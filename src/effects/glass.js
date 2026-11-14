// distortion-wave/glass — the distortion wave with a glass look.
//
//   import { distortionWave } from 'distortion-wave';
//   import { glass } from 'distortion-wave/glass';
//
//   distortionWave(card, update, { effect: glass, source: button });   // the same wave: behind the front, a thick slab of
//                                                                        // glass bends the content and splits it into RGB
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The slab trails the front: across
// it the surface is a half-cylinder, its slope bends the sample (a lens), each channel by a slightly different
// amount (dispersion), and its edges catch the light.
const GLASS_WAVE = `
uniform float uQRefr, uQDisp, uQThick, uQShine, uQTint;
float fxFront(vec2 q, vec2 p) { return 0.0; }
vec4 qTap(vec2 p, vec2 sp, float d) { return mix(tap(uNew0, uNewRect, p, sp), tap(uOld0, uOldRect, p, sp), smoothstep(-1.5, 1.5, d)); }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float h = uQThick * 0.5, x = (fd + h) / h;
  if (inside <= 0.0 || !uLaunched || uGlow < 0.001 || abs(x) >= 1.0) return o;
  vec2 n = front(p).n;
  float s = sqrt(1.0 - x * x), bend = x / max(s, 0.3), k = min(uGlow * 1.5, 1.0);
  // the sample moves towards the middle of the slab: what's under it is magnified, then squeezed at the edges
  vec2 dv = n * (uQRefr * bend * k), e = n * (uQDisp * bend * k);
  float dd = fd - dot(dv, n);
  vec4 r = qTap(p, p - dv - e, dd - dot(e, n)), g = qTap(p, p - dv, dd), b = qTap(p, p - dv + e, dd + dot(e, n));
  vec4 gv = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
  gv += o * (1.0 - gv.a);                          // bent past a rounded corner: what was there shows through
  float along = (uRing ? atan(fq.y, fq.x) / TAU : fq.x * 0.003 / uK) + uTime * 0.08;
  vec3 tint = oklabToSrgb(paletteAt(along + x * 0.15));
  gv.rgb = mix(gv.rgb, gv.rgb * tint, uQTint * s);
  // light: a bright streak on the near face, a softer one on the far face, and fresnel at the edges
  float streak = exp(-pow((x + 0.42) / 0.11, 2.0)) * (0.75 + 0.25 * sin(along * 40.0 + uTime * 2.0)) + 0.45 * exp(-pow((x - 0.55) / 0.08, 2.0));
  float fres = pow(1.0 - s, 3.0);
  float li = clamp((streak + fres * 0.8) * uQShine, 0.0, 1.0) * gv.a;
  gv = vec4(mix(gv.rgb, mix(tint, vec3(1.0), 0.75) * gv.a, li), gv.a);
  return mix(o, gv, smoothstep(1.0, 0.85, abs(x)) * k * inside);
}
`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band steps back so the
// glass reads on its own.
const PRESET = { palette: ['#DFF6FF', '#9FDCFF', '#C9B8FF', '#FFFFFF', '#B8FFF0'], band: 0.3, rimStrength: 0.55 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const GLASS = {
  thickness: 90,    // width of the slab behind the front
  refraction: 26,   // how far the slab bends what's under it
  dispersion: 5,    // RGB split at the slab's slopes
  shine: 1,         // strength of the highlights (0 = none)
  tint: 0.25,       // palette tint of the glass (0 = clear)
};

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the GLASS keys. */
export const glass = Object.freeze({
  name: 'glass',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? GLASS[key]);
    c.thickness = Math.max(v('thickness') * k, 14);
    c.refraction = v('refraction') * k * i; c.dispersion = v('dispersion') * Math.min(k, 1.2) * i;
    c.shine = v('shine'); c.tint = v('tint');
  },
  shader: Object.freeze({ key: 'glass', chunk: GLASS_WAVE }),
  uniforms: (c) => ({ uQRefr: c.refraction, uQDisp: c.dispersion, uQThick: c.thickness, uQShine: c.shine, uQTint: c.tint }),
});
