// distortion-wave/pixel — the distortion wave with a pixel look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { pixel } from 'distortion-wave/pixel';
//
//   distortionWave(card, update, { effect: pixel, source: button });   // the same wave: near the front, the content
//                                                                        // turns into small pixels that flip cell by cell
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). Every cell of the
// grid reads the front at its own centre, so the boundary becomes a staircase of pixels.
const PIXEL_WAVE = `
uniform float uPCell, uPGap, uPZone, uPDensity, uPRate, uPLit, uPRim, uPRimNorm;
float pHash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float fxFront(vec2 q, vec2 p) { return 0.0; }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  if (inside <= 0.0) return o;
  vec2 id = floor(p / uPCell), cc = (id + 0.5) * uPCell, fr = fract(p / uPCell) * uPCell;
  float g = uPGap * 0.5;
  float sq = step(g, fr.x) * step(fr.x, uPCell - g) * step(g, fr.y) * step(fr.y, uPCell - g);
  vec2 hb = uShape.zw * 0.5;
  float sdc = sdRoundBox(cc - (uShape.xy + hb), hb, uRadii);
  if (sdc > 0.0) return o;
  float tick = floor(uTime * uPRate);
  float h = pHash(id + vec2(tick * 0.371, tick * 0.137)), h2 = pHash(id * 1.731 + 3.1);
  Front fc = front(cc);
  float zone = max(uLead * uPZone, uPCell * 3.0);
  vec3 lit = oklabToSrgb(paletteAt(0.5 + id.x * 0.021 + id.y * 0.013 + uTime * 0.2));
  if (uLaunched && uGlow > 0.001) {
    if (fc.d < zone && fc.d > -zone * 1.8) {
      // near the front the content turns into pixels and flips from old to new cell by cell
      bool isOld = fc.d + (h2 - 0.5) * uPCell * 3.0 > 0.0;
      vec4 m = isOld ? tap(uOld0, uOldRect, cc, cc) : tap(uNew0, uNewRect, cc, cc);
      float w = (1.0 - smoothstep(zone * 0.25, zone, abs(fc.d))) * smoothstep(0.0, 0.3, uGlow);
      // and some cells light up in the palette, flickering
      float on = step(1.0 - uPDensity * (0.35 + 0.65 * w), h) * uPLit * min(uGlow * 1.5, 1.0);
      vec4 px = mix(m, vec4(lit, 1.0), on);
      px = vec4(px.rgb * mix(0.55, 1.0, sq), px.a);
      o = mix(o, px, w * inside);
    } else if (fc.d <= -zone * 1.8 && fc.d > -uTail * 1.3) {
      // a few pixels stay lit in the wake
      float t2 = 1.0 - clamp(-fc.d / (uTail * 1.3), 0.0, 1.0);
      float on = step(1.0 - uPDensity * 0.3 * t2, h) * uPLit * uGlow;
      o = mix(o, vec4(lit, 1.0), on * sq * inside);
    }
  }
  // the outline is drawn in pixels where the front has been, then they go out one by one
  if (uPRim > 0.0 && uBoxless < 0.5 && uRim > 0.0 && sdc > -uPCell * 1.2) {
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, fc.d);
    float kept = smoothstep(-uRimSoft, uRimSoft, fc.d + (uRadius - uClear) / fc.g);
    float k = uPRim * min(uRim * uPRimNorm, 1.0) * reached * kept;
    o = mix(o, vec4(lit, 1.0), step(h, k) * sq * inside);
  }
  return o;
}
`;

// Same behaviour as the wave (timing, lens, blur): only the look changes. The smooth colour band and the rim's
// glow step back for the pixels; sparks are square.
const PRESET = { palette: 'pixel', band: 0.35, rimStrength: 0.4, hairWidth: 0 };
// Its own keys. Cell sizes are px; they scale gently with the element so a button keeps visible pixels.
export const PIXEL = {
  cell: 6,          // px: size of a pixel
  gap: 1,           // px: gap between pixels (0 = a plain mosaic)
  zone: 1,          // width of the pixel zone around the front, × the band's lead
  density: 0.45,    // share of lit pixels at the front (0 to 1)
  rate: 14,         // flicker, changes per second
  lit: 1,           // strength of the lit pixels (0 = only the mosaic)
  rimPixels: 1,     // strength of the pixels on the outline (0 = none)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the PIXEL keys. */
export const pixel = Object.freeze({
  name: 'pixel',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const v = (key) => (o[key] ?? PIXEL[key]);
    c.cell = Math.max(v('cell') * clamp(Math.sqrt(c.k), 0.7, 1.3), 2);
    c.gap = clamp(v('gap'), 0, c.cell * 0.6);
    c.zone = v('zone'); c.density = clamp(v('density'), 0, 1); c.rate = v('rate');
    c.lit = v('lit'); c.rimPixels = v('rimPixels');
  },
  shader: Object.freeze({ key: 'pixel', chunk: PIXEL_WAVE, dots: 'square' }),
  uniforms: (c) => ({ uPCell: c.cell, uPGap: c.gap, uPZone: c.zone, uPDensity: c.density, uPRate: c.rate, uPLit: c.lit,
    uPRim: c.rimPixels, uPRimNorm: 1 / Math.max(c.rimStrength, 0.05) }),
});
