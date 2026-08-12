const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

process.env.DATA_FILE = path.join(
  os.tmpdir(),
  `submit-and-visit-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

const { createServer } = require("../../src/server");
const { request } = require("../helpers/http-client");

describe("submit then visit (User Story 1 + User Story 2)", () => {
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

  test("POST /links then GET the alias resolves in one hop to the original destination", async () => {
    const destination = "https://example.com/campaign/full-flow";
    const createRes = await request(`${baseUrl}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: destination }),
    });
    expect(createRes.status).toBe(201);
    const { alias } = JSON.parse(createRes.body);

    const visitRes = await request(`${baseUrl}/${alias}`, { method: "GET" });
    expect(visitRes.status).toBe(302);
    expect(visitRes.headers.location).toBe(destination);
  });

  test("visiting an unknown alias returns a link-not-found response with no redirect", async () => {
    const res = await request(`${baseUrl}/unknown-alias`, { method: "GET" });

    expect(res.status).toBe(404);
    expect(res.headers.location).toBeUndefined();
    expect(JSON.parse(res.body)).toEqual({
      error: "This link doesn't exist or is no longer valid.",
    });
  });
});
