# [APP_NAME] - Hybrid RSVP Reader: PRD, Architecture and Build Plan

> Working title placeholder: `[APP_NAME]` (find-and-replace once naming is settled). UK spelling throughout. No em dashes by convention.
>
> **Purpose of this document.** A single end-to-end target for Claude Code. It blends a PRD, a system architecture, a design spec, and compressed epics with success criteria. It is deliberately chunked at the component level, not the micro-ticket level: Claude Code can pick up whole epics and only decompose into granular tickets where genuinely needed. Ambiguities in analysis and evaluation are left open on purpose and flagged as Open Questions; resolve them as you build.
>
> **Scope.** Desktop web first. v1 is local-file reading. v2 is automatic page parsing (paste a URL). Mobile web and the separate native iOS app are out of scope here.
>
> **Workflow context.** Scaffold the shell and design system in Lovable, iterate briefly, then move the repo to GitHub and do all further work in Claude Code. Never re-enter Lovable for functional changes once Claude Code work begins.

---

## 0. How to read this document

Sections 1-3 are the PRD core (problem, user, positioning, prior art). Sections 4-9 are the architecture and design (reference systems, system layers, reader engine, ingestion including v2, preferences, design). Section 10 compresses everything into epics with success criteria. Sections 11-14 cover workflow, risk, glossary and references. Most sections end with **Research tasks** and **Open questions** so you can defer evaluation work without losing it.

---

## 1. Problem, insight and target user

### 1.1 The problem
Knowledge workers, students and researchers read large volumes of dense long-form text (articles, papers, reports) and want to read faster without losing the thread. Pure speed-reading tools (RSVP) trade comprehension for speed and strip away the document context that dense material needs. Traditional reading keeps context but is slow and easy to lose focus in.

### 1.2 The core insight
RSVP works because it removes saccadic eye movement (the eye stays fixed; words stream to a fixed anchor point). But the research consensus is blunt: comprehension and memory degrade as RSVP speed rises, the effect is worse for paragraphs than single sentences, and the much-hyped Optimal Recognition Point (ORP) is a minor tweak rather than a breakthrough. The product implication: RSVP should be **one mode**, paired with persistent, navigable document context, and pitched comprehension-first rather than as a speed contest.

### 1.3 The wedge
A **synced dual-pane reader**. The left pane is the RSVP reading stage; the right pane is the full, freely scrollable source document where words progressively underline as they are read. The read-head (what RSVP is currently showing) is **decoupled** from the scroll position, so the reader can browse the source, check a figure or back-reference, then snap back to live. No shipping competitor does this; they treat a document as a flat one-word-at-a-time stream.

### 1.4 Target user
Primary: graduate students, researchers and analysts reading papers and long reports on a desktop or laptop. Secondary: professionals clearing article and newsletter backlogs. Tertiary, and a design constraint not a target: readers with dyslexia or visual stress who benefit from a fixed focal point, adjustable typography and tinted overlays.

### 1.5 Positioning and non-goals
Positioning: calm, comprehension-first, editorial; the opposite of the "1500 WPM, high-performance professional" framing the category over-uses. Free and open-source and local-first (no accounts, no tracking, on-device by default).

Non-goals for v1/v2: speed-reading "training" courses and drills; gamified WPM leaderboards; cloud sync and accounts; AI summarisation; mobile-specific layouts; EPUB; camera/OCR; payments. Some of these become later candidates; none are in this build.

### 1.6 Product success metrics (directional, not gates)
1. A user can open a local PDF and be reading in the dual-pane view in under 15 seconds.
2. In Browse, a user can leave the read-head, navigate the source, and return to live in one action without losing position.
3. Comprehension-first defaults: the app opens at ~300 WPM in Comprehend mode, not at a skim speed.
4. Every visual and pacing parameter listed in Section 8 is user-toggleable and persists across sessions.

**Research tasks.** (a) Lightweight comprehension self-check pattern (optional post-read recall prompt) without becoming a "training" product. (b) Decide whether to instrument any anonymous local-only usage stats for self-benchmarking (as some open-source readers do) given the no-tracking stance.

**Open questions.** Is the secondary "article backlog" user worth designing for in v1, or does it pull the product toward the crowded generic-RSVP space and dilute the academic wedge?

