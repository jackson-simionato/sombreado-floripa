# Brand Guide

Sombreado Floripa is a mobile-first companion for riders already on Florianopolis buses. The brand should feel sunny, useful, and personable, but the product promise stays practical: it recommends the side with less direct sun exposure. It does not promise guaranteed shade.

Future identity exploration should preserve the product truths in this guide while challenging the surface execution. Onboard-first use, recommendation-first hierarchy, Brazilian Portuguese, honest limits, warm/cool sun semantics, and diagram-led advice are stable; the exact palette, type, illustration style, motion style, and composition can change. Exploration should be implementation-adjacent, with concrete roles, anatomy, hierarchy, and state rules, without prematurely prescribing code.

![Sombreado Floripa brand examples](brand-examples.svg)

## Brand Position

Sombreado is a delightful consumer companion for a practical decision riders make while already onboard.

- **More companionable than a government service**: friendly copy, warm color, roomy mobile screens, and plain Portuguese.
- **More focused than a generic map app**: the map confirms route direction; it does not lead the experience.
- **More trustworthy than a novelty app**: limitations are visible, advice is specific, and diagrams explain left/right from the rider perspective.

The reference mix is Airbnb warmth plus Anthropic/Claude Code restraint: polished, approachable, and memorable, but calm enough for a rider to trust while the bus is moving. Playfulness belongs in surfaces, illustrations, empty states, and small transitions; the recommendation itself stays direct and practical.

## Visual Principles

- **Immediate utility first**: the recommendation is the visual center. Decorative elements support comprehension, never compete with the action.
- **Sunny, not beachy**: use sun warmth as a functional signal, not a tourism poster mood.
- **Soft confidence**: rounded shapes, generous spacing, and friendly color can coexist with precise language.
- **Readable in motion**: large touch targets, strong contrast, clear hierarchy, and minimal competing controls.
- **Diagrams over jargon**: when explaining side, direction, or sun exposure, show the bus orientation before adding technical text.
- **Local through usefulness**: show Floripa through accurate route names, neighborhoods, sun context, and onboard moments. Avoid slang, language stereotypes, beach/tourism cliches, caricature, or local color that does not help the rider decide.

## Identity Motif

The core brand signature is the bus-side split motif. It should come from the product experience before it becomes a logo.

- Treat the brand as diagram-led: visual identity explorations should start from making the advice diagram useful, beautiful, and ownable, then extend that language into other surfaces.
- Use a rider-facing bus diagram with a clear front arrow.
- Split the cabin lengthwise into left and right seating sides.
- Use the cool side for the recommendation and the warm side for direct sun.
- Pair color with labels, hatches, icons, or outlines so the motif works without color alone.
- Let any future logo-like mark derive from a successful advice diagram. Do not introduce a standalone mark that leads the identity before the diagram works.

## Color Direction

The palette may evolve, but the semantic relationship should remain stable: warm color represents direct sun, and cool color represents the recommended or calmer side. New brand explorations can shift the exact hues, neutral system, texture, and contrast, but should preserve that warm/cool mapping.

| Token        | Hex       | Use                                                           |
| ------------ | --------- | ------------------------------------------------------------- |
| Sun 500      | `#F8B84E` | Sun accents, direct-sun markers, optimistic highlights        |
| Sun 100      | `#FCE6B8` | Soft sun backgrounds and non-critical emphasis                |
| Shade 500    | `#4E9CB5` | Recommended-side accents, selected states, route confirmation |
| Shade 100    | `#DDF1F5` | Recommendation panels and calm informational backgrounds      |
| Surface Warm | `#FFF9EE` | App background                                                |
| Paper        | `#FFFFFF` | Primary cards, sheets, modal surfaces                         |
| Line         | `#E7DED2` | Dividers, quiet borders, diagram outlines                     |
| Ink          | `#25211B` | Primary text                                                  |
| Muted Ink    | `#6B6258` | Secondary text and notices                                    |
| Success      | `#2F8F68` | Available/confirmed states unrelated to sun-vs-shade meaning  |
| Warning      | `#D9822B` | Recoverable uncertainty and partial confidence                |
| Error        | `#C84C3A` | Failed location, unavailable advice, and blocking errors      |
| Focus        | `#2D6CDF` | Keyboard focus rings and accessibility-only focus emphasis    |

### Color Pairing Examples

