// distortion-wave/metal — the distortion wave with a liquid metal look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { metal } from 'distortion-wave/metal';
//
//   distortionWave(card, update, { effect: metal, source: button });   // the same wave: the front is a rolling bead of
//                                                                        // liquid chrome that mirrors a studio and the content
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The front wobbles slowly, like a
// heavy liquid. Just behind it a tube of metal: its cross-section gives a normal, rippled a little, that reflects
// a procedural studio (dark floor, bright horizon, soft sky tinted by the palette) and, faintly, the content.
const METAL_WAVE = `
uniform float uMThick, uMWob, uMRipple, uMShine, uMReflect;
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  float s = uRing ? atan(q.y, q.x) * 2.0 : q.x / (80.0 * uK);
  return uMWob * (0.6 * sin(s * 1.3 + uTime * 2.1) + 0.4 * sin(s * 2.9 - uTime * 2.7 + 1.3));
}
vec3 mEnv(vec3 r, float u) {
  float y = -r.y;
  vec3 sky = mix(vec3(0.62, 0.66, 0.74), oklabToSrgb(paletteAt(u)), 0.35);
  vec3 c = mix(vec3(0.05, 0.055, 0.07), sky, smoothstep(-0.25, 0.35, y));
  c += vec3(1.0) * exp(-pow((y - 0.05) / 0.07, 2.0)) * 0.9;      // the horizon line
  c += vec3(0.9) * exp(-pow((y - 0.75) / 0.12, 2.0)) * 0.5;      // a softbox overhead
  return c;
}
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float h = uMThick * 0.5, x = (fd + h * 0.9) / h;
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001 || abs(x) >= 1.0) return o;
  vec2 n = front(p).n;
  float k = min(uGlow * 1.5, 1.0), s = sqrt(1.0 - x * x);
  float sa = uRing ? atan(fq.y, fq.x) * 9.0 : fq.x * 0.07 / uK;
  float rip = 0.6 * sin(sa + uTime * 3.0) + 0.4 * sin(sa * 2.3 - uTime * 2.1 + x * 2.0);
  vec3 N = normalize(vec3(n * x + vec2(-n.y, n.x) * rip * uMRipple * 0.3, s));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), N);
  float along = (uRing ? atan(fq.y, fq.x) / TAU : fq.x * 0.002 / uK) + uTime * 0.05;
  vec3 col = mEnv(R, along);
  // the content, mirrored in the bead
  vec2 sp = p + R.xy * uMThick * 0.6;
  vec4 m = mix(tap(uNew0, uNewRect, p, sp), tap(uOld0, uOldRect, p, sp), step(0.0, fd + dot(R.xy, n) * uMThick * 0.6));
  col = mix(col, m.rgb / max(m.a, 1e-3), uMReflect * m.a * (0.4 + 0.6 * s));
  // a hard specular and dark edges where the surface turns away
  vec3 L = normalize(vec3(-0.35, -0.6, 0.72));
  col += pow(max(dot(N, L), 0.0), 60.0) * uMShine * 1.4;
  col *= mix(0.35, 1.0, smoothstep(0.0, 0.45, s));
  float a = smoothstep(1.0, 0.86, abs(x)) * k * inside;
  return vec4(clamp(col, 0.0, 1.0) * a, a) + o * (1.0 - a);
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band steps back: the
// metal carries the front.
const PRESET = { palette: ['#C9D6FF', '#F2F6FF', '#FFE3C2', '#B9F3FF', '#E3C9FF'], band: 0.25, rimStrength: 0.55 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const METAL = {
  thickness: 46,    // width of the metal bead
  wobble: 14,       // slow liquid wobble of the front
  ripple: 0.6,      // small ripples on the surface (0 = smooth)
  shine: 1,         // strength of the specular highlight
  reflect: 0.35,    // how much of the content the metal mirrors (0 to 1)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the METAL keys. */
export const metal = Object.freeze({
  name: 'metal',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? METAL[key]);
    c.thickness = Math.max(v('thickness') * k, 10); c.wobble = v('wobble') * k * i;
    c.ripple = Math.max(v('ripple'), 0); c.shine = Math.max(v('shine'), 0); c.reflect = clamp(v('reflect'), 0, 1);
  },
  shader: Object.freeze({ key: 'metal', chunk: METAL_WAVE }),
  uniforms: (c) => ({ uMThick: c.thickness, uMWob: c.wobble, uMRipple: c.ripple, uMShine: c.shine, uMReflect: c.reflect }),
});
