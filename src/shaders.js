// shaders.js — GLSL for the electric effect: the wave's lightning (ELECTRIC_WAVE) and the border (FS_BORDER)
// Part of distortion-wave · MIT © Lucas Bonomi

// Shared pieces. Space is y-down CSS px; radii are (bottom-right, top-right, bottom-left, top-left).
const COMMON = `
const float Q = 1.5707963;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float sdRoundBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw; r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
// arc length of the closest outline point, clockwise from the left end of the top edge
float perimLen(vec2 b, vec4 r) {
  return 4.0 * (b.x + b.y) - 2.0 * (r.x + r.y + r.z + r.w) + Q * (r.x + r.y + r.z + r.w);
}
float perim(vec2 p, vec2 b, vec4 r) {
  float top = 2.0 * b.x - r.w - r.y, right = 2.0 * b.y - r.y - r.x, bottom = 2.0 * b.x - r.x - r.z, left = 2.0 * b.y - r.z - r.w;
  float s1 = top, s2 = s1 + Q * r.y, s3 = s2 + right, s4 = s3 + Q * r.x, s5 = s4 + bottom, s6 = s5 + Q * r.z, s7 = s6 + left;
  if (p.x > b.x - r.y && p.y < -b.y + r.y) return s1 + (clamp(atan(p.y + b.y - r.y, p.x - b.x + r.y), -Q, 0.0) + Q) * r.y;
  if (p.x > b.x - r.x && p.y > b.y - r.x) return s3 + clamp(atan(p.y - b.y + r.x, p.x - b.x + r.x), 0.0, Q) * r.x;
  if (p.x < -b.x + r.z && p.y > b.y - r.z) return s5 + (clamp(atan(p.y - b.y + r.z, p.x + b.x - r.z), Q, 2.0 * Q) - Q) * r.z;
  if (p.x < -b.x + r.w && p.y < -b.y + r.w) {
    float a = atan(p.y + b.y - r.w, p.x + b.x - r.w); if (a > 0.0) a -= 4.0 * Q;
    return s7 + (clamp(a, -2.0 * Q, -Q) + 2.0 * Q) * r.w;
  }
  float dx = b.x - abs(p.x), dy = b.y - abs(p.y);
  if (dy < dx) return p.y < 0.0 ? clamp(p.x + b.x - r.w, 0.0, top) : s4 + clamp(b.x - r.x - p.x, 0.0, bottom);
  return p.x > 0.0 ? s2 + clamp(p.y + b.y - r.y, 0.0, right) : s6 + clamp(b.y - r.z - p.y, 0.0, left);
}
float hash3(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise3(p); p = p * 2.03 + vec3(13.1, 7.7, 3.3); a *= 0.5; } return s / 0.96875; }
uniform vec3 uPal[8]; uniform int uPalN;
vec3 paletteAt(float u) {
  float x = fract(u) * float(uPalN); int i = min(int(floor(x)), uPalN - 1); int j = (i + 1) % uPalN;
  return mix(uPal[i], uPal[j], smoothstep(0.0, 1.0, fract(x)));
}
vec3 oklabToSrgb(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 lin = clamp(vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
  return mix(12.92 * lin, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), lin));
}
// The arc: two noisy strands following the outline, a white-hot core and a coloured glow. Premultiplied.
uniform float uThick, uGlowW, uChaos, uScale, uCrackle, uOffset;
vec4 arcAt(float sd, float s, float P, float t, float k, float hot) {
  if (k <= 0.001 || abs(sd - uOffset) > uGlowW * 6.0 + uChaos * 3.0) return vec4(0.0);
  float th = 6.2831853 * s / P, R = P / (6.2831853 * uScale);
  vec3 q = vec3(cos(th) * R, sin(th) * R, t * uCrackle);
  float n1 = fbm3(q) - 0.5, n2 = fbm3(q * 1.9 + vec3(4.1, 1.7, t * uCrackle * 0.7)) - 0.5;
  float d0 = sd - uOffset, d1 = d0 + n1 * 2.4 * uChaos, d2 = d0 + n2 * 2.0 * uChaos;
  float w = max(uThick, 0.6);
  float core = exp(-(d1 * d1) / (w * w)) + 0.55 * exp(-(d2 * d2) / (w * w * 0.5));
  float glow = 0.6 * exp(-(d1 * d1) / (uGlowW * uGlowW)) + 0.28 * exp(-abs(d0) / (uGlowW * 2.2));
  vec3 lab = paletteAt(s / P + n1 * 0.4 + t * 0.03); lab.yz *= 1.15;
  vec3 base = oklabToSrgb(lab);
  vec3 hotc = mix(base, vec3(1.0), 0.72 + 0.28 * hot);
  float ga = clamp(glow * k, 0.0, 1.0), ca = clamp(core * k * (1.0 + hot), 0.0, 1.0);
  vec4 o = vec4(base * ga, ga);
  return vec4(hotc * ca, ca) + o * (1.0 - ca);
}
`;

