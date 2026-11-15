// distortion-wave/vine — the distortion wave as plants.
//
//   import { distortionWave } from 'distortion-wave';
//   import { vine } from 'distortion-wave/vine';
//
//   distortionWave(card, update, { effect: vine, source: button });   // the same wave: the front is a band of leaves,
//                                                                       // a vine grows around the element, leaves fall
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The front grows leafy bumps. Around
// it, a grid of cells each holds one leaf (a vesica with a midrib), dense on the front and thinning behind; once the
// front has passed, leaves come loose and fall, swaying. On the outline a vine grows where the front has been, with
// small leaves along it, then withdraws. The sparks are leaves too (VINE_DOTS), spinning as they fade.
const VINE_WAVE = `
uniform float uVLeaf, uVZone, uVFall, uVVine, uVVineW, uVBump, uVVineNorm;
float vHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// a leaf along +y: tips at (0, ±b), width r - d; inside < 0
float vLeaf(vec2 p, float r, float d) {
  p = abs(p); float b = sqrt(r * r - d * d);
  return (p.y - b) * d > p.x * b ? length(p - vec2(0.0, b)) : length(p + vec2(d, 0.0)) - r;
}
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  float s = (uRing ? atan(q.y, q.x) * 40.0 * uK : q.x) / max(uVLeaf * 1.6, 1.0);
  return uVBump * (abs(sin(s + uTime * 0.6)) * 0.7 + abs(sin(s * 2.3 - uTime * 0.4 + 1.7)) * 0.3);
}
vec3 vGreen(float h) { return mix(oklabToSrgb(paletteAt(h)), vec3(0.11, 0.3, 0.12), 0.15); }
// one cell of leaves; returns premultiplied colour
vec4 vCell(vec2 p, vec2 shift, float cell, float keep, float spin) {
  vec2 g = (p + shift) / cell, id = floor(g);
  float h = vHash(id), h2 = vHash(id + 4.7), h3 = vHash(id + 9.1);
  if (h > keep) return vec4(0.0);
  vec2 lp = (fract(g) - 0.5 - (vec2(h2, h3) - 0.5) * 0.5) * cell;
  float a = h * TAU + spin * (h2 - 0.5) * 2.0;
  lp = rot(a) * lp;
  float sz = cell * (0.7 + 0.35 * h3);
  float d = vLeaf(lp, sz * 0.5, sz * 0.32);
  float aa = uSize.x / uRes.x;
  float cov = clamp(0.5 - d / aa, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  float rib = 1.0 - smoothstep(0.0, aa * 1.2, abs(lp.x)) * 1.0;
  vec3 col = vGreen(h2 * 0.8 + h3 * 0.2) * (0.8 + 0.35 * clamp(lp.x / sz + 0.5, 0.0, 1.0));
  col = mix(col, col * 1.45, rib * 0.6);
  return vec4(col * cov, cov);
}
vec4 vOver(vec4 o, vec4 l, float k) { l *= k; return l + o * (1.0 - l.a); }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  if (!uLaunched || uGlow < 0.001) return o;
  float k = min(uGlow * 1.5, 1.0) * inside, zone = max(uLead * uVZone, uVLeaf * 3.0);
  if (inside > 0.0) {
    // foliage on the front: dense at the edge, thinning behind
    if (fd < zone * 0.35 && fd > -zone * 1.6) {
      float dens = fd > 0.0 ? 1.0 - fd / (zone * 0.35) : 1.0 - smoothstep(zone * 0.2, zone * 1.6, -fd);
      o = vOver(o, vCell(p, vec2(0.0), uVLeaf, dens * 0.95, 0.0), k);
      o = vOver(o, vCell(p, vec2(uVLeaf * 0.5, uVLeaf * 0.37), uVLeaf * 0.8, dens * 0.8, 0.0), k);
    }
    // loose leaves falling behind it, swaying
    if (uVFall > 0.0 && fd < -zone * 0.3 && fd > -uTail * 1.4) {
      float t = uTime, cell = uVLeaf * 1.9;
      vec2 shift = vec2(sin(t * 1.3 + p.y * 0.02) * cell * 0.35, -t * 42.0 * uK);
      float left = 1.0 - clamp(-fd / (uTail * 1.4), 0.0, 1.0);
      o = vOver(o, vCell(p, shift, cell, uVFall * 0.28 * left, t * 2.0), k);
    }
  }
  // the vine on the outline: a wavy stem with leaves, where the front has been
  if (uVVine > 0.0 && uBoxless < 0.5 && uRim > 0.0 && sd > -uVVineW * 8.0 - uVLeaf) {
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, fd);
    float kept = smoothstep(-uRimSoft, uRimSoft, fd + (uRadius - uClear) / fg);
    float kv = uVVine * min(uRim * uVVineNorm, 1.0) * reached * kept * clamp(0.5 - sd * (uRes.x / uSize.x) + uVVineW * 8.0, 0.0, 1.0);
    if (kv > 0.001) {
      float per = 2.0 * (uShape.z + uShape.w), s = (atan(c.y / uShape.w, c.x / uShape.z) / TAU + 0.5) * per;
      float wav = sin(s / (uVLeaf * 1.3)) * uVVineW * 1.6 + sin(s / (uVLeaf * 0.55) + 1.3) * uVVineW * 0.5;
      float d = sd + uVVineW * 2.5 + wav;
      float stem = clamp(uVVineW * 0.5 - abs(d) + 0.5, 0.0, 1.0);
      vec3 sc = vec3(0.2, 0.36, 0.14) * (0.8 + 0.4 * smoothstep(-uVVineW, uVVineW, d));
      o = vOver(o, vec4(sc * stem, stem), kv);
      // leaves along the stem, alternating sides
      float step_ = uVLeaf * 1.1, i = floor(s / step_), side = mod(i, 2.0) * 2.0 - 1.0;
      vec2 lp = vec2(fract(s / step_) - 0.5, 0.0) * step_;
      lp.y = d + side * uVLeaf * 0.32;
      lp = rot(side * 0.9) * lp;
      float lz = uVLeaf * (0.5 + 0.25 * vHash(vec2(i, 1.0)));
      float ld = vLeaf(lp.yx, lz * 0.5, lz * 0.32);
      float lc = clamp(0.5 - ld * (uRes.x / uSize.x), 0.0, 1.0) * step(0.25, vHash(vec2(i, 3.0)));
      o = vOver(o, vec4(vGreen(vHash(vec2(i, 2.0))) * lc, lc), kv);
    }
  }
  return o;
}
`;
// The sparks, as leaves: a vesica that spins as it fades, two greens.
const VINE_DOTS = `#version 300 es
precision highp float; in float vA; in float vR; in float vPt; out vec4 o;
void main() {
  float a = vA * 7.0 + vR * 2.0, c = cos(a), s = sin(a);
  vec2 p = mat2(c, s, -s, c) * (gl_PointCoord - 0.5) * vPt;
  float r = vR * 1.4, w = r * 0.62, b = sqrt(r * r - w * w);
  vec2 q = abs(p);
  float d = (q.y - b) * w > q.x * b ? length(q - vec2(0.0, b)) : length(q + vec2(w, 0.0)) - r;
  float cov = clamp(0.5 - d, 0.0, 1.0) * vA;
  vec3 g = mix(vec3(0.33, 0.7, 0.25), vec3(0.62, 0.86, 0.3), fract(vR * 3.7));
  o = vec4(g * cov, cov);
}`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. Greens, a softer band, and bigger
// sparks so the leaves read.
const PRESET = { palette: ['#3FA34D', '#7BC950', '#2E7D32', '#A5D86E', '#1B5E20'], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const VINE = {
  leaf: 26,         // size of a leaf
  zone: 0.8,        // width of the foliage around the front, × the band's lead
  bumps: 14,        // leafy bumps of the front
  fall: 1,          // falling leaves behind the front (0 = none)
  vine: 1,          // strength of the vine on the outline (0 = none)
  vineWidth: 2.5,   // thickness of its stem
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the VINE keys. */
export const vine = Object.freeze({
  name: 'vine',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? VINE[key]);
    c.leaf = Math.max(v('leaf') * clamp(Math.sqrt(k), 0.55, 1.4), 6); c.zone = v('zone');
    c.bumps = v('bumps') * k * i; c.fall = clamp(v('fall'), 0, 3); c.vine = Math.max(v('vine'), 0);
    c.vineWidth = Math.max(v('vineWidth') * clamp(k, 0.6, 1.4), 1);
  },
  shader: Object.freeze({ key: 'vine', chunk: VINE_WAVE, dots: VINE_DOTS }),
  uniforms: (c) => ({ uVLeaf: c.leaf, uVZone: c.zone, uVFall: c.fall, uVVine: c.vine, uVVineW: c.vineWidth, uVBump: c.bumps,
    uVVineNorm: 1 / Math.max(c.rimStrength, 0.05) }),
});
