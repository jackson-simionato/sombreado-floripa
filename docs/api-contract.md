# Frontend API Contract

This document defines the browser-facing API contract that Sombreado Floripa needs from `sombreado-service`. The frontend owns this contract from the rider-flow perspective. If the backend does not currently expose one of these shapes or semantics, treat that as a backend contract gap rather than implementing backend behavior in this repository.

`NEXT_PUBLIC_API_URL` is the public API base URL including the version prefix, for example `http://localhost:8000/v1`.

## Contract Principles

- The frontend calls public browser-safe endpoints directly from the browser.
- V1 endpoints do not require auth, sessions, cookies, or frontend-held private secrets.
- Requests should use `credentials: "omit"`.
- Backend CORS must allow the deployed frontend origins and local development origin.
- JSON fields use camelCase in this browser-facing contract.
- IDs are opaque strings. The backend may use UUIDs internally, but frontend validation should not require UUID format.
- Backend responses contain typed values and stable reason/error codes, not rider-facing Portuguese copy.
- The frontend owns copy, brand tone, accessibility text, and route-flow presentation.
- Route discovery returns only current route data. The frontend carries `routeVersionId` as an opaque consistency token after selection.
- Stale route versions are API errors, not withheld advice.
- Route preview advice is route-based, not distance-gated by the rider's current location.

## Endpoints

### Nearby Route Candidates

```http
GET /route-candidates/nearby?lat={lat}&lng={lng}&radiusMeters={meters}&limit={limit}
```

Use after the rider taps location and the browser returns a usable location.

Frontend defaults:

- `radiusMeters: 1200`
- `limit: 5`

Response order is meaningful. The backend should sort by nearby relevance, usually distance first. The frontend may defensively sort when distances are present, but should not rely on sorting to repair an arbitrary response.

```ts
type RouteCandidate = {
  routeId: string;
  routeVersionId: string;
  routeCode: string;
  routeName: string;
  distanceMeters?: number;
  directionHints?: string[];
};

type RouteCandidatesResponse = {
  routes: RouteCandidate[];
};
```

Example:

```json
{
  "routes": [
    {
      "routeId": "route-124",
      "routeVersionId": "route-124-current",
      "routeCode": "124",
      "routeName": "TICEN - Lagoa",
      "distanceMeters": 320,
      "directionHints": ["TICEN", "Lagoa", "UFSC", "Trindade"]
    }
  ]
}
```

### Manual Route Search

```http
GET /route-candidates/search?query={query}&limit={limit}
```

Use for the secondary manual path. Manual search returns the same route-candidate shape as nearby lookup, but usually without `distanceMeters`.

Frontend default:

- `limit: 8`

Response order is backend-owned search relevance. The frontend preserves returned order.

```json
{
  "routes": [
    {
      "routeId": "route-330",
      "routeVersionId": "route-330-current",
      "routeCode": "330",
      "routeName": "TILAG - Centro",
      "directionHints": ["TILAG", "Centro"]
    }
  ]
}
```

### Direction Choices

```http
GET /routes/{routeId}/directions?routeVersionId={routeVersionId}
```

Use after a route candidate is selected. Direction choices are authoritative and selectable. Route candidates may include display hints, but they must not include selectable direction IDs.

Return `200 { "directions": [] }` when the current route exists but has no usable direction choices. That drives the `Route Without Directions` product state. Use an API error only for stale versions, invalid IDs, or request/backend failures.

```ts
type DirectionChoice = {
  routeDirectionId: string;
  sequence: number;
  name: string;
  departureLabels: string[];
};

type DirectionChoicesResponse = {
  directions: DirectionChoice[];
};
```

Example:

```json
{
  "directions": [
    {
      "routeDirectionId": "direction-124-outbound",
      "sequence": 1,
      "name": "TICEN para Lagoa",
      "departureLabels": ["TICEN", "UFSC", "Trindade"]
    },
    {
      "routeDirectionId": "direction-124-inbound",
      "sequence": 2,
      "name": "Lagoa para TICEN",
      "departureLabels": ["Lagoa", "TICEN"]
    }
  ]
}
```

