# Production advice matrix

This directory records browser evidence for the production
`OnboardingFlowScreen` result surface. Run:

```bash
npm run test:advice-matrix
```

The runner is a local layout harness: it boots `npm run dev` and opens
deterministic `/prototype?scenario=<id>` URLs. It does not build or smoke-check
the Cloudflare Worker artifact. It validates
five recommendation areas (`left`, `right`, `front`, `back`, and `neutral`) in
onboard, route-preview, and recent-location contexts at 360 × 640 and
390 × 844 pixels.

`matrix-results.json` is the machine-readable evidence. It includes retained
rectangles for the primary, options, and estimate targets; layout measurements;
reading order; semantic ledger labels and tones; computed artwork mirroring;
approved-asset SHA-256 integrity; and natural and rendered artwork dimensions.
Screenshot samples are taken from the composited proof grid at the rendered
seat-row, rear-lantern, and semantic-field coordinates. They verify all five
front/back seat rows, the neutral middle, red rear lanterns, side/neutral field
colors, and the front/back recommendation-versus-incidence reversal.

Representative PNGs cover every artwork variant, all three contexts, long
Portuguese route copy, withheld/error boundaries, and modal focus behavior.
The full run also verifies:

- no document, result, or horizontal overflow;
- 56px primary and at least 48px options/estimate targets, fully in view;
- no clipped persistent actions or visible result text;
- accessible summaries and meaningful visual reading order;
- estimate/options focus, trap, Escape, backdrop, restoration, and inert
  background behavior at both viewports;
- 48px estimate/options sheet Close targets and 300ms standard entrance motion;
- reduced-motion computed durations at both viewports;
- visually hidden polite advice announcements that combine context and result
  summary;
- distinct withheld and advice-error boundaries, with retained per-viewport
  overflow, clipping, overlap, action-target, and action-rectangle records;
- retained focus, inert, restoration, trap, and reduced-motion values;
- no browser console or page errors.

The JSON and PNGs are generated evidence. Re-run the command after changing the
production result surface, artwork, copy, scenarios, or responsive layout.
