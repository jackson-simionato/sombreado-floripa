# 03 - Clean Frontend Branch and Repo Cleanup

## Goal

Prepare `sombreado-floripa` as a clean frontend-only repo before implementing the app.

## Inputs

- Current `develop` branch
- `docs/product-decisions.md`
- `CONTEXT.md`
- `docs/wireframes-v1.md`

## Work

- Start `feature/clean-frontend-repo` from `develop`.
- Keep this cleanup documentation-only. Do not scaffold the frontend app in this step.
- Keep existing unrelated work out of the frontend rewrite branch.
- Do not restore deleted backend, scraper, GTFS, or historical transit-data experiments. If concrete stale files appear again, delete or archive them outside the frontend implementation path.
- Remove stale ignore rules or repo hints that imply a nested `frontend/` app folder. Future frontend implementation should live at the repository root.
- Create or update README and agent guidance so they describe:
  - frontend-only responsibility
  - browser-direct calls to `sombreado-service`
  - current v1 flow and setup expectations
- Keep `CONTEXT.md` as the canonical domain glossary and have agent guidance point to it instead of duplicating it.
- Keep `NEXT_PUBLIC_API_URL` as the intended public API base URL convention, without adding runnable setup commands before the app is scaffolded.
- Keep docs created in the earlier planning steps.

## Deliverable

- A clean frontend branch ready for implementation.

## Acceptance Criteria

- The repo no longer points new contributors toward the old `GET /shade-side` backend shape.
- The README explains the frontend role without implying scraper or API ownership.
- `AGENTS.md` gives future agents the frontend-only repo boundary and points to canonical product docs.
- `.gitignore` no longer ignores a top-level `frontend/` directory.
- Future app structure is documented as root-level rather than nested under `frontend/`.
- The branch contains no unrelated local backend or historical transit-data experiments.

## Verification

- Run a targeted search for stale backend or experiment references:

  ```bash
  rg "GET /shade-side|shade-side|scraper|GTFS|backend|frontend/" README.md AGENTS.md CONTEXT.md docs .gitignore
  ```

- Confirm remaining matches, if any, are intentional boundary statements or references inside this cleanup plan.
