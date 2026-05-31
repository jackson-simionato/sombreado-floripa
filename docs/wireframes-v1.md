# Wireframes V1

Low-fidelity mobile wireframes for the Sombreado Floripa v1 onboard-first flow. These sketches target a narrow mobile viewport around 360-390px wide and assume one-handed use while standing or sitting on a moving bus.

## Scope

V1 helps a rider locate or search for a route, choose the route, choose the direction, confirm it, and receive sun-side advice. The flow may produce either onboard advice or route preview advice. It does not include timetable planning, stop planning, saved trips, accounts, feedback, or map-led navigation.

## Flow Diagram

```text
[Start]
  |
  v
[Location Request]
  | primary: use location
  | secondary: manual search
  |
  +-- location allowed --> [Finding Nearby Routes]
  |                         |
  |                         +-- candidates --> [Route Candidate Selection]
  |                         +-- no candidates --> [No Nearby Routes]
  |                         +-- slow --> [Slow Loading Notice]
  |                         +-- API error --> [API Error]
  |
  +-- location denied --> [Location Denied Recovery]
  |                         | primary: manual search
  |                         +-- retry location --> [Location Request]
  |
  +-- manual search --------------------------------+
                                                     |
                                                     v
                                            [Manual Route Search]
                                                     |
                                                     +-- route chosen --> [Direction Choice]
                                                     +-- no results --> [No Manual Results]
                                                     +-- API error --> [API Error]

[Route Candidate Selection]
  | route chosen
  | secondary: manual search
  v
[Direction Choice]
  | direction chosen
  | if no directions
  +-------------------------> [Route Without Directions]
  |
  v
[Route Confirmation]
  | primary: confirm route
  | map unavailable
  +-------------------------> [Route Confirmation Fallback]
  |                              |
  |                              v
  |                         [Computing Advice]
  |
  v
[Computing Advice]
  +-- onboard point usable -------------------------> [Onboard Advice Result]
  +-- off-route but estimated route point usable ---> [Route Preview Advice Result]
  +-- no useful advice possible --------------------> [True Withheld]
  +-- API error ------------------------------------> [API Error]

[No Nearby Routes] -- primary: manual search --> [Manual Route Search]
[No Nearby Routes] -- secondary: retry location --> [Location Request]
[API Error] -- retry --> previous failed state
[API Error] -- secondary manual search --> [Manual Route Search]
```

## Screen-State Contract

