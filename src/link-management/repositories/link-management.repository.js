const storage = require("../../shared/storage");

async function save(record) {
  const records = await storage.readAll();
  records.push(record);
  await storage.writeAll(records);
}

async function existsAlias(alias) {
  const records = await storage.readAll();
  return records.some((record) => record.alias === alias);
}

async function findByAlias(alias) {
  const records = await storage.readAll();
  return records.find((record) => record.alias === alias) || null;
}

module.exports = { save, existsAlias, findByAlias };
