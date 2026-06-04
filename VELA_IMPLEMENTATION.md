# Vela — End-to-End Implementation Reference

> A complete, file-by-file account of what is shipped in the Vela RSVP reader
> shell. This document is descriptive: it explains *what is there and why*, not
> what to build next. Use it as a map for future contributors, as a code-review
> baseline, and as the source of truth when porting the engine to other
> runtimes (e.g. iOS / Swift).

---

## 1. Product summary

Vela is a desktop-first hybrid reader: an **RSVP stage** on the left flashes
the current word(s) with a fixed-position anchor character, while a
**source pane** on the right shows the underlying document with a moving
"read head" that the reader can scroll away from independently. Everything
about cadence, typography, anchor rendering, colour, and pane behaviour is
exposed in a single **Preferences** layer that is persisted to
`localStorage` and applied globally as CSS custom properties.

The implementation deliberately separates three concerns:

1. **Pure core** (`src/core/`) — TypeScript only, no React or DOM. Holds
   tokenisation, anchor maths, dwell maths, and the engine reducer.
2. **React adapters** (`src/lib/`) — Context + hooks. Owns persistence and
   the rAF loop integration with React state.
3. **Presentation** (`src/components/`) — Stateless or
   near-stateless views, styled exclusively through semantic CSS tokens.

This separation is non-negotiable: it is what allows the engine to be
unit-tested with a virtual clock, ported to another UI framework, or
swapped behind a different rendering layer.

---

## 2. Repository layout

```
src/
├─ core/                     ← Pure TS, no React, no DOM
│  ├─ types.ts               ← All public type contracts
│  ├─ orp.ts                 ← Optimal Recognition Point pivot table
│  ├─ dwell.ts               ← Per-chunk dwell maths
│  ├─ advance.ts             ← Pure reducer: state + Δt → next state
│  ├─ engine.ts              ← rAF-driven engine wrapper (injectable clock)
│  ├─ tokeniser.ts           ← Plain-text + Markdown → DocumentModel
│  ├─ sources/
│  │  ├─ types.ts            ← SourceProvider contract
│  │  ├─ sampleProvider.ts   ← Three bundled fixtures (REAL)
│  │  ├─ pdfProvider.ts      ← STUB
│  │  └─ urlProvider.ts      ← STUB
│  ├─ fixtures/              ← Hand-written sample documents (article, academic, longform)
│  └─ __tests__/             ← Vitest suites for all pure logic
│
├─ lib/
│  ├─ preferences/
│  │  ├─ PreferencesContext.tsx   ← Context + CSS variable application
│  │  └─ storage.ts               ← Defaults + localStorage round-trip
│  └─ reader/
│     ├─ useReader.ts             ← Wires the engine to React state
│     └─ useViewport.ts           ← Independent scroll state for source pane
│
├─ components/
│  ├─ VelaApp.tsx             ← Composition root
│  ├─ TopBar.tsx              ← Header, mode/transport/sample picker
│  ├─ SplitPane.tsx           ← Draggable left/right split
│  ├─ RSVPStage.tsx           ← 3-segment anchor render + progress underline
│  ├─ SourcePane.tsx          ← Document view with delegated click-to-seek
│  ├─ SettingsDrawer.tsx      ← Full preferences UI
│  ├─ KeyboardShortcuts.tsx   ← Global key handlers
│  └─ controls/               ← Primitive inputs (Toggle, Slider, Segmented, Select, ColourSwatch, PreferenceGroup/Row)
│
├─ routes/
│  ├─ __root.tsx              ← TanStack root, meta, providers
│  └─ index.tsx               ← Mounts <VelaApp />, `ssr: false`
│
└─ styles.css                 ← Tokens (light/dark), base layer
```

Test files live next to the code under `src/core/__tests__/`. Vitest config
is at the project root in `vitest.config.ts`.

---

## 3. Pure core (`src/core/`)

### 3.1 `types.ts` — the contract surface

This file is intentionally the heaviest file in the core. Everything that
crosses a module boundary is declared here so the engine, the React layer,
and any future UI can agree on shapes without importing one another.

Key unions and records:

- `Mode = 'comprehend' | 'accelerate' | 'skim'` and the
  `MODE_RANGES` map:
  - comprehend: 150–350 wpm (default 250)
  - accelerate: 350–600 wpm (default 450)
  - skim: 600–1200 wpm (default 800)
