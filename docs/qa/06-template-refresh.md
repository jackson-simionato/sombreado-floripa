# 06 Template Refresh QA

Issue #15 final QA matrix for the template-driven Onboard Flow refresh.

## Runtime And Sources

- Product runtime: `/` uses the live browser API client.
- QA runtime: `/prototype` uses fixtures and exposes the scenario switcher.
- Visual targets: `docs/design/screens/` templates are composition references,
  not copied markup or new interaction specifications.
- Review widths: 360px and 390px. Use a mobile-height viewport that leaves the
  sticky actions visible while checking the first meaningful screen viewport.

## Template Matrix

| Template                         | Runtime target                     | Prototype scenarios                                                                                                                                                                 | QA focus                                                                                            |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `in_cio_dual_flow_minimal`       | Location request                   | `location-request`                                                                                                                                                                  | Hero hierarchy, honest less-direct-sun copy, abstract bus-side motif, primary and secondary actions |
| `linhas_pr_ximas_simplified`     | Nearby route selection             | `routes-nearby`                                                                                                                                                                     | Route-card scanability, route-only selection, manual-search escape hatch                            |
| `escolha_sua_linha_standardized` | Manual route search and no results | `manual-search`, `manual-search-empty`                                                                                                                                              | Search label and input fit, result cards, retry and location actions                                |
| `escolha_o_sentido_warm`         | Direction choice                   | `direction-choice`                                                                                                                                                                  | Destination/neighborhood labels, selected-route context, direction-change path                      |
| `confirme_sua_linha_com_mapa`    | Route confirmation                 | `confirmation`, `confirmation-fallback`                                                                                                                                             | Compact route context, supportive schematic map, fallback without map-led navigation                |
| `recomenda_o_warm`               | Advice result surfaces             | `advice-onboard-left`, `advice-onboard-right`, `advice-onboard-front`, `advice-onboard-back`, `advice-preview`, `advice-neutral-overhead`, `advice-neutral-none`, `advice-withheld` | Recommendation-first hierarchy, mode distinction, diagram anatomy, non-color cues, estimate notice  |

## Derived-State Coverage

The following states derive from the shared shell, header, card, notice, and
sticky-action system rather than a one-to-one template:

| Derived state                      | Prototype scenarios                                                                                | Required review                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Nearby loading and slow loading    | `location-finding-nearby`, `location-slow-loading`                                                 | Loading copy remains legible; recovery control stays reachable                          |
| Location recovery and nearby empty | `location-denied`, `routes-none-nearby`                                                            | Manual-search escape hatch is prominent and copy remains rider-facing                   |
| Direction unavailable              | `direction-unavailable`                                                                            | Route context and route/manual recovery actions remain clear                            |
| Advice computation                 | `advice-computing`                                                                                 | Progress state does not hide the route or the route-change action                       |
| API failures                       | `error-nearby-routes`, `error-manual-search`, `error-directions`, `error-geometry`, `error-advice` | Heading, retained context, retry, and source-appropriate secondary recovery are visible |

## Manual Mobile Review

For every scenario above, review at both 360px and 390px widths:

- Typography: headings, route labels, route names, direction labels, notices,
  and Portuguese action labels do not clip, overlap, or truncate essential
  meaning.
- Vertical rhythm: the title, supporting copy, cards, and notices remain
  visually grouped; no large accidental gaps or crowded transitions appear.
- Button hierarchy: one primary action is visually dominant where present;
  secondary actions remain clearly actionable without competing with it.
- Sticky actions: primary and secondary actions remain visible above the safe
  area, do not obscure essential controls, and can be reached after scrolling.
- Bus diagrams: entry remains an abstract hint; result diagrams clearly show
  bus anatomy, front/back or left/right orientation, corridor, recommended
  area, direct-sun area, and text cues beyond color.
- Result states: onboard, preview, neutral, and withheld states are distinct
  in text and structure; no withheld or neutral state implies a seat-side
  recommendation; the geometric estimate notice remains visible.
- Accessibility: keyboard focus stays visible; reduced-motion preferences do
  not remove necessary information or leave the layout in an unusable state.

## Automated Coverage

`tests/prototype-scenarios.test.tsx` renders every listed scenario and asserts
contractual headings and recovery actions. `tests/bus-diagrams.test.tsx`
covers the entry abstraction, result bus anatomy, non-color callouts, neutral
behavior, and compact rendering.

## Completion Gate

Run from the repository root:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Verified on 2026-07-10 from `develop` at `c75f6ba`:

- `npm run format:check`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- `npm run test`: passed with 12 test files and 180 tests.
- `npm run build`: passed; `/` and `/prototype` prerender successfully.

The parent PRD, issue #9, remains open and is not modified by this QA slice.
