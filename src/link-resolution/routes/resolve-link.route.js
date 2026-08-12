const { createResolveLinkService } = require("../services/resolve-link.service");

const service = createResolveLinkService();

function matches(req) {
  if (req.method !== "GET") return null;
  const { pathname } = new URL(req.url, "http://localhost");
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  return { alias: segments[0] };
}

async function handle(_req, res, match) {
  const result = await service.resolve(match.alias);

  if (result.outcome === "resolved") {
    res.writeHead(302, { Location: result.destination });
    res.end();
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "This link doesn't exist or is no longer valid." }));
}

module.exports = { matches, handle };
