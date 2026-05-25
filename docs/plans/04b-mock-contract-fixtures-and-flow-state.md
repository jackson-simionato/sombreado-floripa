# 04b - Mock Contract, Fixtures, and Flow State

## Goal

Add the typed mocked data layer and explicit frontend flow model that the rest of the prototype will use.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- Adjacent `../sombreado-service` schemas/routes as contract reference only
- `docs/wireframes-v1.md`
- `CONTEXT.md`

## Work

- Add domain types for route candidates, direction choices, geometry, advisory responses, UI advice states, retry targets, and screen state names.
- Implement a UI-level advice mode union for:
  - onboard result
  - off-route preview result
  - withheld result
  - neutral computed result for `overhead` and `none`
- Add service-shaped mock API functions aligned with `sombreado-service` names and payloads where possible:

  ```ts
  listRoutes({ query, lat, lng, radiusMeters, limit }): Promise<RoutesResponse>
  getRouteDirections(routeId): Promise<RouteDirectionsResponse>
  getRouteGeometry(routeDirectionId, routeVersionId): Promise<RouteGeometryResponse>
  createOnboardAdvisory(request): Promise<OnboardAdvisoryResponse>
  ```

- Add adapters where rider-facing product state differs from service-shaped payloads:

  ```ts
  toRouteCandidates(routesResponse): RouteCandidate[]
  toDirectionChoices(routeDirectionsResponse): DirectionChoice[]
  toUiAdvice(advisoryResponse, context): UiAdviceState
  ```

- Add curated fixtures with realistic local labels and explicit edge cases:
  - at least two normal routes with direction choices
  - route with no directions
  - route with geometry for the placeholder map
  - route with missing geometry for confirmation fallback
  - advisory fixtures for `left`, `right`, `front`, `back`, `overhead`, `none`
  - off-route preview result
  - true withheld result
  - API error, slow loading, no nearby candidates, denied location, and no manual results
- Keep nearby lookup route-level, using `/v1/routes`-shaped fixtures. Direction-level information may appear as supporting metadata only; selecting a route must still lead to direction choice.
- Implement explicit frontend flow state with a reducer or equivalent transition module.
- Preserve selected route, selected direction, advice mode, retry target, and error context where relevant.
- Add unit tests for adapters, fixture selection, and key reducer transitions.

## Deliverable

- A typed mock contract, fixture matrix, adapters, and flow state module ready for UI integration.

## Acceptance Criteria

- Mock functions are asynchronous and do not call live services.
- Flow state names align with `docs/wireframes-v1.md`.
- Route selection always happens before direction choice.
- `overhead` and `none` map to neutral computed UI states, not true withheld states.
- Off-route preview maps directly to a preview result state, not a separate warning step.
- Adapter and flow tests cover normal, empty, error, preview, neutral, and withheld cases.

## Verification

- Run `npm test`.
- Run a targeted search to confirm no live service URL or Mapbox dependency was introduced.
