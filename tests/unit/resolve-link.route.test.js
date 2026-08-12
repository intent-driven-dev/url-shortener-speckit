const { matches } = require("../../src/link-resolution/routes/resolve-link.route");

describe("resolve-link route matches()", () => {
  test("does not match non-GET methods", () => {
    expect(matches({ method: "POST", url: "/abc1234" })).toBeNull();
  });

  test("does not match the root path", () => {
    expect(matches({ method: "GET", url: "/" })).toBeNull();
  });

  test("does not match multi-segment paths", () => {
    expect(matches({ method: "GET", url: "/abc1234/extra" })).toBeNull();
  });

  test("matches a single-segment GET path and extracts the alias", () => {
    expect(matches({ method: "GET", url: "/abc1234" })).toEqual({ alias: "abc1234" });
  });
});
