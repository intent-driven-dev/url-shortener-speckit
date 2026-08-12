const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const storage = require("../../src/shared/storage");

describe("shared storage", () => {
  let filePath;

  beforeEach(() => {
    filePath = path.join(
      os.tmpdir(),
      `storage-test-${process.pid}-${Math.random().toString(36).slice(2)}.json`
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(filePath, { force: true });
  });

  test("read returns [] for a missing file", async () => {
    await expect(storage.readAll(filePath)).resolves.toEqual([]);
  });

  test("read returns [] for an empty file", async () => {
    await fs.writeFile(filePath, "");
    await expect(storage.readAll(filePath)).resolves.toEqual([]);
  });

  test("read propagates a non-ENOENT read error", async () => {
    const err = new Error("permission denied");
    err.code = "EACCES";
    jest.spyOn(fs, "readFile").mockRejectedValueOnce(err);

    await expect(storage.readAll(filePath)).rejects.toThrow("permission denied");
  });

  test("write persists records", async () => {
    const records = [{ alias: "abc1234", destination: "https://example.com" }];
    await storage.writeAll(records, filePath);
    await expect(storage.readAll(filePath)).resolves.toEqual(records);
  });

  test("writes are atomic: write to a temp file, then rename over the target", async () => {
    const writeFileSpy = jest.spyOn(fs, "writeFile");
    const renameSpy = jest.spyOn(fs, "rename");

    await storage.writeAll([{ alias: "atomic1" }], filePath);

    const [tempPathArg] = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(tempPathArg).not.toBe(filePath);

    const [renameFrom, renameTo] = renameSpy.mock.calls[renameSpy.mock.calls.length - 1];
    expect(renameFrom).toBe(tempPathArg);
    expect(renameTo).toBe(filePath);
  });

  test("concurrent writes are serialized via an in-process write queue", async () => {
    let concurrentWrites = 0;
    let maxConcurrentWrites = 0;
    const originalWriteFile = fs.writeFile.bind(fs);

    jest.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
      concurrentWrites += 1;
      maxConcurrentWrites = Math.max(maxConcurrentWrites, concurrentWrites);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await originalWriteFile(...args);
      concurrentWrites -= 1;
    });

    await Promise.all([
      storage.writeAll([{ alias: "first" }], filePath),
      storage.writeAll([{ alias: "second" }], filePath),
    ]);

    expect(maxConcurrentWrites).toBe(1);
  });
});
