const { generateAlias } = require("../../src/link-management/domain/generate-alias");

describe("generateAlias", () => {
  test("generates an alphanumeric alias exactly 7 characters long", () => {
    const alias = generateAlias();
    expect(alias).toMatch(/^[a-zA-Z0-9]{7}$/);
  });

  test("generates different aliases across calls", () => {
    const aliases = new Set(Array.from({ length: 25 }, () => generateAlias()));
    expect(aliases.size).toBeGreaterThan(1);
  });
});
