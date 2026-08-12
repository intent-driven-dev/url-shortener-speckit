function isWellFormedUrl(url) {
  if (typeof url !== "string" || url.trim() === "") return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

function extractSelfReferenceAlias(url, productDomain) {
  let parsedUrl;
  let parsedDomain;
  try {
    parsedUrl = new URL(url);
    parsedDomain = new URL(productDomain);
  } catch {
    return null;
  }

  if (parsedUrl.origin !== parsedDomain.origin) return null;

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;

  return segments[0];
}

module.exports = { isWellFormedUrl, extractSelfReferenceAlias };
