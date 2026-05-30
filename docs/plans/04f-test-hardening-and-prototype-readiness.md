# 04f - Test Hardening and Prototype Readiness

## Goal

Harden the mocked prototype with focused tests and final readiness checks before Plan 05 connects the real API.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
- `docs/plans/04c-route-selection-direction-confirmation.md`
- `docs/plans/04d-advice-results-and-bus-diagrams.md`
- `docs/plans/04e-edge-states-and-scenario-switcher.md`
- `docs/brand-guide.md`
- `docs/wireframes-v1.md`

## Work

- Expand focused component/integration tests around the full mocked flow.
- Minimum test coverage:
  - default location screen renders without a geolocation mock and does not call browser geolocation before rider action
  - manual search selects route, then direction, then confirmation
  - nearby route selection stays route-only before direction choice
  - route confirmation shows the normal placeholder map and fallback variant
  - onboard result renders left/right recommendation and estimate notice
  - preview result is clearly labeled as preview without a separate warning step
  - withheld, API error, no candidates, no directions, and map fallback render correct primary actions
  - `front`, `back`, `overhead`, and `none` variants do not pretend to be left/right seat recommendations
  - scenario switcher can reach required mocked states
- Test assertion policy:
  - assert contractual headings and primary/fallback action labels exactly from `docs/wireframes-v1.md`
  - use looser semantic or regex assertions for supporting explanatory copy that may still be polished
  - use table-driven tests for required edge-state primary/fallback actions, not exhaustive navigation from every edge state
- Audit accessibility basics:
  - automate stable DOM semantics: route cards and direction rows use semantic button behavior, route and direction choices have accessible labels, every bus diagram has an accessible text equivalent, and onboard/preview advice is text-distinct
  - manually audit visual behavior: visible focus states, no color-only sun/shade distinction, reduced-motion support if animation exists, and sticky actions do not trap focus or cover content
- Audit mobile usability at small viewport width:
  - core flow is usable around 360px wide
  - Portuguese copy fits without overflow
  - sticky actions remain reachable
  - advisory result feels like the main product moment
- Treat manual mobile QA as a hard readiness gate for this plan. If it cannot be run, document the blocker instead of marking 04f complete.
- Inspect every scenario-switcher entry once during manual QA, because the switcher is itself the mocked prototype QA surface.
- Confirm deferred integrations are still deferred:
  - no live service calls
  - no real geolocation implementation yet; location stays mocked through 04f
  - no Mapbox package, token, or initialization
  - no backend, scraper, advisory computation, or route-data processing in this repo
- Keep the scenario switcher visible by default for 04f, but document its lifecycle for Plan 05: it must be removed from product runtime or gated behind a prototype/dev condition before real API integration is considered product-ready.
- Keep `/` as the mocked prototype runtime for 04f, and state that explicitly in the readiness note.
- Do not add Playwright in 04f. Browser automation is deferred to Plan 07.
- Update Plan 05 only if the prototype reveals a concrete contract gap that API integration must resolve.
- Update Plan 07 with the deferred Playwright/mobile-smoke follow-up.

## Deliverable

- A tested mocked prototype ready for API integration work in Plan 05.
- A written readiness note at `docs/qa/04f-prototype-readiness.md` recording commands run, manual QA scope, viewport, scenario-switcher coverage, deferred-scope search results, known blockers, and any Plan 05 contract gaps.

## Acceptance Criteria

- `npm test` passes from the repository root.
- Any scaffold type/lint/check command passes.
- Manual mobile QA finds no blocking layout overlap or unreadable copy in the required states.
- The scenario switcher reaches all required QA states.
- The prototype remains frontend-only and mocked by default.
- The readiness note exists and records:
  - default flow checked around a 360px viewport
  - every scenario-switcher entry inspected once
  - reduced-motion and focus-state audit outcome
  - deferred-scope search command and result
  - `/` is still the mocked prototype runtime for 04f
  - scenario switcher lifecycle recommendation for Plan 05
- Any discovered API integration contract gap is documented in Plan 05 or explicitly recorded as "none found" in the readiness note.

## Verification

- Run `npm test`.
- Run scaffold checks:

  ```bash
  npm run lint
  npm run typecheck
  ```

- Manually verify the default flow and scenario switcher on a 360px-wide viewport.
- Run targeted searches for accidental deferred-scope work:

  ```bash
  rg "NEXT_PUBLIC_API_URL|mapbox|Mapbox|navigator.geolocation|GET /shade-side|scraper|GTFS" app src tests docs/plans/04*.md
  ```

- Confirm any matches are intentional deferred-scope notes, tests asserting absence, or existing product-plan references.
