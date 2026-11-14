// distortion-wave/ink — the distortion wave with a risograph ink look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { ink } from 'distortion-wave/ink';
//
//   distortionWave(card, update, { effect: ink, source: button });   // the same wave: the front bleeds like ink, and
//                                                                      // around it the content is printed in two inks
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The front spreads along fractal
// noise pinned to the content, like ink soaking into paper. Around it the content is reprinted the risograph way:
// two inks, each from its own slightly shifted drum, dithered by the paper's grain, multiplied on paper.
const INK_WAVE = `
uniform float uIBleed, uIScale, uIMisreg, uIGrain, uIZone, uIInk;
float iHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float iNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(iHash(i), iHash(i + vec2(1, 0)), f.x), mix(iHash(i + vec2(0, 1)), iHash(i + vec2(1, 1)), f.x), f.y);
}
float iFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * iNoise(p); p = p * 2.11 + vec2(3.1, 8.7); a *= 0.5; } return s / 0.9375; }
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  return (iFbm(p / uIScale + uTime * 0.04) - 0.5) * 2.0 * uIBleed + (iNoise(p / (uIScale * 0.12)) - 0.5) * uIBleed * 0.35;
}
vec4 iTap(vec2 p, float d) { return mix(tap(uNew0, uNewRect, p, p), tap(uOld0, uOldRect, p, p), step(0.0, d)); }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float zone = max(uLead * uIZone, 24.0 * uK);
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001 || fd > zone || fd < -zone * 1.6) return o;
  float k = min(uGlow * 1.5, 1.0);
  vec2 n = front(p).n, off = vec2(uIMisreg, uIMisreg * 0.55);
  // two drums, out of register: each ink reads the content where it lands
  vec4 a = iTap(p + off, fd + dot(off, n)), b = iTap(p - off, fd - dot(off, n));
  float grain = mix(0.5, 0.25 + 0.3 * ign(floor(p * 1.2)) + 0.2 * iNoise(p * 0.5), uIGrain);
  // a two-colour separation: the first ink stands for what the content lacks in green, the second in red
  vec3 ca = a.a > 0.0 ? a.rgb / a.a : vec3(1.0), cb = b.a > 0.0 ? b.rgb / b.a : vec3(1.0);
  float covA = smoothstep(grain - 0.12, grain + 0.12, (1.0 - ca.g) * 1.05);
  float covB = smoothstep(grain - 0.12, grain + 0.12, (1.0 - cb.r) * 1.05);
  vec3 inkA = oklabToSrgb(uPal[0]), inkB = oklabToSrgb(uPal[1 % uPalN]);
  vec3 paper = vec3(0.965, 0.945, 0.9);
  vec3 col = paper * mix(vec3(1.0), inkA, covA * 0.95) * mix(vec3(1.0), inkB, covB * 0.85);
  // the ink itself, soaking in just behind the front, with the grain showing through
  float soak = (1.0 - smoothstep(0.0, uIInk, -fd)) * step(fd, 0.0) * smoothstep(0.15, 0.55, grain + 0.25);
  vec3 inkC = oklabToSrgb(paletteAt((uRing ? atan(fq.y, fq.x) / TAU : fq.x * 0.002 / uK) + uTime * 0.05));
  col *= mix(vec3(1.0), inkC, soak * 0.9);
  float al = max(max(a.a, b.a), o.a);
  float w = (1.0 - smoothstep(zone * 0.35, zone, fd > 0.0 ? fd : -fd / 1.6)) * k * inside;
  return mix(o, vec4(col * al, al), w);
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band steps back: the
// inks carry the front.
const PRESET = { palette: ['#FF48B0', '#0078BF', '#FFE800', '#00A95C'], band: 0.25, rimStrength: 0.5, hairWidth: 0 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const INK = {
  bleed: 30,        // how far the ink spreads ahead and behind the front
  scale: 110,       // one noise cell of the bleed (smaller = more feathered)
  misregister: 3,   // offset between the two inks
  grain: 1,         // paper grain in the print (0 = flat)
  zone: 1.2,        // width of the printed zone around the front, × the band's lead
  ink: 36,          // width of the wet ink behind the front
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the INK keys. */
export const ink = Object.freeze({
  name: 'ink',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? INK[key]);
    c.bleed = v('bleed') * k * i; c.scale = Math.max(v('scale') * k, 16);
    c.misregister = v('misregister') * clamp(k, 0.6, 1.3); c.grain = clamp(v('grain'), 0, 1);
    c.zone = v('zone'); c.ink = Math.max(v('ink') * k, 4);
  },
  shader: Object.freeze({ key: 'ink', chunk: INK_WAVE }),
  uniforms: (c) => ({ uIBleed: c.bleed, uIScale: c.scale, uIMisreg: c.misregister, uIGrain: c.grain, uIZone: c.zone, uIInk: c.ink }),
});
