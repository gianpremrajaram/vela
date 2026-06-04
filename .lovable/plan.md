# Vela — Desktop RSVP Reader (revised plan)

Incorporates the addendum: pure framework-free core, real ORP/dwell/rAF engine now, explicit decoupled read-head state, strict TS, vitest harness, three-segment anchor alignment. PDF and URL import remain the only stubs.

## Assumptions (flag now, not silently)

1. "Markdown" tokenisation = `#`, `##`, `###` headings → sections; blank line → paragraph break; sentence split on `.`/`!`/`?` followed by whitespace, with a small abbreviation list (Mr., Dr., e.g., i.e., etc.) to avoid false splits. No bold/italic/link parsing (not needed for reading-order).
2. "Chunk size" 2 or 3 = N consecutive tokens shown together in one flash; anchor is computed on the longest token in the chunk; dwell uses the max base dwell across the chunk, then chunk-size scaling per addendum.
3. "Punctuation intensity" scales the *extra* portion of the multiplier, not the whole multiplier: subtle = 0.5×extra, standard = 1.0×extra, strong = 1.5×extra. Flagging because the addendum doesn't fix this.
4. "User is not actively scrolling" = 600 ms after the last `scroll` event on the source pane.
5. Source pane renders the whole document inline (no virtualisation). Sample fixtures are short enough that this is fine, per the addendum's instruction not to architect for virtualisation.
6. Theme = "system" follows `prefers-color-scheme` via a `matchMedia` listener.

If any of these conflict with intent, stop me before build mode.

## Conflict carve-out (addendum vs Karpathy-style "no unrequested flexibility")

The preferences/toggleability layer IS the product requirement. Build it in full per the spec — every toggle listed under Reading, Anchor, Typography (split RSVP vs document), Source pane, Appearance. Do not trim it as speculative configurability. Elsewhere, the "minimum code that meets the spec" rule applies.

## Architecture

### Pure core — no React, no DOM (`src/core/`)

- `types.ts` — `Token`, `Chunk`, `DocumentModel`, `ReaderState`, `Preferences` (all discriminated-union string literals where applicable, e.g. `Mode = 'comprehend' | 'accelerate' | 'skim'`, `PunctuationIntensity = 'subtle' | 'standard' | 'strong'`, etc.). Exhaustive switches enforced via `never` helper.
- `orp.ts` — `anchorIndex(word: string): number` using pivot table: 1→0, 2–5→1, 6–9→2, 10–13→3, ≥14→4. Strips leading punctuation before measuring; preserves index relative to original string.
- `dwell.ts` — `dwellMs(chunk, prefs): number`. Base `60000/wpm`; long-word ×1.15 (>8 chars); numeral/symbol ×1.2; trailing punctuation (comma 1.5, ; : 1.75, . ! ? 2.0, paragraph/section boundary 2.5). Punctuation intensity scales the extra over 1.0. Chunk-size scaling: ×1 / ×1.5 / ×1.9 for chunk 1/2/3. Clamp [40 ms, 4000 ms].
- `tokeniser.ts` — `tokenisePlainText(s)` and `tokeniseMarkdown(s)` returning `DocumentModel`. Computes `anchorIndex`, `trailingPunctuation`, `sentenceId`, `paragraphId`, `sectionId`. Section headings parsed from `#/##/###`.
- `advance.ts` — pure `advance(state, prefs, elapsedMs): { state, flashedChunkId? }`: rAF-loop reducer that accumulates elapsed time vs current chunk dwell and advances by chunk size when exceeded. No timers inside.
- `engine.ts` — pure `createEngine({ doc, prefs, onTick })`: owns a `ReaderState`, exposes `play/pause/seek/skip/setWpm/setMode/setPrefs/dispose`. Internally drives a `requestAnimationFrame` loop that calls `advance()`. The clock is the only impure thing; can be swapped via a `now: () => number` and `schedule: (cb) => cancelFn` injection for tests.

### React adapters (`src/lib/`)

- `preferences/PreferencesContext.tsx` — provider + `usePreferences()`. Reducer reads/writes `vela.preferences.v1` in localStorage; applies design-token CSS custom properties and theme class to `<html>` reactively.
- `reader/useReader.ts` — thin hook: instantiates `createEngine`, subscribes to its ticks, exposes `{ state, controls }`. Contains no maths.
- `reader/useViewport.ts` — owns the SourcePane scroll state independently of the engine. Tracks `isUserScrolling` (600 ms idle → false). Exposes `scrollToToken(id)` and `isFollowingLive`.

### Design tokens (`src/styles.css`)

Add semantic vars + register in `@theme inline`: `--bg, --surface, --text, --muted, --accent, --anchor, --underline-current, --underline-read, --selection`, plus typography vars per-pane (`--rsvp-font, --rsvp-size, --doc-font, --doc-size, --doc-line-height`). Warm-neutral light, low-glare dark. Default accent = restrained slate-teal (NOT red); anchor uses accent by default. AA contrast verified in both themes.

### Components (`src/components/`)

