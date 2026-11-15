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
// half-width of a leaf of length L at t (0 = base, 1 = tip): rounded base, widest at a third, pointed tip
float vHalf(float t, float L) { return L * 0.29 * pow(max(sin(3.14159 * pow(clamp(t, 0.0, 1.0), 0.72)), 0.0), 0.62); }
// a leaf along +y, base at the origin, length L; inside < 0 (close to px near the edge)
float vLeafD(vec2 lp, float L) { return max(abs(lp.x) - vHalf(lp.y / L, L), max(-lp.y, lp.y - L)); }
vec3 vGreen(float h) { return oklabToSrgb(paletteAt(h)); }
// a shaded leaf: a stalk, a midrib, side veins, the blade folded along the midrib, a darker rim. Premultiplied.
vec4 vLeaf(vec2 lp, float L, float h, float face, float aa) {
  float d = vLeafD(lp, L);
  float pet = max(abs(lp.x) - max(L * 0.016, aa * 0.45), max(lp.y - L * 0.1, -lp.y - L * 0.14));
  float cov = clamp(0.5 - min(d, pet) / aa, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  float t = clamp(lp.y / L, 0.0, 1.0), w = max(vHalf(t, L), 1e-3), xn = clamp(lp.x / w, -1.0, 1.0);
  vec3 base = vGreen(h), col = base;
  col *= 0.86 + 0.2 * face * smoothstep(-0.3, 0.3, xn);           // folded along the midrib: one half catches the light
  col *= 1.0 - 0.22 * xn * xn;                                    // cupped
  col *= 0.9 + 0.2 * t;
  float detail = smoothstep(14.0, 34.0, L / aa);
  float rib = (1.0 - smoothstep(aa * 0.4, aa * 0.4 + L * 0.018, abs(lp.x))) * (1.0 - 0.7 * t);
  float u = t * 6.5 - abs(xn) * 1.6, wu = aa * 6.5 / L;
  float vein = (1.0 - smoothstep(wu * 0.4, wu * 1.4, abs(fract(u + 0.5) - 0.5))) * smoothstep(0.08, 0.25, abs(xn)) * (1.0 - smoothstep(0.7, 0.95, abs(xn))) * (1.0 - t * 0.6);
  vec3 light = mix(base, vec3(0.85, 0.92, 0.55), 0.45);
  col = mix(col, light, max(rib * 0.8, vein * 0.35 * detail));
  col *= 0.68 + 0.32 * smoothstep(0.0, max(aa * 1.5, L * 0.035), -d);  // darker rim
  col += vec3(0.07, 0.08, 0.04) * smoothstep(0.55, 0.0, length(vec2(xn + 0.4 * face, (t - 0.45) * 2.2)));  // waxy sheen
  if (pet < d) col = mix(base, vec3(0.32, 0.36, 0.16), 0.5) * 0.8;
  return vec4(col * cov, cov);
}
// a leaf centred on c0, turned by a, foreshortened by face (-1..1, its turn in 3D), with a soft drop shadow
vec4 vPlace(vec2 p, vec2 c0, float L, float a, float face, float h, float aa) {
  mat2 R = rot(a); float fs = max(abs(face), 0.18);
  vec2 lp = R * (p - c0); lp.x /= fs; lp.y += L * 0.5;
  vec4 l = vLeaf(lp, L, h, sign(face), aa);
  vec2 sp = R * (p - c0 - vec2(0.05, 0.09) * L); sp.x /= fs; sp.y += L * 0.5;
  float sh = clamp(0.5 - vLeafD(sp, L) / (aa + L * 0.07), 0.0, 1.0) * 0.3;
  return l + vec4(0.0, 0.0, 0.0, sh) * (1.0 - l.a);
}
vec4 vOver(vec4 o, vec4 l, float k) { l *= k; return l + o * (1.0 - l.a); }
// foliage: a grid of leaves, each kept or not and sized by the front's distance at its own centre (so no leaf is
// ever cut), the four nearest cells drawn back to front in a fixed order (so overlaps agree from pixel to pixel)
vec4 vFoliage(vec2 p, float fd, vec2 n, float cell, float zone, float aa, float salt) {
  vec2 g = p / cell, b = floor(g - 0.5);
  vec4 l[4]; float z[4];
  for (int j = 0; j < 4; j++) {
    vec2 id = b + vec2(float(j & 1), float(j >> 1)) + salt;
    float h = vHash(id), h2 = vHash(id + 4.7), h3 = vHash(id + 9.1);
    vec2 c0 = (id - salt + 0.5 + (vec2(h2, h3) - 0.5) * 0.5) * cell;
    float fc = fd + dot(n, c0 - p);
    float dens = fc > 0.0 ? 1.0 - fc / (zone * 0.35) : 1.0 - smoothstep(zone * 0.15, zone * 1.5, -fc);
    float grow = clamp(1.0 - fc / (zone * 0.35), 0.0, 1.0);
    z[j] = h3;
    l[j] = h < dens * 0.9 ? vPlace(p, c0, cell * (0.95 + 0.45 * h3) * (0.45 + 0.55 * grow), h * TAU, 0.75 + 0.25 * h2, h2 * 0.85, aa) : vec4(0.0);
  }
  for (int i = 0; i < 3; i++) for (int j = 0; j < 3 - i; j++) if (z[j] > z[j + 1]) { float t = z[j]; z[j] = z[j + 1]; z[j + 1] = t; vec4 v = l[j]; l[j] = l[j + 1]; l[j + 1] = v; }
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 4; j++) acc = l[j] + acc * (1.0 - l[j].a);
  return acc;
}
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  float s = (uRing ? atan(q.y, q.x) * 40.0 * uK : q.x) / max(uVLeaf * 1.6, 1.0);
  return uVBump * (abs(sin(s + uTime * 0.6)) * 0.7 + abs(sin(s * 2.3 - uTime * 0.4 + 1.7)) * 0.3);
}
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float px = uRes.x / uSize.x, aa = 1.0 / px;
  float inside = clamp(0.5 - sd * px, 0.0, 1.0);
  if (!uLaunched || uGlow < 0.001) return o;
  float k = min(uGlow * 1.5, 1.0), zone = max(uLead * uVZone, uVLeaf * 3.0);
  if (inside > 0.0) {
    vec2 n = front(p).n;
    // foliage on the front: dense at the edge, thinning behind, two staggered layers
    if (fd < zone * 0.35 + uVLeaf && fd > -zone * 1.5 - uVLeaf) {
      o = vOver(o, vFoliage(p, fd, n, uVLeaf * 0.95, zone, aa, 0.0), k * inside);
      o = vOver(o, vFoliage(p + uVLeaf * 0.41, fd, n, uVLeaf * 0.8, zone * 0.8, aa, 17.0), k * inside);
    }
    // loose leaves falling behind it: they sway, tumble (turning in 3D) and yellow a little
    if (uVFall > 0.0 && fd < -zone * 0.2 && fd > -uTail * 1.4) {
      float t = uTime, cell = uVLeaf * 2.2;
      vec2 q = p - vec2(0.0, t * 46.0 * uK);
      vec2 id = floor(q / cell);
      float h = vHash(id + 31.0), h2 = vHash(id + 2.3), h3 = vHash(id + 5.9);
      float left = 1.0 - clamp(-fd / (uTail * 1.4), 0.0, 1.0);
      if (h < uVFall * 0.32 * left) {
        float ph = t * (1.6 + h2) + h * TAU;
        vec2 c0 = (id + 0.5) * cell + vec2(sin(ph) * cell * 0.2, t * 46.0 * uK);
        float L = uVLeaf * (0.75 + 0.3 * h3);
        o = vOver(o, vPlace(p, c0, L, h * TAU + sin(ph) * 0.9, cos(ph * 1.3), mix(h2 * 0.8, 0.98, 0.35 * h3), aa), k * inside);
      }
    }
  }
  // the vine on the outline: a twisted, shaded stem with leaves on stalks, where the front has been
  if (uVVine > 0.0 && uBoxless < 0.5 && uRim > 0.0 && sd > -uVVineW * 6.0 - uVLeaf * 1.6) {
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, fd);
    float kept = smoothstep(-uRimSoft, uRimSoft, fd + (uRadius - uClear) / fg);
    float kv = uVVine * min(uRim * uVVineNorm, 1.0) * reached * kept * inside;
    if (kv > 0.001) {
      float per = 2.0 * (uShape.z + uShape.w), s = (atan(c.y / uShape.w, c.x / uShape.z) / TAU + 0.5) * per;
      float W = uVVineW * (0.85 + 0.3 * sin(s / (uVLeaf * 2.7)));
      float wav = sin(s / (uVLeaf * 1.3)) * uVVineW * 1.4 + sin(s / (uVLeaf * 0.55) + 1.3) * uVVineW * 0.4;
      float d = sd + uVVineW * 2.5 + wav;
      // a second, thinner strand twisting around the first
      float d2 = d + sin(s / (uVLeaf * 0.35)) * W * 1.1;
      vec4 acc = vec4(0.0);
      for (int j = 0; j < 2; j++) {
        float dd = j == 0 ? d2 : d, ww = j == 0 ? W * 0.32 : W * 0.5;
        float cv = clamp(ww - abs(dd) * 1.0 + 0.5 * aa, 0.0, aa) / aa;
        float u = clamp(dd / max(ww, 1e-3), -1.0, 1.0);
        vec3 sc = vec3(0.24, 0.33, 0.13) * (0.55 + 0.55 * sqrt(1.0 - u * u)) + vec3(0.05, 0.05, 0.02) * smoothstep(0.2, -0.6, u);
        sc *= 0.9 + 0.1 * sin(s * 1.7 + dd);
        vec4 st = vec4(sc * cv, cv);
        acc = st + acc * (1.0 - st.a);
      }
      // the stem's shadow on the content
      float sh = clamp(1.0 - abs(d - W * 0.9) / (W * 1.4 + aa), 0.0, 1.0) * 0.25;
      acc = acc + vec4(0.0, 0.0, 0.0, sh) * (1.0 - acc.a);
      // leaves on stalks, alternating sides, pointing inward and forward; the two nearest nodes
      float step_ = uVLeaf * 1.15, f = s / step_, i0 = floor(f);
      for (int j = 0; j < 2; j++) {
        float i = i0 + (j == 0 ? (fract(f) < 0.5 ? -1.0 : 1.0) : 0.0);
        float hv = vHash(vec2(i, 3.0));
        if (hv < 0.12) continue;
        float side = mod(i, 2.0) * 2.0 - 1.0;
        vec2 q = vec2(s - (i + 0.5) * step_, d);             // along the stem, across it (inward < 0)
        float L = uVLeaf * (0.7 + 0.35 * vHash(vec2(i, 1.0)));
        float a = -0.55 * side - 0.25 * (hv - 0.5);
        vec2 lq = rot(a) * vec2(q.x, -q.y);                   // leaf grows inward (+y)
        lq.y -= W * 0.4;
        vec4 lf = vLeaf(lq, L, vHash(vec2(i, 2.0)) * 0.85, side, aa);
        vec2 sq = lq - vec2(0.04, -0.07) * L;
        float ls = clamp(0.5 - vLeafD(sq, L) / (aa + L * 0.07), 0.0, 1.0) * 0.28;
        lf = lf + vec4(0.0, 0.0, 0.0, ls) * (1.0 - lf.a);
        acc = acc + lf * (1.0 - acc.a);
      }
      o = vOver(o, acc, kv);
    }
  }
  return o;
}
`;
// The sparks, as small leaves with a midrib: they tumble as they fade, in the palette's greens.
const VINE_DOTS = `#version 300 es
precision highp float; in float vA; in float vR; in float vPt; out vec4 o;
void main() {
  float a = vA * 7.0 + vR * 2.0, c = cos(a), s = sin(a), f = max(abs(cos(vA * 9.0 + vR)), 0.25);
  vec2 p = mat2(c, s, -s, c) * (gl_PointCoord - 0.5) * vPt;
  float L = vR * 2.6, t = p.y / L + 0.5;
  p.x /= f;
  float w = L * 0.29 * pow(max(sin(3.14159 * pow(clamp(t, 0.0, 1.0), 0.72)), 0.0), 0.62);
  float d = max(abs(p.x) - w, max(-t, t - 1.0) * L);
  float cov = clamp(0.5 - d, 0.0, 1.0) * vA;
  vec3 g = mix(vec3(0.24, 0.5, 0.2), vec3(0.5, 0.72, 0.28), fract(vR * 3.7));
  g *= 0.8 + 0.3 * step(0.0, p.x * sign(cos(vA * 9.0 + vR)));
  g = mix(g, vec3(0.8, 0.88, 0.55), (1.0 - smoothstep(0.3, 0.9, abs(p.x))) * 0.5);
  o = vec4(g * cov, cov);
}`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. Greens, a softer band, and bigger
// sparks so the leaves read.
const PRESET = { palette: ['#3E7B35', '#5C9A43', '#2B5E2B', '#7FAF4E', '#47853B'], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
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
