---
name: distortion-wave
description: Add, tune, debug and test distortion-wave transitions (npm package `distortion-wave`), an API shaped like document.startViewTransition() that plays a WebGL2 wave on any DOM element, from a single button to a whole page. Use this skill whenever the user wants a wave / liquid / ripple / glitchy transition on a UI state change (toggle, tabs, add to cart, list update, theme switch), mentions distortionWave, waveOnClick, setWaveDefaults or the distortion-wave package, wants a View Transitions-like effect scoped to one component, wires it into React, Vue, Svelte, Angular or vanilla JS, or reports a glitch in such an animation (square corners, a rectangle around text, squashed letters, nothing happening, old content flashing).
---

# distortion-wave

`distortionWave(target, update, options)` snapshots `target`, runs `update`, snapshots it again, then draws one WebGL2 overlay that carries the old pixels into the new ones behind a lensed, colourful wave front. When the wave has passed, the overlay goes away and the real DOM is back. Same lifecycle as `document.startViewTransition()`, but scoped to one element and drawn on the GPU.

Read this file first. Go to `references/` only for the part you need:

| File | Read it when |
|---|---|
| `references/api.md` | you need an exact signature, an option, a default, a tuning key or the `WaveTransition` promises |
| `references/frameworks.md` | the project uses React, Next.js, Vue, Svelte, Angular, Solid, Lit, htmx or plain DOM |
| `references/recipes.md` | you are wiring a specific component (tabs, cart, list, accordion, form, theme, route change…) |
| `references/troubleshooting.md` | something looks wrong or nothing animates |
| `references/internals.md` | you are changing, porting or debugging the library itself |
| `scripts/film-wave.mjs` | you want to look at the wave frame by frame to check your work |

## Install

```sh
npm i distortion-wave        # ≥ 0.2.1: earlier versions have the visual bugs listed in troubleshooting.md
```

```js
import { distortionWave, waveOnClick, setWaveDefaults, warmupWave } from 'distortion-wave';
```

No bundler: `import { distortionWave } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.2/+esm'`, or the IIFE build `https://cdn.jsdelivr.net/npm/distortion-wave@0.2/dist/distortion-wave.iife.min.js`, which exposes `window.DistortionWave`. Zero dependencies, ~18 kB gzipped. Importing it has no side effect, so it is safe in SSR code; only call it in the browser, from an event handler or an effect.

## The one rule: the DOM must be updated when `update` is done

The "after" snapshot is taken as soon as `update()` returns, or as soon as the promise it returns resolves. If the framework renders later, the wave carries the old state into the old state, and the new one pops in at the end. So make the render synchronous, or return a promise that resolves after it:

| Stack | `update` |
|---|---|
| Plain DOM | change the DOM directly |
| React | `() => flushSync(() => setState(…))` |
| Vue | `() => { state.x = 1; return nextTick(); }` |
| Svelte 5 | `async () => { x = 1; await tick(); }` |
| Angular | `() => { this.x = 1; this.cdr.detectChanges(); }` |
| Lit | `async () => { this.x = 1; await this.updateComplete; }` |
| Solid | signals update the DOM synchronously: just set them |

Slow work (fetching data) belongs **before** the call. `update` should only apply data you already have, because the wave holds its anticipation while it waits, and gives up animating after `timeout` (3 s).

## Pick the target, the source and the focus

These three choices decide whether the effect looks designed or random.

**target**: the smallest element that contains everything that visibly changes, and nothing that doesn't.
- A button that changes its own label or state: the button.
- Tabs: the panel below them, not the tab bar.
- "Add to cart" inside a product card: the card.
- A list that gets an item: the list. It changes size, and the outline of the wave follows.
- A theme switch: the app wrapper (`#app`). Never `body` or `html`; they can't be targets, so wrap the app.
- Two separate places change (the card and a cart badge in the header): wave the card and update the badge in the same `update`. The badge just changes.

**source**: where the wave starts. Pass the control that was pressed (`source: event.currentTarget`) when it is next to or inside the target: the wave leaves that button and crosses the target. Leave it out when the target is the button itself: the wave becomes a ring from the touch point. It also accepts a rect or `{ x, y }`.

