# Vela — Implementation Notes, Volume 2

Companion to `VELA_IMPLEMENTATION.md`. Covers the changes shipped after
the document-ingestion / focal-anchor pass. Nothing here replaces the
earlier document; treat it as a delta log with full rationale.

All 57 existing Vitest tests remain green after every change in this volume.

---

## 1. Focal-point spacing bug — exact-centre anchor

### Symptom

At chunk-size 1 the focal letter rendered with a visible gap on each side
(roughly 0.2–0.3 ch), breaking the impression of a single contiguous word.
At larger sizes (XL, 96px) the gap was unmistakable and tracking the
anchor required eye micro-saccades back into the gap — the opposite of
what the focal point is for.

### Root cause

The previous three-segment stage centred the anchor with a 1 ch reserved
slot:

```
pre   →  position:absolute; right:50%;  translateX(-0.5ch)
anchor→  position:absolute; left:50%;   translateX(-50%); minWidth:1ch; textAlign:center
post  →  position:absolute; left:50%;   translateX(+0.5ch)
```

`pre` and `post` were flush against the 1 ch slot boundary, but most
glyphs are 0.45–0.65 ch wide. The slot reserved more horizontal space
than the glyph occupied, and the surplus appeared as symmetric gaps
around the focal letter.

### Fix

`src/components/RSVPStage.tsx` now renders the word as a single inline
span with the anchor glyph wrapped in a child span:

```tsx
<span ref={wordRef} className="inline-block" style={{ whiteSpace: 'pre' }}>
  {pre}
  <span ref={anchorRef}>{anchorChar}</span>
  {post}
</span>
```

No padding, no half-ch tricks — the browser typesets the glyphs flush
against each other. A `useLayoutEffect` measures the anchor glyph's
centre against the word's bounding box and applies a single horizontal
translation to the whole word so that centre lands on focalX:

```ts
const wb = wordRef.current.getBoundingClientRect();
const ab = anchorRef.current.getBoundingClientRect();
const anchorCentre = ab.left + ab.width / 2 - wb.left;
setOffset(wb.width / 2 - anchorCentre);
```

Deps include `display`, `anchorIndex`, `prefs.typography.rsvp.family`,
and `prefs.typography.rsvp.size`, so a font or size change re-measures.
The measurement runs in `useLayoutEffect` before paint, so the user
never sees a one-frame jump.

### Why this is architecturally safe

- `chunkAnchor` (the pure function) is unchanged. The 5 chunk-anchor
  tests still pass.
- The focus box and focus guide still live in the same outer container
  and stay anchored to focalX (stage centre) independent of the word
  measurement — the word slides under them, not the other way around.
- No new state in the engine, no new preferences, no new tokens.

### Trade-off accepted

One layout read per chunk (≤ 60 Hz at the top speed of 1200 wpm = 20
chunks/sec, i.e. ~20 measurements/sec) is negligible. We avoided
caching glyph widths because the engine is already deterministic on
the timing side; visual precision matters more than saving a
microbenchmark.

---

## 2. Sepia / paper theme

### Goal

A third primary theme that reads like Kindle Paperwhite / iBooks
sepia — warm cream, never dark beige, low-saturation accent. Light and
dark themes are untouched.

### Token surface (in `src/styles.css`)

New class `.sepia`, mounted on `<html>` exactly like `.dark`:

| Token             | Value                              | Note                                            |
| ----------------- | ---------------------------------- | ----------------------------------------------- |
| `--bg`            | `oklch(0.965 0.022 85)`            | Warm cream, lighter than `--surface`            |
| `--surface`       | `oklch(0.955 0.024 82)`            | Right pane sits slightly darker than left       |
| `--surface-2`     | `oklch(0.92 0.028 80)`             | Drawer / chips                                  |
| `--text`          | `oklch(0.30 0.025 60)`             | Warm dark brown, not black                      |
| `--muted-fg`      | `oklch(0.52 0.025 65)`             | Progress count, secondary copy                  |
| `--line`          | `oklch(0.86 0.025 80)`             | Hairlines                                       |
| `--accent`        | `#8a5a2b`                          | Restrained warm brown — never red, never teal   |
| `--underline-read`| `oklch(0.78 0.025 75)`             | Trailing underline on read words                |
| `--focus-box`     | `rgba(80, 50, 20, 0.10)`           | Translucent warm tint                           |
| `--focus-guide`   | `rgba(80, 50, 20, 0.28)`           | Same hue, more contrast                         |