| State | Trigger/input | Primary action | Fallback action | Minimum copy | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Location Request | First visit or reset | Usar minha localização | Procurar linha manualmente | "De que lado sentar?" / "Encontre a melhor lateral do ônibus pelo sol direto." | Browser geolocation only after tap |
| Finding Nearby Routes | Rider grants location | None while loading | Procurar linha manualmente | "Buscando linhas perto de você..." / "Isso deve levar poucos segundos." | Mocked nearby candidates now; later `sombreado-service` |
| Slow Loading Notice | Nearby lookup exceeds short threshold | Continuar aguardando | Procurar linha manualmente | "Ainda buscando..." / "A conexão pode estar lenta." | Frontend timeout state |
| Location Denied Recovery | Browser geolocation denied or blocked | Procurar linha manualmente | Tentar localização de novo | "Localização desativada" / "Você ainda pode escolher sua linha manualmente." | Browser geolocation permission |
| Route Candidate Selection | Nearby routes returned | Select route card | Procurar outra linha | "Escolha sua linha" / "Mostramos linhas perto de você. O sentido vem no próximo passo." | Nearby route candidates from mocked data/API |
| No Nearby Routes | Nearby lookup returns empty | Procurar linha manualmente | Tentar localização de novo | "Não encontrei linhas perto de você" / "Use a seleção manual para escolher pelo número ou nome da linha." | Nearby route candidate API |
| Manual Route Search | Secondary path from first screen, denied, no candidates, or route list | Select route result | Usar minha localização | "Procurar linha" / "Digite o número ou nome da linha." | Route search API or mocked route list |
| No Manual Results | Search query has no route matches | Buscar de novo | Usar minha localização | "Nenhuma linha encontrada" / "Confira o número ou tente um destino." | Route search API |
| Direction Choice | Route selected | Select direction | Trocar linha | "Escolha o sentido" / "Use o destino ou bairro para confirmar para onde o ônibus vai." | Direction options from route data/API |
| Route Without Directions | Selected route has no usable direction options | Trocar linha | Procurar linha manualmente | "Não é possível confirmar o sentido" / "Essa linha ainda não tem sentidos disponíveis." | Direction metadata gap in service |
| Route Confirmation | Direction selected | Confirmar esta linha | Trocar sentido | "Confirme sua linha" / "Confira se a linha e o sentido combinam com o ônibus." | Later Mapbox route confirmation map |
| Route Confirmation Fallback | Map token, geometry, or map load unavailable | Confirmar mesmo assim | Trocar sentido | "Mapa indisponível" / "Ainda é possível confirmar pela linha e pelo sentido." | Mapbox token/geometry/map load |
| Computing Advice | Confirmation submitted | None while loading | Trocar linha | "Calculando pelo sol direto..." / "Vamos comparar esquerda e direita no sentido escolhido." | Advisory endpoint |
| Onboard Advice Result | Advice computed with live onboard context | Atualizar localização | Trocar linha | "Agora no ônibus" / "Sente à esquerda" or "Melhor sentar à direita" | Advisory endpoint and rider location |
| Route Preview Advice Result | Rider is off route, but service can compute preview advice from an estimated route point | Atualizar localização | Trocar linha | "Prévia da linha" / "Sente à esquerda" or "Melhor sentar à direita" | Advisory endpoint preview mode; requires service support for estimated route point |
| True Withheld | No useful side recommendation can be computed | Trocar linha | Tentar de novo | "Não é possível recomendar agora" / Reason-specific copy explaining why advice was withheld | Advisory endpoint withheld response |
| API Error | Network/server failure in route or advice calls | Tentar de novo | Procurar linha manualmente | "Algo deu errado" / "Não consegui carregar as informações agora." | Frontend network/error handling |

## Global Mobile Layout

- Viewport target: 360-390px wide.
- Page shell: warm surface background, one main column, 16px side padding, 24px top spacing.
- Sticky action area: bottom-safe-area sheet for primary and secondary actions on selection, confirmation, and error states.
- Touch targets: route cards, direction rows, and buttons are at least 48px tall.
- Progress cue: compact text near the top, such as "1 de 4", only after the location screen.
- Route and direction choices stay route-only; no timetable rows, departure times, stop planning, or operator controls.

## Wireframe Sketches

### 1. Location Request

```text
┌──────────────────────────────┐
│ Sombreado Floripa            │
│                              │
│ De que lado sentar?          │
│ Encontre a melhor lateral do │
│ ônibus pelo sol direto.      │
│                              │
│ [small bus split diagram]    │
│                              │
│                              │
│ ┌──────────────────────────┐ │
│ │ Usar minha localização   │ │
│ └──────────────────────────┘ │
│ Procurar linha manualmente   │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "De que lado sentar?"
- Body: "Encontre a melhor lateral do ônibus pelo sol direto."
- Primary: "Usar minha localização"
- Secondary: "Procurar linha manualmente"
- Notice: "A localização só é usada para encontrar linhas perto de você."

Notes:

- Do not request browser location until the primary button is tapped.
- Manual search is visible on the first screen, but visually secondary.

### 2. Finding Nearby Routes And Slow Loading

```text
┌──────────────────────────────┐
│ Buscando linhas perto de você│
│ Isso deve levar poucos       │
│ segundos.                    │
│                              │
│ [simple loading bus motif]   │
│                              │
│ Procurar linha manualmente   │
└──────────────────────────────┘
```

Slow loading copy:

- Heading: "Ainda buscando..."
- Body: "A conexão pode estar lenta. Você pode continuar ou procurar a linha manualmente."
- Primary: "Continuar aguardando"
- Secondary: "Procurar linha manualmente"

Slow loading variant:

```text
┌──────────────────────────────┐
│ Ainda buscando...            │
│ A conexão pode estar lenta.  │
│ Você pode continuar ou       │
│ procurar a linha manualmente.│
│                              │
│ ┌──────────────────────────┐ │
│ │ Continuar aguardando     │ │
│ └──────────────────────────┘ │
│ Procurar linha manualmente   │
└──────────────────────────────┘
```

Notes:

- Loading animation must not be required to understand state.
- If reduced motion is enabled, use a static bus motif and loading text.

### 3. Location Denied Recovery

```text
┌──────────────────────────────┐
│ Localização desativada       │
│ Você ainda pode escolher sua │
│ linha manualmente.           │
│                              │
│ [location icon + route card] │
│                              │
│ ┌──────────────────────────┐ │
│ │ Procurar linha manual... │ │
│ └──────────────────────────┘ │
│ Tentar localização de novo   │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Localização desativada"
- Body: "Você ainda pode escolher sua linha manualmente."
- Primary: "Procurar linha manualmente"
- Secondary: "Tentar localização de novo"

