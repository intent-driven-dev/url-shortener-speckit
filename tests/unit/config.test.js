describe("shared config", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PORT;
    delete process.env.PRODUCT_DOMAIN;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("PORT defaults to 3000 when unset", () => {
    const config = require("../../src/shared/config");
    expect(config.PORT).toBe(3000);
  });

  test("PORT reflects process.env.PORT when set", () => {
    process.env.PORT = "4321";
    const config = require("../../src/shared/config");
    expect(config.PORT).toBe(4321);
  });

  test("PRODUCT_DOMAIN defaults to http://localhost:${PORT} when unset", () => {
    const config = require("../../src/shared/config");
    expect(config.PRODUCT_DOMAIN).toBe("http://localhost:3000");
  });

  test("PRODUCT_DOMAIN default reflects a custom PORT", () => {
    process.env.PORT = "5000";
    const config = require("../../src/shared/config");
    expect(config.PRODUCT_DOMAIN).toBe("http://localhost:5000");
  });

  test("PRODUCT_DOMAIN reflects process.env.PRODUCT_DOMAIN when set", () => {
    process.env.PRODUCT_DOMAIN = "https://short.example";
    const config = require("../../src/shared/config");
    expect(config.PRODUCT_DOMAIN).toBe("https://short.example");
  });
});
