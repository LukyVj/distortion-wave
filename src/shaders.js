// shaders.js — GLSL for the electric effect: the transition (FS_ELECTRIC) and the border (FS_BORDER)
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
// arc length of the closest outline point, clockwise from the left end of the top edge (electric.js · paramAt)
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

export const FS_ELECTRIC = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uSize, uRes;
uniform sampler2D uOld0, uNew0;
uniform vec4 uOldRect, uNewRect, uShape, uRadii;
uniform int uMode;
uniform bool uClip;
uniform float uFade, uTime, uArc, uS0, uLive, uHeadOn, uHeadW, uSurge, uFlash, uGlitch, uRows;
out vec4 outColor;
${COMMON}
vec4 tap(sampler2D s, vec4 rect, vec2 p, vec2 sp) {
  vec2 q = (p - rect.xy) / rect.zw;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return vec4(0.0);
  return textureLod(s, clamp((sp - rect.xy) / rect.zw, 0.0, 1.0), 0.0);
}
vec4 split(sampler2D s, vec4 rect, vec2 p, vec2 sp, float sl) {
  if (abs(sl) < 0.1) return tap(s, rect, p, sp);
  vec4 r = tap(s, rect, p, sp + vec2(sl, 0.0)), g = tap(s, rect, p, sp), b = tap(s, rect, p, sp - vec2(sl, 0.0));
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uSize.x / uRes.x);
  float dn = (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  vec2 hb = uShape.zw * 0.5, c = p - (uShape.xy + hb);
  float sd = sdRoundBox(c, hb, uRadii);
  float mask = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0), clipM = uClip ? mask : 1.0;
  if (uMode == 0 || uMode == 2 || uMode == 3) {
    vec4 a = tap(uOld0, uOldRect, p, p), b = tap(uNew0, uNewRect, p, p);
    vec4 v = (uMode == 0 ? a : uMode == 2 ? b : mix(a, b, uFade)) * clipM;
    outColor = vec4(v.rgb + dn * v.a, v.a); return;
  }
  vec4 col = vec4(0.0);
  if (uMode == 1) {
    // rows of content flip from old to new at random moments of the surge, jumping sideways as they do
    float row = floor(p.y / uRows), tick = floor(uTime * 24.0);
    float flip = 0.08 + 0.84 * h11(row * 1.37 + 3.1);
    float env = sin(3.14159265 * uSurge);
    float jump = step(0.55, h11(row * 7.13 + tick * 1.31)) * (h11(row + tick * 0.73) - 0.5) * 2.0 * uGlitch * env;
    vec2 sp = p + vec2(jump, 0.0);
    float sl = uGlitch * 0.35 * env * (0.5 + h11(tick + row));
    bool isNew = uSurge > flip;
    col = isNew ? split(uNew0, uNewRect, p, sp, sl) : split(uOld0, uOldRect, p, sp, sl);
    float aU = isNew ? tap(uNew0, uNewRect, p, p).a : tap(uOld0, uOldRect, p, p).a;
    col *= min(1.0, aU / max(col.a, 1e-4)) * clipM;
    col.rgb += uFlash * 0.22 * col.a * (0.6 + 0.4 * h11(row + tick));
  }
  float P = perimLen(hb, uRadii), s = perim(c, hb, uRadii);
  float ds = abs(s - uS0); ds = min(ds, P - ds);
  float reached = 1.0 - smoothstep(uArc - uHeadW * 0.4, uArc + 1.0, ds);
  float head = exp(-pow((ds - uArc + uHeadW * 0.3) / max(uHeadW, 1.0), 2.0)) * uHeadOn;
  float k = max(reached * uLive, head) * (1.0 + 0.35 * uFlash);
  vec4 e = arcAt(sd, s, P, uTime, k, head);
  vec4 o = e + col * (1.0 - e.a);
  outColor = vec4(o.rgb + dn * 2.0 * o.a, o.a);
}`;

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
