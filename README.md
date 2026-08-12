# Spec-Driven URL Shortener using SpecKit
--------------
This repository contains the companion code for the Chapter 4 Spec-Driven Coding exercise in Intent-Driven Software Engineering book.

If you want to follow the evolution of the exercise, inspect the commit history. Each iteration shows the SDD steps used and the code changes introduced in that step.

--------------

A minimal short-link service: submit a destination URL and receive a short link on the product's
domain, then have visitors redirected to that destination in a single hop.

Built as two Node.js modules — link management (create) and link resolution (redirect) — with
JSON file storage and no runtime dependencies beyond Node's built-ins. See
`specs/001-create-short-link/plan.md` for the design and `specs/001-create-short-link/contracts/api.md`
for the API contract.

## Prerequisites

- Node.js ≥20 (`node --version`)

## Install & Run

```bash
npm install   # installs Jest (dev-only); no runtime dependencies
npm start     # starts the HTTP server on PORT (default: 3000)
```

## Test

```bash
npm test      # runs the Jest suite with coverage
```

The coverage report printed after the run includes a `% Branch` column per file. The project's
completion gate requires 100% branch coverage across `src/**`; line coverage is informational
only.

## Manual Verification

See `specs/001-create-short-link/quickstart.md` for curl-based scenarios covering both short-link
creation (`POST /links`) and redirect resolution (`GET /{alias}`), including all success and
failure paths.
