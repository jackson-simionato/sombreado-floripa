# 03 - Clean Frontend Branch and Repo Cleanup

## Goal

Prepare `sombreado-floripa` as a clean frontend-only repo before implementing the app.

## Inputs

- Current `main` branch
- `docs/product-decisions.md`

## Work

- Start the implementation branch from `main`.
- Keep existing unrelated work out of the frontend rewrite branch.
- Remove or archive stale in-repo backend assumptions.
- Update README and agent guidance so they describe:
  - frontend-only responsibility
  - browser-direct calls to `sombreado-service`
  - current v1 flow and setup expectations
- Keep docs created in the earlier planning steps.

## Deliverable

- A clean frontend branch ready for implementation.

## Acceptance Criteria

- The repo no longer points new contributors toward the old `GET /shade-side` backend shape.
- The README explains the frontend role without implying scraper or API ownership.
- The branch contains no unrelated local backend or historical transit-data experiments.
