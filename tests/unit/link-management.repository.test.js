const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

process.env.DATA_FILE = path.join(
  os.tmpdir(),
  `link-mgmt-repo-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);

const repository = require("../../src/link-management/repositories/link-management.repository");

describe("link-management repository", () => {
  afterAll(async () => {
    await fs.rm(process.env.DATA_FILE, { force: true });
  });

  test("existsAlias returns false when no records exist", async () => {
    await expect(repository.existsAlias("nope1234")).resolves.toBe(false);
  });

  test("save persists a record retrievable via existsAlias and findByAlias", async () => {
    const record = {
      alias: "abc1234",
      destination: "https://example.com",
      createdAt: new Date().toISOString(),
    };
    await repository.save(record);

    await expect(repository.existsAlias("abc1234")).resolves.toBe(true);
    await expect(repository.findByAlias("abc1234")).resolves.toEqual(record);
  });

  test("findByAlias returns null for an alias that doesn't exist", async () => {
    await expect(repository.findByAlias("missing1")).resolves.toBeNull();
  });
});
