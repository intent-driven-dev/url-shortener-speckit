<!--
Sync Impact Report
Version change: 1.1.0 → 1.2.0
Modified principles: none (no existing principle renamed or redefined)
Added sections:
  - Engineering Practices (new section): test-first workflow (acceptance tests derived from
    spec scenarios, sequenced ahead of implementation tasks; red-before-green per test),
    Jest as the mandated test framework, 100% branch coverage as a completion gate (line
    coverage informational only), and the requirement that every task list include test
    suite changes.
  - Quality Verification (new section): post-implementation confirmation of every
    user-facing behavior via curl against the running application, captured as an explicit
    task in the task list rather than an informal step.
Removed sections: none
Deferred / TODO placeholders: none.
Templates checked for alignment:
  - .specify/templates/tasks-template.md — should be reviewed on next tasks run to confirm
    it sequences acceptance tests ahead of implementation tasks and includes an explicit
    curl-verification completion task; not modified in this pass.
  - .specify/templates/plan-template.md — Constitution Check section should be reviewed to
    confirm it surfaces the Engineering Practices and Quality Verification gates; not
    modified in this pass.
  - .specify/templates/spec-template.md — not modified; unaffected by this amendment.
Follow-up TODOs: none.
-->

# URL Shortener Constitution

## Core Principles

### I. Valid Destinations Only
Every short link MUST be created against a destination that is a syntactically valid URL.
A short link MUST NOT be issued for a destination that fails URL validation. Rejection of an
invalid destination MUST happen at creation time, not at resolution time.

**Rationale**: Marketing teams embed short links in published campaign material before the
destination is exercised end-to-end. Catching invalid destinations at creation is the only
point where the mistake is still cheap to fix.

### II. No Chained or Looping Resolution (NON-NEGOTIABLE)
A short link's destination MUST NEVER be another short link issued by this system. Resolution
MUST always terminate in exactly one hop, from short link to destination. Attempts to create a
short link whose destination is itself a short link MUST be rejected at creation time.

**Rationale**: Chains and loops turn a single point of failure into a multi-hop failure surface
and make resolution latency and correctness impossible to reason about. Guaranteeing one-hop
resolution is what makes Principle III enforceable.

### III. Resolution Must Never Fail (NON-NEGOTIABLE)
A short link that stops resolving is the worst failure this product can have. Short links are
embedded in published campaign material that cannot be recalled or edited after distribution, so
a resolution failure is permanent and unrecoverable from the product's side. Every capability
that can affect whether an existing short link resolves (deletion, expiration, destination
changes, storage or infrastructure changes) MUST treat continued resolution of already-issued
short links as the default, and MUST require an explicit, deliberate action to break that
guarantee — never an incidental side effect of an unrelated change.

**Rationale**: Once a short link is published, the business has no channel to fix or withdraw it.
Every other product concern is negotiable against this one.

### IV. Every Specification States Audience, Failure Path, and Scope
Every feature specification MUST explicitly state, for each capability described:
1. **Who it serves** — which user role or actor the capability is for.
2. **Failure-path behavior** — what happens when the capability fails, including the exact
   user-facing message shown to the affected user.
3. **Out of scope** — what the capability explicitly does not do or handle.

A specification that omits any of these three for a described capability is incomplete and MUST
NOT proceed to planning.

**Rationale**: These three facts are the ones most often left implicit and most often the source
of downstream rework. Requiring them up front keeps specs testable and keeps failure behavior —
the product's biggest risk per Principle III — a first-class part of every spec, not an
afterthought.

## Domain Vocabulary

The following terms are canonical. Specifications, plans, and code MUST use them consistently and
MUST NOT introduce synonyms for the same concept.

- **Short link**: The shortened URL the product issues. Resolves in exactly one hop to a
  destination (Principle II).
- **Destination**: The original URL a short link points to. Must be a valid URL (Principle I) and
  must not itself be a short link (Principle II).
- **Alias**: The path segment that identifies a short link (the portion after the product's
  domain that distinguishes one short link from another).
- **Campaign**: The marketing initiative a short link belongs to.

## Primary Users & Product Scope

The primary users are marketing teams creating and sharing campaign links. This constitution
establishes business context and the architecture constraints below. Authentication/authorization,
analytics, rate limiting, and other implementation concerns not addressed here are established in
future feature specs and plans, subject to the principles and constraints above and below.

## Architecture Constraints

The application is built with JavaScript and Node.js.

**Module separation**: The system separates two distinct capabilities into their own modules:
- **Link management** — creating and administering short links.
- **Link resolution** — redirecting visitors to a short link's destination.