- Recommendation card: Paper surface, Ink title, Shade 100 panel, Shade 500 icon or arrow.
- Direct-sun side: Sun 100 fill with Sun 500 hatch or ray marks. Never rely on yellow alone.
- Primary action: Ink or Shade 500 button on a warm surface. Use Sun 500 sparingly for emphasis, not as the default call-to-action color.
- Notices: Muted Ink on Surface Warm or Paper, with a small Warning accent only when the limitation changes the current result.

## Typography

Use a clean sans-serif with human warmth and strong mobile legibility. Preferred stack:

```css
font-family: Inter, Avenir, "Helvetica Neue", Arial, sans-serif;
```

If the implementation avoids a webfont in v1, system UI is acceptable. The brand does not depend on a custom typeface.

Recommended scale for mobile wireframes:

| Role         | Size    | Weight  | Notes                                       |
| ------------ | ------- | ------- | ------------------------------------------- |
| Result title | 30-34px | 720-780 | Used for advice like "Sente à esquerda"     |
| Screen title | 24-28px | 700     | Route selection, confirmation, empty states |
| Body         | 16-18px | 400-500 | Short explanatory copy                      |
| Button       | 16-17px | 650-720 | Verb-led actions                            |
| Caption      | 13-14px | 450-550 | Estimate notices and metadata               |

Keep letter spacing at `0`. Do not use condensed, technical, or transit-control typography.

## Spacing And Shape

- Use an 8px spacing base: `4, 8, 12, 16, 24, 32, 48`.
- Give result screens more breathing room than selection screens.
- Keep card radius between 16px and 24px for major mobile panels; compact chips and buttons can use pill shapes when they represent a single tap target.
- Avoid nested cards. Use full-width sections, sheets, or simple stacked panels.
- Minimum touch target: 44px tall, with 48px preferred for primary actions.

## Core UI Patterns

### Recommendation Card

The recommendation card should make the positive action unmistakable.

```text
Agora no ônibus

Sente à esquerda
Esse lado deve pegar menos sol direto.

[ bus orientation diagram ]

Estimativa pelo sol direto. Não considera prédios, nuvens, películas ou cortinas.
```

Rules:

- Lead with the seat-area recommendation, not a raw exposure result.
- Place the bus orientation diagram directly below the recommendation copy.
- Let the diagram act as visual proof of the answer, so the screen remains a single calm recommendation rather than a tutorial.
- Use the exact seat-area recommendation in the title, then let the diagram callout say "Sente aqui" on the recommended side.
- Keep route confirmation separate from the recommendation card unless space or context requires a compact supporting cue.
- Keep the limitation visible below the diagram, not hidden in settings.
- If advice is withheld, explain why in one sentence and offer the next useful action.

### Route Candidate

Route candidates should feel like quick confirmations, not timetable rows.

```text
124 TICEN -> Lagoa
perto de você · sentido Lagoa
```

Rules:

- Route number and direction are primary. Use accurate local references such as `TICEN`, `Lagoa`, or `Trindade` when they clarify the selected route.
- Distance, confidence, or source details are secondary.
- Avoid dense columns, departure times, and operator-control labels in the onboard flow.

### Route Confirmation Map

The map confirms the selected route direction. It should be compact, delayed until needed, and visually quieter than the advice. It supports trust and orientation; it does not compete with the recommendation.

Rules:

- Keep map controls minimal.
- The route line should use Shade 500, with current location or candidate markers distinct from sun/shade colors when possible.
- Do not make the home screen map-led.

## Diagram Rules

The bus orientation diagram is a trust feature, not decoration.

- Brand explorations should describe the diagram anatomy concretely: cabin shape, front or driver cue, seating representation, aisle, recommended side treatment, direct-sun treatment, side labels, small-size behavior, and state behavior.
- Show the rider-facing bus direction with an arrow.
- Prefer a vertical top-down cabin view: driver/front marker at the top, bus front pointing upward, aisle down the middle, and seats arranged in left/right columns.
- Keep the diagram schematic for city buses: use simple seat squares or bench blocks, not numbered assigned seats.
- Use a simplified rectangular cabin or soft bus outline; do not make the diagram feel like an intercity seat map.
- Split the bus lengthwise, along its longest axis, so the graphic represents the left and right seating sides. Do not split the bus into front/back blocks.
- Map sun position to rider-facing sides: if the bus is heading north and the sun is east, the right side is the direct-sun side and the recommendation is the left side.
- Label both sides when space allows: "sente à esquerda" or "sente à direita" for the recommendation, and "sol direto" for the side to avoid.
- Prefer a direct "Sente aqui" callout attached to the recommended side over repeating the full recommendation inside the bus shape.
- Keep "esquerda" and "direita" as quiet confirmation labels, secondary to the recommendation callout and the direct-sun callout.
- Use at least two cues per state: color plus label, icon, hatch, outline, or pattern.
- Sun side uses warm fill, hatch, or ray marks.
- Recommended area uses the strongest action cue: explicit recommendation text, a check mark, and cool fill.
- Do not use compass-only language. "Esquerda" and "direita" must be clear from the rider perspective.
- Provide accessible text equivalent, for example: "Recomendação: sente à esquerda. O sol direto está do lado direito do ônibus."

