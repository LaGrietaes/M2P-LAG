# M2P — Frontend Visual Redesign (Tactical/Glassmorphism System)

**Date:** 2026-08-09
**Status:** Draft, pending user review of this document

## 1. Context

`docs/design-brief-2026-frontend.md` asked the design team for a non-traditional,
glassmorphism-forward visual concept for M2P's five-stage pipeline
(source → inspect → configure → extract → deliver), in the visual lineage of the
LaGrieta ecosystem. The design team returned four static Stitch-generated HTML/CSS
mockups plus a design-token doc, all under
`M2P Brand/stitch_m2p_interface_redesign/`:

- `m2p_terminal_home_branded/` — Source input screen
- `m2p_technical_inspection_branded/` — Configure screen
- `m2p_signal_extraction_pixel_grid/` — Extract (waiting) screen
- `m2p_delivery_node_branded/` — Deliver screen
- `m2p_tactical_media_system/DESIGN.md` — design tokens (phosphor-green HUD system)

This spec defines how that concept gets adapted and integrated into the real app at
`apps/web` (React 19 + Vite + Tailwind, 16 source files, single-route/view-state SPA —
see `apps/web/src/routes/Landing.tsx`). It **supersedes §5 (GUI redesign) only** of
`docs/superpowers/specs/2026-08-09-audit-monetization-redesign-design.md`, whose §2–§4
(bug fixes, credit/quota logic, guest free-download, Buy B1T$ modal) are already
implemented and unaffected by this work — this spec builds on top of that backend/data
layer, not around it.

### What we found auditing the mockups

The mockups are usable as a starting point (real portable Tailwind/CSS, not just
pictures) but are not implementation-ready as-is:

- Each of the 4 screens drifted to a **different accent color** (`#00FF41` per
  DESIGN.md, `#ff0000`, `#ffb4ab`, `#ef4444` — one per screen). Not usable as one system
  without reconciling.
- Two screens still contain an **unresolved Stitch template placeholder**
  (`{{DATA:DOCUMENT:DOCUMENT_2}}`) where the logo should render.
  `m2p_terminal_home_branded`'s header also has garbled/overlapping identity-badge text.
- The Configure mockup's "Video Quality" control is a **fixed LOW/MED/HIGH/4K button
  set**, which directly contradicts the brief's explicit requirement that quality
  options be real, source-derived data — not a simplified toggle.
- None of the 4 mockups show **content-type selection** (video/audio/transcript), the
  **audio-preset or transcript-format pickers**, or the **full-source-download** path —
  all required by the brief but absent from what was delivered.
- The Extract mockup's live percentage and "SYS_EVENTS" log (`Decrypting payload
  chunk...`, hex addresses) are cosmetic — the real backend has no in-flight job
  progress today (`services/api` runs extraction synchronously in the request handler
  and writes the job record only after completion; see §5 below).

## 2. Decisions from stakeholder review

- **Palette:** drop DESIGN.md's phosphor-green-dominant scheme. Use a light/dark
  theme-capable system, **dark as default**: near-black background with a navy hue
  (not true `#000`), black/white as the primary text/surface pair, red used only as a
  **sparse accent** (CTAs, active/live state, errors) — not the dominant color the way
  green or `#ff0000` were in the mockups. Light mode is a straightforward inversion
  (white bg, near-black text, same accent) — correct and usable, not separately
  art-directed. This is a continuation of the existing `brand-red` (`#a00000`) direction
  already in `tailwind.config.js`/`index.css`, extended with real theme support (today
  the app hardcodes `color-scheme: dark` with no light mode at all) and the
  glass/blur/mono-type language from the mockups layered on top.
- **Format/quality disclosure:** Configure's "Standard" tab shows resolution options
  **generated from the source's real `InspectResponse.formats`** (not fixed labels),
  plus a Compatible(H.264)/High-Quality(H.265) preset choice per the brief's actual
  language. "Advanced" reveals the full real format-matrix table.
- **Content type:** a top-level Video/Audio/Transcript switch on the Configure screen,
  independent of quality/format choice below it.
- **Clip vs. full source:** a Clip/Full-Source mode switch on the Configure screen,
  independent of content type. Full Source hides the time-range controller and shows
  guest-allowance or B1T$-cost implications instead.
- **Extract progress data:** this round ships the Extract screen against an **interim,
  honest indeterminate-progress contract** (see §5) — not real backend percentages. A
  separate future spec covers converting extraction to background/async job execution
  with real progress capture; this spec's Extract screen is built so that swap is a data
  -source change, not a redesign.

