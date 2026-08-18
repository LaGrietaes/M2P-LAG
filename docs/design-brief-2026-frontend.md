# M2P — Frontend Redesign Brief for Graphic Design Team

**Purpose of this document:** explain what M2P *does* and the full scope of its
functionality, states, and constraints — not how it should look. The current
frontend is a functional-but-plain interface built to prove the product out.
We want your team to invent the actual presentation: layout, motion, and
visual system. This document intentionally avoids prescribing screens,
components, or layout so you have room to propose something non-traditional.

Two fixed reference points, not templates:
- **Visual direction:** tactical, glassmorphism-forward, with real "wow"
  moments (ambient/background video, depth, motion) — a 2026-era interface,
  not a 2020 SaaS dashboard.
- **Brand lineage:** M2P is part of the LaGrieta ecosystem
  (lagrieta.es). That site currently presents as a stripped-down,
  monochrome, terminal/broadcast identity — black-on-white, code-like
  typography, ASCII-ish motifs, framed around "rebuilding the signal."
  M2P's design should feel like a sibling to that world (technical,
  editorial, transmission-minded), not a generic consumer app — but you
  have full latitude on how literally or loosely to carry that influence.

Everything below describes the product, not the presentation.

---

## 1. What M2P is

M2P (Media Server 2 Peer) is a **media extraction and acquisition tool**. A
user pastes a URL to a piece of media hosted somewhere else on the web. M2P
inspects that source, lets the user choose exactly what they want from it —
a short clip, the full file, just the audio, just the subtitles — and
produces a clean, downloadable result. It is explicitly **not** a video
editor, not an NLE, not a social platform, and not a hosting service. Its
entire value proposition is captured in one line already used in the
product:

> **SOURCE → DOWNLOAD → PREVIEW → EXTRACT → DELIVER**

The shortest path from "media I found somewhere" to "the exact piece of that
media I need."

### Who uses it, and why

- **Casual/anonymous visitors ("guests")** who want a quick short clip from
  something they found online, with zero signup friction.
- **Registered members of the LaGrieta ecosystem** (the same identity used
  across LaGrieta's other properties) who do this more seriously — longer
  extractions, full downloads, higher-quality encodes, transcripts — and are
  willing to spend a small amount of platform credit to do so.

The product's tone should communicate precision and control over a messy
process (arbitrary internet media in many formats/qualities) — not
playfulness, not a general-purpose consumer tool.

---

## 2. The core pipeline (what actually happens, in order)

Every session moves through this sequence. This is the spine of the product
— whatever layout/interaction model you design still needs to carry a user
through these five states, in this order, even if you don't present them as
literal "screens" or a linear wizard.

1. **Source input** — user provides a URL to media hosted on essentially any
   platform yt-dlp supports (YouTube, and hundreds of other video/audio
   hosts). This is the only required input to start.
2. **Inspect** — the system fetches metadata about that source *without
   downloading the media itself*: title, creator/uploader, thumbnail,
   platform name, duration, original upload date, and the full list of
   technical formats available at the source (resolution, codec, container,
   file size, bitrate, for each). It also reports which subtitle/caption
   tracks exist, in which languages and formats.
3. **Configure the extraction** — the user decides what they actually want
   out of the source. This is a real decision space, not a single button:
   - **Content type:** video, audio-only, or transcript-only.
   - **Video quality tier:** a "Compatible" preset (broadly playable,
     H.264/MP4) or a "High Quality" preset (H.265/HEVC, better
     compression) when the source supports it — plus a resolution choice
     from 720p up to whatever the maximum available quality is.
   - **Audio preset:** MP3, or the original/source audio codec, when
     audio-only is chosen.
   - **Transcript format:** SRT, VTT, or plain text, when transcript-only
     is chosen.
   - **Time range:** for clip extraction, the user marks an in-point and
     out-point within the source's total duration — this is the one place
     a scrubbing/seeking interaction genuinely matters, since users need to
     find the exact moment they want.
4. **Extract** — the system does the actual work: downloads the source at
   the needed quality, cuts/transcodes according to the chosen
   configuration, and produces one output file. This step takes real,
   possibly non-trivial time (seconds to tens of seconds depending on
   source length and quality) — this is a genuine waiting/progress moment
   in the flow, not instantaneous.
5. **Deliver** — the user gets a downloadable result and can start over
   with a new source. Extracted files are not kept indefinitely — they
   expire from the server after a limited window, so "your file is ready,
   here for a while" is an accurate framing, not "saved forever in your
   account."

### A second, parallel path: full source download

Separate from clip extraction, a user (guest or registered) can also choose
to **download the entire original source** rather than a trimmed
clip — e.g. take the whole video/audio file as-is. This is a heavier
operation (bigger files, more resource cost) and is where the guest/
registered distinction and the credit system (below) actually bite.

---

## 3. Who the user is, and what that changes

The product behaves differently depending on identity — this needs to be
*legible* to the user at all times (they should always know their status and
what it's costing/limiting them), even if you don't present it as a literal
account/profile screen.

### Guests (no login)

- Can extract short clips (a small number of seconds) from any source, at no
  cost, with no signup — this is the "try it instantly" path and should
  feel completely frictionless.
- Get **exactly one** full-source download, completely free and with no
  size/quality restriction — a one-time trial of the "real" experience,
  meant to demonstrate value and nudge toward registering.
- Have no account, no history, no persistent identity beyond a
  device-local token that remembers whether they've used their one free
  download.
- Are shown two very light-touch calls to action at all times: a way to
  **register** (which hands off to LaGrieta's own sign-in, not a form
  inside this app) and a way to **buy credit** (see below) — these should
  feel like natural, always-available options, not aggressive paywalls.

### Registered users (LaGrieta identity)

- Identity, role, and credit balance come from LaGrieta's own systems — M2P
  does not manage its own accounts or passwords at all. A registered user
  arrives already "known."
- Have **no duration or file-size limits** — they can extract clips of any
  length, download full sources of any size, request higher-quality
  encodes, and pull transcripts.
- Instead, resource-intensive operations **cost a small amount of platform
  credit** (an in-ecosystem currency, referred to as "B1T$"), roughly
  proportional to how much work the operation actually costs (bigger
  files, longer durations, and heavier encodes cost more; short clips stay
  free). This is a metering/credit mechanic, not a subscription — think
  "pay per heavy lift," not "monthly plan."
- Always have a visible credit balance, and can top it up by purchasing
  more — this purchase flow exists today only as a placeholder (packages
  of credit exist as options, but no real payment is processed yet), so it
  should be designed as a real, first-class flow even though the backend
  behind it isn't live yet.
- If their balance is too low for an operation, they need a clear, calm way
  to understand *why* the action didn't happen and what to do about it (get
  more credit) — this is a real, expected everyday state, not an error
  case to hide.

---

## 4. States a user can actually be in (design for all of these)

Not just the happy path — these are all real, expected states the interface
needs to represent clearly:

- **Nothing entered yet** — the very first thing a visitor sees, before any
  URL is provided.
- **Inspecting** — waiting on the system to fetch metadata about a source
  (this can take a few seconds; sources vary a lot in how fast they
  respond).
- **Source inspected successfully** — full metadata and format/quality
  options are available and the user is choosing what to extract.
- **Source could not be inspected** — the URL was invalid, the source is
  unavailable, requires authentication M2P doesn't have, or simply isn't
  supported. The user needs a clear, non-technical explanation and an easy
  way to try a different URL.
- **Configuring the extraction** — actively picking time range,
  quality/format options.
- **Extracting** — the work is happening; this can take meaningfully long
  for larger/longer sources and should communicate real progress or at
  least credible "this is working" feedback, not just a static spinner.
- **Extraction failed** — something went wrong mid-process (source
  disappeared, format incompatibility, etc.) — again, plain-language
  explanation, easy retry.
- **Result ready** — a completed file is available to download, with a
  visible sense that it won't stay available forever.
- **Blocked by limits** — a guest tries something beyond their allowance
  (too long a clip, already used their free download), or a registered
  user doesn't have enough credit. This needs to explain the limit clearly
  and offer the two ways past it (register / buy credit) without feeling
  punitive.
- **Identity/credit state** — at every point, the user's status (guest vs.
  registered, remaining allowances, credit balance) should be ambiently
  understandable, not something they have to hunt for.