---

## 2. Competitive and prior-art landscape (summary)

The iOS category flooded in early 2026 with near-identical RSVP apps (ORP highlight, punctuation pauses, share/Safari import, URL import, camera scan, 100-1000+ WPM, aggressive subscriptions up to ~$50/year). Web tools (Spreeder, SwiftRead, FastRead, Outread web) are either training suites or webpage overlays. Adjacent paradigms to avoid copying: BeeLine Reader (colour-gradient text, protected), Bionic Reading (bold-prefix fixation, trademarked), Spritz (specific ORP/streaming implementation and "Redicle" branding, patents).

Implication: RSVP itself is generic and unencumbered; use neutral language ("anchor letter", "focus point"); the synced dual-pane plus comprehension-first positioning is the differentiator. It is a feature advantage, not a moat (no network effects, easily copied), so defensibility is execution, polish and being free.

**Open questions.** Which one or two competitor features are genuinely table-stakes for the academic user (likely: PDF import quality, section navigation) versus noise (camera scan, 1500 WPM)?

---

## 3. Prior art we are adapting (reference architectures)

Three open-source RSVP readers are close enough to study and borrow structure from. Roles: structure = module/component layout to mirror; ethos = product stance to match; engine = ORP/timing logic to reuse.

| Repo | Stack | What to borrow | What to change for our use case |
|---|---|---|---|
| `Viniciusmq25/SpeedRead-Pro` | React + TypeScript | Component split (`RSVPDisplay`, `Controls`, `ProgressBar`, `SettingsPanel`) and a single `utils/textProcessor.ts` for parsing plus timing; ORP toggle; sepia theme | It is single-pane and speed-framed; we add the second synced pane and the decoupled read-head, and demote raw speed |
| `sami-29/speeedy` | Local-first web | Ethos (offline, no accounts, no tracking), PDF/EPUB import, OpenDyslexic and Irlen tinted overlays, focus mode that hides chrome during playback | Same single-pane limitation; we keep the accessibility ideas and add dual-pane sync |
| `thomaskolmans/rsvp-reading` | Svelte + Vite | Clean separation: `rsvp-utils.js` (engine), `file-parsers.js` (ingestion), `progress-storage.js` (persistence), components, and a real test suite per module | Port the module boundaries to our React/TS layout; tests are the part most RSVP repos skip and we should not |

Net: our architecture is essentially the union of (engine + ingestion + persistence + components) from these, restructured around the **dual-pane decoupled-sync** core that none of them have.

**Research tasks.** Read the timing functions in `SpeedRead-Pro/utils/textProcessor.ts` and `rsvp-reading/lib/rsvp-utils.js` and reconcile their punctuation-delay and word-length heuristics into our dwell model (Section 6.2). Check licences before copying any code (most are MIT, verify).

**Open questions.** Do we vendor any of these as a dependency, or treat them purely as reference and write fresh? Recommendation: reference only, write fresh, since the dual-pane changes the data flow enough that copied single-pane code would fight us.

---

## 4. System architecture (desktop)

### 4.1 The five-layer model
The same conceptual model used (separately) by the future iOS app, so the two stay aligned.

```
+-----------------------------------------------------------+
|  5. Rendering + Preferences  (React components, tokens)   |
|     RSVP stage | Source pane | Settings | tokens/theme    |
+-----------------------------------------------------------+
|  4. Viewport + Sync State                                 |
|     read-head index (from engine)  <-- DECOUPLED -->      |
|     scroll position (user-owned) + "return to live"       |
+-----------------------------------------------------------+
|  3. Reader Engine  (pure, framework-free, tested)         |
|     advances token index over time; computes dwell; ORP   |
+-----------------------------------------------------------+
|  2. Canonical Document Model  (immutable)                 |
|     sections -> paragraphs -> sentences -> tokens         |
+-----------------------------------------------------------+
|  1. Ingestion + Parsing                                   |
|     v1: file (txt/md/pdf)   v2: URL (Worker + Defuddle)   |
+-----------------------------------------------------------+
```