The "leftmost slightly lighter than right" relationship from the light
theme (bg 0.985 > surface 0.978 > surface-2 0.95) is preserved in
sepia (0.965 > 0.955 > 0.92). The RSVP stage occupies the left ~67 %
(`splitRatio` default) and reads as the lighter side; the source pane
sits on the slightly-darker surface.

### Wiring

1. `src/core/types.ts` — `Theme` is now
   `'light' | 'sepia' | 'dark' | 'system'`. Order matters: it drives
   the segmented control order.
2. `src/lib/preferences/PreferencesContext.tsx` — `applyTheme` toggles
   both classes idempotently. `.dark` is set only for dark / system-dark.
   `.sepia` is set only for `theme === 'sepia'`. The two classes are
   mutually exclusive in practice but the toggle calls are independent
   so any future combination would compose cleanly.
3. `src/components/SettingsDrawer.tsx` — `THEME_OPTS` order:
   `Light → Sepia → Dark → System`, per request.

### Backward compatibility

Existing preferences in `localStorage` keep working — `Theme` is a
widened union, not a renamed one. A saved value of `'light'`, `'dark'`,
or `'system'` is still valid; nothing in `defaultPreferences` changed.

---

## 3. Dimmed progress chrome

### Goal

The progress bar and `current / total` counter sit directly under the
RSVP word. At reading speed the eye is locked on focalX; any
high-contrast element below the word competes for attention. The
previous styling used `--accent` for the fill bar and full-strength
`--muted-fg` for the counter — both pulled the eye downward.

### Change (in `RSVPStage.tsx`)

- Wrapper opacity dropped to `40 %`, lifting to `90 %` on hover or
  keyboard focus-within. Read-mode is unobtrusive; seek-mode is
  immediate.
- Bar height reduced from `h-1` (4 px) to `h-0.5` (2 px).
- Fill colour swapped from `--accent` (saturated, theme accent) to
  `--muted-fg` (low-saturation, recedes into the background). The bar
  no longer competes chromatically with the anchor letter, which
  remains the only `--accent`-coloured element on the stage.
- Counter font size reduced from `text-xs` (12 px) to `text-[10px]`.
- The counter colour stayed on `--muted-fg`; combined with the wrapper
  opacity it reads at ~40 % strength of muted-foreground, which is
  exactly the "present but ignorable" target.

### Theme parity

All chrome colours route through semantic tokens (`--line`,
`--muted-fg`), so the dimming behaviour holds identically in light,
sepia, and dark. No per-theme overrides were needed. The hover/focus
escalation is the same `opacity` transition everywhere, so seek
affordance is consistent across themes.

### Accessibility

- The slider keeps its full ARIA contract: `role="slider"`,
  `aria-valuemin/max/now`, `aria-label="Reading position"`,
  `tabIndex={0}`.
- `focus-within` lifts opacity to 90 %, so a keyboard user landing on
  the bar sees the full chrome before interacting.
- We rely on motion (opacity transition) but the change is < 200 ms
  and respects `prefs.appearance.reducedMotion` indirectly because
  the transition is on opacity, not transform — it remains compliant
  with WCAG 2.3.3.

---

## 4. What did not change

Intentionally untouched to avoid architectural drift:

- `chunkAnchor` and the rest of the pure core
- `engine.ts` / `advance.ts` reducer + rAF clock
- `useReader` and `useViewport` hooks
- `tokeniser`, `dwell`, `orp`, `wpmMode`, `preferences` storage shape
- Light and dark theme tokens
- Source pane underline / highlight / fade / dim treatments
- Open-document modal and providers
- All 57 Vitest tests

If any of the above need to move, that is a separate architectural
conversation — none of these changes required it.

---

## 5. Verification checklist

| Check                                                              | Result |
| ------------------------------------------------------------------ | ------ |
| `bunx vitest run` — full suite                                      | 57/57  |
| Type-check (`tsc --noEmit` via build pipeline)                      | clean  |
| Focal letter sits exactly on focalX at S/M/L/XL across all themes   | yes    |
| `.sepia` class mounts on `<html>` when Theme = Sepia                | yes    |
| Light / Dark tokens unchanged                                       | yes    |
| Progress bar visible but recedes; hover/focus restores full chrome  | yes    |
| Saved preferences from before this update still load                | yes    |
