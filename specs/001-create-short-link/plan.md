# Implementation Plan: Create Short Link

**Branch**: `001-create-short-link` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-create-short-link/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A marketing user submits a destination URL and receives a system-generated short link on the
product's domain; visitors who request that short link are redirected to the destination in a
single hop. Built as two separate Node.js modules per the constitution — link management (create)
and link resolution (redirect) — each layered as routes → services → domain → repositories, with
JSON file storage (`data/short-links.json`) behind the repository layer and no runtime
dependencies beyond Node's built-ins (`node:http`, `node:fs/promises`, `node:crypto`, global
`fetch`). See `research.md` for the decisions behind alias generation, reachability checking, and
the shared storage boundary between the two modules.

## Technical Context

**Language/Version**: Node.js ≥20 LTS (JavaScript, no transpilation)

**Primary Dependencies**: None at runtime — built-in `node:http`, `node:fs/promises`,
`node:crypto`, and global `fetch` only (research.md §1)

**Storage**: JSON file (`data/short-links.json`), accessed only through the repository layer via
a shared atomic-write storage utility (research.md §3, §7)

**Testing**: `node:test` + `node:assert/strict` (built-in, research.md §2)

**Target Platform**: Any server/host running Node.js ≥20 (Linux in production; local dev on
macOS)

**Project Type**: Web service (two HTTP endpoints, no frontend in this slice)

**Performance Goals**: Short link issued in under 5 seconds end-to-end (SC-001); redirect resolves
in a single hop with no intermediate page (SC-004, FR-008)

**Constraints**: No major external runtime dependencies (constitution); reachability check capped
at 3s to stay within the 5s creation budget (research.md §5); low-volume scale means no
concurrency/locking infrastructure beyond an in-process write queue (research.md §3)

**Scale/Scope**: Dozens to low hundreds of short links, low-volume/single-team usage (per spec
Assumptions) — two endpoints, two modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | How this plan satisfies it |
|------|--------|------------------------------|
| I. Valid Destinations Only | PASS | URL format validated in link-management domain logic before any write; rejection happens at creation time (`POST /links` → `400`), never deferred to resolution. |
| II. No Chained or Looping Resolution | PASS | Link-management checks the submitted destination against the product's own domain + issued aliases before creation (research.md §6); rejected with `409` if it matches. Resolution (`GET /{alias}`) always terminates in exactly one hop — it 302s straight to the stored destination, never to another alias. |
| III. Resolution Must Never Fail | PASS | This slice adds no delete/expire/update capability for issued short links (FR-009) — only creation and read-only resolution exist. Storage writes are atomic (temp file + rename, research.md §3) so a crash mid-write can't corrupt already-issued records that resolution depends on. |
| IV. Every Specification States Audience, Failure Path, and Scope | PASS | Already satisfied in `spec.md` (checked at `/speckit-specify` time) for both user stories. |
| Module separation (link management vs. link resolution) | PASS | Two top-level modules, `src/link-management/` and `src/link-resolution/`, each owning its own routes/services/domain/repositories (research.md §7). The only shared code is a business-logic-free storage utility. |
| Layering (routes → services → domain → repositories) | PASS | Enforced per module in Project Structure below; domain modules stay framework-free (no `node:http` imports). |
| No major external dependencies / JSON file storage | PASS | Runtime deps are Node built-ins only (research.md §1); storage is a JSON file behind repositories (research.md §3). `node:test` is used directly rather than invoking the testing-tools exception. |
| Interface contracts as markdown tables | PASS | `contracts/api.md` documents both endpoints as markdown tables. |

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-create-short-link/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── server.js                    # Bootstraps node:http server, wires routes from both modules
├── link-management/             # Module: creating short links
│   ├── routes/
│   │   └── create-link.route.js       # Thin: parses POST /links, delegates, formats response
│   ├── services/
│   │   └── create-link.service.js     # Orchestrates validation → reachability → alias → save
│   ├── domain/
│   │   ├── validate-destination.js    # URL well-formedness + self-reference rules (framework-free)
│   │   └── generate-alias.js          # Alphanumeric alias generation (framework-free)
│   └── repositories/
│       └── link-management.repository.js  # save(), existsAlias(), findByAlias() for self-ref check
├── link-resolution/              # Module: redirecting visitors
│   ├── routes/
│   │   └── resolve-link.route.js      # Thin: parses GET /:alias, delegates, formats response
│   ├── services/
│   │   └── resolve-link.service.js    # Looks up alias, returns destination or not-found
│   ├── domain/
│   │   └── (no domain rules beyond lookup; kept for structural symmetry if rules emerge later)
│   └── repositories/
│       └── link-resolution.repository.js  # findByAlias() — read-only
└── shared/
    └── storage.js                # Low-level JSON file read/atomic-write/write-queue; no business logic

data/
└── short-links.json             # Runtime storage file (gitignored; created on first write)

tests/
├── contract/
│   ├── create-link.contract.test.js
│   └── resolve-link.contract.test.js
├── integration/
│   └── submit-and-visit.integration.test.js   # Covers both user stories end-to-end
└── unit/
    ├── validate-destination.test.js
    ├── generate-alias.test.js
    └── storage.test.js
```

**Structure Decision**: Single Node.js service (no frontend in this slice), split into the two
constitution-mandated modules (`src/link-management/`, `src/link-resolution/`), each internally
layered routes → services → domain → repositories. Both repositories sit on top of a shared,
business-logic-free `src/shared/storage.js` (research.md §7) so the two modules share only
low-level JSON file I/O, never decision-making logic. `data/short-links.json` is the single JSON
storage file (research.md §3) and is gitignored since it's runtime-generated data, not source.

## Complexity Tracking

*No entries — the Constitution Check above has no violations to justify.*
