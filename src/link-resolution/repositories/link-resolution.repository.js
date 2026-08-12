const storage = require("../../shared/storage");

async function findByAlias(alias) {
  const records = await storage.readAll();
  return records.find((record) => record.alias === alias) || null;
}

module.exports = { findByAlias };
