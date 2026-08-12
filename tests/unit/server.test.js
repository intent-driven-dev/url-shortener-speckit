const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

process.env.DATA_FILE = path.join(
  os.tmpdir(),
  `server-fallback-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

const { createServer } = require("../../src/server");
const { request } = require("../helpers/http-client");

describe("server fallback routing", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(process.env.DATA_FILE, { force: true });
  });

  test("returns 404 for a request that matches no registered route", async () => {
    const res = await request(`${baseUrl}/`, { method: "GET" });

    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      error: "This link doesn't exist or is no longer valid.",
    });
  });
});
