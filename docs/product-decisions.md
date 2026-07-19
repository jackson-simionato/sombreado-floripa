# Product Decisions

This document records current product and design decisions for Sombreado Floripa. It is not a glossary; canonical domain terms live in `CONTEXT.md`.

## Current Decisions

- The first version is **onboard-first**: riders are already on a bus and need immediate guidance.
- The primary audience is **local Florianopolis riders**, with Brazilian Portuguese as the default language.
- The core promise is helping riders choose the side with less direct sun exposure, not predicting heat, weather, or guaranteed shade.
- The main result should be a positive action, such as "Sente à esquerda", rather than making riders mentally invert an exposed-side warning.
- Left/right orientation should be explained primarily through a bus sun/shade diagram, with accessible text for assistive technology.
- The app asks riders to tap a location action before triggering browser geolocation permission.
- Nearby route candidates are the default selection flow; manual route search is also available as a secondary path.
- Route selection happens before direction selection. Direction must be chosen explicitly before confirmation.
- Direction selection may show the backend-provided Route Direction Kind as a concise `Ida` or `Volta` cue. The frontend does not infer it from the raw direction name, and a missing kind preserves the existing name-and-label presentation.
- The app includes a compact route confirmation map after route selection and direction choice, not a map-led home screen.
- Off-route or exploratory usage can show preview advice with a clear warning when the app can estimate a useful point near the selected route; true withheld states are reserved for cases where useful advice cannot be computed.
- Mapbox GL JS is the preferred v1 map provider, lazy-loaded only when the confirmation map is shown.
- Branding should combine Airbnb-like warmth with Anthropic/Claude Code-like restraint: clean, joyful, spacious, human, polished, and calm.
- The accepted visual foundation is Soft Tech Minimalism from `docs/design/DESIGN.md`: Newsreader display type, Hanken Grotesk interface type, warm alabaster surfaces, charcoal primary actions, sun-tan direct-sun accents, and soft-blue recommendation accents.
- The v1 scope is core-only: locate or search, choose route, choose direction, confirm, receive advice, and handle empty/error/preview/withheld states.
- The frontend calls `sombreado-service` directly from the browser with `NEXT_PUBLIC_API_URL`.
- `sombreado-floripa` should become frontend-only; the scraper and advisory backend remain separate projects.

## Design References

- **Airbnb**: warmth, approachability, spaciousness, and polished consumer UX.
- **Anthropic / Claude Code**: restraint, clarity, calm density, and trust.
- **Sombreado adaptation**: playful sunny accents, friendly Portuguese copy, and practical transit utility.

## Deferred Decisions

- Final icon/illustration style beyond the current bus diagrams.
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