- `ChunkSize = 1 | 2 | 3` — words per flash.
- `PunctuationIntensity = 'subtle' | 'standard' | 'strong'`.
- `Theme = 'light' | 'dark' | 'system'`.
- `FontFamily = 'sans' | 'serif' | 'mono' | 'dyslexia'`.
- `FontSize = 'S' | 'M' | 'L' | 'XL'`, `LineHeight = 'compact' | 'normal' | 'relaxed'`.
- `AnchorWeight = 'normal' | 'bold'`.
- `CurrentWordIndicator = 'underline' | 'highlight'`.
- `UnderlineThickness = 'thin' | 'medium' | 'thick'`.
- `ReadTreatment = 'fade' | 'dim' | 'none'`.

Document model:

```ts
interface Token {
  id: number;
  text: string;                  // word without trailing punctuation
  raw: string;                   // word + trailing punctuation
  anchorIndex: number;           // pre-computed from orp.ts
  trailingPunctuation: string;   // '', ',', '.', ';', ':', '!', '?'
  isNumeric: boolean;
  sentenceId: number;
  paragraphId: number;
  sectionId: number;
  endsParagraph: boolean;
  endsSection: boolean;
}

interface Section { id: number; title: string; level: 1|2|3; firstTokenId: number; }
interface DocumentModel { id: string; title: string; tokens: Token[]; sections: Section[]; }
```

The reader's live state is just:

```ts
interface ReaderState { index: number; isPlaying: boolean; wpm: number; }
```

The preferences tree is a flat object with five branches: `reading`,
`anchor`, `typography` (split into `rsvp` and `document`), `source`,
`appearance`. Each branch holds only primitive values, which is what makes
the localStorage round-trip and the CSS-variable projection simple.

`assertNever(x: never)` is exported and used in `dwell.ts` to enforce
exhaustive switches on union types — adding a new `PunctuationIntensity`
variant will fail the build until every site handles it.

### 3.2 `orp.ts` — Optimal Recognition Point

A small, deterministic pivot table maps the trimmed word length to an
anchor index:

| Trimmed length | Anchor index |
|----------------|--------------|
| 0–1            | 0            |
| 2–5            | 1            |
| 6–9            | 2            |
| 10–13          | 3            |
| ≥14            | 4            |

`trimLeading(word)` strips leading non-letter / non-number characters
using a Unicode property regex (`/^[^\p{L}\p{N}]+/u`). Length is taken via
`[...w].length` so multi-codepoint characters count as one. The returned
index is relative to the **trimmed** word, and the caller is responsible
for rendering trailing punctuation separately (see `RSVPStage` below).

The pivot is exhaustively tested in `__tests__/orp.test.ts` against twelve
golden words, leading-punctuation cases, and edge cases (empty, single
char).

### 3.3 `dwell.ts` — per-chunk timing

`dwellMs(chunk: Token[], prefs: ReadingPrefs) → number`

Pipeline:

1. **Base** = `60000 / max(1, wpm)`.
2. Iterate the chunk; for each token compute candidate multipliers, then
   keep the **maximum** seen across the chunk for each axis. This means a
   2-word chunk paces to the slowest token, which is the perceptually
   correct behaviour.
   - `longMul = 1.15` if `text.length > 8` and the pref is enabled.
   - `numMul = 1.2` if `isNumeric` and the pref is enabled.
   - `puncMul` is derived from a raw base multiplier (see table) and the
     intensity factor: `1 + (raw - 1) * intensityFactor(intensity)`.
3. **Chunk scale**: `{ 1: 1.0, 2: 1.5, 3: 1.9 }` — larger chunks take
   longer but with diminishing returns.
4. **Clamp** to `[40, 4000]` ms.

Raw punctuation multipliers (before intensity scaling):

| Condition                          | Multiplier |
|------------------------------------|------------|
| `endsSection` or `endsParagraph`   | 2.5        |
| `,`                                | 1.5        |
| `;` or `:`                         | 1.75       |
| `.`, `!`, `?`                      | 2.0        |
| anything else                      | 1.0        |

Intensity factors: `subtle = 0.5`, `standard = 1.0`, `strong = 1.5`. They
multiply only the *extra* beyond 1×.

Twelve assertions in `dwell.test.ts` lock in the maths (base, comma,
full-stop, subtle/strong scaling, long words, numerals, disabled pauses,
chunk scaling, paragraph boundary, both clamps). When tuning dwell, change
the constants here and run `bunx vitest run` — failures will show the
exact regression.

