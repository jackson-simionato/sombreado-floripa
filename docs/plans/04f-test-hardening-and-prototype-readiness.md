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
  - default location screen does not depend on real geolocation
  - manual search selects route, then direction, then confirmation
  - nearby route selection stays route-only before direction choice
  - route confirmation shows the normal placeholder map and fallback variant
  - onboard result renders left/right recommendation and estimate notice
  - preview result is clearly labeled as preview without a separate warning step
  - withheld, API error, no candidates, no directions, and map fallback render correct primary actions
  - `front`, `back`, `overhead`, and `none` variants do not pretend to be left/right seat recommendations
  - scenario switcher can reach required mocked states
- Audit accessibility basics:
  - route cards and direction rows use semantic button behavior
  - visible focus states
  - accessible labels for route and direction choices
  - accessible text equivalents for every bus diagram
  - no color-only sun/shade distinction
  - reduced-motion support if animation exists
  - sticky actions do not trap focus or cover content
- Audit mobile usability at small viewport width:
  - core flow is usable around 360px wide
  - Portuguese copy fits without overflow
  - sticky actions remain reachable
  - advisory result feels like the main product moment
- Confirm deferred integrations are still deferred:
  - no live service calls
  - no real geolocation call by default
  - no Mapbox package, token, or initialization
  - no backend, scraper, advisory computation, or route-data processing in this repo
- Update any Plan 05 notes if the prototype revealed a contract gap that API integration must resolve.

## Deliverable

- A tested mocked prototype ready for API integration work in Plan 05.

## Acceptance Criteria

- `npm test` passes from the repository root.
- Any scaffold type/lint/check command passes.
- Manual mobile QA finds no blocking layout overlap or unreadable copy in the required states.
- The scenario switcher reaches all required QA states.
- The prototype remains frontend-only and mocked by default.
- Any known follow-up for API integration is documented in Plan 05 or a clear implementation note.

## Verification

- Run `npm test`.
- Run the scaffold's type/lint/check command if one exists.
- Manually verify the default flow and scenario switcher on a 360px-wide viewport.
- Run targeted searches for accidental deferred-scope work:

  ```bash
  rg "NEXT_PUBLIC_API_URL|mapbox|Mapbox|navigator.geolocation|GET /shade-side|scraper|GTFS" app src tests docs/plans/04*.md
  ```

- Confirm any matches are intentional deferred-scope notes, tests asserting absence, or existing product-plan references.