---

## 5. What the product explicitly is *not*, and constraints to design within

- **Not an editor.** No timeline with multiple tracks, no effects, no
  compositing. The only "editing" concept is picking an in/out range on a
  single source and picking an output format — keep this focused, don't
  let the design imply more creative-editing power than the product has.
- **Not a media library or social feed.** There's no browsing, no
  discovery, no feed of other people's extractions. Every session starts
  from a URL the user already has in hand.
- **Minimal persistent state.** Guests have no account at all — just a
  quiet local memory of "have they used their free download." Registered
  users' identity and credit balance live in LaGrieta's systems, not in a
  rich profile inside M2P itself. Don't design around a heavy
  account/dashboard/history model that doesn't exist yet.
- **A real technical decision space, not a toy.** Format/codec/resolution
  choices are genuine, meaningful options sourced from the actual source
  file's real available formats — this isn't a simplified "quality: low/
  high" toggle, there's real technical variety to surface, though *how*
  much of that complexity to expose vs. progressively disclose is very
  much yours to solve.
- **Extraction takes real time.** Don't design as if results are instant;
  the waiting/processing moment for the "extract" step is a real part of
  the experience worth designing deliberately, not glossing over.
- **Cross-platform ambition.** The long-term intent is for this to run
  well as a responsive web app first, with mobile and lightweight desktop
  wrapping possible later — mobile-first responsive behavior matters, this
  shouldn't be a desktop-only design.
- **Uses the LaGrieta identity system, not its own.** Any "sign in" moment
  is a handoff to LaGrieta, not a form M2P owns.

---

## 6. What we're asking the design team to produce

Given everything above — not a prescribed screen list — we want you to
propose:

1. **A non-traditional presentation concept** for how this pipeline
   (source → inspect → configure → extract → deliver) could work as an
   experience, using glassmorphism, ambient/background video, depth, and
   real motion/flair as core material — not applied as decoration on top
   of a conventional form-based layout.
2. **How identity/limits/credit status should be ambiently present**
   throughout, without turning the interface into an account dashboard.
3. **How the "waiting" moments (inspecting, extracting) can be turned into
   a genuine visual/wow moment** rather than a generic spinner — this is
   arguably the single best opportunity for the "flair" you're being asked
   to bring, since it's real dead time in every session.
4. **A point of view on how much of the real technical complexity (codecs,
   resolutions, formats) to show and when** — the data is real and
   available, but you have full discretion on progressive disclosure.
5. Loose visual direction notes (palette, type, motion language) that
   reflect the tactical/glassmorphism brief and the LaGrieta lineage
   described above — this is the one place we do want your point of view
   on "vibe," expressed as a rationale, not just mood-board images.

We're not asking for final screens yet — concept direction, key moments, and
a point of view on the open questions above is the goal of this round.
