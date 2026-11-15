// distortion-wave/christmas — the distortion wave, dressed for Christmas.
//
//   import { distortionWave } from 'distortion-wave';
//   import { christmas } from 'distortion-wave/christmas';
//
//   distortionWave(card, update, { effect: christmas, source: button });   // the same wave: the front is a candy
//                                                                            // cane, snow falls, lights go up
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

// Hooks into the wave shader (renderer.js · FS_MAIN, compiled with #define FX). The front is a twisted candy cane,
// shaded as a cylinder, with frost and glints ahead of it. Behind it, snow falls in three layers. Where the front has
// been, a string of lights hangs along the outline (a sagging wire, bulbs in four colours that twinkle and glow) and
// snow settles on the top edge, with icicles. The sparks are snowflakes (XMAS_DOTS).
const XMAS_WAVE = `
uniform float uXCane, uXStripe, uXSnow, uXFlake, uXLights, uXBulbs, uXCap, uXFrost, uXNorm;
float xHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec4 xOver(vec4 o, vec4 l, float k) { l *= k; return l + o * (1.0 - l.a); }
float fxFront(vec2 q, vec2 p) { return 0.0; }
// one layer of falling snow: soft round flakes that drift
vec4 xSnow(vec2 p, float cell, float speed, float r, float keep, float aa, float salt) {
  float t = uTime;
  vec2 q = p - vec2(sin(t * 0.7 + salt) * cell * 0.4, t * speed);
  vec2 id = floor(q / cell);
  float h = xHash(id + salt), h2 = xHash(id + salt + 3.1), h3 = xHash(id + salt + 7.7);
  if (h > keep) return vec4(0.0);
  vec2 c0 = (id + 0.2 + 0.6 * vec2(h2, h3)) * cell + vec2(sin(t * (1.0 + h2) + h * 6.28) * cell * 0.15, 0.0);
  float rr = r * (0.6 + 0.6 * h3), d = length(q - c0);
  float a = (1.0 - smoothstep(rr * 0.35, rr + aa, d)) * (0.75 + 0.25 * h2);
  return vec4(vec3(0.97, 0.98, 1.0) * a, a);
}
vec4 fxOver(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg) {
  float px = uRes.x / uSize.x, aa = 1.0 / px;
  float inside = clamp(0.5 - sd * px, 0.0, 1.0);
  if (!uLaunched || uGlow < 0.001) return o;
  float k = min(uGlow * 1.5, 1.0) * inside, t = uTime;
  if (inside > 0.0) {
    // frost ahead of the front, with glints
    if (uXFrost > 0.0 && fd > 0.0 && fd < uLead * 1.2) {
      float f = exp(-fd / max(uLead * 0.35, 1.0)) * uXFrost;
      o.rgb = mix(o.rgb, vec3(0.86, 0.93, 1.0) * o.a + vec3(0.0), f * 0.45);
      vec2 g = floor(p / 7.0), gp = p - (g + 0.5) * 7.0;
      float gh = xHash(g), tw = max(sin(t * 7.0 + xHash(g + 1.3) * 40.0), 0.0);
      float star = max(1.0 - abs(gp.x) * abs(gp.y) * 0.9 - length(gp) * 0.28, 0.0);
      o += vec4(vec3(1.0), 1.0) * step(0.93, gh) * tw * star * f * k;
    }
    // snow falling behind the front, three depths
    if (uXSnow > 0.0 && fd < 0.0 && fd > -uTail * 1.5) {
      float left = (1.0 - clamp(-fd / (uTail * 1.5), 0.0, 1.0)) * smoothstep(0.0, uXCane * 3.0, -fd);
      float fl = uXFlake, kp = min(uXSnow, 2.0) * left;
      o = xOver(o, xSnow(p, fl * 9.0, 26.0 * uK, fl * 0.7, 0.55 * kp, aa, 0.0), k);
      o = xOver(o, xSnow(p, fl * 6.5, 40.0 * uK, fl, 0.5 * kp, aa, 11.0), k);
      o = xOver(o, xSnow(p, fl * 11.0, 62.0 * uK, fl * 1.5, 0.35 * kp, aa, 23.0), k);
    }
    // the candy cane on the front: red and white stripes twisting round a shaded cylinder, its shadow behind it
    float R = uXCane, x = fd + R * 0.4;
    float sh = (1.0 - smoothstep(R * 0.6, R * 2.2, abs(x + R * 1.1))) * 0.3;
    o = xOver(o, vec4(0.0, 0.0, 0.0, sh), k);
    float cov = clamp((R - abs(x)) * px + 0.5, 0.0, 1.0);
    if (cov > 0.0) {
      float u = clamp(x / R, -1.0, 1.0), z = sqrt(1.0 - u * u);
      float s = uRing ? atan(fq.y, fq.x) * uRadius : fq.x;
      float v = (s + asin(u) * R * 1.3) / uXStripe;
      float sw = aa / uXStripe * 1.5;
      float red = smoothstep(0.5 - sw, 0.5 + sw, fract(v)) - smoothstep(1.0 - sw, 1.0, fract(v)) + (1.0 - smoothstep(0.0, sw, fract(v)));
      float thin = smoothstep(0.18 - sw, 0.18, fract(v)) - smoothstep(0.26, 0.26 + sw, fract(v));
      vec3 col = mix(vec3(0.97, 0.96, 0.94), vec3(0.8, 0.06, 0.12), clamp(red, 0.0, 1.0));
      col = mix(col, vec3(0.12, 0.5, 0.22), clamp(thin, 0.0, 1.0));
      col *= 0.45 + 0.6 * z;
      col += vec3(1.0) * pow(max(1.0 - abs(u + 0.45) * 3.0, 0.0), 3.0) * 0.55;
      o = xOver(o, vec4(col * cov, cov), k);
    }
  }
  // on the outline, where the front has been: snow on the top edge and a string of lights
  if (uBoxless < 0.5 && uRim > 0.0 && inside > 0.0) {
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, fd);
    float kept = smoothstep(-uRimSoft, uRimSoft, fd + (uRadius - uClear) / fg);
    float kv = min(uRim * uXNorm, 1.0) * reached * kept * inside;
    if (kv > 0.001) {
      // snow cap and icicles
      if (uXCap > 0.0) {
        float top = c.y + uShape.w * 0.5, H = uXCap;
        float h = H * (0.7 + 0.2 * sin(c.x / (H * 1.9)) + 0.12 * sin(c.x / (H * 0.7) + 1.3));
        if (top < H * 3.0) {
          float ci = clamp((h - top) * px + 0.5, 0.0, 1.0);
          float st = H * 1.3, ix = floor(c.x / st), lx = c.x - (ix + 0.5) * st;
          float len = H * (0.4 + 1.4 * xHash(vec2(ix, 5.0))) * step(0.35, xHash(vec2(ix, 8.0)));
          float yy = top - h * 0.85, wd = st * 0.16 * (1.0 - yy / max(len, 1e-3));
          float ic = yy > 0.0 && len > 0.0 ? clamp((wd - abs(lx)) * px + 0.5, 0.0, 1.0) : 0.0;
          vec3 icc = mix(vec3(0.75, 0.88, 1.0), vec3(1.0), 0.5 + 0.5 * sin(lx / max(wd, 1e-3) * 1.5)) ;
          o = xOver(o, vec4(icc * ic * 0.8, ic * 0.8), kv);
          vec3 snow = mix(vec3(0.74, 0.83, 0.95), vec3(1.0), smoothstep(0.0, h * 0.8, h - top));
          float shade = clamp((h + H * 0.35 - top) * px, 0.0, 1.0) * (1.0 - ci) * 0.25;
          o = xOver(o, vec4(0.0, 0.0, 0.0, shade), kv);
          o = xOver(o, vec4(snow * ci, ci), kv);
        }
      }
      // string of lights
      if (uXLights > 0.0) {
        float B = uXBulbs * 0.24, inset = B * 1.0 + 1.0;
        float per = 2.0 * (uShape.z + uShape.w), s = (atan(c.y / uShape.w, c.x / uShape.z) / 6.28318 + 0.5) * per;
        float f = s / uXBulbs, fr = fract(f), sag = B * 0.9 * 4.0 * fr * (1.0 - fr);
        float d = sd + inset + sag;
        if (d > -B * 4.5) {
          float wire = clamp((0.7 - abs(d)) * px + 0.5, 0.0, 1.0) * 0.9;
          vec4 acc = vec4(vec3(0.07, 0.2, 0.1) * wire, wire);
          float i = floor(f + 0.5), al = (f - i) * uXBulbs;
          float ac = -(sd + inset);                            // inward from the wire at the node
          float hv = xHash(vec2(i, 2.0)), tw = 0.55 + 0.45 * sin(t * (2.0 + 2.0 * hv) + hv * 40.0);
          float ci = mod(i, 4.0);
          vec3 bc = ci < 1.0 ? vec3(1.0, 0.16, 0.14) : ci < 2.0 ? vec3(1.0, 0.75, 0.2) : ci < 3.0 ? vec3(0.2, 0.85, 0.35) : vec3(0.3, 0.55, 1.0);
          vec2 bp = vec2(al, ac - B * 1.05);
          float bd = length(bp / vec2(B * 0.42, B * 0.7)) - 1.0;
          float bcov = clamp(-bd * B * 0.5 * px + 0.5, 0.0, 1.0);
          float sock = clamp((B * 0.22 - abs(al)) * px + 0.5, 0.0, 1.0) * clamp((B * 0.4 - abs(ac - B * 0.25)) * px + 0.5, 0.0, 1.0);
          vec3 bulb = bc * (0.35 + 0.75 * tw) + vec3(1.0) * pow(max(1.0 - length(bp / B - vec2(-0.12, -0.2)) * 2.2, 0.0), 2.0) * 0.8 * tw;
          vec4 bl = vec4(bulb * bcov, bcov);
          acc = bl + acc * (1.0 - bl.a);
          acc = vec4(vec3(0.1, 0.25, 0.12) * sock, sock) + acc * (1.0 - sock);
          float glow = exp(-dot(bp, bp) / (B * B * 2.2)) * tw * 0.75;
          o = xOver(o, acc, kv * uXLights);
          o += vec4(bc * glow, 0.0) * kv * min(uXLights, 1.0);
        }
      }
    }
  }
  return o;
}
`;
// The sparks, as snowflakes: six arms with side branches, turning slowly as they fade.
const XMAS_DOTS = `#version 300 es
precision highp float; in float vA; in float vR; in float vPt; out vec4 o;
void main() {
  vec2 p = (gl_PointCoord - 0.5) * vPt;
  float a = atan(p.y, p.x) + vA * 2.0 + vR, r = length(p), R = vR * 1.5;
  float s = mod(a, 1.0471976) - 0.5235988;
  vec2 q = vec2(cos(s), sin(s)) * r;                     // in the frame of the nearest arm
  float arm = abs(q.y);
  vec2 b = vec2(q.x - R * 0.55, abs(q.y));                // side branches at 55% of the arm
  float br = abs(dot(b, vec2(-0.5, 0.866))) ;
  float d = min(arm, (q.x > R * 0.55 && q.x < R * 0.85) ? br : 1e3);
  float cov = clamp(0.9 - d, 0.0, 1.0) * step(r, R) + clamp(R * 0.18 - r + 0.5, 0.0, 1.0);
  cov = clamp(cov, 0.0, 1.0) * vA;
  o = vec4(vec3(0.92, 0.96, 1.0) * cov, cov);
}`;

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. Red, white, green and gold, a softer
// band, and bigger sparks so the flakes read.
const PRESET = { palette: ['#C8102E', '#F4F1EA', '#1E7B3C', '#E8B84A'], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const CHRISTMAS = {
  cane: 7,          // radius of the candy cane on the front
  stripe: 16,       // width of its stripes
  snow: 1,          // snowfall behind the front (0 = none)
  flake: 3,         // size of a snowflake
  lights: 1,        // the string of lights on the outline (0 = none)
  bulbs: 30,        // distance between two bulbs
  cap: 11,          // snow on the top edge, with icicles (0 = none)
  frost: 0.6,       // frost and glints ahead of the front
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the CHRISTMAS keys. */
export const christmas = Object.freeze({
  name: 'christmas',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, s = clamp(Math.sqrt(k), 0.55, 1.4);
    const v = (key) => (o[key] ?? CHRISTMAS[key]);
    c.cane = Math.max(v('cane') * s, 2); c.stripe = Math.max(v('stripe') * s, 3);
    c.snow = clamp(v('snow'), 0, 3); c.flake = Math.max(v('flake') * s, 1);
    c.lights = Math.max(v('lights'), 0); c.bulbs = Math.max(v('bulbs') * s, 10);
    c.cap = Math.max(v('cap') * s, 0); c.frost = Math.max(v('frost'), 0);
  },
  shader: Object.freeze({ key: 'christmas', chunk: XMAS_WAVE, dots: XMAS_DOTS }),
  uniforms: (c) => ({ uXCane: c.cane, uXStripe: c.stripe, uXSnow: c.snow, uXFlake: c.flake, uXLights: c.lights, uXBulbs: c.bulbs,
    uXCap: c.cap, uXFrost: c.frost, uXNorm: 1 / Math.max(c.rimStrength, 0.05) }),
});
