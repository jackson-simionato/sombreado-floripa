# 06 - Mapbox Route Preview

## Goal

Add a lazy-loaded Mapbox route confirmation map after route selection.

## Inputs

- API-integrated frontend
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- Route segment geometry from `sombreado-service`

## Work

- Create an isolated Mapbox route preview component.
- Load Mapbox only when the rider reaches route confirmation.
- Render the selected route line, rider location, and direction cue.
- Handle missing token, failed map load, and missing geometry gracefully.
- Keep map styling aligned with the brand guide.

## Deliverable

- Compact Mapbox route confirmation inside the onboard flow.

## Acceptance Criteria

- The map does not initialize on the first screen.
- A route line and rider marker are visible when geometry exists.
- The app remains usable if Mapbox fails or no token is configured.
- Mapbox-specific code is contained enough to swap providers later.
