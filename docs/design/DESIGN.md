---
name: Sombreado Soft Tech
colors:
  surface: "#faf9f5"
  surface-dim: "#dbdad6"
  surface-bright: "#faf9f5"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f4f4f0"
  surface-container: "#efeeea"
  surface-container-high: "#e9e8e4"
  surface-container-highest: "#e3e2df"
  on-surface: "#1b1c1a"
  on-surface-variant: "#464742"
  inverse-surface: "#2f312e"
  inverse-on-surface: "#f2f1ed"
  outline: "#777871"
  outline-variant: "#c7c7bf"
  surface-tint: "#5f5e5c"
  primary: "#171816"
  on-primary: "#ffffff"
  primary-container: "#2c2c2a"
  on-primary-container: "#949390"
  inverse-primary: "#c8c6c3"
  secondary: "#695d44"
  on-secondary: "#ffffff"
  secondary-container: "#f1e1c0"
  on-secondary-container: "#6f6349"
  tertiary: "#011928"
  on-tertiary: "#ffffff"
  tertiary-container: "#172e3d"
  on-tertiary-container: "#7f96a8"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e5e2df"
  primary-fixed-dim: "#c8c6c3"
  on-primary-fixed: "#1b1c1a"
  on-primary-fixed-variant: "#474744"
  secondary-fixed: "#f1e1c0"
  secondary-fixed-dim: "#d4c5a6"
  on-secondary-fixed: "#221b07"
  on-secondary-fixed-variant: "#50462e"
  tertiary-fixed: "#cee5fa"
  tertiary-fixed-dim: "#b2c9dd"
  on-tertiary-fixed: "#051e2c"
  on-tertiary-fixed-variant: "#334959"
  background: "#faf9f5"
  on-background: "#1b1c1a"
  surface-variant: "#e3e2df"
  muted-text: "#8D8D8A"
  accent-yellow: "#FFF1B5"
typography:
  display-lg:
    fontFamily: newsreader
    fontSize: 48px
    fontWeight: "500"
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: newsreader
    fontSize: 36px
    fontWeight: "500"
    lineHeight: 44px
  headline-md:
    fontFamily: newsreader
    fontSize: 32px
    fontWeight: "500"
    lineHeight: 40px
  headline-sm:
    fontFamily: newsreader
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  body-lg:
    fontFamily: hankenGrotesk
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  label-md:
    fontFamily: hankenGrotesk
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: hankenGrotesk
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is rooted in "Soft Tech Minimalism," a style that balances the precision of modern technology with the warmth of editorial design. It is crafted for users who value focus, clarity, and a tactile sense of quality. The aesthetic avoids the coldness of traditional tech interfaces, instead opting for an inviting, sophisticated environment that feels like a premium digital journal.

The style is characterized by:

- **Minimalism:** Aggressive use of negative space to reduce cognitive load and highlight high-quality content.
- **Editorial Influence:** Strong typographic hierarchy and a sophisticated, warm color palette that mimics physical media.
- **Human-Centric Tech:** Softened geometric shapes and subtle transitions that make digital interactions feel more natural and less mechanical.

## Colors

The palette is anchored by **Warm Alabaster**, providing a soft, non-reflective background that reduces eye strain compared to pure white. **Dark Charcoal** serves as the primary ink color, ensuring high legibility while maintaining a softer contrast than pure black.

- **Primary:** Use for high-contrast text, primary iconography, and structural lines.
- **Secondary (Sun Tan):** Reserved for subtle highlights, secondary buttons, or background surfaces that need to stand out from the alabaster base.
- **Tertiary (Soft Blue):** Used sparingly for interactive hints, success states, or to denote specific technical features.
- **Muted Accents:** Used for metadata, secondary labels, and decorative borders to maintain a hierarchy without clutter.

## Typography

This design system employs a serif-on-sans pairing to evoke an editorial, high-end feel.

**Newsreader** is the voice of the brand, used for headings and display text to provide a literary, authoritative character. **Hanken Grotesk** (serving as the substitute for Satoshi) provides a clean, highly legible foundation for functional UI elements, body copy, and labels.

Maintain generous line heights to ensure a "breathing" layout. Use optical sizing for Newsreader when possible to preserve the elegance of the serifs at larger scales.

## Brand Signature

The canonical Sombreado lockup is defined by `docs/design/screens/in_cio_dual_flow_minimal/code.html`. It pairs a 32px circular sun-and-shadow mark (`#1E1E1C` and `#FDFCF8`) with the `#2C2C2A` Newsreader wordmark “Sombreado” at 18px and weight 700. Preserve these literal colors, geometry, spacing, and tight tracking; do not convert it into the bus-side split diagram motif or recolor it through generic UI tokens.

The bus-side split motif remains the signature diagram language for recommendations and direct-sun explanation. It is a product visual, not the logo.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach for desktop to preserve the editorial integrity of the content, while transitioning to a fluid model for mobile.

- **Rhythm:** An 8px base unit governs all spacing.
- **Margins:** Intentional "waste" of space is encouraged. Use wide outer margins (64px+) on desktop to center the user's focus.
- **Grid:** A 12-column grid on desktop, 4-column on mobile.
- **Padding:** Internal component padding should be generous—prioritize airiness over density.

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Tiers:** Use the secondary color (#E5D5B5) at very low opacities (5-10%) to create subtle depth for cards and containers.
- **Outlines:** Instead of shadows, use 1px solid borders in the muted accent color (#8D8D8A) at 20% opacity to define boundaries.
- **Depth:** When elevation is required for interaction (e.g., a floating menu), use a "Soft Ambient Shadow": a very large blur (32px+) with extremely low opacity (4%) using the Dark Charcoal hex to mimic a natural, soft light source.

## Shapes

The shape language is defined by "Soft Corners." Standard UI components use a 16px radius (1rem) to create a friendly, approachable feel that contrasts with the sharp serifs of the typography.

- **Standard Elements:** 16px radius.
- **Large Containers:** 24px radius.
- **Small Elements (Chips/Tags):** 8px or fully pill-shaped depending on the content density.

## Components

### Buttons

Primary buttons should be solid Dark Charcoal with Warm Alabaster text, using the 16px corner radius. Secondary buttons should use a Sun Tan background with Charcoal text. Avoid gradients.

### Cards

Cards should have no shadow by default. Use a 1px muted border or a subtle fill change from the background. Padding inside cards should be at least 24px.

### Input Fields

Inputs should be minimalist: a simple bottom border or a very light fill. Focus states should be indicated by a shift to the Soft Blue tertiary color, rather than a thick outline.

### Chips & Tags

Use the Soft Blue or Sun Tan colors at 15% opacity for backgrounds with full-opacity text of the same hue. This keeps the "Soft Tech" feel without introducing high-contrast noise.

### Lists

Lists should be separated by thin, muted horizontal rules. Include significant vertical padding (16px+) between list items to maintain the editorial rhythm.
