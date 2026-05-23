# 05 - API Integration

## Goal

Connect the mocked frontend flow to `sombreado-service` through browser-direct API calls.

## Inputs

- Mocked frontend prototype
- `sombreado-service` public endpoint schemas
- `NEXT_PUBLIC_API_URL`

## Work

- Verify or adapt the `sombreado-service` contract for route-only nearby candidates, manual route search, selected-route directions, route geometry, onboard advisories, and preview/off-route responses.
- If required endpoints or response semantics are missing, document the needed `sombreado-service` changes instead of implementing backend behavior in this frontend repo.
- Add typed frontend models for route candidates, direction choices, route geometry, onboard advisories, preview advisories, and true withheld responses.
- Call the nearby-route endpoint after rider location is available.
- Call the manual route search endpoint when the rider searches by route.
- Call the selected-route directions endpoint before route confirmation.
- Call the advisory endpoint after the rider confirms a selected route and direction.
- Preserve fixture-based tests by mocking the API client.
- Map backend advisory directions into rider-facing seat-side recommendations.
- Render preview-with-warning and true withheld responses with clear, helpful copy.

## Deliverable

- Frontend flow connected to the real advisory backend.

## Acceptance Criteria

- The app works against a local `sombreado-service` instance via `NEXT_PUBLIC_API_URL`.
- Loading, empty, route-without-directions, error, preview-with-warning, and true withheld states are visible and understandable.
- The UI does not expose backend debug language directly to riders.