### 4. Route Candidate Selection

```text
┌──────────────────────────────┐
│ 1 de 4                       │
│ Escolha sua linha            │
│ Mostramos linhas perto de    │
│ você. O sentido vem depois.  │
│                              │
│ ┌──────────────────────────┐ │
│ │ 124 TICEN - Lagoa        │ │
│ │ perto de você            │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 330 TILAG - Centro       │ │
│ │ perto de você            │ │
│ └──────────────────────────┘ │
│                              │
│ Procurar outra linha         │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Escolha sua linha"
- Body: "Mostramos linhas perto de você. O sentido vem no próximo passo."
- Route card example: "124 TICEN - Lagoa" / "perto de você"
- Secondary: "Procurar outra linha"

Notes:

- Nearby candidates are route-only choices.
- Text such as "TICEN - Lagoa" is the route display name, not a selected direction.
- Do not show direction as selected on these cards. If a candidate has a likely direction, show it only as supporting text after the route name, not as confirmation.

### 5. No Nearby Routes

```text
┌──────────────────────────────┐
│ Não encontrei linhas perto   │
│ de você                      │
│ Use a seleção manual pelo    │
│ número ou nome da linha.     │
│                              │
│ ┌──────────────────────────┐ │
│ │ Procurar linha manual... │ │
│ └──────────────────────────┘ │
│ Tentar localização de novo   │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Não encontrei linhas perto de você"
- Body: "Use a seleção manual para escolher pelo número ou nome da linha."
- Primary: "Procurar linha manualmente"
- Secondary: "Tentar localização de novo"

### 6. Manual Route Search

```text
┌──────────────────────────────┐
│ Procurar linha               │
│ Digite o número ou nome da   │
│ linha.                       │
│                              │
│ ┌──────────────────────────┐ │
│ │ 124 ou Lagoa             │ │
│ └──────────────────────────┘ │
│                              │
│ Resultados                   │
│ ┌──────────────────────────┐ │
│ │ 124 TICEN - Lagoa        │ │
│ │ linha                    │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 330 TILAG - Centro       │ │
│ │ linha                    │ │
│ └──────────────────────────┘ │
│                              │
│ Usar minha localização       │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Procurar linha"
- Body: "Digite o número ou nome da linha."
- Input placeholder: "124 ou Lagoa"
- Empty query helper: "Busque pelo número, terminal ou destino."
- Primary: selecionar uma linha nos resultados.
- Result metadata: "linha"
- Secondary: "Usar minha localização"

Notes:

- Manual results are route-only choices.
- Selecting a route always rejoins the same Direction Choice state.

### 7. No Manual Results

```text
┌──────────────────────────────┐
│ Nenhuma linha encontrada     │
│ Confira o número ou tente um │
│ destino.                     │
│                              │
│ [search field remains above] │
│                              │
│ ┌──────────────────────────┐ │
│ │ Buscar de novo           │ │
│ └──────────────────────────┘ │
│ Usar minha localização       │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Nenhuma linha encontrada"
- Body: "Confira o número ou tente um destino."
- Primary: "Buscar de novo"
- Secondary: "Usar minha localização"

### 8. Direction Choice

