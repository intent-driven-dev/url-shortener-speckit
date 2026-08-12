# Data Model: Create Short Link

## Short Link

The record created for every accepted destination submission (FR-005, FR-006). Stored as one
entry in the `data/short-links.json` array.

| Field         | Type   | Description                                                                 | Validation / Rules |
|---------------|--------|-------------------------------------------------------------------------------|---------------------|
| `alias`       | string | The path segment identifying this short link.                                | Alphanumeric (`a-z`, `A-Z`, `0-9`) only; fixed length of 7 characters (see research.md §4); unique across all stored records. |
| `destination` | string | The full destination URL this alias resolves to.                            | Well-formed `http`/`https` URL (Principle I); MUST NOT itself be a short link issued by this system (Principle II, FR-004); immutable after creation. |
| `createdAt`   | string | ISO 8601 timestamp of when the short link was issued.                       | Set once at creation; never updated. |

**Relationships**: One short link maps to exactly one destination (1:1). A destination may have
zero, one, or many short links pointing to it (FR-007 — resubmission creates a new, independent
record rather than reusing an existing alias).

**State transitions**: None. A short link is created once and never modified, disabled, expired,
or deleted in this slice (FR-009, Principle III). There is no lifecycle beyond "does not exist" →
"exists."

**Derived value — the short link URL**: `{PRODUCT_DOMAIN}/{alias}`, returned to the caller on
creation (FR-006) and not persisted separately (it's reconstructible from `alias` at any time).

## Destination (submission-time concept only)

Not a stored entity — it's the input to short-link creation, validated before a Short Link record
is written.

| Property                | Rule |
|--------------------------|------|
| Format                  | Must parse as a well-formed `http` or `https` URL (FR-002). |
| Reachability             | Must respond to a request within the reachability timeout at submission time (FR-003, research.md §5). Not re-checked after creation. |
| Not-a-short-link         | Must not match the product's own domain + an alias already present in storage (FR-004, research.md §6). |

## Storage file shape

`data/short-links.json`:

```json
[
  {
    "alias": "aB3xQ9z",
    "destination": "https://example.com/campaign/summer-sale",
    "createdAt": "2026-08-12T10:15:00.000Z"
  }
]
```

An empty/missing file is treated as an empty array (no short links issued yet).
