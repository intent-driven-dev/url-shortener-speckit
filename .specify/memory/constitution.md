<!--
Sync Impact Report
Version change: [none, template scaffold] → 1.0.0
Modified principles: n/a (initial ratification)
Added sections:
  - Core Principles: I. Valid Destinations Only
  - Core Principles: II. No Chained or Looping Resolution (NON-NEGOTIABLE)
  - Core Principles: III. Resolution Must Never Fail (NON-NEGOTIABLE)
  - Core Principles: IV. Every Specification States Audience, Failure Path, and Scope
  - Domain Vocabulary (glossary of short link, shortened URL, destination, original URL, alias, campaign)
  - Primary Users & Product Scope
  - Governance
Removed sections: none
Deferred / TODO placeholders: RATIFICATION_DATE set to today's date (2026-08-12) as the
  date of initial adoption — confirm with the user if an earlier informal adoption date
  should be used instead.
Templates checked for alignment:
  - .specify/templates/spec-template.md — not present/not modified in this pass; when
    present, verify it requires "who it serves," failure-path behavior + user-facing
    message, and an explicit out-of-scope section per Principle IV.
  - .specify/templates/plan-template.md — not modified; no technical/architecture
    principles were established in this pass (business context only), so no
    plan-template gates depend on this amendment yet.
  - .specify/templates/tasks-template.md — not modified; no changes required.
Follow-up TODOs: none beyond the ratification-date confirmation above.
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
establishes business context only: the validity, resolution-integrity, and specification
requirements above. Technical architecture, authentication/authorization, analytics, rate
limiting, and other implementation concerns are explicitly out of scope for this document and are
established in future feature specs and plans, subject to the principles above.

## Governance

This constitution supersedes any conflicting practice, spec, plan, or task in this repository.
Every specification produced via `/speckit-specify` MUST comply with Principle IV before moving to
`/speckit-plan`. Every plan or task that touches short link creation or resolution MUST be checked
against Principles I–III before implementation.

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

**Version**: 1.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