## 3. Visual system

Tokens land in `apps/web/tailwind.config.js` (extended, not replaced) and
`apps/web/src/index.css` (CSS custom properties), replacing the current flat
`brand-red`/charcoal/ink set and the `.hud-*` utility classes with a superset:

- **Color roles:** `background` / `surface` / `surface-elevated` (glass panel tint),
  `text-primary` / `text-secondary`, `accent` (red, sparse use only), `accent-error`
  (visually distinct from `accent` — reusing the same red for both actions and errors
  was a real risk we're avoiding), `border-subtle`. Each role gets a dark-mode value and
  a light-mode value; dark is default via `prefers-color-scheme` + a manual override
  class (`data-theme="dark"|"light"` on `<html>`), matching the existing
  `color-scheme` pattern in `index.css` but no longer hardcoded to dark-only.
- **Typography:** Chivo (display/headline, heavy weights, tracked-out uppercase for
  titles) + JetBrains Mono (all data readouts, labels, timestamps — kept from
  DESIGN.md, matches the brief's "technical/editorial" direction independent of color).
  Self-hosted or `@fontsource` rather than the mockups' Google Fonts CDN `<link>` tags
  (no runtime CDN dependency).
- **Depth/glass:** retain backdrop-blur panels (`.glass-panel`, `.glass-panel-active`
  equivalents), 0.5px borders, sharp 0px corners, corner-bracket accents — these read
  fine in both themes with per-theme opacity/blur tuning, not per-component forking.
- **Motion:** scanline-on-focus inputs, hover-sweep buttons, and the pixel-grid
  extraction animation are pure CSS/small-state-driven — no new animation library
  dependency.
- **Accessibility:** WCAG AA contrast is a hard constraint for all body/readout text in
  both themes — carried over unchanged from the prior redesign spec's constraint, since
  glass/glow effects must stay decorative layers behind text, never the text's only
  distinguishing treatment.

## 4. Component architecture

No `components/ui/` primitives kit exists today (`apps/web/src/components/` is a flat,
bespoke folder). This introduces one:

```
apps/web/src/components/ui/
  Panel.tsx        — glass panel; variants default/active/bordered; replaces .hud-panel
  Button.tsx        — replaces .hud-button; variants primary/ghost/danger
  StatusBadge.tsx    — small pill, used for identity/balance/status readouts
  FormatTable.tsx    — data-dense right-aligned table ("format matrix" pattern),
                        reused by Configure's Advanced tab
  ThemeToggle.tsx    — light/dark switch, persists choice to localStorage
```

Existing feature components are restyled in place onto the new tokens/primitives, not
rewritten:

- `UrlInput.tsx` — Source screen input; scanline-focus effect, corner accents.
- `SourceCard.tsx` — gains the video-preview-frame treatment (thumbnail, REC//LIVE-style
  corner HUD) and hosts the new Configure UX (§ below).
- `ClipEditor.tsx` — becomes the "Extraction Controller" panel: time-range control plus
  the new content-type and clip/full-source switches.
- `ProgressRail.tsx` — restyled as a persistent left-nav pipeline stepper
  (Source/Inspect/Configure/Extract/Deliver), replacing the current top-of-content thin
  rail, matching the mockups' sidebar pattern.
- `AuthStatus.tsx` / `BuyB1tModal.tsx` — logic unchanged (already correct per the prior
  spec), restyled: identity/balance readout moves into the persistent sidebar.

New components for previously-missing screens:

- `ExtractionProgress.tsx` — the pixel-grid "wow moment," ported from
  `m2p_signal_extraction_pixel_grid/code.html` (its vanilla-JS percentage/class-toggle
  logic maps directly to React state/`useEffect`). Driven by the interim progress
  contract (§5).
- `DeliverPanel.tsx` — extracted from `Landing.tsx`'s current inline result block;
  result summary, download CTA, countdown timer wired to real file-expiry data (not the
  mockup's hardcoded 24h).

`Landing.tsx` keeps its `ViewState` view-switching model (`input | source | extractor |
result`, extended with an explicit `configure` and `extracting` state to match the
5-stage pipeline the sidebar now displays) — no routing overhaul; this is consistent
with the app's current small, single-page shape.

## 5. Screen-by-screen behavior

### Source input
Centered glass card; pipeline breadcrumb (SOURCE → DOWNLOAD → PREVIEW → EXTRACT →
DELIVER); single URL field with scanline-focus; "INITIATE INSPECTION" CTA. Identity/
allowance HUD (guest vs. registered, free-download status, B1T$ balance) lives in the
persistent sidebar, not the top bar — this also fixes the mockup's garbled overlapping-
header rendering bug, which was a mockup artifact, not an intentional layout.

### Configure (replaces/extends the current `source` + `extractor` views)
8/4 column split (stacked on mobile): left = video preview + format controls, right =
Extraction Controller.

- Top-level switches (independent of each other): **Clip / Full Source**, and
  **Video / Audio / Transcript**.
- Video content type: Standard tab shows resolution chips generated from the source's
  real `formats[]` plus a Compatible/High-Quality preset; Advanced tab shows the full
  format-matrix table (`FormatTable.tsx`).
- Audio content type: MP3 vs. source/original codec choice.
- Transcript content type: SRT / VTT / plain-text choice.
- Clip mode: IN_MARK/OUT_MARK time-range controller (tactile slider + numeric readouts,
  consistent with the numeric-input approach already decided in the prior spec's bug
  fix for the broken video-scrub preview — no scrub-bar dependency introduced here).
- Full Source mode: time-range controller replaced with an "entire source" readout and
  the applicable guest-allowance/B1T$-cost note.
- Extraction Controller panel always shows identity status (balance) and an estimated
  cost readout that updates as choices change; the exact cost-estimation function is an
  implementation-plan detail (it must reuse the existing `CreditService` cost table from
  the prior spec, not invent a new one).

### Extract (waiting) — new screen, the brief's flagged "wow moment"
Ported from `m2p_signal_extraction_pixel_grid/code.html`: central pixel-grid gauge,
percentage readout, speed/tasks stat bar, side event-log panel. Interim data contract
for this round (no backend changes in this spec):

- While the extract/download request is in flight (`useMutation().isPending`), the
  pixel-grid fill eases toward ~90% on a fixed timer curve, then jumps to 100% when the
  request resolves — the same "credible progress without real data" pattern used by
  common deploy-status UIs. This is **not** presented as a real percentage from the
  server; it's a deliberately-designed indeterminate state wearing the mockup's visual
  language.
- The SYS_EVENTS side panel is kept as clearly-generic ambient flavor text (e.g.
  connection/buffer-style messages that don't imply per-chunk backend telemetry that
  doesn't exist) rather than the mockup's oddly-specific fake log lines.
- This component's data source is isolated behind a small interface
  (`useExtractionProgress` hook or similar) specifically so a future real-progress
  backend (separate spec) swaps in without touching the visual component.

### Deliver
Ported from `m2p_delivery_node_branded/code.html`: result summary (format/resolution/
duration from the real `ExtractResponse`), download CTA, countdown timer wired to real
expiry data. `ExtractResponse` (`apps/web/src/types/index.ts`) currently only has
`file_id`/`status`/`message` — no `expires_at`. `JobResponse` has `expires_at`, but
`Landing.tsx` never calls `getJob()` today. This spec requires either extending
`ExtractResponseSchema` with `expires_at` (small backend/type change, in scope here
since it's a static value returned once, not live progress) or having the Deliver view
call `getJob(file_id)` once on mount to read it — implementation plan decides which;
until then the countdown timer must not render a fabricated duration.

### Error / blocked states (not covered by any mockup, required by the brief)
Reuse the same Panel/Button language with the `accent-error` token: inspect-failed,
extract-failed, and blocked-by-limits (insufficient B1T$ / guest limit reached) all
render as a Panel with plain-language explanation, retry CTA, and — for blocked-by-
limits specifically — the standing register/buy-credit CTAs the brief requires to
always be available, not just on this screen.

## 6. Non-goals

- Real backend job progress / async execution — separate future spec; this round's
  Extract screen uses the interim indeterminate contract described in §5.
- Any change to the credit/quota/guest-token backend logic, `CreditService`, or
  `BuyB1tModal` purchase flow — already implemented per the prior spec, reused as-is.
- Routing changes (`react-router` stays effectively single-route; pipeline stages remain
  view-state driven, not URL-driven).
- A fully separately-art-directed light theme — light mode is a correct inversion of
  dark, not an equally bespoke second design pass.
- Mobile-specific novel interactions beyond responsive collapse of the existing layouts
  (brief requires mobile-first responsive behavior, not a distinct mobile design).
