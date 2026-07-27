# Production advice matrix

This directory records browser evidence for the production
`OnboardingFlowScreen` result surface. Run:

```bash
npm run test:advice-matrix
```

The runner opens deterministic `/prototype?scenario=<id>` URLs and validates
five recommendation areas (`left`, `right`, `front`, `back`, and `neutral`) in
onboard, route-preview, and recent-location contexts at 360 × 640 and
390 × 844 pixels.

`matrix-results.json` is the machine-readable evidence. It includes layout
measurements, reading order, semantic ledger tones, computed artwork mirroring,
approved-asset SHA-256 integrity, natural and rendered artwork dimensions, and
sampled artwork/rendered-proof pixel landmarks. The pixel evidence specifically
checks the five front/back seat rows, neutral middle alignment, red rear
lanterns, and the front/back recommendation-versus-incidence color reversal.

Representative PNGs cover every artwork variant, all three contexts, long
Portuguese route copy, withheld/error boundaries, and modal focus behavior.
The full run also verifies:

- no document, result, or horizontal overflow;
- no clipped persistent actions or visible result text;
- accessible summaries and meaningful visual reading order;
- estimate/options focus, trap, Escape, backdrop, restoration, and inert
  background behavior;
- reduced-motion computed durations;
- distinct withheld and advice-error boundaries;
- no browser console or page errors.

The JSON and PNGs are generated evidence. Re-run the command after changing the
production result surface, artwork, copy, scenarios, or responsive layout.
