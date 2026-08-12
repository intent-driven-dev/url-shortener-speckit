# Feature Specification: Create Short Link

**Feature Branch**: `001-create-short-link`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Help me specify the first slice of the URL shortener: a marketing user submits a destination and receives a short link on our domain, and visiting the short link reaches the destination."

## Clarifications

### Session 2026-08-12

- Q: Should this first slice include any abuse-prevention for the submission endpoint (e.g. rate limiting), or is that explicitly out of scope? → A: Out of scope for this slice — no rate limiting; revisit as a separate future feature.
- Q: What character set and length should the system-generated alias use? → A: Alphanumeric (a-z, A-Z, 0-9), fixed length of 6-8 characters.
- Q: Does this slice need to support a specific expected scale (short links / traffic)? → A: No explicit target — assume low-volume/single-team usage (dozens to low hundreds of links); revisit if traffic grows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit a destination and receive a short link (Priority: P1)

A marketing user has a destination URL (e.g. a campaign landing page) and wants a short link on
the product's domain that they can put into campaign material.

**Who it serves**: Marketing users creating campaign links. No login is required in this slice —
anyone with access to the tool can submit a destination.

**Failure-path behavior**: If the destination fails validation (not a well-formed http/https URL,
unreachable, or is itself a short link already issued by this system), no short link is created
and the marketing user sees the message: *"We couldn't create a short link: the destination
[reason]. Please check the URL and try again."* — where `[reason]` is one of "isn't a valid web
address," "couldn't be reached," or "is already a short link, not a destination."

**Out of scope**: Choosing a custom alias, editing or deleting a short link after creation,
authentication/authorization, campaign grouping or tagging, click analytics, and abuse prevention
(e.g. rate limiting the submission endpoint) are all out of scope for this slice.

**Independent Test**: Can be fully tested by submitting a valid, reachable destination URL and
confirming a short link on the product's domain is returned, without needing any other capability
to exist first.

**Acceptance Scenarios**:

1. **Given** a marketing user has a valid, reachable destination URL, **When** they submit it,
   **Then** they receive a short link on the product's domain with a system-generated alias.
2. **Given** a marketing user submits text that is not a well-formed http/https URL, **When** they
   submit it, **Then** no short link is created and they see the "isn't a valid web address"
   failure message.
3. **Given** a marketing user submits a syntactically valid URL that does not respond, **When**
   they submit it, **Then** no short link is created and they see the "couldn't be reached"
   failure message.
4. **Given** a marketing user submits a URL that is itself a short link already issued by this
   system, **When** they submit it, **Then** no short link is created and they see the "is already
   a short link" failure message.
5. **Given** a marketing user submits the same destination twice, **When** each submission
   succeeds, **Then** each submission receives its own distinct short link.

---

### User Story 2 - Visiting a short link reaches the destination (Priority: P1)

Anyone who clicks or enters a short link on the product's domain is taken to the destination it
was created for.

**Who it serves**: Visitors following a short link from campaign material — the general public,
not just marketing users. This story is independently valuable once at least one short link
exists (e.g. from User Story 1), and delivers the other half of this slice's core value.

**Failure-path behavior**: If the requested alias does not correspond to any short link this
system has issued, the visitor sees a "link not found" page with the message: *"This link doesn't
exist or is no longer valid."* No redirect occurs. A short link that was successfully issued MUST
always keep resolving to its destination — nothing in this slice provides a way to remove,
disable, or expire an already-issued short link.

**Out of scope**: Custom 404/branding pages, redirect analytics, and any form of link
deactivation or expiration are out of scope for this slice.

**Independent Test**: Can be fully tested by visiting a known-good short link and confirming the
browser reaches the destination, and by visiting an unknown alias and confirming the "link not
found" message appears instead of a broken redirect.

**Acceptance Scenarios**:

1. **Given** a short link that was successfully issued, **When** a visitor requests it, **Then**
   they are redirected to the exact destination it was created for, in a single hop.
