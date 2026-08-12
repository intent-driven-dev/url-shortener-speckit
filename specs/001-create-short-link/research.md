# Research: Create Short Link

## 1. Runtime & HTTP delivery

**Decision**: Node.js ≥20 LTS, using only built-in modules (`node:http`, `node:fs/promises`,
`node:crypto`, global `fetch`) for the HTTP server and reachability checks. No web framework
(e.g. Express).

**Rationale**: The constitution requires avoiding major external dependencies and relying on
built-in Node modules. This feature exposes exactly two HTTP endpoints (create short link,
resolve short link), which is small enough that manual routing over `node:http` is simpler than
adding a framework dependency. Node ≥18 ships a built-in `fetch` with `AbortSignal.timeout()`,
which covers the destination-reachability check without an HTTP client library.

**Alternatives considered**:
- Express/Fastify — rejected: violates the no-major-external-dependencies constraint for a
  two-route service.
- `node-fetch`/`axios` for reachability checks — rejected: redundant now that `fetch` is built in.

## 2. Testing tooling

**Decision**: Jest.

**Rationale**: The constitution (v1.2.0) mandates Jest as this project's test framework and
requires a 100% branch-coverage completion gate. Jest's built-in `--coverage` (Istanbul) reports
branch-level coverage without an additional tool, and its mocking utilities (`jest.fn()`,
`jest.spyOn()`) are needed to force edge-case branches — e.g. the alias-collision retry and the
`HEAD`→`GET` reachability fallback (§4, §5) — that are otherwise hard to trigger from black-box
contract tests alone.

**Alternatives considered**:
- `node:test` + `node:assert/strict` — considered initially as a zero-dependency option that
  avoids invoking the constitution's testing-tools exception; rejected because the constitution
  was subsequently amended to explicitly mandate Jest, superseding this preference.
- Vitest — rejected: unnecessary given Jest is the constitution-mandated choice.

## 3. Storage mechanism

**Decision**: A single JSON file (`data/short-links.json`) holding an array of issued short-link
records, accessed only through a shared low-level storage module behind the repository layer.
Writes are atomic (write to a temp file, then rename over the target) to avoid partial-write
corruption. Since Node runs single-threaded and this slice has no concurrent-write hot path at
its target scale (dozens to low hundreds of links), an in-process write queue (serialize writes
with a promise chain) is sufficient to prevent interleaved writes without a locking library.

**Rationale**: The constitution mandates JSON file storage behind the repository layer, and this
feature's scale assumption (dozens to low hundreds of short links, low-volume/single-team usage)
makes a single JSON file adequate. Atomic rename avoids the file being left half-written if the
process dies mid-write, which directly protects Principle III (resolution must never fail) since
resolution reads must never see a corrupt file.

**Alternatives considered**:
- SQLite — rejected: not JSON file storage per the constitution, and unnecessary at this scale.
- One file per short link — rejected: adds filesystem complexity (directory scans on resolution)
  for no benefit at this scale; a single JSON array is simpler to read/write atomically.

## 4. Alias generation

**Decision**: Generate a 7-character alphanumeric alias (`a-z`, `A-Z`, `0-9`) using
`crypto.randomInt` per character. On collision with an existing alias (checked via the
repository), regenerate and retry.

**Rationale**: The spec's clarification ("alphanumeric, fixed length of 6-8 characters") calls
for one fixed length chosen from the 6-8 range, not a variable length per alias. 7 characters is
the midpoint, giving ~62^7 (~3.5×10^12) possible aliases — far more than enough headroom for the
slice's target scale (dozens to low hundreds) to make collisions rare, while collision-and-retry
handles the rare case without violating uniqueness (FR-005).

**Alternatives considered**:
- UUID-based aliases — rejected: not alphanumeric-only in the required sense and far longer than
  6-8 characters.
- Sequential/incrementing IDs encoded as base62 — rejected: predictable aliases let visitors
  enumerate other campaigns' short links, which the spec doesn't require but also doesn't need to
  risk.

## 5. Reachability check

