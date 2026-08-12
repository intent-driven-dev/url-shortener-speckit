process.env.PRODUCT_DOMAIN = "http://localhost:3000";

const { createCreateLinkService } = require("../../src/link-management/services/create-link.service");

function makeRepository(overrides = {}) {
  return {
    existsAlias: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    findByAlias: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("CreateLinkService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("retries alias generation on collision until a unique alias is found", async () => {
    const repository = makeRepository({
      existsAlias: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    });
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("https://example.com/campaign");

    expect(result.outcome).toBe("created");
    expect(repository.existsAlias).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  test("falls back from HEAD to GET when the destination responds 405 to HEAD, and GET succeeds", async () => {
    const repository = makeRepository();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 200 });

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("https://example.com/head-not-allowed");

    expect(result.outcome).toBe("created");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][1].method).toBe("HEAD");
    expect(global.fetch.mock.calls[1][1].method).toBe("GET");
  });

  test("treats a HEAD 405 followed by a failing GET as unreachable", async () => {
    const repository = makeRepository();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 405 })
      .mockRejectedValueOnce(new Error("network error"));

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("https://example.com/head-not-allowed-get-fails");

    expect(result.outcome).toBe("unreachable");
  });

  test("treats a rejected/timed-out fetch as unreachable", async () => {
    const repository = makeRepository();
    global.fetch = jest.fn().mockRejectedValue(new Error("timeout"));

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("https://this-host-does-not-resolve.invalid/");

    expect(result.outcome).toBe("unreachable");
  });

  test("does not treat a product-domain-shaped URL as self-referential when the alias was never issued", async () => {
    const repository = makeRepository({
      existsAlias: jest.fn().mockResolvedValue(false),
    });
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("http://localhost:3000/notIssued1");

    expect(result.outcome).toBe("created");
  });

  test("rejects a destination that is already an issued short link", async () => {
    const repository = makeRepository({
      existsAlias: jest.fn().mockResolvedValue(true),
    });

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("http://localhost:3000/aB3xQ9z");

    expect(result.outcome).toBe("self-reference");
    expect(repository.save).not.toHaveBeenCalled();
  });

  test("rejects a malformed url without calling the repository or fetch", async () => {
    const repository = makeRepository();
    global.fetch = jest.fn();

    const service = createCreateLinkService({ repository });
    const result = await service.createLink("not-a-url");

    expect(result.outcome).toBe("invalid");
    expect(repository.existsAlias).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects a missing url", async () => {
    const repository = makeRepository();
    const service = createCreateLinkService({ repository });
    const result = await service.createLink(undefined);

    expect(result.outcome).toBe("invalid");
  });
});