```text
┌──────────────────────────────┐
│ 2 de 4                       │
│ Escolha o sentido            │
│ Use o destino ou bairro para │
│ confirmar para onde o ônibus │
│ vai.                         │
│                              │
│ Linha escolhida              │
│ 124 TICEN - Lagoa            │
│                              │
│ ┌──────────────────────────┐ │
│ │ Sentido Lagoa            │ │
│ │ via Trindade             │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Sentido TICEN            │ │
│ │ via Centro               │ │
│ └──────────────────────────┘ │
│                              │
│ Trocar linha                 │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Escolha o sentido"
- Body: "Use o destino ou bairro para confirmar para onde o ônibus vai."
- Direction option: "Sentido Lagoa" / "via Trindade"
- Secondary: "Trocar linha"

Notes:

- Use rider-facing destinations or neighborhoods.
- Avoid raw shape IDs, bearings, or backend labels.
- The selected direction must be explicit before route confirmation.

### 9. Route Without Directions

```text
┌──────────────────────────────┐
│ Não é possível confirmar o   │
│ sentido                      │
│ Essa linha ainda não tem     │
│ sentidos disponíveis.        │
│                              │
│ Linha 124 TICEN - Lagoa      │
│                              │
│ ┌──────────────────────────┐ │
│ │ Trocar linha             │ │
│ └──────────────────────────┘ │
│ Procurar linha manualmente   │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Não é possível confirmar o sentido"
- Body: "Essa linha ainda não tem sentidos disponíveis."
- Primary: "Trocar linha"
- Secondary: "Procurar linha manualmente"

Dependency note:

- This state should be uncommon. If it appears in integration, document the missing route-direction metadata for `sombreado-service`.

### 10. Route Confirmation With Map

```text
┌──────────────────────────────┐
│ 3 de 4                       │
│ Confirme sua linha           │
│ Confira se a linha e o       │
│ sentido combinam com o       │
│ ônibus.                      │
│                              │
│ 124 TICEN - Lagoa            │
│ Sentido Lagoa                │
│                              │
│ ┌──────────────────────────┐ │
│ │ compact route map        │ │
│ │ route line + position    │ │
│ └──────────────────────────┘ │
│                              │
│ Se você não estiver nessa    │
│ linha agora, posso mostrar   │
│ uma prévia com aviso.        │
│                              │
│ ┌──────────────────────────┐ │
│ │ Confirmar esta linha     │ │
│ └──────────────────────────┘ │
│ Trocar sentido               │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Confirme sua linha"
- Body: "Confira se a linha e o sentido combinam com o ônibus."
- Notice: "Se você não estiver nessa linha agora, posso mostrar uma prévia com aviso."
- Primary: "Confirmar esta linha"
- Secondary: "Trocar sentido"

Notes:

- Map area is compact and supporting, not the main entry point.
- Map controls are minimal. Route line uses the shade accent; current position marker uses a neutral or success cue distinct from sun/shade meaning.
- Sticky action area keeps confirm reachable at the bottom.

### 11. Route Confirmation Fallback

```text
┌──────────────────────────────┐
│ 3 de 4                       │
│ Confirme sua linha           │
│ Mapa indisponível            │
│ Ainda é possível confirmar   │
│ pela linha e pelo sentido.   │
│                              │
│ 124 TICEN - Lagoa            │
│ Sentido Lagoa                │
│                              │
│ [simple route summary block] │
│                              │
│ ┌──────────────────────────┐ │
│ │ Confirmar mesmo assim    │ │
│ └──────────────────────────┘ │
│ Trocar sentido               │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Confirme sua linha"
- Notice heading: "Mapa indisponível"
- Body: "Ainda é possível confirmar pela linha e pelo sentido."
- Primary: "Confirmar mesmo assim"
- Secondary: "Trocar sentido"

Dependency note:

- Used when Mapbox token, route geometry, or map loading is unavailable.

### 12. Computing Advice

