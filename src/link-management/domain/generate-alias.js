const crypto = require("node:crypto");

const ALIAS_LENGTH = 7;
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateAlias() {
  let alias = "";
  for (let i = 0; i < ALIAS_LENGTH; i += 1) {
    alias += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return alias;
}

module.exports = { generateAlias };