Design rule: layers 2 and 3 are pure TypeScript with no React and no DOM, so they are unit-testable and portable. Layer 1 is source-agnostic (any provider yields the same Document Model). Layer 4 is the product's defining mechanic. Layer 5 reads everything through semantic tokens and the preferences store; no hardcoded styles.

### 4.2 Data model (the contracts)
These interfaces are the stable spine; everything else can change behind them.

```ts
type TokenId = number;

interface Token {
  id: TokenId;
  text: string;            // the display word, no surrounding whitespace
  anchorIndex: number;     // 0-based ORP pivot within text (Section 6.1)
  trailingPunctuation: string; // "", ",", ".", "?", ")" etc.
  sentenceId: number;
  paragraphId: number;
  sectionId: number;
  charStart: number;       // offset into the flattened source text
  charEnd: number;
  isHeading: boolean;      // token belongs to a section heading
}

interface Section { id: number; title: string; level: 1|2|3; firstTokenId: TokenId; }
interface DocumentModel {
  sourceType: "txt" | "md" | "pdf" | "url";
  title: string;
  tokens: Token[];         // canonical reading order
  sections: Section[];
  byParagraph: Record<number, TokenId[]>;
  bySentence: Record<number, TokenId[]>;
}

interface ReaderState {
  index: TokenId;          // current read-head
  isPlaying: boolean;
  wpm: number;
  chunkSize: 1 | 2 | 3;
}
```

Every Token carries both a **reading position** (id, sentence, paragraph, section) and a **document position** (charStart/charEnd). That dual addressing is what makes click-to-jump, section nav, and the underline sync possible without coupling scroll to playback.

