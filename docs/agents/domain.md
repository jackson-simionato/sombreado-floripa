# Domain Docs

How engineering skills should consume this repo's domain documentation.

## Layout

This is a single-context frontend repo.

Before domain-sensitive work, read:

- `CONTEXT.md` for canonical domain terms and relationship rules.
- `docs/adr/0003-one-job-evolution-rule.md` for the Advice Triple evolution filter.
- `docs/product-decisions.md` for current product decisions.
- `docs/wireframes-v1.md` for the v1 screen-state contract.
- `docs/brand-guide.md` for UI, copy, and visual direction.
- Relevant records under `docs/adr/`.

If a file or directory does not exist, proceed silently. Domain-modeling workflows create missing documentation lazily when decisions are made.

## Vocabulary Rules

Use the glossary's terms when naming issues, plans, tests, and implementation concepts. Important terms include:

- **Sombreado Floripa**
- **Rider**
- **Advice Triple**
- **Onboard Flow**
- **Sun-side Advice**
- **Seat-area Recommendation**
- **Route Candidate**
- **Direction Choice**
- **Route Confirmation Map**
- **Route Preview**
- **Geometric Estimate Notice**

Avoid terms that `CONTEXT.md` explicitly rejects, especially backend, scraper, timetable planning, guaranteed shade, route detail, raw shape IDs, and map-led navigation when describing frontend product work.

If a needed concept is absent from the glossary, reconsider the terminology or note the gap for domain modeling.

## Boundary Rules

This repo is frontend-only. Skills should not propose backend implementation, scraper ingestion, route-data processing, advisory computation, API server routes, database migrations, or a nested `frontend/` app folder here.

When work needs backend behavior, document it as a `sombreado-service` dependency or issue instead of implementing it in this repo.

## ADR Conflicts

If an output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
