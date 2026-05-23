# 04 - Mocked Frontend Prototype

## Goal

Build the v1 onboard UX with mocked data before connecting the real API or Mapbox.

## Inputs

- `docs/brand-guide.md`
- `docs/wireframes-v1.md`
- `docs/product-decisions.md`

## Work

- Implement the mobile-first app shell.
- Implement location request and mocked geolocation states.
- Implement manual route search and nearby route-only candidate selection with fixture data.
- Implement direction choice after route selection.
- Implement selected route confirmation after direction choice with a placeholder map region.
- Implement advisory results for left, right, front, back, overhead, and none.
- Implement no-candidates, route-without-directions, loading, error, preview-with-warning, and true withheld states.
- Add focused component tests for state rendering and copy.

## Deliverable

- A runnable frontend prototype using mocked API fixtures.

## Acceptance Criteria

- The core flow is usable on a small mobile viewport.
- Portuguese copy fits without overflow.
- The advisory result feels like the main product moment.
- Route selection, direction choice, confirmation, onboard result, and preview result are all reachable with mocked fixtures.
- Tests cover the main states without depending on live services.
