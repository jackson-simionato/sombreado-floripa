# 04 - Mocked Frontend Prototype Roadmap

## Goal

Build the v1 onboard UX as a runnable root-level Next.js prototype with mocked data before connecting the real API or Mapbox.

This plan is intentionally split into smaller deliverables. Each child plan should be implemented and reviewed independently, in order, so the team always has a working frontend increment instead of one large all-or-nothing prototype task.

## Inputs

- `docs/brand-guide.md`
- `docs/wireframes-v1.md`
- `docs/product-decisions.md`
- `CONTEXT.md`
- Adjacent `../sombreado-service` schemas/routes as contract reference only

## Roadmap

1. `docs/plans/04a-app-scaffold-and-design-foundation.md`
   - Create the root-level Next.js app, test setup, brand tokens, app shell, sticky action pattern, centralized copy module, and first screen.
2. `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
   - Add service-shaped mock API functions, typed fixtures, adapters, and explicit frontend flow state.
3. `docs/plans/04c-route-selection-direction-confirmation.md`
   - Build the mocked location/manual search path through route selection, direction choice, and route confirmation.
4. `docs/plans/04d-advice-results-and-bus-diagrams.md`
   - Build computing, onboard result, preview result, neutral, withheld, and bus diagram presentation.
5. `docs/plans/04e-edge-states-and-scenario-switcher.md`
   - Add empty/error/recovery/fallback states and a prototype-only scenario switcher for QA.
6. `docs/plans/04f-test-hardening-and-prototype-readiness.md`
   - Complete focused integration coverage and final prototype readiness checks.

## Scope Guardrails

- Keep implementation frontend-only. Do not add backend routes, scraper behavior, advisory computation, or route-data processing to this repo.
- Scaffold the app at the repository root. Do not create a nested `frontend/` folder.
- Use one public route, `/`, with structured internal flow state and screen modules.
- Use npm with Next.js, React, TypeScript, Vitest, React Testing Library, and jsdom.
- Use lightweight CSS with brand tokens from `docs/brand-guide.md`. Do not add a component library for this prototype.
- Do not call real browser geolocation by default.
- Do not require `NEXT_PUBLIC_API_URL`, Mapbox, or a running `sombreado-service`.
- Do not install or initialize Mapbox in Plan 04. Plan 06 owns the real Mapbox confirmation map.
- Preserve route-level selection before direction choice for both nearby and manual paths.
- Do not keep or reintroduce a separate `Preview With Warning` screen. Off-route preview goes directly to a clearly labeled preview result.

## Target App Boundaries

Use a root-level app structure similar to:

```text
app/
  layout.tsx
  page.tsx
  globals.css
src/
  components/
  content/copy.ts
  domain/adapters.ts
  domain/types.ts
  fixtures/
  flow/
  mock-api/
  screens/
tests/
```

Exact file names may change during implementation, but preserve these responsibilities:

- screen components for rider-facing states
- flow state and reducer/transition logic
- service-shaped mock API functions
- fixture data
- adapters between service-shaped payloads and product screen states
- centralized Brazilian Portuguese copy
- reusable route cards, direction rows, sticky actions, map placeholder, and bus diagrams

## Final Deliverable

- A runnable root-level frontend prototype using mocked API fixtures.
- `npm install`, `npm run dev`, and `npm test` work from the repository root.
- The core flow is usable on a small mobile viewport.
- Wider desktop viewports keep the mobile app column usable and centered; no separate desktop design is required.
- Route selection, direction choice, confirmation, onboard result, preview result, neutral result, withheld, and edge states are reachable with mocked fixtures.
- A scenario switcher makes every required state reachable without editing code.
- Tests cover the main states without depending on live services.
- The prototype does not call live services, real geolocation, or Mapbox.

## Integration Notes For Plan 05

- The prototype uses route-level nearby selection to preserve the product flow. If `sombreado-service` exposes direction-level nearby candidates, the integration should not preselect direction without a rider choice.
- The current service advisory response distinguishes `advisory` and `withheld`, but the UI needs an explicit way to distinguish onboard advice from off-route preview advice. Plan 05 should either add a service signal or document the frontend inference.
- Preview advice must use an automatic estimated point on or near the route. Do not ask riders to choose a stop, segment, or map point.
- Mapbox integration remains deferred to Plan 06.
