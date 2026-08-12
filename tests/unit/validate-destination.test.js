const {
  isWellFormedUrl,
  extractSelfReferenceAlias,
} = require("../../src/link-management/domain/validate-destination");

describe("isWellFormedUrl", () => {
  test("accepts a well-formed http URL", () => {
    expect(isWellFormedUrl("http://example.com/path")).toBe(true);
  });

  test("accepts a well-formed https URL", () => {
    expect(isWellFormedUrl("https://example.com/path")).toBe(true);
  });

  test("rejects a malformed URL", () => {
    expect(isWellFormedUrl("not-a-url")).toBe(false);
  });

  test("rejects a non-http(s) scheme", () => {
    expect(isWellFormedUrl("ftp://example.com/file")).toBe(false);
  });

  test("rejects a missing value", () => {
    expect(isWellFormedUrl(undefined)).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(isWellFormedUrl("")).toBe(false);
  });
});

describe("extractSelfReferenceAlias", () => {
  const PRODUCT_DOMAIN = "http://localhost:3000";

  test("extracts the alias when the URL matches the product domain shape", () => {
    expect(extractSelfReferenceAlias(`${PRODUCT_DOMAIN}/aB3xQ9z`, PRODUCT_DOMAIN)).toBe(
      "aB3xQ9z"
    );
  });

  test("returns null for a URL on a different domain", () => {
    expect(extractSelfReferenceAlias("https://example.com/aB3xQ9z", PRODUCT_DOMAIN)).toBeNull();
  });

  test("returns null when the product-domain URL has no alias segment", () => {
    expect(extractSelfReferenceAlias(PRODUCT_DOMAIN, PRODUCT_DOMAIN)).toBeNull();
    expect(extractSelfReferenceAlias(`${PRODUCT_DOMAIN}/`, PRODUCT_DOMAIN)).toBeNull();
  });

  test("returns null when the product-domain URL has extra path segments", () => {
    expect(
      extractSelfReferenceAlias(`${PRODUCT_DOMAIN}/aB3xQ9z/extra`, PRODUCT_DOMAIN)
    ).toBeNull();
  });

  test("returns null for a malformed URL", () => {
    expect(extractSelfReferenceAlias("not-a-url", PRODUCT_DOMAIN)).toBeNull();
  });
});