### Route Geometry

```http
GET /routes/{routeId}/directions/{routeDirectionId}/geometry?routeVersionId={routeVersionId}
```

Use before confirmation to support the compact route confirmation map. Geometry is a confirmation aid, not the frontend source of advice computation.

Missing route geometry should return a successful empty polyline or a typed non-fatal response that the frontend can map to `Route Confirmation Fallback`. Network/server failures should be API errors because retry may fix them.

```ts
type LatLng = {
  lat: number;
  lng: number;
};

type RouteGeometryResponse = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  polyline: LatLng[];
};
```

Example:

```json
{
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "polyline": [
    { "lat": -27.5969, "lng": -48.5488 },
    { "lat": -27.5961, "lng": -48.5363 }
  ]
}
```

### Advice

```http
POST /advice
```

Use after the rider confirms a selected route and direction. Use the same endpoint for onboard advice and route preview advice. The request states the advice product explicitly.

```ts
type AdviceMode = "onboard" | "preview";
type AdviceHorizon = "upcoming" | "remainingRoute";

type AdviceLocation = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  observedAt: string;
};

type AdviceRequest = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  mode: AdviceMode;
  horizon: AdviceHorizon;
  observedAt: string;
  location?: AdviceLocation;
  fallbackToPreview?: boolean;
};
```

Frontend defaults:

- Use `mode: "onboard"` and `horizon: "upcoming"` when a live or fresh location is available.
- Use `mode: "preview"` and `horizon: "remainingRoute"` when location is denied, unavailable, paused, stale, or the rider is using manual route exploration without live location.
- For v1 route confirmation, onboard requests should send `fallbackToPreview: true`.
- Preview mode does not require a location. Backend should compute preview from a deterministic route anchor, defaulting to the selected direction start.
- Preview should not be withheld merely because the rider is far from Florianopolis.
- Onboard requests include browser accuracy metadata when available.

Example onboard request:

```json
{
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "mode": "onboard",
  "horizon": "upcoming",
  "observedAt": "2026-05-31T15:00:00.000Z",
  "fallbackToPreview": true,
  "location": {
    "lat": -27.5969,
    "lng": -48.5488,
    "accuracyMeters": 42,
    "observedAt": "2026-05-31T14:59:58.000Z"
  }
}
```

Example preview request:

```json
{
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "mode": "preview",
  "horizon": "remainingRoute",
  "observedAt": "2026-05-31T15:00:00.000Z"
}
```

## Advice Responses

```ts
type DirectSunExposure = "left" | "right" | "front" | "back" | "overhead" | "none";
type RecommendedSeatArea = "left" | "right" | "front" | "back" | "neutral";
type SunCondition = "daylight" | "night" | "lowSun" | "overhead";

type AdvicePosition = {
  lat: number;
  lng: number;
  source: "liveLocation" | "directionStart";
  distanceFromRouteMeters?: number;
};

type AdviceSuccess = {
  status: "advice";
  mode: "onboard" | "preview";
  horizon: "upcoming" | "remainingRoute";
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  directSunExposure: DirectSunExposure;
  recommendedSeatArea: RecommendedSeatArea;
  sunCondition: SunCondition;
  computedAt: string;
  position?: AdvicePosition;
};

type WithheldReasonCode =
  | "missingRouteGeometry"
  | "insufficientSunSignal"
  | "unsupportedDirection"
  | "noAdviceForSelectedHorizon"
  | "locationOffRoute";

type AdviceWithheld = {
  status: "withheld";
  mode: "onboard" | "preview" | "unavailable";
  horizon?: "upcoming" | "remainingRoute";
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  reasonCode: WithheldReasonCode;
  computedAt: string;
};

type AdviceResponse = AdviceSuccess | AdviceWithheld;
```

The backend returns `recommendedSeatArea` directly. The frontend should not derive the primary recommendation by inverting `directSunExposure`, although it may validate enum shape at the API boundary.

`front` and `back` are valid recommendation areas. Use `neutral` for successful computations where no seating area meaningfully improves direct-sun exposure.

Nighttime is successful neutral advice, not withheld:

