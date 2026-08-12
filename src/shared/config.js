const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PRODUCT_DOMAIN = process.env.PRODUCT_DOMAIN || `http://localhost:${PORT}`;

module.exports = { PORT, PRODUCT_DOMAIN };
