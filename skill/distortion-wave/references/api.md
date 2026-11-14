# API reference (distortion-wave 0.3.x)

The TypeScript definitions in `types/index.d.ts` of the package are the source of truth. This page explains them.

## Contents

1. `distortionWave()`
2. Options
3. Fine-tuning keys
4. `WaveTransition`
5. Other exports
6. Timeline of one wave

## 1. `distortionWave(target, update?, options?) → WaveTransition`

- `target: Element`: the element that waves. It must be on screen, have a size, and not be `body` or `html`.
- `update?: () => void | Promise<void>`: changes the DOM. It runs exactly once, always, even without WebGL, offscreen or with reduced motion. If it returns a promise, the "after" snapshot waits for it.
- `options?`: below.

The update runs after the "before" snapshot. If it throws, `updateCallbackDone` rejects and the wave ends without animating the failed state.

## 2. Options

| Option | Default | |
|---|---|---|
| `effect` | the wave | `electric` from `distortion-wave/electric`, `pixel` from `distortion-wave/pixel`, or `'wave'`. An unknown string warns and falls back to the wave |
| `source` | touch point, else centre | where the wave starts: an `Element` (inside or outside the target), a rect `{ x, y, width, height }` or a point `{ x, y }` in viewport coordinates |
| `focus` | `null` | the `PointerEvent`/`MouseEvent` (or `{ x, y }`): the front leans toward it. Keyboard-generated clicks (`detail === 0`) are ignored |
| `variant` | `'auto'` | `'vertical'`, `'horizontal'`, `'center'`. Auto looks at the source element: 1.4× wider than tall → vertical, 1.4× taller than wide → horizontal, anything else (or no source element, or the target itself) → center |
| `palette` | `'aurora'` | `'aurora'`, `'ocean'`, `'mint'`, `'ember'`, or an array of up to 8 hex colours, interpolated in OKLab |
| `duration` | auto | total length in ms until `finished`. Auto scales with the size: about 2 s for a button, 4 s for a page, the last half being the glow fading out |
| `easing` | `'cubic-bezier(0.2, 1, 0.3, 1)'` | travel of the front: `'linear'`, `'ease'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`, `'cubic-bezier(a, b, c, d)'`, `[a, b, c, d]` or `(t) => number` |
| `speed` | `1` | multiplier on the automatic duration (`0.3` = slow motion). Ignored when `duration` is set |
| `intensity` | `1` | multiplies displacement, bulge, pull and chromatic aberration. `0` = colours only |
| `particles` | `true` | `false`, or a count at reference scale |
| `reducedMotion` | follows `prefers-reduced-motion` | `true` forces the 220 ms crossfade, `false` forces the wave |
| `preserveFocus` | `true` | if the update replaces the focused element, focus its equivalent (same `id`, then `data-focus-key` or `name`, then same place in the tree). Left alone if your code moved focus itself |
| `timeout` | `3000` | max ms to wait for the "after" snapshot; past it, the update shows without animation |
| `onLaunch` | | the front leaves the source |
| `onCovered` | | the front has passed over the whole target |
| `onSettled` | | the real DOM is visible again, only the glow is left |
| `onEnd(metrics)` | | everything is done |

`setWaveDefaults(options)` merges options for every later call (per-call options win; `undefined` values are ignored). `setWaveDefaults(null)` resets. It returns the current defaults.

## 3. Fine-tuning keys

Values are for a 360×740 px target and are scaled to the real size: lengths with `k = √(w·h) / 516` (clamped to 0.12–1.8), times with a gentler factor. Lengths in px, times in seconds. When `duration` is set, all the times are stretched together.

| Key | Default | |
|---|---|---|
| `anticipation` | `0.45` | the "inhale" before the wave leaves the source |
| `travel` | `2.2` | time for the front to cross the target |
| `linger`, `rimFade` | `-0.3`, `2.8` | when the glowing edge starts to clear (relative to the end of the travel), and how long that takes |
| `amplitude` | `32` | displacement under the front |
| `lensWidth` | `140` | width of the lens band |
| `swell` | `20` | how much the front bulges outward |
| `aberration` | `0.75` | chromatic split |
| `blur`, `blurNear` | `18`, `6` | max blur, and the blur right next to the front |
| `blurAhead`, `blurBehind` | `90`, `230` | how far the blur reaches before and after the front |
| `lead`, `tail`, `band` | `120`, `280`, `0.9` | the colour band: length ahead, length behind, strength |
| `rimWidth`, `rimSoftness`, `rimStrength` | `14`, `320`, `0.85` | the glow on the element's edge |
| `hairWidth` | `1.5` | the thin line on the edge |
| `lean` | `0.9` | how much the front tilts toward the touch point (0 to 1) |
| `pull`, `inhale` | `22`, `50` | pull toward the source during the anticipation. `pull` is also capped at 6.5% of the element's smallest side |
| `particleSize`, `particleLife`, `reach`, `spread` | `1.8`, `2.1`, `140`, `1` | the sparks |

The `center` preset is softer (smaller amplitude, lens, aberration, pull): read `PRESETS.center`.

Order of resolution: preset (from `variant`) → your tuning keys → `intensity` → size scaling → `duration` → `easing`.

## 4. `WaveTransition`

| Member | |
|---|---|
| `ready: Promise<void>` | the overlay is up and the animation started (resolves at once when there is no animation) |
| `updateCallbackDone: Promise<void>` | your update finished. Rejects if it threw |
| `covered: Promise<void>` | the wave has covered the target: the old state is gone |
| `finished: Promise<void>` | overlay removed, real DOM back. Chain follow-up states here |
| `metrics` | `{ captureBefore, captureAfter, upload, worstFrame }` in ms, filled as it goes |
| `skip()` | jump to the end. The update still runs |