**focus**: pass the pointer event (`focus: e`). The front leans toward the finger, which is what makes it feel physical. Keyboard clicks carry no position and are ignored, so the wave starts centred: nothing to handle. `submit` events have no coordinates: remember the last `pointerdown` on the form and pass that point.

```js
tabs.addEventListener('click', (e) => {
  const tab = e.target.closest('[role=tab]');
  if (!tab || tab.getAttribute('aria-selected') === 'true') return;   // no wave when nothing changes
  distortionWave(panel, () => renderPanel(tab.dataset.id), { source: tab, focus: e });
});
```

## Options you will actually use

| Option | Use |
|---|---|
| `duration` | total length in ms, whatever the size. Default: from the size (about 2 s for a button, 4 s for a page; the second half is the glow fading out, so it feels shorter). |
| `easing` | how the front travels: `'ease-out'`, `'linear'`, `'cubic-bezier(…)'`, `[x1, y1, x2, y2]` or a function |
| `intensity` | strength of the distortion. `0.5` for dense UI or text-heavy targets, `0` keeps only the colours |
| `palette` | `'aurora'` (default), `'ocean'`, `'mint'`, `'ember'`, or up to 8 colours. Match the meaning: mint for success, ember for delete or like |
| `variant` | `'vertical'`, `'horizontal'`, `'center'`. `'auto'` picks from the shape of the source; override only if the direction looks wrong |
| `particles` | `false` for a calmer look |

App-wide taste goes in `setWaveDefaults({ duration: 1200, intensity: 0.7 })`; options passed to a call still win. Every fine-tuning key (blur, rim, lens, colour band…) is in `references/api.md`; change them only after `duration`, `intensity` and `palette`.

## The returned transition

```js
const t = distortionWave(card, update, { source: button, focus: e });
await t.ready;               // overlay up, animation started
await t.updateCallbackDone;  // your update ran (rejects if it threw)
await t.covered;             // the wave has passed over everything: old state gone
await t.finished;            // overlay removed, real DOM back
t.skip();                    // jump to the end; the update still runs
```

Chain on `finished`, for example a "Copied!" label that reverts, or a second step like "Downloading…" then "Done". Starting a new wave on a target that is still waving skips the old one, so double clicks are safe.

## Things that make it feel good

- Call `warmupWave()` once at idle: it compiles the shaders, so the first click has no hitch.
- For big targets (a whole page) use `waveOnClick(trigger, target, update)`: it pre-captures on hover and focus, so the click starts instantly. For your own handlers, `prepareWave(target)` on `pointerenter` does the same thing.
- Give re-rendered controls a stable `id` or `data-focus-key`. If the update replaces the focused button, focus moves to its new twin, which keeps keyboard users in place.
- Add `data-dw-ignore` to elements inside the target that should stay out of the snapshot (an open tooltip, a hover card). They are missing during the wave and back when it ends.
- `prefers-reduced-motion` gets a 220 ms crossfade automatically. Don't work around it.
- Without WebGL2, the update still runs with no animation. Never put logic in the callbacks that only an animation would trigger.

## Limits to design around

- Offscreen targets, 0-size targets, `body`/`html`: the update runs, no wave.
- At most 4 waves at once (4 WebGL contexts); extra ones just update.
- Not captured: iframes (empty box), cross-origin images without CORS (transparent), inner scroll positions. Fonts must be loaded; same-origin or CORS fonts render right.
- `transform: scale()` on the target or an ancestor can offset the overlay slightly.
- Tested in Chromium. Safari and Firefox: test before shipping; Safari has a history of `foreignObject` quirks.

## Check your work

Don't trust a one-off look: the interesting part lasts 300 ms. Film it frame by frame and look at the frames:

```sh
node scripts/film-wave.mjs --url http://localhost:5173 --click '#add' --clip '.product' --out /tmp/wave
```

It freezes the page clock, clicks, and saves PNGs every few frames (it needs `playwright`; see the header of the script). Check: the "before" state is crisp at the start, the front leaves the source, nothing outside the target moves, no rectangle or square corners appear around the target, text stays readable during the first frames, and the last frame is the real new state.

If you change the library itself, read `references/internals.md`, add a test for the bug, and run `npm test`, `npm run test:browser` and `npm run test:ui-kit`.
