---

description: "Task list for Create Short Link"
---

# Tasks: Create Short Link

**Input**: Design documents from `/specs/001-create-short-link/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Required by the constitution's Engineering Practices — test-first workflow with Jest,
sequenced ahead of the implementation tasks they support, targeting 100% branch coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

Single Node.js service per plan.md: `src/link-management/`, `src/link-resolution/`,
`src/shared/`, `tests/{contract,integration,unit}/`, `data/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure: `src/link-management/{routes,services,domain,repositories}/`, `src/link-resolution/{routes,services,domain,repositories}/`, `src/shared/`, `tests/{contract,integration,unit}/`, `data/` per plan.md Project Structure
- [X] T002 Initialize `package.json` for a CommonJS Node.js ≥20 project with no runtime dependencies; add Jest as a devDependency (constitution Test framework) and a `test` script (`jest --coverage`)
- [X] T003 [P] Configure `jest.config.js`: `testEnvironment: "node"`, `collectCoverageFrom: ["src/**/*.js"]`, `coverageThreshold: { global: { branches: 100 } }` (line coverage tracked but not gated, per constitution Coverage gate)
- [X] T004 [P] Configure `.gitignore` for `node_modules/`, `data/short-links.json`, npm/log files, and local env files (constitution Repository hygiene)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared storage, shared config, and server bootstrap that both user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Write unit tests for the shared storage utility in `tests/unit/storage.test.js`: read returns `[]` for a missing/empty file, write persists records, writes are atomic (temp file + rename), and concurrent writes are serialized via an in-process write queue — RED (storage.js doesn't exist yet)
- [X] T006 Implement shared storage utility in `src/shared/storage.js`: atomic write (temp file + rename), in-process write-queue (promise chain) to serialize writes, read treats missing/empty file as `[]`; MUST NOT import from `src/link-management/` or `src/link-resolution/` and MUST NOT branch on alias/destination content (constitution boundary rule, research.md §3, §7) — GREEN for T005
- [X] T007 [P] Write unit tests for the shared config module in `tests/unit/config.test.js`: `PORT` defaults to `3000` when unset and reflects `process.env.PORT` when set; `PRODUCT_DOMAIN` defaults to `` `http://localhost:${PORT}` `` when unset and reflects `process.env.PRODUCT_DOMAIN` when set (research.md §8) — RED
- [X] T008 Implement shared config module in `src/shared/config.js`: export `PORT` (env `PORT`, default `3000`) and `PRODUCT_DOMAIN` (env `PRODUCT_DOMAIN`, default `` `http://localhost:${PORT}` ``) as the single source of truth for both values (research.md §8) — GREEN for T007
- [X] T009 [P] Bootstrap HTTP server entry point in `src/server.js`: start a `node:http` server on `config.PORT` with a minimal request router placeholder that each module's routes will be wired into (depends on T008)
- [X] T010 [P] Add `start` script to `package.json` running `node src/server.js` (quickstart.md `npm start`)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Submit a destination and receive a short link (Priority: P1) 🎯 MVP

**Goal**: A marketing user submits a destination URL and receives a short link on the product's
domain with a system-generated alias, or a specific rejection reason if the destination is
invalid, unreachable, or already a short link.

**Independent Test**: Submit a valid, reachable destination URL via `POST /links` and confirm a
`201` with a short link on the product's domain is returned; submit each invalid case and confirm
the matching `400`/`422`/`409` and message.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation (constitution Test-first workflow)

- [X] T011 [P] [US1] Unit tests for destination validation and self-reference detection in `tests/unit/validate-destination.test.js`: well-formed `http`/`https` URL accepted, malformed/non-http(s) rejected, a URL shaped like `PRODUCT_DOMAIN` (src/shared/config.js) + an existing alias is flagged as self-referential (FR-002, FR-004) — RED
- [X] T012 [P] [US1] Unit tests for alias generation in `tests/unit/generate-alias.test.js`: generated alias is alphanumeric (`a-z`, `A-Z`, `0-9`) and exactly 7 characters long (FR-005, research.md §4) — RED
- [X] T013 [P] [US1] Contract test for `POST /links` in `tests/contract/create-link.contract.test.js` covering `201`/`400`/`422`/`409` request/response shapes and messages per `contracts/api.md`, plus a resubmission case asserting that submitting the same `url` twice yields two `201`s with distinct `alias` values (FR-007, spec Acceptance Scenario 5) — RED
- [X] T014 [P] [US1] Service-level unit tests for `CreateLinkService` in `tests/unit/create-link.service.test.js` that force its internal decision branches via mocks: alias **collision-retry** (mock `repository.existsAlias` to return `true` once then `false`, assert a second alias is generated) and the reachability **`HEAD`→405→`GET` fallback** (mock `fetch` to return `405` on `HEAD` then succeed on `GET`; separately mock `fetch` to reject/time out and assert "couldn't be reached") — RED. These branches are not reliably exercised by the black-box contract test alone (T013) and are required for the constitution's 100% branch-coverage gate (T027).

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement `validate-destination.js` domain rule in `src/link-management/domain/validate-destination.js` (well-formedness check + structural self-reference detection against `PRODUCT_DOMAIN` from `src/shared/config.js`; framework-free per constitution Layering; depends on T008) — GREEN for T011
- [X] T016 [P] [US1] Implement `generate-alias.js` domain rule in `src/link-management/domain/generate-alias.js` (7-char alphanumeric alias via `crypto.randomInt`; framework-free) — GREEN for T012
- [X] T017 [P] [US1] Implement link-management repository in `src/link-management/repositories/link-management.repository.js`: `save(record)`, `existsAlias(alias)`, `findByAlias(alias)`, built on top of `src/shared/storage.js` (depends on T006)
- [X] T018 [US1] Implement `CreateLinkService` in `src/link-management/services/create-link.service.js`: orchestrate validate → confirm self-reference via `repository.existsAlias` → reachability check (`HEAD` with `AbortSignal.timeout(3000)`, retry once with `GET` on `405`; any response counts as reachable, research.md §5) → generate alias with collision-retry via the repository → save (depends on T015, T016, T017) — GREEN for T013, T014
- [X] T019 [US1] Implement `POST /links` route in `src/link-management/routes/create-link.route.js`: parse the JSON body, delegate to `CreateLinkService`, map outcomes to `201`/`400`/`422`/`409` responses and messages per `contracts/api.md`, building `shortLink` from `PRODUCT_DOMAIN` (src/shared/config.js) + `alias` (depends on T018)
- [X] T020 [US1] Wire the link-management route into `src/server.js` (depends on T009, T019)

**Checkpoint**: User Story 1 is fully functional and independently testable (`npm test` + quickstart.md `POST /links` curl scenarios)

---

## Phase 4: User Story 2 - Visiting a short link reaches the destination (Priority: P1)

**Goal**: A visitor requesting an issued short link is redirected to its destination in a single
hop; a visitor requesting an unknown alias sees a "link not found" message with no redirect.

**Independent Test**: Visit a known-good short link and confirm a single-hop `302` to the
destination; visit an unknown alias and confirm `404` with the "link not found" message.

### Tests for User Story 2 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation (constitution Test-first workflow)

- [X] T021 [P] [US2] Contract test for `GET /{alias}` in `tests/contract/resolve-link.contract.test.js` covering `302` (with `Location` header) and `404` responses per `contracts/api.md` — RED
- [X] T022 [P] [US2] Integration test for the full submit-then-visit flow (both user stories) in `tests/integration/submit-and-visit.integration.test.js`: `POST /links` then `GET` the returned alias resolves in one hop to the original destination; an unknown alias returns "link not found" — RED for the resolution portion

### Implementation for User Story 2

- [X] T023 [P] [US2] Implement link-resolution repository (read-only) in `src/link-resolution/repositories/link-resolution.repository.js`: `findByAlias(alias)`, built on top of `src/shared/storage.js` (depends on T006)
- [X] T024 [US2] Implement `ResolveLinkService` in `src/link-resolution/services/resolve-link.service.js`: look up the alias, return the destination or a not-found result (depends on T023) — GREEN for T021
- [X] T025 [US2] Implement `GET /{alias}` route in `src/link-resolution/routes/resolve-link.route.js`: `302` with `Location: {destination}` for a known alias, `404` with the "link not found" message otherwise; only exact alias matches resolve (depends on T024)
- [X] T026 [US2] Wire the link-resolution route into `src/server.js` (depends on T020, T025) — GREEN for T022

**Checkpoint**: Both user stories are independently functional and integrated — the full slice works end-to-end

---

## Phase 5: Polish & Quality Verification

**Purpose**: Constitution completion gates — branch coverage and end-to-end confirmation

- [X] T027 [P] Run `npm test` (Jest with coverage) and confirm 100% branch coverage across `src/**`, including the alias-collision-retry and reachability-fallback branches forced by T014; add or adjust tests until every decision branch (including every failure path) is exercised (constitution Coverage gate)
- [X] T028 Quality verification: start the server (`npm start`) and run every quickstart.md curl scenario against the running app — `201` success, `400` invalid URL, `422` unreachable, `409` self-referential, `302` redirect, `404` not-found — confirming each response matches `contracts/api.md` exactly (constitution Quality Verification — a completion check, not an informal step)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — no dependency on User Story 2
- **User Story 2 (Phase 4)**: Depends on Foundational only for its own routes/service/repository; T020 (US1) and T026 (US2) both touch `src/server.js`, so route-wiring is sequential between the two stories even though the stories are otherwise independent
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- Tests are written first and MUST fail before implementation begins (constitution Test-first workflow)
- Domain rules before services; services before routes; routes before server wiring
- Repository tasks depend on the shared storage utility (T006) but not on domain tasks
- `validate-destination.js` and the `POST /links` route depend on the shared config module (T008) for `PRODUCT_DOMAIN`

### Parallel Opportunities

- Setup: T003, T004 in parallel
- Foundational: T005, T007 in parallel (test-writing); T009, T010 in parallel once T006/T008 land
- User Story 1 tests: T011, T012, T013, T014 in parallel
- User Story 1 implementation: T015, T016, T017 in parallel; T018 → T019 → T020 sequential after
- User Story 2 tests: T021, T022 in parallel
- User Story 2 implementation: T023 in parallel with nothing blocking it; T024 → T025 → T026 sequential after
- Once Foundational completes, Phase 3 and Phase 4 test/domain/repository work (T011–T017, T021, T023) can proceed in parallel across the two stories — only the final `src/server.js` wiring tasks (T020, T026) must be sequential

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for destination validation in tests/unit/validate-destination.test.js"
Task: "Unit tests for alias generation in tests/unit/generate-alias.test.js"
Task: "Contract test for POST /links in tests/contract/create-link.contract.test.js"
Task: "Service-level branch-forcing tests in tests/unit/create-link.service.test.js"

# Then launch independent domain/repository implementation together:
Task: "Implement validate-destination.js in src/link-management/domain/validate-destination.js"
Task: "Implement generate-alias.js in src/link-management/domain/generate-alias.js"
Task: "Implement link-management repository in src/link-management/repositories/link-management.repository.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 — RED tests, then GREEN implementation
4. **STOP and VALIDATE**: `npm test` passes for US1's tests; curl `POST /links` scenarios from quickstart.md succeed
5. Demo: a destination can be shortened (visiting it isn't wired up yet without US2)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → test independently → creation works end-to-end
3. User Story 2 → test independently → the full slice (create + resolve) works end-to-end
4. Phase 5 → 100% branch coverage confirmed, every quickstart.md curl scenario verified against the running app

### Test-Driven Flow (per constitution)

For every task pair below, the first task MUST be completed (and observed failing) before the
second begins:

- T011/T012/T013/T014 → T015/T016/T017/T018/T019
- T021/T022 → T023/T024/T025/T026

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Jest is the mandated test framework (constitution Test framework); 100% branch coverage is a completion gate, line coverage is informational only (constitution Coverage gate)
- T014 exists specifically to make the 100% branch-coverage gate (T027) achievable — `CreateLinkService`'s collision-retry and reachability-fallback branches need mocked conditions that a black-box contract test is unlikely to trigger on its own
- `PRODUCT_DOMAIN` and `PORT` are sourced from `src/shared/config.js` (research.md §8) — no other file should read `process.env.PORT`/`process.env.PRODUCT_DOMAIN` directly
- T028 (curl-based quality verification) is a mandatory, explicit completion task per the constitution's Quality Verification section — do not treat it as informally satisfied by the automated test suite
- Commit after each task or logical RED/GREEN group
- Stop at either checkpoint to validate a story independently