- `controls/` — `Toggle`, `Slider`, `SegmentedControl`, `Select`, `ColourSwatch`, `PreferenceRow`, `PreferenceGroup`. Plain Tailwind, keyboard-accessible, token-driven.
- `TopBar.tsx` — import (sample picker popover), mode selector, transport (play/pause, skip ±10), live WPM readout, settings cog.
- `SplitPane.tsx` — horizontally resizable, draggable divider, pointer events, ratio persisted via prefs. Min/max clamps.
- `RSVPStage.tsx` — three-segment word render: `<span pre/><span anchor/><span post/>` inside a fixed-width frame; the anchor span is absolutely positioned (or grid-column-pinned) at the same X for every word. Thin click-to-seek progress bar beneath.
- `SourcePane.tsx` — full document rendered with each token wrapped in a `<span data-token-id>`. Click-to-seek uses a SINGLE delegated listener on the container reading `dataset.tokenId`. Current word: underline (configurable thickness or highlight alt); read words: fade/dim/none. Section chips at top jump scroll. Auto-scroll only when pref ON and `!isUserScrolling`. "Return to live" pill appears when `!isFollowingLive`.
- `SettingsDrawer.tsx` — right slide-over composed from `PreferenceGroup` + `PreferenceRow`. Every spec preference present. Academic-cap inline notice when WPM > 500 and toggle on.
- `KeyboardShortcuts.tsx` — Space, ←/→ (±10 words), ↑/↓ (±50 WPM), Esc.
- `VelaApp.tsx` — composes the above inside `PreferencesProvider`.

### Source provider interface (stubs preserved)

`src/core/sources/types.ts` defines `SourceProvider { id, label, load(): Promise<DocumentModel> }`. Implementations:
- `sampleProvider.ts` — 3 bundled fixtures (short article, academic with `##` sections, long-sentence/numerals piece) routed through `tokeniseMarkdown`. **Real.**
- `pdfProvider.ts` — `// STUB: replaced by Claude Code`. Throws "Not implemented".
- `urlProvider.ts` — `// STUB: replaced by Claude Code`. Throws "Not implemented".

Import button shows only the sample picker; PDF/URL entries are absent from UI (out of scope, not hidden behind a disabled button).

### Tests (`src/core/__tests__/`)

Add vitest + `@testing-library/react` minimal. Tests written first, then implementation.

- `orp.test.ts` — full pivot table, leading-punctuation stripping, empty string, single char.
- `dwell.test.ts` — base from WPM, each multiplier in isolation, combined, punctuation-intensity scaling, chunk-size scaling, clamps.
- `tokeniser.test.ts` — golden fixture: plain prose, markdown with 3 sections, abbreviations don't split sentences, numerals tagged.
- `engine.test.ts` — inject fake clock/scheduler; play advances exactly N chunks over T ms; pause stops; seek jumps; setWpm mid-play changes cadence on next tick.
- `preferences.test.ts` — reducer round-trip through localStorage (mocked).

### Dependencies

Add: `lucide-react`, `vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom`. No router, no animation libs, nothing else.

## File plan

```
src/core/
  types.ts
  orp.ts
  dwell.ts
  advance.ts
  engine.ts
  tokeniser.ts
  sources/{types,sampleProvider,pdfProvider,urlProvider}.ts
  fixtures/{article,academic,longform}.ts
  __tests__/{orp,dwell,tokeniser,engine,preferences}.test.ts
src/lib/preferences/{types,defaults,PreferencesContext}.tsx
src/lib/reader/{useReader,useViewport}.ts
src/components/controls/{Toggle,Slider,SegmentedControl,Select,ColourSwatch,PreferenceRow,PreferenceGroup}.tsx
src/components/{TopBar,SplitPane,RSVPStage,SourcePane,SettingsDrawer,KeyboardShortcuts,VelaApp}.tsx
src/styles.css                          (modify: tokens + themes)
src/routes/index.tsx                    (modify: mount VelaApp)
src/routes/__root.tsx                   (modify: meta only)
vite.config.ts                          (modify: vitest config block)
```

## Step → verify checks

1. Tokens + themes in `styles.css` → light/dark swap via `<html class="dark">` flips all surfaces; no hardcoded colours remain in components.
2. Pure core (`orp/dwell/advance/tokeniser/engine`) + vitest harness → `bunx vitest run` green for all 5 test files; no React/DOM imports in `src/core/`.
3. Preferences context + localStorage round-trip → reducer test green; manual: change setting, reload, value persists.
4. Primitive controls + drawer → every spec preference visible and toggling updates UI live.
5. SplitPane + TopBar + KeyboardShortcuts → drag divider clamps and persists; Space toggles play; arrows behave per spec.
6. RSVPStage three-segment anchor → measure: anchor character left-edge X is identical across a sequence of words of varying lengths (eyeball via overlay during dev, then remove).
7. SourcePane with delegated click + decoupled scroll → single listener on container; scrolling away surfaces "Return to live"; auto-follow respects toggle and 600 ms idle.
8. Engine wired end-to-end with sample fixtures → play advances words at WPM; punctuation pauses visible; mode/WPM changes apply live; reduced-motion honoured.
9. `bun run build` green; `bunx vitest run` green.

Ready to switch to build mode.