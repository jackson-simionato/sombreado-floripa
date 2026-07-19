# 04f Prototype Readiness

Date: 2026-05-30

## Runtime

- `/` remains the mocked prototype runtime for 04f.
- The scenario switcher is visible by default on `/` for prototype QA coverage.
- Recommendation for Plan 05: remove the switcher from product runtime or gate it behind a prototype/dev-only condition before API-integrated release readiness.

## Commands Run

```bash
npm test
npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
rg "NEXT_PUBLIC_API_URL|mapbox|Mapbox|navigator.geolocation|GET /shade-side|scraper|GTFS" app src tests docs/plans/04*.md
```

## Automated Coverage Summary

- Default location screen renders without requiring a browser geolocation mock and does not call `navigator.geolocation` before rider action.
- Nearby and manual flows are covered through route selection, direction choice, confirmation, fallback confirmation, and result states.
- Contractual headings and primary/fallback action labels are asserted for core edge states.
- `front`, `back`, `overhead`, and `none` advice variants are covered without left/right recommendation leakage.
- The scenario switcher reaches every mocked prototype entry from `/`.
- Route cards, direction rows, schematic route map, and advice diagrams expose accessible labels or text equivalents.
- Onboard and preview advice remain text-distinct without relying on color alone.

## Accessibility Audit

- Automated DOM semantics checked:
  - route cards and direction rows render as buttons with accessible names
  - bus diagrams and the schematic route map expose accessible text equivalents
  - onboard and preview advice are text-distinct
- Manual visual audit status:
  - visible focus states: blocked for this session
  - no color-only distinction: blocked for this session
  - reduced-motion behavior: CSS hook exists in `app/globals.css`; manual motion audit blocked for this session
  - sticky actions focus/coverage behavior: blocked for this session

## Mobile QA

- Target viewport: around 360px wide
- Status: blocked in this session
- Reason: I could not run a manual browser audit from this environment, so the required 360px mobile pass is still outstanding.
- Consequence: 04f is not fully complete until manual mobile QA is executed and recorded.

## Scenario Switcher Coverage

- Automated reachability confirmed for every scenario-switcher entry once through the home route.
- Manual inspection of every entry at mobile width: blocked pending browser QA.

## Deferred-Scope Search

Command:

```bash
rg "NEXT_PUBLIC_API_URL|mapbox|Mapbox|navigator.geolocation|GET /shade-side|scraper|GTFS" app src tests docs/plans/04*.md
```

Result:

- Matches are limited to plan documentation plus the new test assertion that `navigator.geolocation` is not called before rider action.
- No live service wiring, Mapbox package/init, backend behavior, scraper code, or GTFS processing was introduced in runtime code.

## Plan 05 Contract Gaps

- None found.

## Known Blockers

- Manual QA at approximately 360px width still needs to verify:
  - default flow usability
  - Portuguese copy fit and overflow
  - sticky action reachability
  - result-screen prominence
  - visible focus states
  - reduced-motion behavior
  - no color-only sun/shade distinction
  - every scenario-switcher entry once
