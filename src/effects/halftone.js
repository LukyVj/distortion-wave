// distortion-wave/halftone — the distortion wave with a halftone look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { halftone } from 'distortion-wave/halftone';
//
//   distortionWave(card, update, { effect: halftone, source: button });   // the same wave: near the front the content
//                                                                           // turns into a screen of dots that swell with it
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). A rotated grid: every cell reads
// the content and the front at its centre, and draws one dot sized by the content's tone (dark dots on light
// content, light dots on dark), bigger near the front, inked in the palette at its peak.
const HALFTONE_WAVE = `
uniform float uHCell, uHAngle, uHZone, uHSize, uHInk;
float fxFront(vec2 q, vec2 p) { return 0.0; }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float zone = max(uLead * uHZone, uHCell * 3.0);
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001 || fd > zone * 1.2 || fd < -zone * 2.0) return o;
  vec2 g = rot(uHAngle) * p / uHCell, id = floor(g) + 0.5, cc = rot(-uHAngle) * (id * uHCell);
  float dc = front(cc).d;
  vec4 m = dc > 0.0 ? tap(uOld0, uOldRect, cc, cc) : tap(uNew0, uNewRect, cc, cc);
  if (m.a < 0.01) m = dc > 0.0 ? tap(uOld0, uOldRect, p, p) : tap(uNew0, uNewRect, p, p);
  vec3 col = m.rgb / max(m.a, 1e-3);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  float w = 1.0 - smoothstep(zone * 0.1, zone, dc > 0.0 ? dc : -dc / 1.6), k = min(uGlow * 1.5, 1.0);
  // the dot: on light content a dark dot sized by the darkness, on dark content a light one; the wave swells it
  bool lite = l > 0.5;
  float r = uHCell * 0.5 * uHSize * sqrt(clamp((lite ? 1.0 - l : l) * 0.9 + 0.1, 0.0, 1.0)) * (0.55 + 0.75 * w);
  float d = length((fract(g) - 0.5) * uHCell), aa = uSize.x / uRes.x;
  float cov = clamp((r - d) / aa + 0.5, 0.0, 1.0);
  vec3 ink = oklabToSrgb(paletteAt(id.x * 0.021 + id.y * 0.034 + uTime * 0.15));
  vec3 dotc = mix(lite ? col * 0.2 : col, ink, uHInk * w * w), gap = lite ? mix(col, vec3(1.0), 0.4) : col * 0.14;
  vec4 h = vec4(mix(gap, dotc, cov) * m.a, m.a);
  return mix(o, h, smoothstep(0.0, 0.35, w) * k * inside);
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band steps back for
// the dots.
const PRESET = { palette: ['#00AEEF', '#EC008C', '#FFF200', '#FF6A3D'], band: 0.3, rimStrength: 0.55 };
// Its own keys. Sizes are px; they scale gently with the element so a button keeps visible dots.
export const HALFTONE = {
  cell: 7,          // px: one cell of the screen
  angle: 45,        // degrees: angle of the screen
  zone: 1.1,        // width of the screen around the front, × the band's lead
  size: 1.2,        // largest dot, × the cell (above 1 the dots merge)
  ink: 0.7,         // palette ink at the front (0 = the content's own colours)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the HALFTONE keys. */
export const halftone = Object.freeze({
  name: 'halftone',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const v = (key) => (o[key] ?? HALFTONE[key]);
    c.cell = Math.max(v('cell') * clamp(Math.sqrt(c.k), 0.7, 1.3), 3);
    c.angle = v('angle') * Math.PI / 180; c.zone = v('zone'); c.size = clamp(v('size'), 0.2, 2); c.ink = clamp(v('ink'), 0, 1);
  },
  shader: Object.freeze({ key: 'halftone', chunk: HALFTONE_WAVE }),
  uniforms: (c) => ({ uHCell: c.cell, uHAngle: c.angle, uHZone: c.zone, uHSize: c.size, uHInk: c.ink }),
});
