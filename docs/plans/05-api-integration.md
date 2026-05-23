# 05 - API Integration

## Goal

Connect the mocked frontend flow to `sombreado-service` through browser-direct API calls.

## Inputs

- Mocked frontend prototype
- `sombreado-service` public endpoint schemas
- `NEXT_PUBLIC_API_URL`

## Work

- Add typed frontend models for route candidates, route geometry, and onboard advisories.
- Call `GET /v1/nearby-route-directions` after rider location is available.
- Call `POST /v1/onboard-advisories` after the rider selects a route direction.
- Preserve fixture-based tests by mocking the API client.
- Map backend advisory directions into rider-facing seat-side recommendations.
- Render withheld responses with clear, helpful copy.

## Deliverable

- Frontend flow connected to the real advisory backend.

## Acceptance Criteria

- The app works against a local `sombreado-service` instance via `NEXT_PUBLIC_API_URL`.
- Loading, empty, error, and withheld states are visible and understandable.
- The UI does not expose backend debug language directly to riders.
