const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

process.env.DATA_FILE = path.join(
  os.tmpdir(),
  `create-link-contract-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

const { createServer } = require("../../src/server");
const { request } = require("../helpers/http-client");
const config = require("../../src/shared/config");

describe("POST /links contract", () => {
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

  function post(body) {
    return request(`${baseUrl}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("201 Created for a well-formed, reachable, non-self-referential destination", async () => {
    const res = await post({ url: "https://example.com/campaign/summer-sale" });

    expect(res.status).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.alias).toMatch(/^[a-zA-Z0-9]{7}$/);
    expect(body.destination).toBe("https://example.com/campaign/summer-sale");
    expect(body.shortLink).toBe(`${config.PRODUCT_DOMAIN}/${body.alias}`);
  });

  test("400 Bad Request when url is missing", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error:
        "We couldn't create a short link: the destination isn't a valid web address. Please check the URL and try again.",
    });
  });

  test("400 Bad Request when url is not a well-formed http(s) URL", async () => {
    const res = await post({ url: "not-a-url" });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error:
        "We couldn't create a short link: the destination isn't a valid web address. Please check the URL and try again.",
    });
  });

  test("400 Bad Request when the request body is empty", async () => {
    const res = await request(`${baseUrl}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  test("400 Bad Request when the request body is not valid JSON", async () => {
    const res = await request(`${baseUrl}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    expect(res.status).toBe(400);
  });

  test("422 Unprocessable Entity when the destination cannot be reached", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network error"));
    const res = await post({ url: "https://this-host-does-not-resolve.invalid/" });
    expect(res.status).toBe(422);
    expect(JSON.parse(res.body)).toEqual({
      error:
        "We couldn't create a short link: the destination couldn't be reached. Please check the URL and try again.",
    });
  });

  test("409 Conflict when the destination is already a short link issued by this system", async () => {
    const createRes = await post({ url: "https://example.com/campaign/self-ref-source" });
    const { shortLink } = JSON.parse(createRes.body);

    const res = await post({ url: shortLink });
    expect(res.status).toBe(409);
    expect(JSON.parse(res.body)).toEqual({
      error:
        "We couldn't create a short link: the destination is already a short link, not a destination. Please check the URL and try again.",
    });
  });

  test("resubmitting the same url twice yields two 201s with distinct aliases", async () => {
    const payload = { url: "https://example.com/campaign/resubmit-test" };
    const res1 = await post(payload);
    const res2 = await post(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    const body1 = JSON.parse(res1.body);
    const body2 = JSON.parse(res2.body);
    expect(body1.alias).not.toBe(body2.alias);
  });
});