## Copy Rules

Default language is Brazilian Portuguese. Voice should be short, direct, friendly, and honest about limitations. Use local specificity when it is useful; avoid slang, stereotypes, or exaggerated regional voice.

Copy should be defined together with diagram states. Left/right recommendations can use a direct "Sente aqui" diagram callout; neutral, preview, withheld, loading, and front/back states need their own copy posture instead of forcing the same label everywhere.

Use:

- "Usar minha localização"
- "Escolha sua linha"
- "Sente à esquerda"
- "Melhor sentar à direita"
- "Não encontrei linhas perto de você"
- "Estimativa pelo sol direto. Pode variar no caminho."

Avoid:

- "Sombra garantida"
- "Previsão de temperatura"
- "Exposição solar computada com precisão"
- "Usuário", "debug", "bearing", or operator-facing terms in rider copy
- Slang, beach/tourism cliches, or local caricature
- Long legal disclaimers in the main flow

When the app cannot recommend a side, be specific and useful:

```text
Não dá para recomendar agora.
Não consegui confirmar o sentido dessa linha. Tente escolher outra opção perto de você.
```

## Motion Guidance

Motion can add companion-like warmth, but it should feel like simple 2D GIF-style illustration rather than a complex interface layer.

- Use motion to give the onboard flow a coherent sense of progression from locating, to confirming, to receiving advice.
- Use short 300-700ms transitions for state changes, such as the recommended side settling in or the sun hatch appearing.
- Use tiny loops only in empty, loading, or help states.
- Do not animate the recommendation text itself.
- Do not require motion to understand left/right, route direction, or uncertainty.
- Avoid map movement, parallax, complex physics, or decorative loops on the result screen.
- Respect reduced-motion preferences.

## Accessibility

- Maintain WCAG AA contrast for text and controls.
- Do not encode sun/shade meaning with color alone.
- Keep visible focus states, using Focus `#2D6CDF` when the default browser ring is not enough.
- Every diagram needs an accessible text summary.
- Dynamic recommendation changes should be announced politely, not as urgent alerts unless the previous result becomes invalid.
- Avoid motion that could distract riders on a moving bus.

## Do Not Do

- Do not make the brand mascot-heavy or childish.
- Do not use beach/tourism imagery as the main identity.
- Do not use local slang, stereotypes, or caricature as the voice.
- Do not make the interface look like a transit operations dashboard.
- Do not lead with a full-screen map.
- Do not imply the app accounts for buildings, clouds, curtains, window film, traffic, or vehicle-specific shading.
- Do not bury uncertainty. Honest limits are part of the brand.

## Wireframe Readiness Checklist

A wireframe is on-brand when:

- The first screen supports the onboard flow.
- The main result is a positive seat-area recommendation.
- The bus orientation diagram clarifies left/right without relying only on color.
- The copy is short Brazilian Portuguese.
- Route selection feels like confirmation, not trip planning.
- Sun warmth appears as a focused accent rather than a full-page theme.
- Local context is specific and useful, not stereotyped.
- The app feels like a delightful companion with a calm, trustworthy recommendation moment.

## Diagram Evaluation Checklist

A bus orientation diagram is successful when:

- It reads as a bus interior within one second.
- The recommended side is more visually dominant than the direct-sun side.
- A rider can understand left and right without reading a paragraph.
- It avoids looking like an assigned-seat map.
- It feels pleasant and ownable enough to become the product's signature visual object.
- It remains calm and trustworthy for a rider using the app while the bus is moving.
- Its weak points are explicit enough to critique before implementation.