### 4.3 The decoupled read-head (the core mechanic)
```
Engine tick ---> ReaderState.index advances        (playback clock)
                      |
                      v
            Source pane: token[index] underlined,
            tokens < index faded.
                      |
   User scrolls source pane  ---> ViewportState.userScrolling = true
                      |               (scroll position is INDEPENDENT;
                      |                playback keeps running)
                      v
   "Return to live" button appears; click ---> scroll snaps to token[index],
                                               userScrolling = false.
```
Two independent state atoms: `ReaderState.index` (owned by the engine) and `ViewportState` (owned by the user's scroll). The source pane only auto-scrolls to follow the read-head when `userScrolling` is false (and that auto-follow is itself a user-toggleable preference). This is the single most important interaction to get right.

### 4.4 Tech stack and deployment
- Frontend: Vite + React + TypeScript + Tailwind. Icons via lucide-react. No heavy UI kit; build controls from Tailwind primitives.
- Parsing: `pdfjs-dist` (pdf.js) for PDF, client-side; `@mozilla/readability` or `kepano/defuddle` for v2 article extraction.
- Persistence: `localStorage` for preferences and recent-session resume (works in Lovable's deployed output and on Cloudflare Pages; do not rely on it inside Claude artifacts, irrelevant here).
- Hosting: Cloudflare Pages (unlimited static bandwidth on free tier, deploys from the GitHub repo on push; no commercial-use restriction unlike GitHub Pages).
- v2 server hop: a minimal Cloudflare Pages Function or Worker as a fetch-relay (free tier ~100k requests/day) to bypass CORS. Extraction stays client-side.

### 4.5 Repo structure (target)
```
src/
  model/            # Layer 2: types.ts, documentModel.ts (pure)
  engine/           # Layer 3: readerEngine.ts, orp.ts, dwell.ts (pure, tested)
  ingestion/        # Layer 1: source.ts (interface), fileProvider.ts,
                    #          pdf/ (pdf.js + reading-order), urlProvider.ts (v2)
  state/            # Layer 4: preferencesStore.tsx, readerState.ts, viewportState.ts
  ui/               # Layer 5: AppShell, TopBar, SplitView, RSVPStage,
                    #          SourcePane, SettingsDrawer, controls/ primitives
  design/           # tokens.css, tailwind token mapping, themes
  fixtures/         # sample documents + golden token-stream JSON for tests
functions/          # v2: Cloudflare Pages Function fetch-relay
tests/              # engine + ingestion unit tests
```

**Research tasks.** Confirm pdf.js worker bundling under Vite (the pdf.js worker file must be served correctly; common Vite gotcha). Decide state approach: plain React Context plus reducers is sufficient and dependency-free; evaluate Zustand only if Context re-render cost becomes a problem in the source pane.

**Open questions.** Should the Document Model be fully materialised up front for large PDFs, or lazily tokenised per section to keep first-paint fast? Likely: parse structure eagerly, tokenise lazily per section.

---

## 5. (reserved - merged into 4)

---

## 6. Reader engine deep-dive (Layer 3)

### 6.1 Anchor point (ORP) algorithm
The ORP sits slightly left of a word's centre and is computed from word length. Standard length-to-pivot table (0-indexed), which our `orp.ts` should implement and expose as a pure function `anchorIndex(word: string): number`:

| Word length | Anchor index (0-based) |
|---|---|
| 1 | 0 |
| 2-5 | 1 |
| 6-9 | 2 |
| 10-13 | 3 |
| 14+ | 4 |

Render: the stage centres the word so the anchor character is at a fixed x for every word (this is what keeps the eye still), with the anchor character coloured via the `--anchor` token. Note the research caveat: the comprehension gain from ORP is modest, so anchor is an aid, user-toggleable, never the headline.

### 6.2 Adaptive dwell model
Pure function `dwellMs(token, prefs): number`. Base from WPM, then multipliers (calibrate constants against the reference repos, then tune by feel):

```
base = 60000 / wpm                       // ms per word at target WPM
d = base
if word length > 8:        d *= 1 + min((len - 8) * 0.04, 0.6)   // long words
if token has numerals/symbols: d *= 1.25                          // dense tokens
switch trailing punctuation:
  ","  -> d *= 1.5
  ";" ":" -> d *= 1.75
  "." "!" "?" -> d *= 2.0
  paragraph or section boundary after -> d *= 2.5
if chunkSize > 1:          d *= chunkSize * 0.9   // chunks shown longer, sub-linear
clamp d to [minFloorMs, maxCeilingMs]
```
Punctuation pause intensity (subtle/standard/strong) scales the punctuation multipliers. "Extra dwell on long words and numerals" is a toggle that switches those two multipliers on or off.

### 6.3 Chunking
1, 2 or 3 words per flash. For chunks, anchor on the chunk's longest word or the first word (decide in research below). Dwell uses the chunk's combined length and the heaviest trailing punctuation in the chunk.

### 6.4 Reading modes and the academic cap
| Mode | WPM range | Default | Notes |
|---|---|---|---|
| Comprehend | 250-450 | 300 (app default) | Matched page-format comprehension in studies |
| Accelerate | 450-650 | 550 | Acceptable for familiar material |
| Skim | 700-1000+ | 800 | De-emphasise comprehension claims; strengthen progress cues; keep instant rewind |

Academic cap: when WPM exceeds 500, show a non-blocking inline warning (toggleable) that comprehension degrades above this for dense text. Selecting a mode sets the slider range; the WPM slider remains free within 100-1200.

### 6.5 Engine loop
Drive with `requestAnimationFrame` accumulating elapsed time against the current token's `dwellMs`, not a naive `setInterval` (setInterval drifts and stutters). When accumulated time exceeds dwell, advance `index` by `chunkSize`. Pause/seek reset the accumulator. Expose `play()`, `pause()`, `seek(tokenId)`, `skip(±n)`, `setWpm()`, `setMode()`.

**Research tasks.** (a) Reconcile dwell constants with `SpeedRead-Pro` and `rsvp-reading` and pick defaults. (b) Decide chunk anchoring rule. (c) Evaluate an optional "ramp" (gentle WPM ease-in over the first ~10 words) for comfort. (d) Decide minimum floor/ceiling clamps.

**Open questions.** Should sentence-initial capital words or proper nouns get extra dwell? Does the engine need a "regression" feature (auto re-show the previous chunk on demand) given the source pane already provides backtracking?

---

## 7. Ingestion and parsing (Layer 1)

### 7.1 Source-agnostic interface (forward-compat for v2)
All providers implement one contract so adding URL parsing in v2 is additive, not a refactor:
```ts
interface SourceProvider {
  canHandle(input: File | string): boolean;
  load(input: File | string): Promise<{ title: string; rawText: string;
        structure: SectionHint[]; sourceType: DocumentModel["sourceType"] }>;
}
```
The tokeniser then turns `{rawText, structure}` into the canonical `DocumentModel` identically regardless of source.

### 7.2 v1 file providers
- `txt`, `md`: trivial; for Markdown, parse headings (`#`, `##`, `###`) into `SectionHint`s and strip syntax for display while keeping heading structure.
- `pdf`: pdf.js. This is the hard part (7.3).

### 7.3 PDF reading order (the real technical risk)
pdf.js `page.getTextContent()` returns text items with transform matrices giving x/y positions and font sizes, **not** clean reading order. Naive concatenation interleaves columns in two-column papers and scrambles headers/footers/footnotes. Approach:
1. For each page, collect items with (x, y, width, height, fontSize, str).
2. Detect columns by clustering item x-positions (e.g. 1D k-means or gap detection on left-edge x); most papers are 1 or 2 columns.
3. Within each detected column, sort top-to-bottom (y) then left-to-right (x); concatenate columns left-to-right.
4. Heuristically drop running headers/footers (repeating short lines at consistent y across pages) and detach footnotes/references (small font size near page bottom) into trailing sections.
5. Infer headings from relative font size and weight to build `SectionHint`s.
6. Reconstruct paragraphs from vertical gaps and line-start x-alignment.

This will not be perfect. Scope: target single-column and clean two-column academic PDFs; flag scanned/image PDFs (no text layer) and heavily-designed magazine layouts as out of scope with a clear user message.

### 7.4 v2 URL / automatic page parsing
Goal: paste a URL, fetch it, extract only the relevant article content, read it. Constraints: zero API cost, zero hosting cost.

Reality: a browser cannot fetch arbitrary cross-origin pages (CORS), so a server hop is unavoidable for pasted URLs. The zero-cost path:
```
Client: user pastes URL
   |
   v
Cloudflare Pages Function (free tier ~100k req/day)
   - server-side fetch(url), return raw HTML with permissive CORS header
   - this is the ONLY server responsibility; keep it ~15 lines
   |
   v
Client: run Defuddle (or Readability) on the raw HTML  -> clean article HTML
   - extraction is local, no API, no LLM
   |
   v
Tokeniser: clean HTML -> SectionHint(s) from h1-h3 -> DocumentModel
```
Library choice: use **Defuddle** client-side (modern, forgiving, standardises footnotes/code/maths, needs a real browser DOM which the client has). Keep **Mozilla Readability** as fallback and as the option if extraction ever moves into the Worker (Defuddle reportedly breaks with server-side DOM shims like linkedom). Forward-compat note: an alternative zero-server path is a separate browser extension that runs Defuddle on the current page DOM (no fetch, no hosting) but that is a separate product surface and not in this build.

Hard limitation to design around: a plain fetch only sees server-rendered HTML, so JavaScript-rendered SPAs, paywalled and bot-protected pages will extract empty or partial. Those need a headless browser (cost), which we are not paying for. Scope v2 to static-HTML articles and message the failure cases clearly.

**Research tasks.** (a) pdf.js column-detection heuristic: prototype k-means vs gap-detection on 5-10 real two-column papers and pick the more robust. (b) Defuddle vs Readability extraction quality on 10 representative article sources; record which the user base actually reads. (c) Worker relay: rate-limit and basic abuse protection (restrict to the app's origin) to stay within free tier. (d) Footnote/reference handling: read inline, append as a section, or skip.

**Open questions.** Do we cache fetched-and-extracted articles locally (localStorage/IndexedDB) for resume, and how do we respect the no-tracking ethos while doing so? Should v2 also accept pasted raw text/HTML directly (no fetch needed) as a cheap intermediate step before full URL support?

---

## 8. Preferences and toggleability (core use case, Layer 4/5)

Full user control is a primary product promise, not a settings afterthought. Architecture: one `preferencesStore` (React Context plus reducer) is the single source of truth; every component reads from it; changes apply live and persist to localStorage; the settings UI is composed from generic `PreferenceGroup` and `PreferenceRow` primitives so adding a setting is one entry.

| Group | Setting | Control | Default | Range / options |
|---|---|---|---|---|
| Reading | Mode | segmented | Comprehend | Comprehend / Accelerate / Skim |
| Reading | WPM | slider | 300 | 100-1200, live |
| Reading | Chunk size | segmented | 1 | 1 / 2 / 3 words |
| Reading | Punctuation pauses | toggle + segmented | on, standard | off / subtle / standard / strong |
| Reading | Extra dwell (long words, numerals) | toggle | on | on / off |
| Reading | Academic cap warning | toggle | on | warn above 500 WPM |
| Anchor | Anchor letter | toggle | on | on / off |
| Anchor | Anchor colour | swatch + custom | restrained accent (not red) | presets + custom |
| Anchor | Anchor weight | segmented | normal | normal / bold |
| Type (RSVP) | Font family | select | clean sans | sans / serif / mono / dyslexia-friendly |
| Type (RSVP) | Font size | segmented | M | S / M / L / XL |
| Type (Doc) | Font family | select | serif | sans / serif / mono / dyslexia-friendly |
| Type (Doc) | Font size | segmented | M | S / M / L / XL (independent of RSVP) |
| Type (Doc) | Line height | segmented | normal | compact / normal / relaxed |
| Source pane | Current-word indicator | segmented | underline | underline / highlight |
| Source pane | Underline thickness | segmented | medium | thin / medium / thick |
| Source pane | Read-word treatment | segmented | fade | fade / dim / none |
| Source pane | Section chips | toggle | on | show / hide |
| Source pane | Auto-scroll to read-head | toggle | on | on / off (the decoupling control) |
| Appearance | Theme | segmented | system | light / dark / system |
| Appearance | Accent colour | swatch + custom | restrained accent | presets + custom |
| Appearance | Split ratio | slider/draggable | 67/33 | draggable divider, persisted |
| Appearance | Progress bar | toggle | on | show / hide |
| Appearance | Reduced motion | toggle | follows OS | on / off |
| Accessibility | Tinted overlay (Irlen-style) | select + opacity | off | off / peach / mint / parchment + opacity |
| Accessibility | Focus mode | toggle (key: F) | off | hide chrome during playback |

**Research tasks.** Decide the preset palettes for accent and anchor that hold contrast in both themes (WCAG AA against bg and surface). Decide whether preferences export/import (JSON) is worth it for power users.

**Open questions.** Do RSVP and document typography defaults differ on purpose (sans for the stage, serif for the document) or should they share one setting with an override? Current recommendation: separate, because the two surfaces have different legibility needs.

---

## 9. Design system and UX

### 9.1 Aesthetic direction
Calm, editorial, premium; the deliberate opposite of the neon "productivity dashboard" the category defaults to. Warm-neutral light theme (paper-inspired), true low-glare dark theme. Generous whitespace, one confident restrained accent, clear type hierarchy. Reading surfaces stay flat and quiet; no glass or gradients behind running text. Default anchor is a restrained accent, never red (red is fatiguing and is a competitor signature). The only motion in the product is the word cadence and the underline progression; honour reduced-motion.

### 9.2 Semantic design tokens
CSS custom properties, never hardcoded values; theme switching is a token swap.
```
--bg            page background
--surface       panels, drawer, top bar
--text          primary reading text
--muted         secondary text, read-word fade target
--accent        primary accent (controls, active states)
--anchor        ORP character colour
--underline-current   current-word underline in source pane
--underline-read      already-read underline/fade
--selection     text selection
```
Map these into Tailwind via the theme config so components use token-backed utilities, not raw colours.

### 9.3 Layout (desktop)
```
+-----------------------------------------------------------------------+
| TopBar: [Import] [Mode v] [<<] [Play/Pause] [>>]  WPM 300   [Settings] |
+-------------------------------------------+---------------------------+
|                                           | Section chips: Intro Methods ... |
|         RSVP STAGE (67%)                  |                           |
|                                           |  SOURCE PANE (33%)        |
|              re a ding                    |  scrollable full document |
|                ^ anchor                   |  current word underlined  |
|                                           |  read words faded         |
|  [=========------------]  progress        |  [Return to live]         |
+-------------------------------------------+---------------------------+
        draggable divider (persisted ratio)
```
Settings open as a right-hand slide-over drawer. Focus mode hides TopBar, progress and chrome during playback, leaving only the stage; pausing or pressing F restores chrome.

### 9.4 Components
`AppShell`, `TopBar`, `SplitView` (resizable divider), `RSVPStage` (word + anchor + progress), `SourcePane` (scroll, underline states, section chips, return-to-live), `SettingsDrawer`, primitives `Toggle / Slider / SegmentedControl / Select / ColourSwatch`, `PreferenceGroup / PreferenceRow`, `ImportButton` (and v2 `UrlImport`). Keep RSVPStage and SourcePane dumb; they render from `ReaderState` plus tokens plus preferences.

### 9.5 Interaction and keyboard
Space play/pause; Left/Right skip 10 words; Up/Down WPM by 50; Esc pause; F focus mode; click any word in the source pane to set the read position; section chip click jumps the source scroll; progress bar click-to-seek. All live-applying.

### 9.6 Accessibility
Respect prefers-reduced-motion; full keyboard operability; dyslexia-friendly font option; Irlen-style tinted overlays with adjustable opacity; AA contrast for text and the anchor in both themes; do not rely on colour alone for the current-word indicator (underline plus colour). RSVP is inherently hostile to some needs, so Browse (full document, normal reading) is the accessible fallback and must always be reachable.

**Research tasks.** Select the four font families (a clean sans, a readable serif, a mono, and an OpenDyslexic-style face with an open licence) and confirm licences for web embedding. Define the accent and anchor preset palettes with measured contrast.

**Open questions.** Does Browse warrant a true single-pane full-width document mode (collapsing the stage) on desktop, mirroring the planned mobile Browse, or is the 67/33 split always present on desktop?

---

## 10. Epics (compressed) with success criteria

Each epic is a Claude Code-sized chunk. Decompose into granular tickets only where flagged or where it stalls. Success criteria are acceptance gates.

### E1 - Scaffold and design system
Goal: Lovable-scaffolded shell moved to GitHub, building cleanly on Cloudflare Pages, with the token system and preference primitives in place.
Success: app builds and deploys from a git push; theme switches via token swap; `PreferenceGroup/Row` primitives render all control types; no hardcoded colours in components.
Research/Open: confirm pdf.js worker bundling under Vite before deep work (de-risk early).

### E2 - Document model and tokeniser
Goal: pure `model/` and a tokeniser that turns `{rawText, structure}` into `DocumentModel` with anchor indices and section/paragraph/sentence mapping.
Success: golden-fixture tests pass (sample texts produce expected token streams); anchor indices match the Section 6.1 table; headings map to sections.
Research/Open: lazy vs eager tokenisation for large docs.

### E3 - Reader engine
Goal: pure `engine/` (orp, dwell, loop) with play/pause/seek/skip/mode/WPM.
Success: rAF-driven loop holds steady cadence at a set WPM (measured drift under a small threshold); dwell multipliers apply per the 6.2 model; mode selection sets ranges; academic-cap warning fires above 500 WPM; unit tests cover dwell and ORP.
Research/Open: dwell constants reconciliation; chunk anchoring rule; optional ramp.

### E4 - Dual-pane UI and decoupled sync (the core)
Goal: SplitView with RSVPStage and SourcePane; read-head underline; read-word fade; decoupled scroll with return-to-live; click-to-jump; section chips.
Success: playback continues while the user scrolls the source freely; return-to-live snaps to the current token in one action; clicking a word sets read position; auto-scroll-to-read-head respects its toggle; divider ratio persists.
Research/Open: single-pane Browse on desktop (Section 9 open question).

### E5 - File ingestion (txt/md/pdf)
Goal: `SourceProvider` interface plus txt/md/pdf providers; pdf.js with column-aware reading order (Section 7.3).
Success: txt/md read correctly with headings; a clean single-column and a clean two-column PDF both produce correct reading order and sections; scanned/image PDFs and unsupported layouts are detected and messaged, not silently broken.
Research/Open: column-detection heuristic prototype; footnote handling.

### E6 - Preferences and persistence
Goal: full Section 8 preference set wired to live behaviour and persisted; recent-session resume.
Success: every setting in the Section 8 table is functional, applies live, and survives reload; reopening a recent document restores read position.
Research/Open: preset palettes with AA contrast; export/import.

### E7 - v2 automatic page parsing
Goal: Cloudflare Pages Function fetch-relay plus client-side Defuddle extraction plus URL import UI.
Success: pasting a static-HTML article URL fetches, extracts main content (nav/ads/footers stripped), tokenises with section nav, and reads in the dual pane; SPA/paywalled/bot-protected URLs fail gracefully with a clear message; relay stays within free-tier limits and is origin-restricted.
Research/Open: Defuddle vs Readability quality sample; local caching vs no-tracking; accept pasted raw text as an intermediate.

### E8 - Polish, accessibility, performance, launch
Goal: a11y pass, focus mode, reduced-motion, large-document performance, error states, deploy hardening.
Success: keyboard-complete; reduced-motion honoured; a large PDF (e.g. 30+ pages) tokenises and scrolls without jank; AA contrast verified in both themes; clean empty/error/loading states; production deploy on Cloudflare Pages with the GitHub repo as source of truth.
Research/Open: optional local-only self-benchmark stats given the no-tracking stance.

---

## 11. Build workflow (Lovable -> GitHub -> Claude Code)

1. Lovable: scaffold E1 only (shell, layout, tokens, preference primitives, sample fixtures), constrained to Vite + React + TS + Tailwind, client-side, no Supabase/backend/auth. Iterate briefly on look and layout.
2. Export to GitHub; strip any Shadcn/Radix clutter Lovable injects back to plain Tailwind before continuing (cleaner input, cleaner continuations).
3. Connect the GitHub repo to Cloudflare Pages (deploy on push). Stop using Lovable for functional changes.
4. Claude Code picks up E2-E8 as whole epics; decompose into granular tickets only where flagged or stuck. Keep `model/` and `engine/` pure and test-first (golden fixtures shared with the future iOS app for parity).
5. v2 (E7) is a post-launch fast-follow; the source-agnostic ingestion interface (7.1) means it slots in without refactoring v1.

---

## 12. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| PDF reading order for two-column papers is wrong | High | Treat 7.3 as the main engineering spike; scope to clean layouts; message unsupported PDFs; prototype column detection early in E5 |
| Differentiator is copyable (no moat) | Medium | Compete on execution, polish and free/open-source; ship the dual-pane sync well before the category notices |
| v2 fetch fails on JS-rendered/paywalled sites | Medium | Scope to static HTML; clear failure messaging; do not pay for headless rendering |
| Engine cadence jank at high WPM or large docs | Medium | rAF accumulator not setInterval; lazy tokenisation; virtualise the source pane render |
| Free-tier abuse on the v2 relay | Low | Origin-restrict the Worker; basic rate limit; it is read-only fetch |
| Scope creep toward speed-training features | Low | Non-goals in Section 1.5 are firm; comprehension-first stays the spine |

---

## 13. Glossary

RSVP = rapid serial visual presentation (words flashed at a fixed point). ORP = optimal recognition point, the anchor character. WPM = words per minute. CORS = cross-origin resource sharing (browser rule blocking arbitrary cross-site fetch). Read-head = the token RSVP is currently showing. Decoupled sync = read-head independent from the user's scroll. SPA = single-page app (JS-rendered, server returns a shell). AA = WCAG AA contrast level. rAF = requestAnimationFrame.

---

## 14. References (study, then adapt)

Reference implementations: `Viniciusmq25/SpeedRead-Pro` (React/TS, components + textProcessor), `sami-29/speeedy` (local-first, dyslexia/Irlen, offline ethos), `thomaskolmans/rsvp-reading` (Svelte, clean engine/ingestion/persistence split with tests).

Extraction (v2): `kepano/defuddle` (modern, client-side), `mozilla/readability` (proven fallback / Worker-safe), `zcag/readdown` (HTML to Markdown, optional).

Fetch relay (v2): Cloudflare official `cors-header-proxy` example or `chebyrash/cors` (minimal Worker, free tier ~100k req/day).

Parsing: `pdfjs-dist` (pdf.js) for client-side PDF text extraction with positional text items.

Research framing: RSVP comprehension declines as speed rises and is worse for paragraphs; ORP is a modest tweak, not a breakthrough; treat speed as a mode, context as the product. Comprehend 250-450, Accelerate 450-650, Skim 700-1000+; warn above 500 for dense text.
