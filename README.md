# Vela

A comprehension-first hybrid RSVP reader for desktop. Words flash at a fixed anchor point on the left; the full source document scrolls independently on the right. The read-head is decoupled from scroll position, so you can browse, check a footnote, or re-read a passage without losing your place in the stream.

Free, open-source, and local-first: no accounts, no tracking, everything runs in your browser.

---

## What makes it different

Every other RSVP reader treats a document as a flat one-word-at-a-time stream. Vela gives you both panes at once:

- **RSVP stage (left)** flashes the current word(s) with a fixed anchor character that your eye locks onto.
- **Source pane (right)** shows the full document. Already-read words are faded or dimmed; the current word is underlined or highlighted. You can scroll freely and the playback keeps running.
- **Return to live** appears whenever you scroll away from the read-head. One click snaps you back.
- **Click any word** in the source pane to set the read position.
- **Section chips** across the top of the source pane let you jump directly to headings.

---

## Reading modes

| Mode | WPM range | Default | Notes |
|---|---|---|---|
| Comprehend | 150-350 | 250 | Paced for dense or unfamiliar material |
| Accelerate | 350-600 | 450 | Comfortable for familiar text |
| Skim | 600-1200 | 800 | Progress cues strengthened; instant rewind available |

Above 500 wpm an inline notice warns that comprehension typically degrades on dense text. This is non-blocking and user-dismissible.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `Left` / `Right` | Skip 1 chunk |
| `Shift + Left / Right` | Skip 10 chunks |
| `Up` / `Down` | WPM +10 / -10 |
| `Esc` | Pause |

---

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

The app opens on `http://localhost:3000`. Three sample documents (article, academic paper, longform) are bundled and load without any network access.

To run tests:

```bash
bunx vitest run
```

To build for production:

```bash
bun run build
```

---

## Architecture

The codebase is split into three layers that must stay strictly separated:

```
src/core/          Pure TypeScript. No React, no DOM.
                   Tokenisation, anchor maths, dwell maths, engine reducer.
                   Everything here is unit-tested and framework-portable.

src/lib/           React adapters. Context, hooks.
                   Owns localStorage persistence and the rAF loop integration.
                   No maths. No direct DOM access beyond what hooks provide.

src/components/    Presentation. Stateless or near-stateless views.
                   Styled exclusively through semantic CSS tokens.
                   No hardcoded colours.
```

The engine is driven by `requestAnimationFrame` with an injectable clock so the timing loop is fully unit-testable with a manual scheduler.

### Key files

| File | Role |
|---|---|
| `src/core/types.ts` | All public type contracts |
| `src/core/orp.ts` | Anchor-point pivot table |
| `src/core/dwell.ts` | Per-chunk timing maths |
| `src/core/advance.ts` | Pure reducer: state + elapsed time to next state |
| `src/core/engine.ts` | rAF-driven wrapper with injectable clock |
| `src/core/tokeniser.ts` | Plain text and Markdown to `DocumentModel` |
| `src/core/sources/` | `SourceProvider` interface + sample, PDF, paste, URL providers |
| `src/lib/preferences/PreferencesContext.tsx` | Global preferences + CSS variable projection |
| `src/lib/reader/useReader.ts` | Engine-to-React glue |
| `src/lib/reader/useViewport.ts` | Independent scroll state for the source pane |
| `src/components/VelaApp.tsx` | Composition root |
| `src/components/RSVPStage.tsx` | Anchor rendering + progress bar |
| `src/components/SourcePane.tsx` | Full document view with read-head sync |
| `src/styles.css` | Semantic design tokens for light, sepia, and dark themes |

---

## Preferences

Every visual and pacing parameter applies live and persists to `localStorage`. Full list:

**Reading:** Mode, WPM (100-1200), Chunk size (1/2/3 words), Punctuation pauses + intensity, Extra dwell on long words and numerals, Academic cap warning.

**Anchor:** Show / hide, Colour (presets + custom), Weight (normal / bold).

**Typography:** RSVP stage font family + size; source pane font family, size, and line height.

**Source pane:** Current-word indicator (underline / highlight), Underline thickness, Read-word treatment (fade / dim / none), Section chips, Auto-follow.

**Appearance:** Theme (Light / Sepia / Dark / System), Accent colour, Split ratio, Progress bar, Reduced motion.

---

## Themes

Three themes: **Light** (near-white), **Sepia** (warm cream, Kindle-style), and **Dark** (near-black with lifted surfaces). All colours flow through semantic CSS tokens; components never touch raw colour values. The default accent is a restrained slate-teal. Red is explicitly avoided as an accent.

---

## Testing

57 Vitest tests covering the entire pure core:

- `orp.test.ts` -- anchor pivot table
- `dwell.test.ts` -- timing maths across all multipliers
- `tokeniser.test.ts` -- word splitting, punctuation, abbreviation handling
- `engine.test.ts` -- deterministic rAF loop with a manual clock
- `preferences.test.ts` -- localStorage round-trip
- `chunkAnchor.test.ts` -- multi-word chunk anchor logic
- `wpmMode.test.ts` -- mode ranges and defaults

Run with `bunx vitest run`. Treat a test failure as a behaviour change to discuss, not a test to delete.

---

## Tech stack

- [Vite](https://vite.dev) + [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TailwindCSS v4](https://tailwindcss.com) with semantic CSS custom properties
- [TanStack Router](https://tanstack.com/router) (single route, SSR disabled)
- [Bun](https://bun.sh) for package management and scripts
- [Vitest](https://vitest.dev) with jsdom for unit tests
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) for client-side PDF parsing (provider wired; reading-order pass in progress)
- [lucide-react](https://lucide.dev) for icons

---

## What is not yet implemented

These are intentional stubs or explicitly out of scope:

- Real PDF reading-order extraction (`pdfProvider.ts` loads but column-detection is not complete)
- URL fetch and article extraction (`urlProvider.ts` is stubbed)
- EPUB, camera scan, OCR
- Accounts, sync, cloud storage
- Mobile layout (the split pane assumes a desktop viewport; below approximately 900 px it is unusable by design for v1)
- Focus mode (hide chrome during playback)
- Tinted overlays (Irlen-style accessibility aid)

---

## Conventions

- **UK spelling** in all user-facing copy (`Colour`, `Behaviour`, `Recognise`). Code identifiers follow library conventions (US English where third-party APIs require it).
- **No em dashes** in copy or documentation.
- **No hardcoded colours** in components. If you need a colour, add a token to `src/styles.css`.
- **Maths in the core, glue in the hooks, tokens in the components.** Any new cadence rule belongs in `dwell.ts` with a test. Any new DOM measurement belongs in `useViewport.ts` or a sibling hook.
- **Tests first** for anything in `src/core/`. The test suite runs in under a second; there is no excuse to ship untested core logic.

---

## Licence

MIT. See `LICENSE`.
