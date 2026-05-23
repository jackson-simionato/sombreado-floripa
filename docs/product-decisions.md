# Product Decisions

This document records current product and design decisions for Sombreado Floripa. It is not a glossary; canonical domain terms live in `CONTEXT.md`.

## Current Decisions

- The first version is **onboard-first**: riders are already on a bus and need immediate guidance.
- The primary audience is **local Florianopolis riders**, with Brazilian Portuguese as the default language.
- The core promise is helping riders choose the side with less direct sun exposure, not predicting heat, weather, or guaranteed shade.
- The main result should be a positive action, such as "Sente à esquerda", rather than making riders mentally invert an exposed-side warning.
- Left/right orientation should be explained primarily through a bus sun/shade diagram, with accessible text for assistive technology.
- The app asks riders to tap a location action before triggering browser geolocation permission.
- Nearby route direction candidates are the default selection flow; text search is a fallback, not the primary path.
- The app includes a compact route confirmation map after route selection, not a map-led home screen.
- Mapbox GL JS is the preferred v1 map provider, lazy-loaded only when the confirmation map is shown.
- Branding should combine Airbnb-like warmth with Anthropic/Claude Code-like restraint: clean, joyful, spacious, human, polished, and calm.
- The v1 scope is core-only: locate, choose route/direction, confirm, receive advice, and handle empty/error/withheld states.
- The frontend calls `sombreado-service` directly from the browser with `NEXT_PUBLIC_API_URL`.
- `sombreado-floripa` should become frontend-only; the scraper and advisory backend remain separate projects.

## Design References

- **Airbnb**: warmth, approachability, spaciousness, and polished consumer UX.
- **Anthropic / Claude Code**: restraint, clarity, calm density, and trust.
- **Sombreado adaptation**: playful sunny accents, friendly Portuguese copy, and practical transit utility.

## Deferred Decisions

- Exact color palette, typography, spacing scale, and icon/illustration style.
- Exact wireframes for each rider state.
- Final Mapbox style and interaction details.
- Deployment target for the frontend.
- Whether saved routes, feedback reporting, sharing, or bilingual support belong after v1.

## Not V1

- Timetable planning.
- Bus stop planning as the primary flow.
- Saved routes.
- User accounts or authentication.
- Tourist/bilingual mode.
- Weather-aware or shadow-aware modeling.
- Feedback/reporting tools.
