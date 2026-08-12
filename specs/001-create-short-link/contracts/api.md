# Interface Contract: Create Short Link

Per the constitution, interface contracts are captured as simple markdown tables. This feature
exposes two HTTP endpoints, one per module.

## Link Management module — `POST /links`

Creates a short link for a submitted destination. Maps to FR-001 through FR-007.

### Request

| Field | Type   | Required | Description |
|-------|--------|----------|-------------|
| `url` | string | Yes      | The destination URL to shorten. |

### Responses

| Status | When | Body |
|--------|------|------|
| `201 Created` | Destination is a well-formed, reachable, non-self-referential URL. | `{ "shortLink": "https://{PRODUCT_DOMAIN}/{alias}", "alias": "{alias}", "destination": "{url}" }` |
| `400 Bad Request` | `url` is missing, or is not a well-formed `http`/`https` URL. | `{ "error": "We couldn't create a short link: the destination isn't a valid web address. Please check the URL and try again." }` |
| `422 Unprocessable Entity` | `url` is well-formed but did not respond within the reachability timeout. | `{ "error": "We couldn't create a short link: the destination couldn't be reached. Please check the URL and try again." }` |
| `409 Conflict` | `url` matches an alias already issued by this system. | `{ "error": "We couldn't create a short link: the destination is already a short link, not a destination. Please check the URL and try again." }` |

**Notes**:
- Resubmitting the same `url` always succeeds again with a new, distinct `alias` (FR-007) — this
  endpoint is not idempotent by design.
- No authentication is required (FR-001).

## Link Resolution module — `GET /{alias}`

Redirects a visitor to the destination a short link was created for. Maps to FR-008 through
FR-010.

### Request

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `alias` | string | Yes (path segment) | The alias portion of a short link's URL. |

### Responses

| Status | When | Body / Headers |
|--------|------|-----------------|
| `302 Found` | `alias` matches a previously issued short link. | `Location: {destination}` header; empty body. Single hop — no intermediate page (FR-008). |
| `404 Not Found` | `alias` does not match any issued short link. | `{ "error": "This link doesn't exist or is no longer valid." }` |

**Notes**:
- Only exact alias matches resolve; extra path segments or query parameters beyond the alias are
  out of scope for this slice (see spec Edge Cases) and are expected to fall through to the
  `404` case since they won't match a stored alias exactly.
- A resolvable short link MUST always keep resolving (Principle III, FR-009) — this endpoint never
  returns anything other than `302` for a known alias.