### 3.4 `advance.ts` — pure reducer

`advance(doc, state, prefs, accumulator) → AdvanceResult`

This is a step function with no side effects. Given the document, the
current `ReaderState`, the preferences, and the elapsed accumulator (ms),
it:

1. Builds the chunk starting at `state.index` (size from `prefs.reading.chunkSize`).
2. If the chunk is empty, signals `finished: true` and returns a paused state.
3. Computes `dwellMs(chunk, prefs.reading)`.
4. If `acc < dwell`, returns the same index, the unchanged accumulator,
   and `flashed: false`. The UI keeps showing the same chunk.
5. Otherwise subtracts the dwell, advances `index` by `chunk.length`, sets
   `flashed: true`, and loops up to **8 times** (a safety bound for
   catch-up storms after a tab switch).

Because the function is pure, it is trivial to unit test (see `engine.test.ts`
for the assembled behaviour) and trivial to port: a Swift implementation
on iOS can be a direct line-by-line translation.

### 3.5 `engine.ts` — rAF-driven wrapper with injectable clock

```ts
interface EngineDeps {
  doc: DocumentModel;
  prefs: Preferences;
  onTick: (snapshot: EngineSnapshot) => void;
  now?: Now;            // () => number
  schedule?: Scheduler; // (cb) => cancel
}
```

The defaults are `performance.now()` and `requestAnimationFrame` with a
`setTimeout` fallback, but the tests inject a manual clock + a manual
scheduler. That is the *single* reason the engine is testable — it never
calls `performance.now()` or `requestAnimationFrame` directly.

Loop shape:

```
loop(t):
  if !isPlaying: return                 // cancelled by pause()
  elapsed = t - lastTick
  lastTick = t
  accumulator += elapsed
  result = advance(doc, state, prefs, accumulator)
  state = result.state
  accumulator = result.accumulator
  if finished: emit(); return
  if result.flashed: emit()
  schedule(loop)
```

Public methods: `play`, `pause`, `toggle`, `seek(tokenId)`,
`skip(delta)`, `setWpm(n)`, `setMode(m)`, `setPrefs(prefs)`, `setDoc(doc)`,
`getSnapshot()`, `dispose()`.

`setPrefs` swaps the prefs reference without resetting the accumulator,
so a WPM change *during* a flash takes effect on the next chunk boundary
(verified in `engine.test.ts` → "setWpm changes cadence on next tick").

### 3.6 `tokeniser.ts` — text → DocumentModel

Two entry points:

- `tokenisePlainText(text, { title? })` — splits on whitespace,
  separates trailing punctuation, detects numerals (regex on the word
  body), and groups tokens into sentences and paragraphs.
- `tokeniseMarkdown(md, { title? })` — additionally promotes lines
  starting with `#`, `##`, `###` to **sections** at level 1/2/3 and pushes
  a `Section` record with the `firstTokenId` for the chip navigation.

Heuristics worth noting:

- Sentence boundary detection avoids splitting on the dot of common
  abbreviations (`Dr.`, `Mr.`, `e.g.`, `i.e.`) — covered by
  `tokeniser.test.ts → "does not split sentences on abbreviations"`.
- `endsParagraph` is set on the **last** token of a paragraph, not the
  first of the next. `endsSection` likewise. This is what `dwell.ts`
  uses to slow the cadence at structural boundaries.
- `anchorIndex` is computed eagerly at tokenisation time, so rendering
  never re-runs the pivot.

### 3.7 `sources/`

`SourceProvider` is the swap point for future ingestion:

```ts
interface SourceProvider {
  id: string;
  label: string;
  load(): Promise<DocumentModel>;
}
```

- `sampleProvider.ts` is **real**: it exposes three providers (`article`,
  `academic`, `longform`) backed by the hand-written fixtures in
  `core/fixtures/` and passed through `tokeniseMarkdown`.
- `pdfProvider.ts` and `urlProvider.ts` are **stubs**, intentionally
  marked `// STUB: replaced by Claude Code`. They satisfy the
  `SourceProvider` contract so the UI can pretend they exist; they
  currently throw on `load()`.

Add a new source by implementing the contract — nothing else in the app
needs to change.

### 3.8 Fixtures

Three short Markdown strings exported as plain ES modules:

- `article.ts` — short opinion-piece length, tests sentence cadence.
- `academic.ts` — multiple `##` sections and numerals, tests section
  chips and numeral dwell.
- `longform.ts` — long enough to exercise scrolling and the
  "Return to live" pill.

These are *not* fetched at runtime — they ship in the bundle. This is
deliberate: the harness must work offline, with no network, and with a
deterministic token count for tests.

---

## 4. React adapters (`src/lib/`)

### 4.1 `preferences/storage.ts`

- `STORAGE_KEY = 'vela.preferences.v1'` — the `.v1` suffix is the
  migration hatch; bumping to `.v2` invalidates old payloads cleanly.
- `defaultPreferences` is the single source of defaults. Notable picks:
  - `appearance.accent = '#2f7a78'` — a restrained slate-teal. **Not red**,
    by explicit product direction.
  - `appearance.splitRatio = 0.67` — RSVP gets two-thirds.
  - `typography.rsvp.size = 'XL'` — the stage word should dominate.
  - `typography.document.family = 'serif'` — long-form reading default.
- `loadPreferences()` performs a **deep merge** of the parsed payload over
  the defaults. This means future preference additions don't break older
  saved payloads; missing keys fall back to defaults.
- `savePreferences(prefs)` silently swallows quota errors — preferences
  are a quality-of-life feature, not a correctness feature.

### 4.2 `preferences/PreferencesContext.tsx`

Provides:

- `prefs: Preferences`
- `update(updater)` — functional setter.
- `set(key, value)` — shallow root-level setter.
- `reset()` — back to defaults.

Lifecycle:

1. Initial render uses `defaultPreferences` (so SSR-equivalent renders are
   deterministic; the app is `ssr: false` regardless).
2. `useEffect` on mount calls `loadPreferences()` and flips the `hydrated`
   flag. Persistence only runs after hydration to avoid clobbering on
   first paint.
3. A second `useEffect` projects the current prefs onto **CSS custom
   properties** on `<html>` every time prefs change:
   - `--accent`, `--anchor` (anchor falls through to `--accent` if its
     value is the sentinel string `var(--accent)`).
   - `--rsvp-font`, `--rsvp-size`, `--doc-font`, `--doc-size`,
     `--doc-line-height`.
   - Theme toggles the `.dark` class on `<html>`.
4. A third `useEffect` listens to `prefers-color-scheme` when
   `theme = 'system'` and re-applies the class on change.

This pattern — *one* context that projects to CSS variables — means
components stay token-only and don't need to read the preferences object
just to set a colour or font.

### 4.3 `reader/useReader.ts`

Owns the engine instance per document:

- Recreates the engine when `doc` changes; disposes the old one in the
  cleanup.
- Pushes preference changes into the live engine via `setPrefs(prefs)`.
- Exposes a stable `controls` object (`play`, `pause`, `toggle`, `seek`,
  `skip`, `setWpm`) memoised once.
- `snapshot` is the React-visible mirror of the engine's
  `EngineSnapshot`, updated on every `onTick`.

The hook is intentionally thin. It contains **no maths**. All cadence
logic lives in the core; this file is glue.

### 4.4 `reader/useViewport.ts`

The differentiator: **scroll is decoupled from the read head.**

State:

- `containerRef` — attached by `SourcePane` to its scroll container.
- `isUserScrolling` — true for 600 ms after the last scroll event.
- `isFollowingLive` — true when the current read-head token is inside the
  visible scroll window.

Methods:

- `scrollToTokenEl(tokenId, smooth?)` — scrolls the container so the
  token sits at the upper-third, and sets `isFollowingLive` to true.
- `updateLiveFlag(tokenId)` — recomputes `isFollowingLive` from the DOM
  rect of the current token.

The `IDLE_MS = 600` constant defines how long after a user scroll the
"return to live" pill stays visible.

---

## 5. Presentation (`src/components/`)

### 5.1 `VelaApp.tsx` — composition root

Top-down:

1. `PreferencesProvider` wraps everything (so CSS vars apply to the whole
   tree).
2. `VelaShell` holds the only piece of feature state in this file:
   `doc: DocumentModel | null` and `settingsOpen: boolean`.
3. On first mount it calls `sampleProviders()[0].load()` so the UI is
   interactive without user action.
4. Renders `<TopBar />`, the `<SplitPane>` (with `<RSVPStage>` and
   `<SourcePane>`), the `<SettingsDrawer>`, and `<KeyboardShortcuts>`.