```text
┌──────────────────────────────┐
│ Calculando pelo sol direto...│
│ Vamos comparar esquerda e    │
│ direita no sentido escolhido.│
│                              │
│ [static bus diagram skeleton]│
│                              │
│ Trocar linha                 │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Calculando pelo sol direto..."
- Body: "Vamos comparar esquerda e direita no sentido escolhido."
- Secondary: "Trocar linha"

### 13. Onboard Advice Result

```text
┌──────────────────────────────┐
│ 4 de 4                       │
│ Agora no ônibus              │
│                              │
│ Sente à esquerda             │
│ Esse lado deve pegar menos   │
│ sol direto.                  │
│                              │
│ ┌──────────────────────────┐ │
│ │        FRENTE ↑          │ │
│ │  [check]       [sun]     │ │
│ │  esquerda     sol direto │ │
│ │  seats        seats //// │ │
│ └──────────────────────────┘ │
│                              │
│ Linha 124 · Sentido Lagoa    │
│ Estimativa pelo sol direto.  │
│ Não considera prédios,       │
│ nuvens, películas ou         │
│ cortinas.                    │
│                              │
│ ┌──────────────────────────┐ │
│ │ Atualizar localização    │ │
│ └──────────────────────────┘ │
│ Trocar linha                 │
└──────────────────────────────┘
```

Minimum copy:

- Mode label: "Agora no ônibus"
- Recommendation: "Sente à esquerda" or "Melhor sentar à direita"
- Body: "Esse lado deve pegar menos sol direto."
- Route metadata: "Linha 124 · Sentido Lagoa"
- Estimate notice: "Estimativa pelo sol direto. Não considera prédios, nuvens, películas ou cortinas."
- Primary: "Atualizar localização"
- Secondary: "Trocar linha"

Diagram text equivalent:

- "Recomendação: sente à esquerda. O sol direto está do lado direito do ônibus."

Notes:

- Recommendation must be visually obvious within a few seconds.
- Use color plus labels, check mark, hatching, and "sol direto" text. Do not rely on color alone.
- The same diagram structure is reused for preview mode.

### 14. Route Preview Advice Result

```text
┌──────────────────────────────┐
│ 4 de 4                       │
│ Prévia da linha              │
│                              │
│ Sente à esquerda             │
│ Esse lado tende a pegar      │
│ menos sol direto nesse ponto │
│ estimado do trajeto.         │
│                              │
│ ┌──────────────────────────┐ │
│ │        FRENTE ↑          │ │
│ │  [check]       [sun]     │ │
│ │  esquerda     sol direto │ │
│ │  seats        seats //// │ │
│ └──────────────────────────┘ │
│                              │
│ Prévia, não orientação ao    │
│ vivo. Não considera prédios, │
│ nuvens, películas ou         │
│ cortinas.                    │
│                              │
│ ┌──────────────────────────┐ │
│ │ Atualizar localização    │ │
│ └──────────────────────────┘ │
│ Trocar linha                 │
└──────────────────────────────┘
```

Minimum copy:

- Mode label: "Prévia da linha"
- Recommendation: "Sente à esquerda" or "Melhor sentar à direita"
- Body: "Esse lado tende a pegar menos sol direto nesse ponto estimado do trajeto."
- Notice: "Prévia, não orientação ao vivo. Não considera prédios, nuvens, películas ou cortinas. Atualize a localização quando estiver na linha."
- Primary: "Atualizar localização"
- Secondary: "Trocar linha"

Notes:

- Keep selected route and direction visible.
- Location refresh is the primary recovery action.
- Diagram structure matches onboard advice; only labels and notice copy distinguish preview.
- This state is shown directly after advice computation when the rider appears off route but preview advice can be computed. Do not add a separate preview-warning step.
- Preview advice depends on `sombreado-service` returning advice for an automatic estimated point on or near the selected route. V1 does not expose stop, segment, or point picking to riders.

### 15. True Withheld

```text
┌──────────────────────────────┐
│ Não é possível recomendar    │
│ agora                        │
│ Falta informação suficiente  │
│ para orientar esta linha e   │
│ sentido.                     │
│                              │
│ 124 TICEN - Lagoa            │
│ Sentido Lagoa                │
│                              │
│ ┌──────────────────────────┐ │
│ │ Trocar linha             │ │
│ └──────────────────────────┘ │
│ Tentar de novo               │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Não é possível recomendar agora"
- Body: "Falta informação suficiente para orientar esta linha e sentido."
- Primary: "Trocar linha"
- Secondary: "Tentar de novo"

