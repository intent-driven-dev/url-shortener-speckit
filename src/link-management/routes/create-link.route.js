const { createCreateLinkService } = require("../services/create-link.service");
const config = require("../../shared/config");

const service = createCreateLinkService();

const ERROR_MESSAGES = {
  invalid:
    "We couldn't create a short link: the destination isn't a valid web address. Please check the URL and try again.",
  unreachable:
    "We couldn't create a short link: the destination couldn't be reached. Please check the URL and try again.",
  "self-reference":
    "We couldn't create a short link: the destination is already a short link, not a destination. Please check the URL and try again.",
};

const STATUS_BY_OUTCOME = {
  invalid: 400,
  unreachable: 422,
  "self-reference": 409,
};

function matches(req) {
  return req.method === "POST" && new URL(req.url, "http://localhost").pathname === "/links";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handle(req, res) {
  const rawBody = await readBody(req);

  let parsed = {};
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    parsed = {};
  }

  const result = await service.createLink(parsed.url);

  if (result.outcome === "created") {
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        shortLink: `${config.PRODUCT_DOMAIN}/${result.record.alias}`,
        alias: result.record.alias,
        destination: result.record.destination,
      })
    );
    return;
  }

  res.writeHead(STATUS_BY_OUTCOME[result.outcome], { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: ERROR_MESSAGES[result.outcome] }));
}

module.exports = { matches, handle };
