# Troubleshooting

Find the symptom, check the causes in order. To look at the problem rather than guess, film it with `scripts/film-wave.mjs` and read the frames.

First, check the version: `npm ls distortion-wave`. Several visual bugs were fixed recently; anything older than 0.2.1 should be upgraded before you debug.

| Fixed in | Bug |
|---|---|
| 0.1.1 | a rectangle and a glowing rim drawn around elements without background (a row of labels, a transparent grid) |
| 0.1.1 | `::before` / `::after` content missing during the wave when a font is loaded from a `data:` URL |
| 0.1.1 | password fields empty during the wave (now masked dots, the value is never captured) |
| 0.1.2 | square corners when the rounding comes from a parent with `overflow: hidden` |
| 0.1.2 | square corners with partial radii such as `border-radius: 12px 12px 0 0` |
| 0.2.1 | letters squashed and torn at the start on thin elements (a 26 px row of small text) |

## Nothing animates, the update just happens

1. **No WebGL2.** `warmupWave()` returns `false`. Expected: the update runs without animation.
2. **Reduced motion.** With `prefers-reduced-motion: reduce` you get a 220 ms crossfade, by design. To test the wave, emulate "no preference" in the devtools, or pass `reducedMotion: false` while debugging only.
3. **Target offscreen or 0-size** at the moment of the call. Scroll it into view first, or wave a visible ancestor.
4. **Target is `body` or `html`.** Not supported: wrap the app in a `div` and target that.
5. **4 waves already running.** Only 4 WebGL contexts exist; extra waves update without animation. Wave a common parent once instead of many children at once.
6. **The "after" snapshot took longer than `timeout`** (3 s): usually a slow `update` (network inside it) or an image that never loads. Load data before the call.
7. **The snapshot failed.** The console shows `[distortion-wave] falling back to a plain update:` and the error. A tainted canvas (cross-origin image without CORS) is the usual reason.

## The wave plays, but the new state pops in at the end

The DOM was not updated when `update` returned, so both snapshots show the old state. React needs `flushSync`, Vue `nextTick`, Svelte `tick`, Angular `detectChanges`, Lit `updateComplete` (see `frameworks.md`). Also check that the call happens in the event handler, not in an effect that runs after the render.

## The "before" state is already the new one

`distortionWave` was called after the state changed: from a `useEffect`, a watcher, or after an `await` that let the framework render. Call it first, and do the state change inside `update`.

## A rectangle, a box or square corners around the element

- On a transparent element: upgrade to ≥ 0.1.1.
- Rounded parent, square wave: upgrade to ≥ 0.1.2 (the clipping parent needs `overflow` other than `visible`, or `contain: paint`).
- Rounded corners from `clip-path` or a mask are not detected. Put the radius on the element itself, or wave the rounded parent.

## Text squashed or wobbly at the very start

That is the anticipation: the content is pulled toward the source before the launch. Upgrade to ≥ 0.2.1, where the pull is capped on thin elements. To remove it completely: `pull: 0` (and `inhale: 0` for the ring).

## The effect is too strong for this UI

`intensity: 0.4` to `0.7` for dense or text-heavy targets, `particles: false` for a calmer look, `duration` to make it snappier. Tune individual keys (`aberration`, `blur`, `rimStrength`…) only after that.

## Something is missing or wrong in the wave, then fine at the end

The snapshot (an SVG `foreignObject` render of the target) could not reproduce it:

- Iframes, `<embed>`, `<object>`: empty box.
- Cross-origin images without CORS: transparent. Add `crossorigin="anonymous"` and the CORS header, or proxy them.
- Web fonts not loaded yet, or cross-origin without CORS: fallback font during the wave. Wait for `document.fonts.ready` before the first wave.
- Scrolled containers inside the target: shown at scroll 0.
- `<use href="#…">` pointing outside the target: missing. Inline the symbol.
- Closed shadow roots: only the light DOM.
- `<canvas>` and `<video>`: captured as their current frame.

## The overlay is offset from the element

A `transform: scale()` (or zoom) on the target or an ancestor. Wave an element above the transform, or remove the transform during the transition.

## Focus lands on the wrong control after the update

Give the re-rendered controls a stable `id`, or the same `data-focus-key` before and after. If your app moves focus itself in the update, the library leaves it alone. To turn the behaviour off: `preserveFocus: false`.

## First click stutters

Call `warmupWave()` once at load or idle. For big targets, pre-capture on hover with `waveOnClick` or `prepareWave(target)`.

## Fine in Chrome, broken in Safari or Firefox

The library is tested in Chromium. Report it with the browser version and a minimal page. Safari has a history of `foreignObject` bugs; the update still runs if the snapshot fails.
