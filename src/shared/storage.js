const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_FILE =
  process.env.DATA_FILE || path.join(process.cwd(), "data", "short-links.json");

let writeQueue = Promise.resolve();

async function readAll(filePath = DEFAULT_FILE) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  if (!content.trim()) return [];
  return JSON.parse(content);
}

function writeAll(records, filePath = DEFAULT_FILE) {
  const task = writeQueue.then(() => atomicWrite(filePath, records));
  writeQueue = task.catch(() => {});
  return task;
}

async function atomicWrite(filePath, records) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(records, null, 2));
  await fs.rename(tempFilePath, filePath);
}

module.exports = { readAll, writeAll };
