# Internals: changing or porting the library

Read this before touching `src/`. About 1,200 lines in five files:

```
src/
  index.js      orchestration and public API: measure, WaveTransition, render loop, waveOnClick, prepareWave
  core.js       pure: presets, palettes, option resolution, size scaling, timeline (frameState), particles
  renderer.js   WebGL2: shaders, blur pyramid, context pool (max 4)
  capture.js    DOM → canvas through SVG foreignObject
  focus.js      keyboard focus capture and restore
```

## Contents

- One wave, step by step
- Capture (capture.js)
- Timeline and config (core.js)
- Rendering (renderer.js)
- Shape of the element
- Tests and how to verify a change
- Rules that keep it working

## One wave, step by step

`WaveTransition._run()` in `index.js`:

1. If the same target is already waving, skip that wave and wait for it.
2. `measure(target)`: rect in page coordinates, the visible part (clipped to the viewport), opacity, per-corner radii, `boxless` (no background, border or shadow), and the shape after overflow-clipping ancestors (`clippedShape`).
3. No WebGL context left, not visible, or `body`/`html`: `_plain()` runs the update and resolves every promise.
4. "Before" snapshot (or the `prepareWave` cache, valid 8 s and until any mutation), uploaded as the `old` layer with its blur levels.
5. `resolveConfig()` builds the config; the overlay canvas is mounted (`position: fixed`, z-index 2147483000, `pointer-events: none`) and the target gets `opacity: 0 !important`. `ready` resolves, the render loop starts.
6. The update runs during the anticipation (focus captured before, restored after). One frame later, once the `<img>` inside are decoded, the "after" snapshot is taken and uploaded as the `new` layer. The gate opens. If the gate is late, the timeline holds at the launch point instead of running ahead; past `timeout` it finishes without animating.
7. The loop calls `frameState(t)` each frame and renders. When the front has passed everything (`covered`), then the glow has cleared enough (`settled`), the real target is shown again (mode 4: effects only over the live DOM).
8. Release the context to the pool, remove the canvas, resolve `finished`, call `onEnd(metrics)`.

Reduced motion uses the same path with a 220 ms crossfade (mode 3) instead of the wave.

## Capture (capture.js)

`snapshotElement(el, { dpr, clip, rootOpacity })`:

- Clones the composed tree (open shadow roots included), inlining each node's computed style. A property is omitted only when it equals both the tag's default (measured once in a hidden sandbox iframe) and the parent's value; custom properties, transitions, animations and `cursor` are skipped.
- `::before` / `::after` become classed rules in a `<style>` inside the SVG.
- Form state is written into the clone (value, checked, selected). Password values are replaced by the same number of `•`.
- Images, CSS `url()`s and loaded `@font-face` fonts are inlined as data URLs. Font rules are rebuilt from their descriptors (a regex on `cssText` broke on `data:` URLs that contain `;`).
- `<canvas>` and `<video>` become images of their current frame; iframes, `<embed>`, `<object>` become empty boxes. Nodes with `data-dw-ignore` are left out.
- The SVG is drawn to a canvas, clipped to the visible part. A 1×1 `getImageData` checks for taint: a tainted canvas throws, and the wave falls back to a plain update.

## Timeline and config (core.js)

Everything here is pure and unit-tested; keep it that way.

- `BASE` and `PRESETS` (`vertical`, `horizontal`, `center`): reference values for a 360×740 target.
- `resolveConfig(preset, options, w, h)`: preset → tuning keys from the options → `intensity` (multiplies `amplitude`, `swell`, `pull`, `inhale`, `aberration`) → `scaleConfig` → `retime` if `duration` → `parseEasing`.
- `scaleConfig(c, w, h)`: `k = clamp(√(w·h) / 516, 0.12, 1.8)` scales the lengths (`PX_KEYS`), a gentler factor scales the times (`T_KEYS`), with floors (blur, rim width, seam, anticipation) and a cap on `pull` (6.5% of the smallest side).
- `frameState(t, c, geometry)`: the whole animation as data: origin, tilt and lean toward the touch point, squash, front radius, energy, pull, glow, rim and hairline clearing, `covered`, `settled`. The renderer only draws what this returns.
- `totalDuration(c)` is the time until `finished`; `retime(c, s)` stretches every time key so it equals `s`.

## Rendering (renderer.js)

One pass per frame over the overlay canvas (the union of the visible parts of the element before and after the update):

- Each layer (`old`, `new`) is uploaded sharp (with mipmaps), plus two blurred copies (near and far): downsampled, then a separable Gaussian. Built once per capture, never per frame.
- The front is a signed distance to a rotated, squashed capsule. Content is displaced along the normal near the front (the lens), pulled radially toward the source during the anticipation (zero at the origin), and split per channel (chromatic aberration). Blur is picked from the three levels by distance to the front.
- Ahead of the front you see `old`, behind it `new`. A colour band from the palette (interpolated in OKLab, white crest) rides the front.
- The element's shape is a rounded-rect SDF with four radii: it masks the band and carries the rim glow and the hairline. Elements without a box (`boxless`) mask the band by their content alpha and its blurred halo instead, with no rim. When an ancestor clips the element (`clipped`), the snapshot itself is masked by the shape too.
- Particles are `gl.POINTS` drawn after, premultiplied. An interleaved-gradient-noise dither prevents banding.
- `textureLod` is used in divergent branches; keep it that way when editing the shader.

## Shape of the element

`clippedShape()` walks up from the target: every ancestor with `overflow` other than `visible` (or `contain: paint`) clips the rect to its padding box and, where its inner rounded corner overlaps the target's corner, lends its radius. Radii are then normalised with the CSS rule (two radii on one side can't exceed that side; a zero sum leaves them alone).

## Tests and how to verify a change

```sh
npm test               # node:test on the pure core
npm run test:browser   # Playwright + SwiftShader: real captures and waves in Chromium
npm run test:ui-kit    # clicks every component of examples/ui-kit and checks the result
npm run build          # dist/, demo/standalone.html, examples/ui-kit/standalone.html, examples/react/codepen.jsx
```

For visual changes, film the wave with a frozen clock and read the frames: `scripts/film-wave.mjs` in this skill. The trick: replace `performance.now` and `requestAnimationFrame` before the page loads, then advance the clock by 1/30 s per screenshot. Captures still run in real time, so wait for them before you advance.

## Rules that keep it working

- Every bug gets a test: pure logic in `test/core.test.js`, anything that needs a browser in `scripts/browser-test.mjs`.
- Check visual changes on these cases at least: a button, a transparent row of small text, a card with rounded corners inside an `overflow: hidden` parent, a partial radius (`12px 12px 0 0`), an element that changes size, and a whole page.
- The update must always run exactly once, whatever fails. Every early exit goes through `_plain()` or `_finish()`.
- Nothing in `core.js` may touch the DOM.
- When the build inlines the minified bundle into an HTML file, use a replacer function (`.replace(x, () => code)`): minified code can contain `$'` or `$&`.
