const http = require("node:http");
const config = require("./shared/config");
const createLinkRoute = require("./link-management/routes/create-link.route");
const resolveLinkRoute = require("./link-resolution/routes/resolve-link.route");

const routes = [];

function registerRoute(matcher, handler) {
  routes.push({ matcher, handler });
}

registerRoute(createLinkRoute.matches, createLinkRoute.handle);
registerRoute(resolveLinkRoute.matches, resolveLinkRoute.handle);

function createServer() {
  return http.createServer(async (req, res) => {
    for (const { matcher, handler } of routes) {
      const match = matcher(req);
      if (match) {
        await handler(req, res, match);
        return;
      }
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "This link doesn't exist or is no longer valid." }));
  });
}

/* istanbul ignore if -- entrypoint guard, exercised via `npm start`, not the test suite */
if (require.main === module) {
  const server = createServer();
  server.listen(config.PORT, () => {
    console.log(`Server listening on port ${config.PORT}`);
  });
}

module.exports = { createServer, registerRoute };