5. The shell is a single flex column at `h-screen w-screen` with
   `overflow-hidden`; the `<main>` is `flex-1 min-h-0` so the split pane
   gets a bounded height.

### 5.2 `TopBar.tsx`

- App mark + name (`Vela`, with the `BookOpen` icon tinted by `--accent`).
- "Open sample" dropdown — closes on outside click via a `mousedown`
  listener on `document` (registered only while the popover is open).
- `SegmentedControl` for `Mode`. Changing mode resets `wpm` to the mode's
  default — this is intentional so the slider never lands outside the
  mode's recommended range.
- Transport cluster: skip-back-10 / play-pause / skip-forward-10. Play is
  the accent-coloured primary button.
- Live WPM read-out (tabular-nums for stable width).
- Settings cog (opens the drawer).

All colours come from the token set; no hard-coded colours appear in this
file.

### 5.3 `SplitPane.tsx`

A draggable two-pane splitter. The drag handle uses Pointer Events with
`setPointerCapture` so dragging works even when the pointer leaves the
handle. Constraints: `min = 0.3`, `max = 0.85`. The ratio is written back
to `appearance.splitRatio` on every move, which means user resizes
persist across sessions for free.

### 5.4 `RSVPStage.tsx`

The visual identity of the app. Two architectural choices matter:

1. **Three-segment grid for the anchor**. The current word is rendered as
   three spans — `pre`, `anchor`, `post` — laid out so the anchor sits at
   a fixed horizontal pixel. `pre` is right-aligned, `anchor` is the
   single character, `post` is left-aligned. The anchor letter therefore
   does not jitter horizontally as word length changes; the eye fixates
   in one place. Trailing punctuation is appended to `post`, never to the
   anchor.
2. **Progress underline below the stage**. A thin track with a filled
   portion at `progress * 100%` width. This is the *only* horizontal
   movement element in the stage; the word itself does not slide.

Click-on-progress seeks: a click anywhere on the underline calls
`onSeekFraction(x / width)`, which `VelaApp` translates into a token
index.

For chunks of >1 token, the chunk renders inline; the anchor is still
placed on the lead token so the fixation point is stable.

### 5.5 `SourcePane.tsx`

- Renders the full document as paragraphs of `<span data-token-id="…">`.
- The container is scrollable and its ref comes from `useViewport`.
- **Click delegation**: a single click handler on the root reads
  `event.target.closest('[data-token-id]')` and calls `onSeek(id)`. No
  per-token handlers — important for documents with thousands of tokens.
- The current token gets the "current word indicator" treatment from
  prefs (`underline` or `highlight`), with underline thickness mapped to
  px values.
- Tokens with `id < currentIndex` get the `readTreatment`: `fade` lowers
  opacity to ~0.5, `dim` shifts colour toward `--muted-fg`, `none` leaves
  them alone. The treatment is purely CSS; the data is unchanged.
- Optional **section chips** render across the top from `doc.sections`;
  clicking a chip seeks to `firstTokenId` and scrolls the chip target to
  the viewport.
- **Return to live** pill appears when `!isFollowingLive`. Clicking it
  calls `scrollToTokenEl(currentIndex)`.
- **Auto-scroll toggle**: when `prefs.source.autoScroll` is true and the
  user is not currently scrolling, `useEffect` watches `currentIndex` and
  scrolls the container so the read head stays visible. The "not
  currently scrolling" gate is exactly why `useViewport`'s 600 ms idle
  timer exists.

### 5.6 `SettingsDrawer.tsx`

A right-side sheet with a backdrop. Sections, in order:

- **Reading** — Mode, WPM slider (100–1200, step 10), Chunk size,
  Punctuation pauses (+ intensity when on), Extra dwell on long words,
  Extra dwell on numerals, "Warn above 500 wpm" toggle.
- A **soft warning callout** renders when `academicCapWarning && wpm > 500`:
  "Above 500 wpm, comprehension typically drops on dense or technical
  material." This is the "academic cap" notice — visible, dismissible
  via the toggle, never a hard block.
- **Anchor** — Show anchor letter, Colour (preset swatches plus the
  `var(--accent)` sentinel), Weight (normal / bold).
- **Typography — RSVP stage** — Family (sans / serif / mono / dyslexia),
  Size (S/M/L/XL).
- **Typography — Source pane** — Family, Size, Line height (compact /
  normal / relaxed).
