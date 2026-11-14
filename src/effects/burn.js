// distortion-wave/burn — the distortion wave with a burn look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { burn } from 'distortion-wave/burn';
//
//   distortionWave(card, update, { effect: burn, source: button });   // the same wave: the front burns the old content
//                                                                       // away, with a glowing edge, scorch and embers
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The front follows fractal noise
// pinned to the content, like paper catching fire; ahead of it the old content scorches, on it a white-hot edge,
// behind it smoke and embers drifting up.
const BURN_WAVE = `
uniform float uBRough, uBScale, uBChar, uBHeat, uBEmber, uBSmoke;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bHash(i), bHash(i + vec2(1, 0)), f.x), mix(bHash(i + vec2(0, 1)), bHash(i + vec2(1, 1)), f.x), f.y);
}
float bFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * bNoise(p); p = p * 2.07 + vec2(5.3, 1.7); a *= 0.5; } return s / 0.9375; }
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  return (bFbm(p / uBScale + vec2(0.0, uTime * 0.12)) - 0.5) * 2.0 * uBRough;
}
// black, deep red, orange, yellow, white
vec3 bHeatCol(float t) { return vec3(smoothstep(0.0, 0.45, t), smoothstep(0.3, 0.8, t), smoothstep(0.65, 1.0, t)); }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001) return o;
  float k = min(uGlow * 1.5, 1.0), n = bNoise(p / (uBScale * 0.18) + uTime * 0.7);
  // ahead: the old content browns, then blackens close to the flame
  if (fd > 0.0 && fd < uBChar) {
    float ch = pow(1.0 - fd / uBChar, 1.6) * (0.75 + 0.5 * n);
    o.rgb = mix(o.rgb, o.rgb * vec3(0.55, 0.32, 0.16), clamp(ch * 1.6, 0.0, 1.0) * k);
    o.rgb *= 1.0 - smoothstep(0.45, 0.95, ch) * 0.92 * k;
  }
  // behind: smoke darkens the new content for a moment
  if (fd < 0.0) o.rgb *= 1.0 - uBSmoke * 0.7 * exp(fd / (uBHeat * 2.5)) * (0.6 + 0.4 * n) * k;
  // the burning edge, flickering
  float e = exp(-pow(fd / uBHeat, 2.0)) * (0.7 + 0.6 * n);
  float t = clamp(e, 0.0, 1.0);
  vec3 hc = mix(bHeatCol(t), oklabToSrgb(paletteAt(0.3 + n * 0.4 + uTime * 0.1)), 0.3 * (1.0 - t));
  float ga = clamp(exp(-abs(fd) / (uBHeat * 2.2)) * 0.6 * (0.6 + 0.4 * n) * k, 0.0, 1.0) * inside;   // red-orange halo
  o = vec4(bHeatCol(0.42) * ga, ga * 0.5) + o * (1.0 - ga * 0.5);
  float a = clamp(smoothstep(0.08, 0.6, e) * k, 0.0, 1.0) * inside;
  o = vec4(hc * a, a) + o * (1.0 - a);
  // embers: sparks drifting up behind the edge
  if (uBEmber > 0.0 && fd < uBHeat && fd > -uTail) {
    float cell = 9.0 * uK + 4.0;
    vec2 g = (p + vec2(0.0, uTime * 38.0 * uK)) / cell, id = floor(g), f = fract(g) - 0.5;
    float h = bHash(id), h2 = bHash(id + 7.3);
    vec2 off = (vec2(h, h2) - 0.5) * 0.7 + vec2(0.12 * sin(uTime * 3.0 + h * 9.0), 0.0);
    float d = length(f - off) * cell, r = 0.8 + 1.5 * h2;
    float live = step(1.0 - uBEmber * 0.45 * (1.0 - clamp(-fd / uTail, 0.0, 1.0)), h);
    float tw = 0.6 + 0.4 * sin(uTime * 12.0 + h * 40.0);
    float ea = clamp(exp(-d * d / (r * r)) * live * tw * k, 0.0, 1.0) * inside;
    o = vec4(bHeatCol(0.45 + 0.3 * h2) * ea, ea) + o * (1.0 - ea);
  }
  return o;
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band goes low so the
// flame carries the front.
const PRESET = { palette: 'ember', band: 0.3, rimStrength: 0.6, hairWidth: 0 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const BURN = {
  roughness: 32,    // how ragged the burning edge is
  scale: 100,       // one noise cell of the edge (smaller = more ragged)
  char: 70,         // scorched zone ahead of the edge
  heat: 11,          // width of the glowing edge
  embers: 1,        // embers behind the edge (0 = none)
  smoke: 0.5,       // smoke behind the edge (0 = none)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the BURN keys. */
export const burn = Object.freeze({
  name: 'burn',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? BURN[key]);
    c.roughness = v('roughness') * k * i; c.scale = Math.max(v('scale') * k, 16);
    c.char = Math.max(v('char') * k, 6); c.heat = Math.max(v('heat') * clamp(k, 0.5, 1.4), 2);
    c.embers = clamp(v('embers'), 0, 3); c.smoke = clamp(v('smoke'), 0, 1);
  },
  shader: Object.freeze({ key: 'burn', chunk: BURN_WAVE }),
  uniforms: (c) => ({ uBRough: c.roughness, uBScale: c.scale, uBChar: c.char, uBHeat: c.heat, uBEmber: c.embers, uBSmoke: c.smoke }),
});