2. **Given** an alias that does not correspond to any issued short link, **When** a visitor
   requests it, **Then** they see the "link not found" message and are not redirected anywhere.

---

### Edge Cases

- What happens when the destination URL is extremely long or contains unusual characters/encoding?
  It is still accepted as long as it is a well-formed, reachable http/https URL.
- What happens when the reachability check times out rather than returning an explicit error? It
  is treated the same as "couldn't be reached" — no short link is created.
- What happens when a destination becomes unreachable *after* its short link was already issued?
  Per Principle III, the short link must keep resolving regardless — this slice never re-checks
  destination reachability after creation.
- What happens when a visitor requests a short link with extra path segments or query parameters
  appended beyond the alias? Out of scope for this slice; only exact alias matches resolve.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any marketing user, without requiring login, to submit a
  destination and request a short link.
- **FR-002**: System MUST reject a submitted destination that is not a well-formed http/https URL,
  and MUST NOT create a short link for it.
- **FR-003**: System MUST verify the submitted destination is reachable before issuing a short
  link, and MUST reject the submission (no short link created) if it is not.
- **FR-004**: System MUST reject a submitted destination that is itself a short link already
  issued by this system, and MUST NOT create a short link for it.
- **FR-005**: System MUST generate a unique, system-generated alias for every accepted
  destination, using alphanumeric characters (a-z, A-Z, 0-9) at a fixed length of 6-8 characters;
  this slice does not support user-chosen aliases.
- **FR-006**: System MUST return the complete short link (product domain + alias) to the marketing
  user immediately upon successful creation.
- **FR-007**: System MUST allow a destination to be submitted more than once, issuing a separate,
  independent short link for each successful submission.
- **FR-008**: System MUST redirect a visitor requesting a valid, previously issued short link to
  its destination in exactly one hop.
- **FR-009**: System MUST continue resolving every previously issued short link indefinitely;
  nothing in this slice may remove, disable, or expire an issued short link.
- **FR-010**: System MUST show a "link not found" message, with no redirect, when a visitor
  requests an alias that does not correspond to any issued short link.

### Key Entities

- **Short Link**: A system-generated alias (alphanumeric, a-z/A-Z/0-9, fixed length of 6-8
  characters) paired with exactly one destination and the product domain. Once created, it
  resolves to that destination indefinitely.
- **Destination**: The destination URL a marketing user submits. Must be a well-formed, reachable
  http/https URL and must not itself be a short link issued by this system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A marketing user submitting a valid destination receives a working short link in
  under 5 seconds, at the low-volume/single-team usage scale this slice targets (dozens to low
  hundreds of short links).
- **SC-002**: 100% of short links successfully issued remain resolvable to their original
  destination for as long as the system operates, with no incidental breakage.
- **SC-003**: 100% of submissions with an invalid, unreachable, or already-shortened destination
  are rejected with a clear, specific reason and result in zero short links created.
- **SC-004**: A visitor clicking a valid short link reaches the destination without encountering
  any intermediate page or additional hop.
- **SC-005**: A visitor requesting an unknown alias sees a clear "link not found" message instead
  of an error page or dead redirect, every time.

## Assumptions

- No authentication or authorization is required to submit a destination or to create a short
  link in this slice; this may be revisited in a future feature.
- Aliases are always system-generated; custom/branded aliases are deferred to a later slice.
- Destination reachability is checked once, synchronously, at submission time only — this slice
  does not periodically re-validate destinations after a short link is issued, since doing so
  could conflict with the requirement that issued short links always keep resolving.
- Resubmitting the same destination is treated as a brand-new request and produces a new,
  independent short link rather than reusing an existing one.
- "Reachable" means the destination responds to a request within a reasonable timeout; the exact
  timeout and response-code thresholds are an implementation detail for the planning phase.
- This slice targets low-volume, single-team usage (dozens to low hundreds of short links); no
  specific scale/throughput target is required. Higher-scale hardening is deferred to a future
  feature if traffic grows.
