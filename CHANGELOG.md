# Changelog

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
