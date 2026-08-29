# One-job evolution rule

## Status

Accepted.

## Decision

Sombreado Floripa’s product is the **Advice Triple**: a **Route Candidate**, a **Direction Choice**, and a datetime of now or near-now, yielding **Sun-side Advice** as a **Seat-area Recommendation**. That is the one job. Onboard Flow is the default way to instantiate the triple when there is no recent or share-link; preview, recents, time chips, and share-links are the same job, not a different product.

New work in this repository must be one of:

1. **Choose** the triple faster or more clearly.
2. **Explain** the advice (why this side, what the geometry means, what it does not mean).
3. **Reach** the one job without adding a second job (install, share a sentence, hide a round-trip inside the existing wizard).

Anything else is default-no until a later ADR supersedes this one.

The audience is local Florianopolis riders. Copy and UI stay Brazilian Portuguese. A second language or tourist mode is default-no even though it can look like reachability.

This ADR constrains `sombreado-floripa`. Do not add `sombreado-service` work on this app’s behalf whose only purpose is a banned job. Service may grow other endpoints; this app will not call a second job.

### Allowed kinds (examples)

- **Choose:** recents of Route Candidate + Direction Choice with no account; near-now time chips; prefetch inside the wizard; compact **Route Confirmation Map**; clearer direction labels; manual route search that returns routes, not A→B trips.
- **Explain:** **Bus Orientation Diagram**; compact exposure receipt; **Geometric Estimate Notice**; polyline that shows a mid-route flip without faking a single side.
- **Reach:** Add to Home Screen; a share sentence plus a deep link that lands on the same triple.

### Default-no

Trip planning; ETAs; nearby-stop or map-home surfaces; A→B destination search; accounts; payment/recarga; per-seat pickers; a starred-line library beyond recents; bilingual or tourist mode; weather or building-shadow modeling; feedback or “report this”; a date or leave-at picker.

Do not read those bans as a license to delete what already instantiates the triple: manual route search stays; the compact **Route Confirmation Map** stays.

### Why

Sun-side apps that stayed useful (Sit In Shade, UVLens, FujiSeat, Veyil, Shady Way) never left one job. Cittamobi and Moovit grew by stacking jobs (map, recarga, extra tabs) and became hard to evolve. Sombreado is easy to mistake for a transit super-app; this rule is the filter so the backlog cannot drift there by default.

Datetime is part of the triple because sun azimuth moves, but a leave-at calendar is planning. Location is not a fourth field: it helps instantiate nearby **Route Candidates** and choose onboard vs preview when available. Recents and share-links may supply the route and direction without a locate step.

“Not v1” is too weak: it invites a second job the day the wizard ships. Reopen only with a superseding ADR and new evidence, not with a convincing ticket.

### Considered options

- Keep onboard-first as the product identity and treat the triple as a description of one request — rejected: recents, time chips, and share-links would fail or have to be pretended through.
- Two-clause filter only (choose or explain) — rejected: install and prefetch are how the one job stays reachable; they are not a second job.
- Negative test only (anything that is not Moovit is in) — rejected: a tips tab, weather widget, or stop list would pass.
- Frame the bans as Not v1 / maybe later — rejected: that is the failure mode this ADR exists to close.
- Duplicate the full rule into `CONTEXT.md` and `docs/product-decisions.md` — rejected: this ADR is canonical; those files point here and keep a living snapshot, not a second constitution.

### Out of scope

Craft deferrals that are not a second job (icon style, wireframe polish, Mapbox style). How recents, chips, receipt, or PWA are implemented; those stay separate tickets inside the allowed kinds.

## Consequences

- Agents and humans apply this filter before filing or implementing product work. Pointers: `AGENTS.md` Product Guardrails, `README.md` product contract, `docs/product-decisions.md`.
- `CONTEXT.md` names **Advice Triple** and demotes **Onboard Flow** to default instantiation.
- `docs/product-decisions.md` restates the snapshot so share, recents, and bilingual are not “maybe after v1.”
- A second job requires a new ADR that supersedes this one. Do not reopen in an issue comment.