// One element of an electric border, drawn in its own viewport of a shared full-screen canvas.
export const FS_BORDER = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uView;        // canvas size, CSS px
uniform float uDpr, uTime, uLevel;
uniform vec4 uShape, uRadii;
out vec4 outColor;
${COMMON}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 hb = uShape.zw * 0.5, c = p - (uShape.xy + hb);
  float sd = sdRoundBox(c, hb, uRadii);
  float P = perimLen(hb, uRadii), s = perim(c, hb, uRadii);
  vec4 e = arcAt(sd, s, P, uTime, uLevel, 0.0);
  outColor = vec4(e.rgb + (ign(gl_FragCoord.xy) - 0.5) / 255.0 * e.a, e.a);
}`;

// Lightning for the wave shader (renderer.js · FS_MAIN, compiled with #define FX): the front turns jagged and
// carries crackling bolts, and the outline charges with arcs where the front has passed.
export const ELECTRIC_WAVE = `
uniform float uEJag, uEScale, uECrackle, uEBoltW, uEBoltGlow, uEChaos, uEBolt, uERim, uERimNorm;
float eHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float eNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(eHash(i), eHash(i + vec3(1, 0, 0)), f.x), mix(eHash(i + vec3(0, 1, 0)), eHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(eHash(i + vec3(0, 0, 1)), eHash(i + vec3(1, 0, 1)), f.x), mix(eHash(i + vec3(0, 1, 1)), eHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float eFbm(vec3 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 5; i++) { if (i >= oct) break; s += a * eNoise(p); n += a; p = p * 2.03 + vec3(13.1, 7.7, 3.3); a *= 0.5; }
  return s / n;
}
float fxFront(vec2 q, vec2 p) {
  if (!uLaunched) return 0.0;
  return (eFbm(vec3(q / uEScale, uTime * uECrackle), 3) - 0.5) * 2.0 * uEJag;
}
vec3 eColour(float u, float hot) { vec3 lab = paletteAt(u); lab.yz *= 1.15; return mix(oklabToSrgb(lab), vec3(1.0), hot); }
vec4 eOver(vec3 rgb, float a, vec4 o) { a = clamp(a, 0.0, 1.0); return vec4(rgb * a, a) + o * (1.0 - a); }
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float inside = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  if (inside <= 0.0) return o;
  float flick = 0.7 + 0.3 * eNoise(vec3(uTime * 19.0, 3.7, 0.0));
  float w = max(uEBoltW, 0.5);
  // bolts riding the front
  if (uLaunched && uGlow > 0.001 && abs(fd) < uEChaos * 3.0 + uEBoltGlow * 3.0 + uEJag) {
    vec3 x = vec3(fq / (uEScale * 0.55), uTime * uECrackle * 1.6);
    float n1 = eFbm(x, 4) - 0.5, n2 = eFbm(x * 1.7 + vec3(7.3, 2.1, 0.0), 4) - 0.5;
    float d1 = fd + n1 * 2.0 * uEChaos, d2 = fd + 0.7 * uEChaos + n2 * 1.8 * uEChaos;
    float core = exp(-d1 * d1 / (w * w)) + 0.6 * exp(-d2 * d2 / (w * w * 0.5));
    float glow = 0.55 * exp(-d1 * d1 / (uEBoltGlow * uEBoltGlow)) + 0.22 * exp(-abs(fd) / (uEBoltGlow * 2.2));
    float k = uEBolt * uGlow * flick * inside;
    float u = 0.55 + (uRing ? atan(fq.y, fq.x) / TAU : fq.x * 0.004 / uK) + uTime * 0.1;
    o = eOver(eColour(u, 0.0), glow * k, o);
    o = eOver(eColour(u, 0.8), core * k, o);
  }
  // the outline charges where the front has been, then discharges
  if (uERim > 0.0 && uBoxless < 0.5 && uRim > 0.0 && sd > -(uEBoltGlow * 2.5 + uEChaos * 2.0 + w * 3.0)) {
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, fd);
    float kept = smoothstep(-uRimSoft, uRimSoft, fd + (uRadius - uClear) / fg);
    float k = uERim * min(uRim * uERimNorm, 1.0) * reached * kept * flick * inside;
    if (k > 0.001) {
      float n = eFbm(vec3(c / uEScale, uTime * uECrackle), 4) - 0.5;
      float dr = sd + w * 2.0 + n * 2.0 * uEChaos * 0.7;
      float u = atan(c.y / uShape.w, c.x / uShape.z) / TAU + uTime * 0.2;
      o = eOver(eColour(u, 0.0), (0.5 * exp(-dr * dr / (uEBoltGlow * uEBoltGlow * 0.6)) + 0.2 * exp(-abs(sd) / (uEBoltGlow * 2.0))) * k, o);
      o = eOver(eColour(u, 0.75), exp(-dr * dr / (w * w * 0.8)) * k, o);
    }
  }
  return o;
}
`;