A second `distortionWave()` on a target that is still waving calls `skip()` on the first one and waits for it.

## 5. Other exports

| Export | |
|---|---|
| `waveOnClick(trigger, target, update, options?)` | wires a click on `trigger` to a wave on `target`, starting from `trigger`, leaning to the touch point, and pre-captures `target` on `pointerenter` and `focus`. `update` receives the click event |
| `prepareWave(target)` | pre-captures `target` so the next wave starts at once. Any DOM mutation inside invalidates it; a cached capture expires after 8 s |
| `warmupWave()` | creates a WebGL context and compiles the shaders. Returns `false` without WebGL2: use it to feature-detect |
| `snapshotElement(el, { dpr, clip, rootOpacity })` | the DOM → canvas capture alone. Resolves `{ canvas, w, h, dpr, ms, bytes }` |
| `PALETTES` | the named palettes, as arrays of hex colours |
| `PRESETS` | `vertical`, `horizontal`, `center` tuning sets |
| `scaleConfig(config, w, h)`, `totalDuration(config)`, `frameState(t, config, geometry)` | the pure core, to drive your own renderer or to compute timings |

## 6. Timeline of one wave

1. Call: `this.update` is stored, the "before" snapshot starts (from cache if `prepareWave` ran).
2. Overlay appears over the target, the target gets `opacity: 0`. `ready` resolves.
3. `update` runs, then one frame later (and once the `<img>` inside are decoded) the "after" snapshot is taken. Meanwhile the anticipation plays (content pulled toward the source).
4. The front launches (`onLaunch`), crosses the target, the shape morphs if the size changed.
5. `covered` resolves (`onCovered`). Then the real DOM is shown again under a glow that fades (`onSettled`).
6. Overlay removed, `finished` resolves, `onEnd(metrics)`.

No animation (no WebGL2, offscreen, `body`/`html`, 4 waves already running, snapshot failed): the update runs and every promise resolves right after it.

## 7. distortion-wave/electric

```js
import { electric, electricBorder, ELECTRIC, BORDER } from 'distortion-wave/electric';
```

CDN without a bundler: `https://cdn.jsdelivr.net/npm/distortion-wave@0.3/dist/electric.js` (self-contained ES module), or `dist/electric.iife.min.js` → `window.DistortionWaveElectric`.

### `effect: electric`

The wave itself, with an electric look: same timeline, lens, blur, sparks and options (`variant` included). The default palette becomes `'electric'`, the colour band is thinner, the soft rim and the hairline give way to arcs. On top: the front's edge is jagged and carries two crackling strands with a white-hot core, and the outline charges with arcs where the front has passed, then discharges with the rim's timing.

Its keys (reference 360×740 px, scaled like the wave's):

| Key | Default | |
|---|---|---|
| `jag` | `8` px | how jagged the front is (it also shapes the old/new boundary) |
| `scale` | `46` px | one noise cell along the front; smaller is more jagged |
| `crackle` | `1.8` | noise speed |
| `chaos` | `6` px | how far the strands stray from the front |
| `boltWidth`, `boltGlow` | `1.5`, `14` px | core of a strand, glow around it |
| `bolts`, `rimBolts` | `1.2`, `1.3` | strength on the front, on the outline (0 = none) |

`intensity` scales `jag` and `chaos` with the wave's distortion.

### `electricBorder(element, options) → controller`

| Option | Default | |
|---|---|---|
| `trigger` | `'always'` | `'hover'`, `'focus'` (focus inside counts), `'hover focus'`, `'manual'` (waits for `start()`) |
| `color` / `palette` | `'electric'` palette | one colour, or a palette spread along the outline |
| `thickness`, `glow`, `chaos`, `scale`, `crackle`, `offset` | `1.6`, `14`, `5`, `34`, `1`, `0` | as above, not scaled |
| `intensity` | `1` | overall strength |
| `fadeIn`, `fadeOut` | `220`, `380` ms | |
| `zIndex` | `2147482000` | of the shared canvas |

Controller: `active`, `start()`, `stop()`, `set(options)` (live; not `trigger`), `destroy()`.

The outline follows `border-radius` per corner and the element's size (ResizeObserver). It is drawn in viewport space every frame, so scrolling and sticky positioning are followed. It does not follow clipping by scrolling ancestors. With `prefers-reduced-motion` the arc stops moving but stays.

## 8. distortion-wave/pixel

```js
import { pixel, PIXEL } from 'distortion-wave/pixel';
distortionWave(card, update, { effect: pixel, source: button });
```

The wave with a pixel look: each cell of a grid reads the front at its own centre, so the boundary is a staircase of pixels. Near the front the content becomes a mosaic that flips from old to new cell by cell; some cells light up in the palette (default `'pixel'`, orange) and flicker; a few stay lit in the wake; the outline is drawn in pixels that go out one by one with the rim's timing; sparks are square.

| Key | Default | |
|---|---|---|
| `cell`, `gap` | `6`, `1` px | pixel size (scales gently with the element, never under 2 px), gap between pixels |
| `zone` | `1` | width of the mosaic zone around the front, × `lead` |
| `density` | `0.45` | share of lit pixels at the front (0 to 1) |
| `rate` | `14` | flicker changes per second |
| `lit`, `rimPixels` | `1`, `1` | strength of the lit pixels, of the outline pixels |

CDN: `dist/pixel.js` (self-contained ES module) or `dist/pixel.iife.min.js` → `window.DistortionWavePixel`.
