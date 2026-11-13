# Changelog

## 0.1.1 — 2026-11-13

- Password fields are captured as masked dots instead of rendering empty during the wave. The real value never goes into the snapshot.
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
