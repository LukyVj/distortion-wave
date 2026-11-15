# Changelog

## Unreleased

- `distortion-wave/vine`, a new look (~1.9 kB gzipped): plants. The front is a band of leaves, green leaves fall behind it, a vine grows around the element and the sparks are leaves. Keys: `leaf`, `zone`, `bumps`, `fall`, `vine`, `vineWidth`. Also in `distortion-wave/all`.
- An effect can bring its own spark shape (`shader.dots`, a fragment shader). The plain wave draws the same pixels as before.

## 0.3.0 — 2026-11-15

- Effects: `effect` option on `distortionWave()` and `setWaveDefaults()`. An effect keeps the wave's behaviour (timing, lens, blur, sparks) and changes its look. The plain wave stays the default and the only look in the core bundle.
- `distortion-wave/electric`, a new entry (~6 kB gzipped):
  - `electric`: the wave with an electric look. The front is a crackling bolt, the colour band goes electric, and the outline charges with arcs as the front passes, then discharges. Keys: `jag`, `scale`, `crackle`, `chaos`, `boltWidth`, `boltGlow`, `bolts`, `rimBolts`.
  - `electricBorder(el, options)`: a live electric arc on the outline, always on, on hover or on focus. All borders share one canvas and one WebGL context.
- `distortion-wave/pixel`, a new entry (~1.2 kB gzipped): `pixel`, the wave with a pixel look. Near the front the content turns into small pixels that flip cell by cell, some light up and flicker, the outline is drawn in pixels that go out one by one, sparks are square. Keys: `cell`, `gap`, `zone`, `density`, `rate`, `lit`, `rimPixels`.
- Six more looks, each its own entry (1 to 1.3 kB gzipped), each with its own keys and their defaults:
  - `distortion-wave/glass`: a thick slab of glass trails the front, bends the content like a lens, splits it into RGB and catches the light. Keys: `thickness`, `refraction`, `dispersion`, `shine`, `tint`.
  - `distortion-wave/burn`: the front burns the old content away along a ragged edge, with scorch, a white-hot rim, smoke and embers. Keys: `roughness`, `scale`, `char`, `heat`, `embers`, `smoke`.
  - `distortion-wave/ink`: risograph. The front bleeds like ink and the content around it is reprinted in two inks, out of register, with paper grain. Keys: `bleed`, `scale`, `misregister`, `grain`, `zone`, `ink`.
  - `distortion-wave/halftone`: near the front the content becomes a dot screen sized by its tone. Keys: `cell`, `angle`, `zone`, `size`, `ink`.
  - `distortion-wave/metal`: the front is a rolling bead of liquid chrome. Keys: `thickness`, `wobble`, `ripple`, `shine`, `reflect`.
  - `distortion-wave/water`: ripples, refraction, caustics and foam. Keys: `wavelength`, `refraction`, `caustics`, `foam`, `tint`.
- `distortion-wave/all`: the core and every effect in one entry (~25 kB gzipped); `dist/all.iife.min.js` puts them all on `window.DistortionWave`.
- `electric` and `pixel` palettes.
- Smaller bundle, with the same pixels. The core goes from 18.7 to 17.3 kB gzipped (15.6 kB brotli):
  - the shaders are minified at build time (comments and indentation out);
  - their identifiers get short names, from one table shared by every entry (uniform names included, on the JS side too);
  - the `.min` and `.iife.min` builds go through Terser after esbuild.
- README: how to load the library on the first interaction instead of with the page.

## 0.2.1 — 2026-11-13

- Before the launch, the content is pulled toward the source. On thin elements (a 26 px row of small text) that pull squashed and tore the letters. It is now capped by the element's smallest side. Big elements are unchanged.

## 0.2.0 — 2026-11-13

- `duration`: total length of the transition in ms, whatever the size of the element.
- `easing`: how the front travels. CSS keywords, `cubic-bezier(…)`, an array or a function.
- `intensity`: one multiplier for the distortion (displacement, bulge, chromatic aberration).
- `setWaveDefaults(options)`: options for every wave of the app, under the per-call ones.
- Every fine-tuning key is documented in the README and typed.
- React example (`examples/react`) with a `useWave` hook, plus a CodePen version.
- UI kit: an Options panel to try duration, easing, intensity and palette live.

## 0.1.2 — 2026-11-13

- The wave keeps rounded corners that come from a parent with `overflow: hidden` (a `<pre>` inside a rounded card, say). It used to show square corners there.
- Partial radii such as `border-radius: 12px 12px 0 0` are kept. They used to collapse to square corners.

## 0.1.1 — 2026-11-13

- Password fields are captured as masked dots instead of rendering empty during the wave. The real value never goes into the snapshot.
- Elements with no background, border or shadow (a transparent grid, a row of labels) no longer get a rim and a coloured band on their invisible bounding box. The wave now lights up their content only.
- Fonts loaded from a `data:` URL (or any URL with a `;`) no longer break the snapshot's CSS. Before, every `::before` / `::after` after the `@font-face` was lost during the wave.
- UI kit example: 40 components (buttons, toggles, commerce, navigation, forms).

## 0.1.0 — 2026-11-12

First version.

- `distortionWave(target, update, options)` on any DOM element, View Transitions-style promises
- DOM → texture capture through SVG `foreignObject` (computed styles, pseudo-elements, form state, open shadow DOM, images and fonts inlined, viewport clipping)
- One-pass WebGL2 composite: lens, chromatic aberration, progressive blur, OKLab colour band, rim on the element's rounded corners, particles, dithering
- Variants: vertical, horizontal, center, auto
- Sizes adapt to the target; the shape follows the wave when the element changes size
- Keyboard focus preserved across re-renders
- Reduced motion → crossfade; no WebGL → plain update
- Unit tests for the pure core, end-to-end checks in Chromium
