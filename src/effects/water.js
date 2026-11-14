// distortion-wave/water — the distortion wave with a water look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { water } from 'distortion-wave/water';
//
//   distortionWave(card, update, { effect: water, source: button });   // the same wave: the front is a breaking wave
//                                                                        // with foam, and ripples, caustics and refraction trail it
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). Behind the front the surface carries
// ripples parallel to it, plus a slow cross swell; their slope refracts the content, the water tints it, caustics
// dance on it, and a line of foam breaks on the front.
const WATER_WAVE = `
uniform float uWLen, uWRefr, uWCaus, uWFoam, uWTint;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y);
}
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  return (wNoise(p / (uWLen * 2.5) + uTime * 0.3) - 0.5) * uWLen * 0.5;
}
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001 || fd > uWLen * 1.5 || fd < -uTail * 1.6) return o;
  vec2 n = front(p).n;
  float k = min(uGlow * 1.5, 1.0);
  float env = fd > 0.0 ? exp(-fd / (uWLen * 0.35)) : exp(fd / (uTail * 0.8));
  float ph = TAU * fd / uWLen + uTime * 7.0;
  vec2 wq = p / uWLen;
  vec2 swell = vec2(sin(wq.y * 1.7 + uTime * 1.6) + sin(wq.x * 1.1 - uTime * 1.2 + wq.y * 0.6),
                    cos(wq.x * 1.9 - uTime * 1.4) + cos(wq.y * 1.2 + uTime * 1.1 + wq.x * 0.7)) * 0.3;
  vec2 dv = (n * cos(ph) + swell) * uWRefr * env * k;
  vec2 sp = p - dv;
  float dd = fd + dot(dv, n);
  vec4 s = mix(tap(uNew0, uNewRect, p, sp), tap(uOld0, uOldRect, p, sp), smoothstep(-1.5, 1.5, dd));
  s += o * (1.0 - s.a);
  // the water: tinted by depth, lit by caustics and the crests of the ripples
  vec3 tint = oklabToSrgb(paletteAt(0.4 + fd * 0.0015 / uK + uTime * 0.04));
  vec3 rgb = mix(s.rgb, s.rgb * tint * 1.15, uWTint * env);
  vec2 cp = p / (uWLen * 0.45) + swell * 2.0;
  float v = sin(cp.x + sin(cp.y * 1.3 + uTime * 1.5)) + sin(cp.y * 1.1 + sin(cp.x * 0.9 - uTime * 1.7));
  float caus = pow(clamp(1.0 - abs(v) * 0.7, 0.0, 1.0), 5.0);
  rgb += (caus * uWCaus * 0.4 + smoothstep(0.8, 1.0, sin(ph + 0.9)) * 0.22 * env) * env * s.a * mix(tint, vec3(1.0), 0.5);
  // foam breaking on the front
  float fn = wNoise(p / 5.0 + vec2(uTime * 2.0, 0.0)) * 0.6 + wNoise(p / 13.0 - uTime) * 0.4;
  float foam = smoothstep(0.35, 0.7, fn + 0.45 - abs(fd + uWLen * 0.15) / max(uWLen * 0.35, 1.0)) * uWFoam;
  rgb = mix(rgb, vec3(0.97, 0.99, 1.0) * s.a, clamp(foam, 0.0, 1.0));
  return mix(o, vec4(rgb, s.a), clamp(env * 3.0, 0.0, 1.0) * k * inside);
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. Ocean colours, a softer band.
const PRESET = { palette: 'ocean', band: 0.4, rimStrength: 0.6 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const WATER = {
  wavelength: 44,   // distance between two ripples
  refraction: 9,    // how far the ripples bend the content
  caustics: 1,      // strength of the light patterns (0 = none)
  foam: 1,          // foam on the front (0 = none)
  tint: 0.35,       // palette tint of the water (0 = clear)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the WATER keys. */
export const water = Object.freeze({
  name: 'water',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? WATER[key]);
    c.wavelength = Math.max(v('wavelength') * k, 10); c.refraction = v('refraction') * k * i;
    c.caustics = Math.max(v('caustics'), 0); c.foam = clamp(v('foam'), 0, 2); c.tint = clamp(v('tint'), 0, 1);
  },
  shader: Object.freeze({ key: 'water', chunk: WATER_WAVE }),
  uniforms: (c) => ({ uWLen: c.wavelength, uWRefr: c.refraction, uWCaus: c.caustics, uWFoam: c.foam, uWTint: c.tint }),
});
