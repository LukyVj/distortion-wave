/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/shaders.js
var COMMON = `
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
var FS_BORDER = `#version 300 es
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
var ELECTRIC_WAVE = `
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

// src/core.js
var TAU = Math.PI * 2;
function cubicBezier(x1, y1, x2, y2) {
  const b = (t, p1, p2) => {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) {
      const m = (lo + hi) / 2;
      if (b(m, x1, x2) < x) lo = m;
      else hi = m;
    }
    return b((lo + hi) / 2, y1, y2);
  };
}
var easeLaunch = cubicBezier(0.2, 1, 0.3, 1);
var easeClear = cubicBezier(0.45, 0, 0.55, 1);
function hexToOklab(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
var PALETTES = {
  aurora: ["#FF4FD8", "#A35BFF", "#5B7CFF", "#38D9FF", "#FFD36B", "#FF7A5C"],
  ocean: ["#3A7BFF", "#2EE6D6", "#7C5CFF", "#1FB6FF", "#B8F2FF"],
  mint: ["#2BD67B", "#B6FF5C", "#1FC8A9", "#E8FFB0", "#3CE0C0"],
  ember: ["#FF5A3C", "#FFB23C", "#FF3C8E", "#FFE07A", "#FF7F50"],
  electric: ["#8FF7FF", "#3FA9FF", "#6B7CFF", "#C6FBFF"],
  pixel: ["#FF6B2C", "#FFA15E", "#FFE2C9", "#FF4F2E"]
};
var BASE = {
  type: "vertical",
  speed: 1,
  anticipation: 0.45,
  travel: 2.2,
  linger: -0.3,
  rimFade: 2.8,
  hairDelay: 0.45,
  hairFade: 2.8,
  pull: 22,
  inhale: 50,
  gatherGlow: 0.35,
  gatherDots: 1,
  amplitude: 32,
  lensWidth: 140,
  aberration: 0.75,
  swell: 20,
  blur: 18,
  blurNear: 6,
  blurAhead: 90,
  blurBehind: 230,
  lead: 120,
  tail: 280,
  band: 0.9,
  rimWidth: 14,
  rimSoftness: 320,
  rimStrength: 0.85,
  uneven: 1,
  hairWidth: 1.5,
  lean: 0.9,
  margin: 60,
  seam: 48,
  particles: 64,
  particleSize: 1.8,
  particleLife: 2.1,
  reach: 140,
  spread: 1,
  palette: "aurora"
};
var PRESETS = {
  vertical: BASE,
  horizontal: { ...BASE, type: "horizontal" },
  center: {
    ...BASE,
    type: "center",
    anticipation: 0.25,
    travel: 3.2,
    linger: -0.2,
    rimFade: 2.4,
    hairDelay: 0.9,
    pull: 14,
    inhale: 32,
    gatherGlow: 0.2,
    gatherDots: 0,
    amplitude: 20,
    lensWidth: 90,
    aberration: 0.35,
    swell: 13,
    blur: 11,
    blurAhead: 54,
    blurBehind: 140,
    lead: 80,
    tail: 180,
    band: 0.75,
    rimStrength: 0.7,
    rimSoftness: 200,
    particles: 90,
    particleLife: 3,
    reach: 90,
    spread: 0.65
  }
};

// src/gl.js
var VS_FULL = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile");
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  const locs = /* @__PURE__ */ new Map();
  return { p, u: (n) => {
    if (!locs.has(n)) locs.set(n, gl.getUniformLocation(p, n));
    return locs.get(n);
  } };
}

// src/ambient.js
var BORDER = {
  thickness: 1.6,
  glow: 14,
  chaos: 5,
  scale: 34,
  crackle: 1,
  offset: 0,
  intensity: 1,
  palette: "electric",
  trigger: "always",
  fadeIn: 220,
  fadeOut: 380
};
var items = /* @__PURE__ */ new Set();
var stage = null;
var raf = 0;
var lastNow = 0;
function makeStage() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-dw-ignore", "");
  canvas.setAttribute("data-dw-ambient", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;contain:strict;";
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return { ok: false };
  let prog;
  try {
    prog = program(gl, VS_FULL, FS_BORDER);
  } catch (e) {
    console.warn("[distortion-wave]", e);
    return { ok: false };
  }
  const s = { ok: true, canvas, gl, prog, vao: gl.createVertexArray(), pal: new Float32Array(24), lost: false };
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    s.lost = true;
  });
  return s;
}
function radiiOf(cs, w, h) {
  const one = (v, side) => {
    const t = String(v).trim().split(/\s+/)[0];
    const n = parseFloat(t) || 0;
    return t.endsWith("%") ? n / 100 * side : n;
  };
  const r = { tl: one(cs.borderTopLeftRadius, w), tr: one(cs.borderTopRightRadius, w), br: one(cs.borderBottomRightRadius, w), bl: one(cs.borderBottomLeftRadius, w) };
  const fit = (side, a, b) => a + b > 0 ? side / (a + b) : Infinity;
  const f = Math.min(1, fit(w, r.tl, r.tr), fit(w, r.bl, r.br), fit(h, r.tl, r.bl), fit(h, r.tr, r.br));
  return { tl: r.tl * f, tr: r.tr * f, br: r.br * f, bl: r.bl * f };
}
function frame(now) {
  raf = 0;
  const dt = lastNow ? Math.min(now - lastNow, 100) : 16;
  lastNow = now;
  const s = stage;
  if (!s || !s.ok || s.lost) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), vw = innerWidth, vh = innerHeight;
  const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
  if (s.canvas.width !== W || s.canvas.height !== H) {
    s.canvas.width = W;
    s.canvas.height = H;
  }
  const gl = s.gl, u = s.prog.u;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.SCISSOR_TEST);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(s.prog.p);
  gl.bindVertexArray(s.vao);
  gl.uniform2f(u("uView"), vw, vh);
  gl.uniform1f(u("uDpr"), dpr);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive = false;
  for (const it of items) {
    const o = it.o, goal = it.on ? 1 : 0, rate = dt / (goal > it.level ? o.fadeIn : o.fadeOut);
    it.level = goal > it.level ? Math.min(goal, it.level + rate) : Math.max(goal, it.level - rate);
    if (it.level > 0 || goal > 0) alive = true;
    if (it.level <= 1e-3 || !it.el.isConnected) {
      if (it.dead) items.delete(it);
      continue;
    }
    if (!still) it.time += dt / 1e3;
    const b = it.el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (it.dirty || Math.abs(b.width - it.w) > 0.5 || Math.abs(b.height - it.h) > 0.5) {
      it.w = b.width;
      it.h = b.height;
      it.dirty = false;
      it.radii = radiiOf(getComputedStyle(it.el), b.width, b.height);
    }
    const m = o.glow * 6 + o.chaos * 3 + Math.abs(o.offset) + 2;
    const x0 = Math.max(0, Math.floor((b.left - m) * dpr)), y0 = Math.max(0, Math.floor((vh - b.bottom - m) * dpr));
    const x1 = Math.min(W, Math.ceil((b.right + m) * dpr)), y1 = Math.min(H, Math.ceil((vh - b.top + m) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    gl.viewport(0, 0, W, H);
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    gl.uniform4f(u("uShape"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("uRadii"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("uTime"), it.time);
    gl.uniform1f(u("uLevel"), it.level * o.intensity);
    const f = { uThick: o.thickness, uGlowW: o.glow, uChaos: o.chaos, uScale: o.scale, uCrackle: o.crackle, uOffset: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("uPal[0]"), it.pal);
    gl.uniform1i(u("uPalN"), it.palN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  if (alive) raf = requestAnimationFrame(frame);
  else {
    s.canvas.remove();
    lastNow = 0;
  }
}
function wake() {
  if (!stage) stage = makeStage();
  if (!stage.ok) return false;
  if (!stage.canvas.isConnected) document.body.appendChild(stage.canvas);
  if (!raf) raf = requestAnimationFrame(frame);
  return true;
}
function setPalette(it) {
  const p = it.o.color ? [it.o.color] : Array.isArray(it.o.palette) ? it.o.palette : PALETTES[it.o.palette] || PALETTES.electric;
  it.pal = new Float32Array(24);
  p.slice(0, 8).forEach((h, i) => it.pal.set(hexToOklab(h), i * 3));
  it.palN = Math.min(p.length, 8);
}
function electricBorder(el, options = {}) {
  const it = { el, o: { ...BORDER, ...options }, level: 0, on: false, time: Math.random() * 20, w: 0, h: 0, dirty: true, dead: false };
  if (it.o.zIndex != null && stage?.canvas) stage.canvas.style.zIndex = String(it.o.zIndex);
  setPalette(it);
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    it.dirty = true;
  }) : null;
  ro?.observe(el);
  const triggers = String(it.o.trigger);
  const listeners = [];
  const on = (type, fn) => {
    el.addEventListener(type, fn);
    listeners.push([type, fn]);
  };
  let hover = false, focus = false;
  const sync = () => {
    it.on = triggers.includes("always") || triggers.includes("hover") && hover || triggers.includes("focus") && focus;
    if (it.on) wake();
  };
  if (triggers.includes("hover")) {
    on("pointerenter", () => {
      hover = true;
      sync();
    });
    on("pointerleave", () => {
      hover = false;
      sync();
    });
  }
  if (triggers.includes("focus")) {
    on("focusin", () => {
      focus = true;
      sync();
    });
    on("focusout", () => {
      focus = el.matches(":focus-within");
      sync();
    });
  }
  items.add(it);
  sync();
  const ctl = {
    get active() {
      return it.on;
    },
    start() {
      it.on = true;
      wake();
      return ctl;
    },
    stop() {
      it.on = false;
      return ctl;
    },
    set(options2) {
      Object.assign(it.o, options2);
      if ("color" in options2 || "palette" in options2) setPalette(it);
      wake();
      return ctl;
    },
    destroy() {
      it.on = false;
      it.dead = true;
      ro?.disconnect();
      for (const [t, f] of listeners) el.removeEventListener(t, f);
      if (it.level <= 1e-3) items.delete(it);
    }
  };
  return ctl;
}

// src/effects/electric.js
var PRESET = { palette: "electric", band: 0.6, rimStrength: 0.45, hairWidth: 0 };
var ELECTRIC = {
  jag: 8,
  // how jagged the front is
  scale: 46,
  // one noise cell along the front (smaller = more jagged)
  crackle: 1.8,
  // speed of the crackle
  chaos: 6,
  // how far the bolts stray from the front
  boltWidth: 1.5,
  // bright core of a bolt
  boltGlow: 14,
  // glow around it
  bolts: 1.2,
  // strength of the bolts on the front (0 = none)
  rimBolts: 1.3
  // strength of the arcs on the outline (0 = none)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var electric = Object.freeze({
  name: "electric",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? ELECTRIC[key];
    c.jag = v("jag") * k * i;
    c.chaos = v("chaos") * k * i;
    c.scale = Math.max(v("scale") * k, 10);
    c.crackle = v("crackle");
    c.boltWidth = Math.max(v("boltWidth") * clamp(k, 0.6, 1.3), 0.6);
    c.boltGlow = Math.max(v("boltGlow") * k, 3);
    c.bolts = v("bolts");
    c.rimBolts = v("rimBolts");
  },
  shader: Object.freeze({ key: "electric", chunk: ELECTRIC_WAVE }),
  uniforms: (c) => ({
    uEJag: c.jag,
    uEScale: c.scale,
    uECrackle: c.crackle,
    uEBoltW: c.boltWidth,
    uEBoltGlow: c.boltGlow,
    uEChaos: c.chaos,
    uEBolt: c.bolts,
    uERim: c.rimBolts,
    uERimNorm: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
