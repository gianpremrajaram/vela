# CLAUDE.md

> Operating guide for Claude Code sessions on the Vela repository. Read this end-to-end before starting any work.

---

## What Vela is

A comprehension-first hybrid RSVP reader. The left pane flashes words at a fixed anchor point; the right pane shows the full source document with a decoupled, independently scrollable read-head. Desktop web, local-first, no accounts, no tracking, open-source.

**Three-layer separation is the load-bearing architectural rule:**

1. `src/core/` -- pure TypeScript, no React, no DOM. Engine, tokeniser, dwell maths, anchor maths. Framework-portable and unit-tested.
2. `src/lib/` -- React adapters. Context, hooks, localStorage persistence, rAF loop integration. No maths, no direct DOM manipulation beyond what hooks legitimately provide.
3. `src/components/` -- stateless or near-stateless views. Styled exclusively through semantic CSS tokens. No hardcoded colours, no business logic.

This is non-negotiable. It is what keeps the engine unit-testable with a virtual clock and what makes an iOS port tractable.

---

## Toolchain

### Runtime and package manager

- **Bun** for package management and scripts. Use `bun install`, `bun run dev`, `bun run build`.
- Never commit `node_modules`.

### Language

- TypeScript strict mode throughout. `tsconfig.json` is authoritative.
- No `any` in public signatures unless the type is genuinely polymorphic.
- Prefer discriminated unions over optional fields for variant types.

### Linting and formatting

- `eslint .` for linting (configured via `eslint.config.js`).
- `prettier --write .` for formatting.
- Never bypass with `--no-verify`. If a hook fails, fix the underlying issue.

### Testing

- `bunx vitest run` for the full suite.
- `bunx vitest --watch` during development.
- Tests live in `src/core/__tests__/`. Vitest config is at `vitest.config.ts`, environment is `jsdom`.
- **Test first or alongside** for anything in `src/core/`. Never ship untested core logic.
- Treat a failing test as a behaviour change to discuss, not a test to delete.

### Type checking

- `tsc --noEmit` (or equivalent via the build pipeline) must be clean before any commit.

---

## Code style and architecture

### Layer discipline

| Layer | What belongs here | What does not |
|---|---|---|
| `src/core/` | Tokenisation, anchor maths, dwell maths, pure reducer, engine loop | React imports, DOM access, localStorage |
| `src/lib/` | Context providers, hooks, localStorage read/write, rAF integration | Business maths, direct style manipulation |
| `src/components/` | JSX, event handlers, CSS token classes | Cadence logic, engine calls outside hooks |

If you find yourself importing React inside `src/core/`, stop. If you find yourself writing a dwell multiplier inside a hook, move it to `dwell.ts` and write a test.

### CSS tokens, never hardcoded colours

All colours flow through CSS custom properties defined in `src/styles.css`. The token set:

`--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted-fg`, `--accent`, `--anchor`, `--underline-current`, `--underline-read`, `--focus-box`, `--focus-guide`, `--selection`, `--rsvp-font`, `--rsvp-size`, `--doc-font`, `--doc-size`, `--doc-line-height`.

Three theme classes: `:root` (light), `html.dark` (dark), `html.sepia` (sepia). Token overrides are additive -- add a `.sepia` block before reaching for per-component theme checks.

**Never write `text-white`, `bg-[#...]`, or any raw colour value in a component.** Add a token instead.

### Semantic tokens for state, not colour-only

Do not signal state with colour alone. Segmented controls add an underline in addition to colour. Toggles use `role="switch"`. The anchor letter uses both colour and optionally weight. This is a hard accessibility rule.

### Component authorship

- `RSVPStage` and `SourcePane` are dumb: they render from `snapshot`, `doc`, and `prefs`. Do not put engine calls inside them.
- `VelaApp` owns the only non-preference feature state: `doc` and `settingsOpen`. Keep it that way.
- The `controls/` primitives (`Toggle`, `Slider`, `SegmentedControl`, `Select`, `ColourSwatch`, `PreferenceGroup`, `PreferenceRow`) are ~20-45 lines each. Do not grow them; do not replace them with shadcn equivalents without a good reason.

### The injectable clock

`engine.ts` accepts `now` and `schedule` as optional constructor arguments. The defaults are `performance.now()` and `requestAnimationFrame`. Tests inject a manual clock and manual scheduler. Never call `performance.now()` or `requestAnimationFrame` directly inside the engine -- always use the injected dependencies.

### Preferences projection

`PreferencesContext.tsx` projects the entire preferences tree onto `<html>` as CSS custom properties on every change. Components never need to read `prefs` just to get a colour or font -- they read the token. New preferences that affect visual output must project a CSS variable.

### click delegation in SourcePane

`SourcePane` handles click via a single listener on the root that reads `event.target.closest('[data-token-id]')`. Do not add per-token event handlers. Documents can have thousands of tokens.

---

## Implementation discipline

These principles prevent the most common causes of rework.

**Surface assumptions before coding.** If a request admits multiple reasonable interpretations, name them and ask. Ambiguity hidden upfront becomes rework at review.

**Minimum code that satisfies the requirement.** No speculative abstractions, no configurability nobody asked for, no error paths for states that cannot occur. If a 200-line diff could be 50, rewrite it.

