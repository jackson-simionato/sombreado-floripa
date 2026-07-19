# Route Direction Kind on Direction Choice

## Summary

Consume the new nullable `directionKind` field from Sombreado Service on the existing Direction Choices request and use it as a stable `Ida` or `Volta` cue on the "Escolha o sentido" screen.

The raw Direction Choice name and Departure Labels remain the primary fallback. The frontend never parses route names to recreate a missing kind.

## Backend Dependency

The backend must first deploy this response shape:

```ts
type DirectionChoice = {
  routeDirectionId: string;
  sequence: number;
  name: string;
  directionKind: "ida" | "volta" | null;
  departureLabels: string[];
};
```

Endpoint:

```http
GET /v1/routes/{routeId}/directions?routeVersionId={routeVersionId}
```

The field is always present. Null is valid and does not mean the direction is unavailable.

## Frontend Behavior

- Extend the Zod transport schema with `z.enum(["ida", "volta"]).nullable()`.
- Carry `directionKind` through `RiderFlowClient`, domain adapters, Direction Choice state, mocks, and fixtures without deriving or rewriting it.
- Preserve backend response order.
- On the "Escolha o sentido" screen, render localized `Ida` or `Volta` as concise supporting context when non-null.
- Keep the authoritative direction `name` visible and keep `departureLabels` as supporting recognition context.
- When null, render the current card presentation with `name` and `departureLabels`; do not show an unknown-kind warning and do not disable selection.
- Do not infer a kind from `name`, Route Candidate hints, Departure Labels, sequence, or the other direction in the response.
- Route Confirmation, Advice requests, and Geometry requests continue to use `routeDirectionId`; `directionKind` is display metadata only.

## Compatibility and Rollout

Deploy Sombreado Service first. The current frontend ignores the additional response field, but the updated required Zod schema would reject an older backend response that omits it.

After the backend is live, deploy the frontend schema and presentation together.

## Test Plan

- Transport accepts `ida`, `volta`, and null, and rejects an omitted or unknown value.
- Domain adaptation preserves the field without changing Direction Choice order.
- The direction-selection screen shows `Ida` and `Volta` cues for classified choices.
- A null choice remains selectable and preserves the existing name/Departure Label fallback.
- Accessibility text includes the cue when shown but remains complete when it is null.
- Existing stale-version recovery, retry, Geometry, confirmation, and Advice flows remain unchanged.
