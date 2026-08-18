---
name: M2P Tactical Media System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9ccb2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#84967e'
  outline-variant: '#3b4b37'
  surface-tint: '#00e639'
  primary: '#ebffe2'
  on-primary: '#003907'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#006e16'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#f9f9f9'
  on-tertiary: '#2f3131'
  tertiary-container: '#dcdddd'
  on-tertiary-container: '#5f6161'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Chivo
    fontSize: 72px
    fontWeight: '900'
    lineHeight: 72px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Chivo
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Chivo
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
  data-primary:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: -0.01em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  gutter: 16px
  margin-edge: 32px
  panel-gap: 1px
---

## Brand & Style
The design system for this product is a tactical, high-fidelity interface designed for 2026-era media extraction and signal processing. It draws heavily from the "LaGrieta" technical lineage, prioritizing a "rebuilding the signal" aesthetic that feels both broadcast-ready and clandestine.

The visual direction is **Extreme Glassmorphism** layered over a monochromatic, data-dense environment. The UI should evoke a sense of high-precision instruments operating in a vacuum—cold, focused, and authoritative.

Key aesthetic drivers:
- **Optical Depth:** Multiple levels of translucent surfaces with 32px to 64px backdrop blurs.
- **Tactical Utility:** A "Transmission-minded" layout where every pixel serves a function, avoiding decorative elements that don't imply data or status.
- **Micro-Textures:** Subtle "frosted" grain overlays on glass surfaces to simulate physical lens or sensor surfaces.
- **Signal Narrative:** UI elements should appear as if they are being synthesized or scanned onto the screen, utilizing light-leak gradients on borders to suggest energy and active data flow.

## Colors
The palette is rooted in a "Phosphor-on-Black" monochrome philosophy to ensure maximum focus during low-light tactical operations.

- **Primary (Phosphor Green):** Used exclusively for critical actions, active transmission states, and successful data validation. It represents the "Signal."
- **Neutrals:** A range of charcoal grays and deep blacks (True Black #000000 for the background) to provide the necessary contrast for glass effects.
- **Surface Tints:** Glass panels are tinted with a 5% white or 5% primary color overlay to differentiate layered stacks.
- **Accents:** Use a high-contrast white for editorial headlines to maintain a "New York Times Tactical" hybrid feel.

## Typography
This design system employs a "Hybrid-Technical" typographic scale.

- **Editorial Headlines:** Use **Chivo** for large-scale impact. It should feel heavy, urgent, and authoritative. Headlines should often be presented in uppercase or tight-tracked heavy weights to mimic broadcast title cards.
- **Technical Data:** Use **JetBrains Mono** for all functional UI, metadata, timestamps, and coordinates. The monospaced nature ensures that fluctuating data strings (like file sizes or bitrates) do not cause layout shifts.
- **Visual Hierarchy:** Maintain a strict contrast between the massive, sans-serif headlines and the small, precise monospaced labels.

## Layout & Spacing
The layout follows a **Fixed-Grid System** inspired by military heads-up displays (HUDs). 

- **Grid:** A 12-column grid for desktop with 1px "light-leak" dividers instead of traditional wide gutters.
- **Density:** High information density is required. Use tight 4px increments for internal component spacing.
- **Margins:** Large outer safe-areas (32px+) create a "viewfinder" effect, pushing the content toward the center or pinning it to specific technical corners.
- **Adaptation:** On mobile, the grid collapses to 4 columns, and glass panels become full-width to maximize the legible area for data-dense tables.

## Elevation & Depth
Elevation in this design system is achieved through **refraction and blurring** rather than shadows.

- **Surface 1 (Base):** True black or ambient signal-noise background.
- **Surface 2 (Glass Layer):** 12% opacity white fill, 32px backdrop-filter: blur, 0.5px solid border (white at 20% opacity).
- **Surface 3 (Active/Raised):** 18% opacity white fill, 64px backdrop-filter: blur, 0.5px "light-leak" border (gradient from primary to transparent).
- **Shadows:** Avoid traditional drop shadows. Use a subtle 10px outer glow in the primary color (#00FF41) only for high-alert or selected states to simulate a glowing cathode-ray tube (CRT) effect.

## Shapes
The shape language is **Sharp (0px)**. 

Every element—cards, buttons, inputs, and selections—must have 90-degree angles. This reinforces the "Tactical/Technical" narrative and suggests a system built for speed and precision rather than consumer comfort. The only exception is the use of circular "Record" or "Signal" status indicators.

## Components

- **Glass Cards:** Razor-thin borders (0.5px). Use a linear gradient for the border: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)`.
- **Tactile Sliders:** For time-range clipping, use a 1px vertical line as a thumb and a primary-colored glow for the selected range. The track should be a 1px subtle gray line.
- **Data-Dense Tables:** No row backgrounds; use 0.5px horizontal separators. All numeric data must be right-aligned and monospaced.
- **Action Buttons:** Ghost-style by default with 0.5px borders. On hover, the background fills with a 10% primary color tint and a 1px primary glow.
- **Inputs:** Underline-only style or fully boxed with 0.5px borders. Include a "Scanline" animation when the input is focused.
- **Progress Bars:** Use a "Segmented" style (blocks of color) instead of a continuous fill to mimic legacy signal strength meters.