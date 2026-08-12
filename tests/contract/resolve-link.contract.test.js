const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

process.env.DATA_FILE = path.join(
  os.tmpdir(),
  `resolve-link-contract-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

const { createServer } = require("../../src/server");
const { request } = require("../helpers/http-client");

describe("GET /{alias} contract", () => {
  let server;
  let baseUrl;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    global.fetch = originalFetch;
    await fs.rm(process.env.DATA_FILE, { force: true });
  });

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });
  });

  test("302 Found with a Location header for a known alias", async () => {
    const createRes = await request(`${baseUrl}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/campaign/resolve-known" }),
    });
    const { alias } = JSON.parse(createRes.body);

    const res = await request(`${baseUrl}/${alias}`, { method: "GET" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/campaign/resolve-known");
  });

  test("404 Not Found for an unknown alias", async () => {
    const res = await request(`${baseUrl}/does-not-exist`, { method: "GET" });

    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({
      error: "This link doesn't exist or is no longer valid.",
    });
  });
});