A feature's design MUST place its work within the module (link management or link resolution) that
capability belongs to, rather than blurring work across both. A change that appears to need both
MUST be decomposed so each module's piece stays within its own boundary.

**Layering**: Within each module:
- Routes MUST stay thin — they parse input and delegate, and MUST NOT contain business logic.
- Behavior MUST live in services.
- Domain rules MUST stay framework-free — they MUST NOT depend on Node.js HTTP primitives, web
  frameworks, or other delivery-mechanism concerns.
- Data access MUST go through repositories — services and domain rules MUST NOT read or write
  storage directly.

**Dependencies and storage**: The application MUST avoid major external dependencies. It relies on
built-in Node.js modules and JSON file storage accessed behind the repository layer. Testing tools
are the accepted exception to the no-major-external-dependencies rule.

**Repository hygiene**: The project follows standard `.gitignore` practices for Node.js projects
(e.g., excluding `node_modules/`, log files, and local environment files from version control).

**Interface contracts**: Interface contracts MUST be captured as simple markdown tables.

**Rationale**: Separating link management from link resolution keeps the product's highest-risk
capability — resolution, per Principle III — isolated from the more frequently changing
administrative surface, so changes to one cannot accidentally destabilize the other. The
routes/services/domain/repositories layering keeps domain rules testable and portable independent
of any framework choice, and keeps storage swappable behind the repository boundary. Avoiding major
external dependencies minimizes supply-chain and upgrade risk for a system whose failure mode
(Principle III) is unrecoverable.

**Escalation**: Design questions that these constraints do not settle MUST be clarified with the
architect rather than decided unilaterally during a session.

## Engineering Practices

**Test-first workflow**: Every task list MUST begin with acceptance tests derived from the
governing specification's scenarios, sequenced ahead of the implementation tasks they support.
Implementation MUST follow a test-driven approach: for each unit of behavior, the test is written
first, observed to fail for the right reason, and only then made to pass. A task list that
contains no test suite changes is incomplete and MUST NOT be treated as ready for implementation.

**Test framework**: Jest is the mandated testing framework for this project.

**Coverage gate**: The test suite MUST maintain 100% branch coverage as a completion check. Line
coverage is tracked but is informational only and MUST NOT block completion on its own.

**Rationale**: Resolution must never fail (Principle III) and short links cannot be recalled once
published, so regressions must be caught before they reach production, not after. Sequencing
acceptance tests ahead of implementation tasks keeps every task list anchored to the spec's actual
scenarios rather than to an implementer's guess at behavior. Branch coverage is the meaningful
signal because it verifies every decision path — including the failure paths Principle IV requires
every spec to state — has been exercised; line coverage alone would miss untested branches within
covered lines.

## Quality Verification

**Post-implementation confirmation**: After implementation, every user-facing behavior MUST be
confirmed with curl commands run against the running application. This confirmation is a
completion check, not an informal step, and MUST be captured as its own explicit task in the task
list rather than assumed to happen incidentally during development.

**Rationale**: Automated tests verify units and branches in isolation; they do not prove the
assembled system behaves correctly end-to-end from a user's vantage point. Requiring curl-based
confirmation as a tracked task closes that gap and gives Principle III's guarantee — that
resolution never fails — a concrete, repeatable check against the real running system rather than
a mocked or unit-level approximation of it.

## Governance

This constitution supersedes any conflicting practice, spec, plan, or task in this repository.
Every specification produced via `/speckit-specify` MUST comply with Principle IV before moving to
`/speckit-plan`. Every plan or task that touches short link creation or resolution MUST be checked
against Principles I–III before implementation. Every task list produced via `/speckit-tasks` MUST
comply with the Engineering Practices and Quality Verification sections before implementation
begins.

**Amendment procedure**: Amendments are made by editing this file directly or via
`/speckit-constitution`. Any amendment MUST update the Sync Impact Report at the top of this file
and MUST bump the version per the policy below.

**Versioning policy**: This constitution follows semantic versioning.
- **MAJOR**: Backward-incompatible removal or redefinition of a principle or governance rule.
- **MINOR**: A new principle or section is added, or existing guidance is materially expanded.
- **PATCH**: Clarifications, wording fixes, or non-semantic refinements.

**Compliance review**: Every spec, plan, and task set MUST be checked against this constitution
before implementation begins. Any deviation MUST be justified in writing in the relevant artifact
or the work MUST be revised to comply.

**Version**: 1.2.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