**Decision**: Issue a `HEAD` request to the destination with a 3-second timeout
(`AbortSignal.timeout(3000)`); if the destination responds with a `405 Method Not Allowed` (HEAD
unsupported), retry once with `GET`. Any response (any status code) counts as "reachable" —
reachability means the server responded, not that it returned success. A network error, DNS
failure, or timeout is treated as "couldn't be reached."

**Rationale**: SC-001 requires a short link to be issued in under 5 seconds; a 3-second
reachability timeout leaves headroom for alias generation, collision retry, and file I/O within
that budget. Treating any HTTP response (even 4xx/5xx) as "reachable" avoids rejecting valid
destinations that happen to return a non-2xx status for reasons unrelated to reachability (e.g. a
landing page behind a login wall). HEAD-first minimizes load on the destination server; falling
back to GET handles servers that don't implement HEAD.

**Alternatives considered**:
- GET-only reachability check — rejected: heavier than necessary when HEAD suffices for most
  servers.
- Treating only 2xx as "reachable" — rejected: the spec only requires the destination to respond;
  requiring success status would reject legitimate campaign destinations that gate content behind
  auth or return redirects.

## 6. Detecting "already a short link"

**Decision**: At submission time, parse the submitted destination's origin and path. If the
origin matches the product's own domain and the path's alias segment matches an alias already
present in storage, reject with the "is already a short link" message. This check runs before the
reachability check (a self-referential submission is rejected on shape alone, no network call
needed).

**Rationale**: FR-004 and Principle II require rejecting destinations that are themselves issued
short links, at creation time. Comparing against the product's own domain plus a live lookup
against issued aliases is the only reliable way to detect this without maintaining a separate
registry.

**Alternatives considered**:
- Reject any URL under the product's domain regardless of alias existence — rejected: overly
  broad; spec requires the check to be specifically about already-issued short links, not the
  domain in general.

## 7. Module boundary

**Decision**: Two top-level modules, `src/link-management` (creation) and `src/link-resolution`
(redirect), each with its own `routes/`, `services/`, `domain/`, `repositories/`. Both
repositories read/write the same `data/short-links.json` file through a shared low-level storage
utility (`src/shared/storage.js`) that owns the atomic-write/write-queue logic; each module's
repository wraps that shared utility with only the operations its module needs (link-management:
save + check-alias-exists + check-destination-is-own-alias; link-resolution: find-by-alias only).

**Rationale**: The constitution requires link management and link resolution to be separate
modules with no blurred business logic, but both need to read the same underlying data. Sharing
only the low-level storage I/O (not business logic, not domain rules) keeps the constraint intact
— the shared piece is a dumb file-access utility, not a decision-making component.

**Alternatives considered**:
- Fully independent storage per module (e.g. two files kept in sync) — rejected: adds
  synchronization complexity and a new way for Principle III to be violated (drift between the
  two copies) for no benefit at this scale.

## 8. Product domain configuration

**Decision**: A single shared config module (`src/shared/config.js`) exports `PORT` (env var
`PORT`, default `3000`) and `PRODUCT_DOMAIN` (env var `PRODUCT_DOMAIN`, default
`` `http://localhost:${PORT}` ``). Both the link-management self-reference check (§6) and the
`shortLink` value returned on creation (`contracts/api.md`, data-model.md) read `PRODUCT_DOMAIN`
from this module rather than each computing or hardcoding it independently.

**Rationale**: `{PRODUCT_DOMAIN}` is referenced by data-model.md and contracts/api.md but had no
defined source. An env var with a `localhost:${PORT}` default is the simplest option that needs no
new infrastructure: it matches the existing `PORT` env-var pattern (quickstart.md), works
out-of-the-box for local dev/testing without requiring the env var to be set, and lets a real
deployment override it with the actual public domain. A single config module avoids the two
call sites (self-reference detection, response construction) computing this value independently
and drifting.

**Alternatives considered**:
- Hardcoding the domain in each call site — rejected: duplicates the value and risks drift between
  the self-reference check and the returned `shortLink`, which would directly undermine Principle
  II if they ever disagreed.
- Deriving the domain from the incoming request's `Host` header at request time — rejected: more
  flexible but unnecessary complexity for a single-team deployment at this slice's scale, and it
  would make the self-reference check depend on request context rather than a stable, testable
  value.