```json
{
  "status": "advice",
  "mode": "onboard",
  "horizon": "upcoming",
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "directSunExposure": "none",
  "recommendedSeatArea": "neutral",
  "sunCondition": "night",
  "computedAt": "2026-05-31T23:00:00.000Z",
  "position": {
    "lat": -27.5969,
    "lng": -48.5488,
    "source": "liveLocation",
    "distanceFromRouteMeters": 8
  }
}
```

Example preview advice:

```json
{
  "status": "advice",
  "mode": "preview",
  "horizon": "remainingRoute",
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "directSunExposure": "left",
  "recommendedSeatArea": "right",
  "sunCondition": "daylight",
  "computedAt": "2026-05-31T15:00:00.000Z",
  "position": {
    "lat": -27.5969,
    "lng": -48.5488,
    "source": "directionStart"
  }
}
```

Example withheld response:

```json
{
  "status": "withheld",
  "mode": "preview",
  "horizon": "remainingRoute",
  "routeId": "route-124",
  "routeVersionId": "route-124-current",
  "routeDirectionId": "direction-124-outbound",
  "reasonCode": "missingRouteGeometry",
  "computedAt": "2026-05-31T15:00:00.000Z"
}
```

## Error Envelope

All non-2xx API errors should use the same envelope:

```ts
type ApiError = {
  error: {
    code: string;
    message?: string;
    requestId?: string;
  };
};
```

The frontend uses `code` for behavior. It never renders `message` directly to riders.

Frontend-actionable v1 codes:

- `routeVersionStale`
- `routeNotFound`
- `routeDirectionNotFound`
- `validationFailed`
- `serviceUnavailable`

Unknown error codes map to generic API error copy.

Stale route version example:

```http
409 Conflict
```

```json
{
  "error": {
    "code": "routeVersionStale",
    "message": "Selected route version is no longer current.",
    "requestId": "req_123"
  }
}
```

## Location Freshness

The app should not silently use old browser locations for onboard advice.

Definitions:

- Fresh location: a current one-shot result or an active watch result with acceptable timestamp and accuracy.
- Recent fallback location: the last acceptable location fix, used only when refreshing location fails and the app can clearly tell the rider that the advice is based on the last known location.
- Stale location: an old stored location, a paused watch result, an inaccurate fix, or a fix from before a route/direction change where the rider has not re-confirmed live location.

Initial frontend thresholds:

- `accuracyMeters <= 100`
- Fresh location: observed no more than 30 seconds ago.
- Recent fallback location: observed no more than 2 minutes ago.

Plan 05 should define this as a named frontend constant so real-device QA can tune it.

## Live Location Updates

V1 should support live location updates on the advice result screen:

- Use `navigator.geolocation.watchPosition()` after route confirmation for live onboard advice.
- Do not start live watching merely because the rider used location for nearby route discovery.
- Make live updating visible and controllable on the result screen.
- Stop watching when the rider leaves the advice flow or taps a pause/stop control.
- Automatically recompute advice while the result screen is open, throttled by time or meaningful movement.
- Keep `Atualizar localização` as a manual fallback.
- If a background refresh fails, keep the last successful advice visible and show a non-blocking update failure.
- Use full API error state only when the initial advice request fails before any advice exists.

## Backend Contract Gaps

These are required by the frontend contract and may not exist in current `sombreado-service`:

- Browser-facing camelCase contract fields.
- Desired route-candidate paths:
  - `GET /route-candidates/nearby`
  - `GET /route-candidates/search`
- Direction lookup that validates `routeVersionId`.
- Geometry path that returns a frontend-ready `{ lat, lng }` polyline.
- `POST /advice` with `mode`, `horizon`, `observedAt`, optional location accuracy, and `fallbackToPreview`.
- Preview advice from selected direction start, without rider-distance gating.
- Successful neutral night advice with `sunCondition: "night"`.
- Backend-provided `recommendedSeatArea`.
- `status: "advice"` terminology for successful advice responses.
- Stable non-2xx error envelope and `409 routeVersionStale`.
- Public browser-safe CORS behavior for frontend origins.