Reason-specific copy variants:

- Missing route geometry: "Não encontrei o trajeto desta linha para comparar esquerda e direita."
- Direction cannot be confirmed: "Não consegui confirmar o sentido escolhido para esta linha."
- No usable onboard or preview point: "Não encontrei um ponto útil do trajeto para calcular a orientação."
- Advisory service has insufficient data: "As informações disponíveis não permitem recomendar uma lateral com confiança."

Notes:

- True withheld is reserved for cases where useful advice cannot be computed at all.
- Do not use this state for ordinary off-route usage when preview advice can be computed.

### 16. API Error

```text
┌──────────────────────────────┐
│ Algo deu errado              │
│ Não consegui carregar as     │
│ informações agora.           │
│                              │
│ ┌──────────────────────────┐ │
│ │ Tentar de novo           │ │
│ └──────────────────────────┘ │
│ Procurar linha manualmente   │
└──────────────────────────────┘
```

Minimum copy:

- Heading: "Algo deu errado"
- Body: "Não consegui carregar as informações agora."
- Primary: "Tentar de novo"
- Secondary: "Procurar linha manualmente"

Notes:

- Keep the previous selected route/direction visible if the error happens after selection.
- If manual search itself failed, secondary action should be "Usar minha localização" when location is available.

## Accessibility Notes

- Focus order follows the visible flow: heading, body, current route summary if present, selectable rows, primary action, secondary action.
- Route cards and direction rows use button semantics with full accessible labels, for example: "Linha 124 TICEN para Lagoa. Selecionar linha."
- Direction choices include route context in their accessible names, for example: "Linha 124, sentido Lagoa via Trindade."
- The bus orientation diagram has an accessible text equivalent in every result state. Example: "Recomendação: sente à esquerda. O sol direto está do lado direito do ônibus."
- Sun and shade cues use at least two signals: text plus icon, hatch, check mark, border, or pattern. Yellow/blue color alone is never the only distinction.
- Dynamic advice updates are announced politely. Do not use an urgent alert unless the previous recommendation becomes invalid.
- Reduced-motion mode replaces animated loading and diagram settling with static states.
- Sticky bottom actions must not cover content; scroll padding should leave the last card readable above the action area.
- Error and withheld states put the useful recovery action first, not a generic dismiss action.

## Data And Integration Assumptions

- Nearby route candidates are mocked in the wireframe/prototype phase and later come from `sombreado-service`.
- Manual route search requires a route search response that returns route-only choices. Direction options are fetched or included after route selection.
- Direction labels must be rider-facing destinations or neighborhoods. If the service exposes only raw IDs or technical headsigns, frontend implementation should document the gap for `sombreado-service`.
- Route confirmation map depends on Mapbox GL JS, a public token, and route geometry. The fallback confirmation state is required whenever those are unavailable.
- Advisory results need a mode field or equivalent frontend inference for onboard advice, preview advice, and true withheld.
- Route preview advice requires service support for automatic estimated point selection on or near the selected route. V1 must not ask riders to choose a stop, segment, or map point.
- The geometric estimate notice is visible in result states and should not be hidden in settings.

## Acceptance Checklist

- The flow starts onboard-first with location as primary and manual route search as secondary.
- Manual search returns route-only choices and rejoins Direction Choice.
- Route selection happens before Direction Choice.
- Direction is explicit before Route Confirmation.
- Route Confirmation is mandatory, including when the map is unavailable.
- Off-route usage goes directly to a clearly labeled route preview result when an estimated route point can produce advice.
- True withheld is reserved for cases where no useful advice can be computed.
- Onboard and preview results share the same bus orientation diagram structure.
- Preview is distinguished through the mode label and warning/notice copy.
- The result screen leads with a positive seat-area recommendation.
- Empty, slow, denied, map fallback, API error, no directions, preview, and withheld states are all designed.
