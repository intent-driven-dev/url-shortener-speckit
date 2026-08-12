# Quickstart: Create Short Link

Validates both user stories end-to-end: submitting a destination (User Story 1) and visiting the
resulting short link (User Story 2). See `contracts/api.md` for full request/response shapes and
`data-model.md` for the stored record shape.

## Prerequisites

- Node.js ≥20 installed (`node --version`).
- No external services required — storage is a local JSON file (`data/short-links.json`),
  created automatically on first write.

## Setup

```bash
npm install   # installs dev-only testing tooling if any is added; no runtime dependencies expected
npm start     # starts the HTTP server (link management + link resolution routes)
```

The server listens on the port defined by the `PORT` environment variable (default: `3000`).

## Validate User Story 1 — submit a destination, receive a short link

```bash
curl -i -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/campaign/summer-sale"}'
```

**Expected**: `201 Created` with a JSON body containing `shortLink`, `alias`, and `destination`
(see `contracts/api.md`).

Failure paths to also check:

```bash
# Malformed URL -> 400, "isn't a valid web address"
curl -i -X POST http://localhost:3000/links -H "Content-Type: application/json" \
  -d '{"url": "not-a-url"}'

# Unreachable URL -> 422, "couldn't be reached"
curl -i -X POST http://localhost:3000/links -H "Content-Type: application/json" \
  -d '{"url": "https://this-host-does-not-resolve.invalid/"}'

# Already a short link -> 409, "is already a short link"
# (use the shortLink URL returned by the first successful call above as the submitted url)
curl -i -X POST http://localhost:3000/links -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000/aB3xQ9z"}'
```

## Validate User Story 2 — visiting a short link reaches the destination

```bash
# Using the alias returned above
curl -i http://localhost:3000/aB3xQ9z
```

**Expected**: `302 Found` with a `Location` header equal to the original destination, in a single
hop (no intermediate page).

```bash
# Unknown alias -> 404, "link not found"
curl -i http://localhost:3000/does-not-exist
```

**Expected**: `404 Not Found` with the "This link doesn't exist or is no longer valid." message.

## Automated validation

```bash
npm test
```

Runs the `node:test` suite covering:
- Contract tests for both endpoints against `contracts/api.md`.
- Integration tests for the full submit → resolve flow (both user stories).
- Unit tests for domain rules (URL validation, self-reference detection, alias generation).
