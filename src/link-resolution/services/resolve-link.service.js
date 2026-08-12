const defaultRepository = require("../repositories/link-resolution.repository");

function createResolveLinkService({ repository = defaultRepository } = {}) {
  async function resolve(alias) {
    const record = await repository.findByAlias(alias);
    if (!record) {
      return { outcome: "not-found" };
    }
    return { outcome: "resolved", destination: record.destination };
  }

  return { resolve };
}

module.exports = { createResolveLinkService };
