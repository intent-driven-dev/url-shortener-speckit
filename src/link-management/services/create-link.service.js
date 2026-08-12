const config = require("../../shared/config");
const { isWellFormedUrl, extractSelfReferenceAlias } = require("../domain/validate-destination");
const { generateAlias } = require("../domain/generate-alias");
const defaultRepository = require("../repositories/link-management.repository");

const REACHABILITY_TIMEOUT_MS = 3000;

function createCreateLinkService({ repository = defaultRepository } = {}) {
  async function createLink(url) {
    if (!isWellFormedUrl(url)) {
      return { outcome: "invalid" };
    }

    const selfReferenceAlias = extractSelfReferenceAlias(url, config.PRODUCT_DOMAIN);
    if (selfReferenceAlias && (await repository.existsAlias(selfReferenceAlias))) {
      return { outcome: "self-reference" };
    }

    const reachable = await checkReachable(url);
    if (!reachable) {
      return { outcome: "unreachable" };
    }

    let alias = generateAlias();
    while (await repository.existsAlias(alias)) {
      alias = generateAlias();
    }

    const record = {
      alias,
      destination: url,
      createdAt: new Date().toISOString(),
    };
    await repository.save(record);

    return { outcome: "created", record };
  }

  return { createLink };
}

async function attemptFetch(url, method) {
  try {
    return await fetch(url, { method, signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

async function checkReachable(url) {
  const headResponse = await attemptFetch(url, "HEAD");
  if (headResponse && headResponse.status === 405) {
    const getResponse = await attemptFetch(url, "GET");
    return getResponse !== null;
  }
  return headResponse !== null;
}

module.exports = { createCreateLinkService };