**Surgical edits.** When modifying existing code, touch only what the change requires. Do not reformat adjacent code, do not refactor working code, do not delete pre-existing dead code. Every changed line should trace to the task.

**Orphan cleanup is yours; pre-existing cruft is not.** Remove imports, variables, and symbols that your change leaves unused. Leave unrelated dead code alone.

**No comments that explain what the code does.** Well-named identifiers do that. Write a comment only when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug.

---

## Critical architectural constraints

### Pure core is the contract

`src/core/` is the portable, testable spine. Any new cadence rule belongs in `dwell.ts` with a test. Any new anchor logic belongs in `orp.ts` or `chunkAnchor.ts` with a test. Any new tokenisation rule belongs in `tokeniser.ts` with a test.

### The rAF accumulator, not setInterval

The engine accumulates elapsed time against `dwellMs` on every frame. `setInterval` drifts and stutters under tab-switch catch-up. Do not introduce `setInterval` or `setTimeout` loops for pacing.

### Decoupled scroll is the core mechanic

`ReaderState.index` (owned by the engine) and `ViewportState` (owned by the user's scroll) are independent state atoms. The source pane auto-scrolls to follow the read-head only when `isUserScrolling` is false. Do not couple them. The `IDLE_MS = 600` constant in `useViewport.ts` is the gate; adjust it only with a clear UX reason.

### The `STORAGE_KEY` migration hatch

Preferences persist under `vela.preferences.v1`. The `.v1` suffix is the migration key. When a change would break existing saved preferences, bump to `.v2` and handle the old payload gracefully. Never silently corrupt saved preferences.

### Exhaustive unions via `assertNever`

`assertNever(x: never)` in `types.ts` is used in switches over union types. Adding a new variant to a union (e.g., `PunctuationIntensity`, `Theme`) will fail the build at every switch site that does not handle it. This is intentional. Do not work around it with a default case.

### SourceProvider is the ingestion seam

Adding a new document source means implementing `SourceProvider` in `src/core/sources/`. Nothing else in the app should change. Do not add ingestion logic to components or hooks.

---

## Things to never do

1. **Never hardcode a colour** in a component. Add a token to `src/styles.css`.
2. **Never import React inside `src/core/`**. The core is framework-free.
3. **Never write timing or cadence maths outside `src/core/`**. If it looks like `60000 / wpm` or a dwell multiplier, it belongs in `dwell.ts`.
4. **Never call `performance.now()` or `requestAnimationFrame` directly inside the engine** -- use the injected `now` and `schedule` dependencies.
5. **Never add per-token event handlers in `SourcePane`**. Use click delegation.
6. **Never signal state with colour alone**. Pair with an underline, a weight change, or an ARIA attribute.
7. **Never delete a test because it is inconvenient.** A failing test is a behaviour conversation, not a cleanup task.
8. **Never ship core logic without a test in `src/core/__tests__/`**. The suite runs in under a second.
9. **Never use `setInterval` for pacing.** rAF accumulator only.
10. **Never push to the remote or open pull requests** unless the user explicitly asks.

---

## Things to always do

1. **Always check the three-layer rule** before writing a line: does this belong in core, lib, or components?
2. **Always write tests first or alongside** for anything in `src/core/`.
3. **Always run `bunx vitest run` and `tsc --noEmit`** before considering a change complete.
4. **Always project new appearance preferences** as CSS custom properties in `PreferencesContext.tsx`.
5. **Always use UK spelling** in user-facing copy, markdown, and comments. US spelling is fine in code identifiers where third-party APIs require it (e.g., `color` props on `<input type="color">`).
6. **Always use semantic tokens** for colours, never raw values.
7. **Always pair colour-based state signals** with a non-colour indicator for accessibility.
8. **Always deep-merge loaded preferences over defaults** so new preference keys do not break old saved payloads.

---

## Conventions

### Spelling

UK English in all user-facing copy and documentation: `Colour`, `Behaviour`, `Recognise`, `Customise`. Code identifiers follow the library in use.

### No em dashes

Use a comma, a colon, or a separate sentence instead.

### Accent colour

The default accent is a restrained slate-teal (`#2f7a78`). Red is explicitly disallowed as an accent -- it is fatiguing and is a competitor signature.

### Fixtures

The three sample fixtures in `src/core/fixtures/` are bundled ES modules, not fetched at runtime. They must work offline and produce a deterministic token count. Do not make them async or network-dependent.

---

## Scope boundaries (out of scope for current build)

Do not pull these into open tasks without a separate explicit decision:

- Real PDF reading-order extraction (column detection prototype outstanding)
- URL fetch relay and client-side article extraction
- EPUB, camera scan, OCR
- Accounts, cloud sync, payments
- Mobile layout
- Focus mode (hide chrome during playback)
- Tinted overlays (Irlen-style)
- AI summarisation

---

## When in doubt

1. Re-read the relevant section of `VELA_IMPLEMENTATION.md` or `VELA_IMPLEMENTATION_2.md`. They are the code-review baseline and architecture reference.
2. Check `src/core/__tests__/` -- the tests are the behaviour contract.
3. If a change touches the engine or dwell maths, confirm all 57+ tests still pass before proceeding.
4. If an architectural decision is genuinely ambiguous, surface the options explicitly rather than picking silently.

---

*Keep this file current as the repo evolves. A stale operating guide is worse than no guide at all.*