- **Source pane** — Current word indicator (underline / highlight),
  Underline thickness, Read treatment (fade / dim / none), Show section
  chips, Auto-follow.
- **Appearance** — Theme (light / dark / system), Accent colour swatches,
  Show progress bar, Reduced motion.
- A **Reset** button in the header reverts to `defaultPreferences`.

The drawer animation is a `transform: translate-x` transition; when
`reducedMotion` is on, `transition-none` is added so it snaps instead of
sliding.

### 5.7 `KeyboardShortcuts.tsx`

Global `keydown` listener registered on `document`. Bindings:

- `Space` — toggle play/pause (only if the focused element is not an
  input/textarea/contenteditable, so settings inputs remain typeable).
- `←` / `→` — `onSkip(±1)`.
- `Shift + ← / →` — `onSkip(±10)`.
- `↑` / `↓` — `onWpmDelta(±10)`.
- `Esc` — `onPause()`.

Each handler calls `preventDefault()` only when the binding actually
fires, so unhandled keys remain normal.

### 5.8 `controls/`

Six primitive components, each ~20–45 lines, all token-styled:

- `PreferenceGroup` — titled section wrapper (the section title above a
  thin line, then the rows).
- `PreferenceRow` — label / optional description on the left, control
  slot on the right; uses CSS grid for stable alignment.
- `Toggle` — accessible switch (`role="switch"`, `aria-checked`).
- `Slider` — wraps `<input type="range">` and forwards the value as a
  number; styled with custom track / thumb classes.
- `SegmentedControl` — radio-group-shaped buttons with the selected
  segment painted in `--accent`. **Selection is signalled by both colour
  and a 1px underline** so colour-blind users can still tell which segment
  is active.
- `Select` — minimal styled `<select>` for short option sets.
- `ColourSwatch` — a strip of preset circles plus a free-form
  `<input type="color">`; supports the `'var(--accent)'` sentinel for
  "follow the accent".

None of these components import from `@/components/ui/…` (shadcn) — they
are deliberately tiny so the design system stays under our control.

---

## 6. Design tokens (`src/styles.css`)

All colours, surfaces, and per-pane typography knobs flow through CSS
custom properties so components never touch raw colours. Tokens defined
on `:root` (light) and overridden inside `html.dark`:

| Token              | Role                                      |
|--------------------|-------------------------------------------|
| `--bg`             | Page background                           |
| `--surface`        | Cards, top bar, drawer                    |
| `--surface-2`      | Hover/active surface                      |
| `--line`           | Borders and separators                    |
| `--text`           | Primary text                              |
| `--muted-fg`       | Secondary / metadata text                 |
| `--accent`         | Primary action / focus colour             |
| `--anchor`         | Anchor letter colour                      |
| `--underline-current` | Current-word underline in the source pane |
| `--underline-read` | Read-portion underline / progress fill    |
| `--selection`      | Text selection background                 |
| `--rsvp-font` / `--rsvp-size` | RSVP stage typography (set from prefs) |
| `--doc-font` / `--doc-size` / `--doc-line-height` | Source pane typography |

Light mode uses near-white surfaces with high-contrast text. Dark mode
uses a near-black background (not pure `#000`) with slightly lifted
surfaces. The default accent is a slate-teal (`#2f7a78`), chosen to
avoid the "neon productivity dashboard" aesthetic. Both modes are
deliberately low-chroma everywhere except the accent.

`html` and `body` are set to `bg-[var(--bg)] text-[var(--text)]` and the
selection colour is wired to `--selection`. The base layer also disables
text-size inflation on iOS Safari (`-webkit-text-size-adjust: 100%`) for
parity when the same shell renders in mobile webviews.

---

## 7. Routing (`src/routes/`)

- `__root.tsx` — TanStack root. Sets `<title>` / `<meta name="description">`,
  wraps children in `<Outlet />`, and (importantly) does **not** wrap
  `PreferencesProvider` here — that lives inside `VelaApp` so unit tests
  can mount the shell without bringing the router along.
- `index.tsx` — declares the `/` route with `ssr: false` and renders
  `<VelaApp />`. `ssr: false` is required because the app is fully
  client-side (localStorage, rAF, pointer events, viewport measurements);
  letting the server render an empty shell with no benefit was the cause
  of the original SSR runtime error.

There are intentionally no other routes — Vela is single-screen.

---

## 8. Tests (`src/core/__tests__/`)

