# Result Surface And Bus Diagram Design

Date: 2026-07-03

## Goal

Redesign the advice result surface so the rider can trust the recommendation at a glance on a 360-390px mobile viewport.

The result screen must show:

- which route and direction the advice applies to
- whether the advice is onboard or preview advice
- the seat-area recommendation
- a bus diagram that reads as a bus within one second
- the direct-sun limitation notice

This is a focused UI redesign for the result surface and bus diagram, not a flow rewrite.

## Product Context

Sombreado Floripa is an onboard-first frontend for riders already on Florianopolis buses. The result screen is the product's trust moment: the rider needs to see the context, understand the side recommendation, and believe the diagram enough to act.

The current implementation has the right pieces, but the layout reads too much like stacked panels. The current `AdviceBusDiagram` is especially weak: it communicates left/right color zones, but it does not resemble a city bus strongly enough to become the app's signature visual object.

## Brand Direction

Use the existing Sombreado brand guide as the product contract:

- warm color means direct sun
- cool color means the recommended/calmer side
- recommendation copy stays direct and practical
- limitations stay visible
- the experience is diagram-led, not map-led

Use Airbnb's public Brazilian homepage as a calibration reference for balance: approachable rounded surfaces, clean hierarchy, friendly consumer polish, and playful discovery cues without sacrificing trust. This is a brand reference, not a layout to copy.

## Chosen Result Anatomy

Use the **Context Receipt Result** anatomy.

The screen starts with compact route/status context, then presents the recommendation and diagram. This lets the rider see "this advice applies to this line, this direction, now or as preview" before acting on the seat recommendation.

Order:

1. Progress/status: `4 de 4`.
2. Route receipt:
   - route chip, for example `124`
   - route label, for example `TICEN - Lagoa`
   - metadata, for example `Agora no ônibus · sentido Lagoa`
3. Recommendation panel:
   - eyebrow: `Recomendação`
   - title: `Sente à esquerda`
   - short explanation: `Esse lado deve pegar menos sol direto neste sentido.`
   - bus diagram directly below the copy
4. Limitation notice:
   - `Estimativa pelo sol direto. Pode variar no caminho.`
5. Sticky actions:
   - primary: `Atualizar localização`
   - secondary: `Trocar linha`

The route receipt should be clear but compact. The recommendation panel should be visually dominant, so the screen does not become a transit receipt first and a recommendation second.

## Bus Diagram Direction

Use the **Transit Pictogram Bus** direction.

The diagram should be flatter and implementation-friendly, but it must clearly resemble a city bus. It should feel like the product's own visual language, not a generic two-column chart.

Required anatomy:

- top-down rounded bus silhouette
- rounded front or windshield cue at the top
- small side mirror or wheel cues
- central aisle
- simplified bench blocks or paired seat rows, not assigned-seat numbering
- left/right split along the bus length
- recommended side with cool fill, stronger outline, check cue, and `Sente aqui`
- direct-sun side with warm fill, hatch or ray pattern, and `sol direto`
- side labels such as `esquerda` and `direita` when space allows
- accessible text equivalent matching the visible recommendation

Do not keep the current shape if it continues to read as two colored columns in a rounded container. The diagram must read as a bus first, then as sun/shade advice.

## State Behavior

### Onboard Advice

Use the full Context Receipt Result anatomy.

Receipt metadata example:

```text
Agora no ônibus · sentido Lagoa
```

The recommendation panel stays calm and direct.

### Route Preview Advice

Use the same anatomy, but the receipt metadata makes preview status explicit.

Example:

```text
Prévia da linha · sentido Lagoa
```

Use a small preview chip near the receipt if needed. Do not put preview status inside the recommendation title.

### Freshness Fallback

Keep the recommendation visible. Add one compact notice between the recommendation copy and the diagram:

```text
Usando sua última localização conhecida.
```

### Neutral Computed Result

Keep the receipt. Change the recommendation title to the neutral copy, such as:

```text
Sem lado melhor agora
```

The diagram switches to equal left/right treatment with no recommended-side dominance.

### Withheld Result

Do not use the full catchy bus diagram. Withheld is not a recommendation surface.

Use:

- compact route receipt when route context exists
- reason panel
- next useful action

## Implementation Shape

Add a small `ResultRouteReceipt` component instead of forcing result context through `RouteSummary`.

Split result rendering into a focused result surface:

- `AdviceResultSurface` handles onboard, preview, freshness fallback, and neutral computed advice.
- Withheld and error states remain separate from the recommendation surface.

Keep `AdviceBusDiagram`, but redesign its internals and responsive sizing around the Transit Pictogram Bus direction.

CSS should move from one big result card to three clear layers:

- route receipt
- recommendation panel
- limitation notice

## Mobile Fit Rules

At 360px width:

- route receipt, recommendation title, and most of the diagram should be visible before the sticky actions take over the lower viewport
- text must not wrap into awkward clipped fragments
- the limitation notice remains visible as part of the result, not hidden in settings or a collapsed detail area
- sticky actions remain reachable and do not obscure the core recommendation

## Accessibility

- Do not encode sun/shade meaning with color alone.
- The bus diagram needs an accessible summary, for example:

```text
Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.
```

- Onboard and preview advice must be text-distinct.
- Neutral and withheld states must not announce a left/right recommendation.
- Focus states remain visible on sticky actions and any interactive route/context controls.

## Test Coverage

Add or update tests to cover:

- onboard result shows route, direction, recommendation, diagram summary, and limitation notice
- preview result is visibly distinct from onboard result
- preview status is not folded into the recommendation title
- freshness fallback notice appears without hiding the recommendation
- neutral result uses neutral copy and does not leak left/right recommendation text
- withheld result remains separate from the recommendation surface
- bus diagram exposes an accessible text equivalent

## Non-Goals

- Do not redesign route selection, direction selection, route confirmation, or error handling beyond result-surface dependencies.
- Do not add map-led behavior.
- Do not promise guaranteed shade.
- Do not introduce beach imagery, mascots, or tourism cliches.
- Do not add backend, scraper, advisory computation, or API behavior.