Vitest configured via `vitest.config.ts` with the `jsdom` environment.
Five suites, **40 passing tests** at the time of writing:

- `orp.test.ts` — pivot table (12 golden words + edge cases).
- `dwell.test.ts` — base, comma, full-stop, intensity scaling, long
  words, numerals, disabled pauses, chunk scaling, paragraph boundary,
  both clamps.
- `tokeniser.test.ts` — word splitting, trailing punctuation,
  abbreviation handling, numeral detection, paragraph boundary flag.
- `engine.test.ts` — uses a manual `now()` + `schedule()` to step the rAF
  loop deterministically: per-dwell advancement, pause stops
  advancement, seek/skip arithmetic, WPM mid-flight change.
- `preferences.test.ts` — localStorage round-trip, defaults when empty,
  fallback on malformed JSON.

Run with `bunx vitest run`. The tests are the contract: when refactoring
the core, treat a failure as a behaviour change to discuss, not a test to
delete.

---

## 9. End-to-end flow (concrete example)

1. The user opens `/`. TanStack mounts `<VelaApp />` (no SSR).
2. `PreferencesProvider` initialises with defaults, then on mount loads
   from `localStorage` and projects the merged prefs onto `<html>` as
   CSS variables. The `.dark` class is set if appropriate.
3. `VelaShell` calls `sampleProviders()[0].load()` (the `article`
   fixture). `tokeniseMarkdown` runs once, returning a `DocumentModel`
   with pre-computed anchors, sentence/paragraph IDs, and section index.
4. `useReader(doc)` instantiates the engine with the current prefs and
   emits an initial `EngineSnapshot { index: 0, isPlaying: false, ... }`.
5. The UI renders: `RSVPStage` shows token 0 with its anchor at the
   fixed pixel; `SourcePane` renders the full document and applies the
   current-word indicator to token 0.
6. The user presses `Space`. `KeyboardShortcuts` calls
   `controls.toggle()`. The engine sets `isPlaying = true`, records
   `lastTick`, and schedules the first frame.
7. On each rAF callback the engine accumulates elapsed ms and calls
   `advance()`. When the accumulator clears a chunk's dwell, `index`
   advances and `onTick` fires, which sets React state, which re-renders
   the stage with the new chunk.
8. The source pane, listening to `currentIndex`, scrolls to keep the
   read head visible — *unless* the user has scrolled in the last 600 ms,
   in which case the "Return to live" pill appears and auto-scroll
   pauses until the user clicks it or stops scrolling.
9. The user opens settings, drags the WPM slider to 600. The preferences
   tree updates, `useReader`'s effect calls `engine.setPrefs(...)`, and
   the next chunk dwell is shorter — without restarting the loop.
10. The user closes the tab. `savePreferences` has been called on every
    pref change, so the next session restores exactly the same state.

---

## 10. Explicit non-features (still out of scope)

These remain stubs or absent by design:

- Real PDF parsing (`pdfProvider.ts` throws).
- URL ingestion / `fetch` of remote articles (`urlProvider.ts` throws).
- EPUB, camera scan, OCR.
- Accounts, sync, payments / tip jars.
- Mobile-specific or responsive-collapsed layout. The app currently
  assumes a desktop viewport; below ~900 px the split pane is unusable
  and that is intended.
- Any real RSVP timing optimisations beyond the dwell formula in
  `dwell.ts` (no eye-tracking, no per-user calibration).

When these are implemented, they should land as new `SourceProvider`s
and new preference branches — the existing core should not change shape.

---

## 11. Conventions for future changes

- **Spelling**: UK English in all user-facing copy (`Colour`, `Behaviour`,
  `Recognise`). Code identifiers stay in US English where libraries do
  (e.g. `color` props on third-party inputs).
- **Colours**: never hard-coded. If you find yourself writing `text-white`
  or `bg-[#…]` in a component, add a token to `styles.css` instead.
- **Maths in the core, glue in the hooks, tokens in the components.**
  Any new cadence rule belongs in `dwell.ts` (with a test). Any new DOM
  measurement belongs in `useViewport.ts` or a new sibling hook.
- **Tests first** for anything in `core/`. The harness is fast enough
  that there is no excuse to land untested core logic.
- **Accessibility**: do not signal state with colour alone. Segmented
  controls add an underline; toggles use `role="switch"`; the anchor
  uses colour *and* font weight.

---

*End of document.*
