// renderer.js — WebGL2 renderer: one full-screen composite pass + points, blur pyramid, context pool
// Part of distortion-wave · MIT © Lucas Bonomi

import { PALETTES, hexToOklab } from './core.js';

// ═══ Shaders (GLSL ES 3.00) ══════════════════════════════════════════════════
const VS_FULL = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const FS_COPY = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uLod; out vec4 o;
void main() { o = textureLod(uTex, vUv, uLod); }`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uStep; uniform float uSigma; out vec4 o;
void main() {
  float R = min(ceil(uSigma * 3.0), 32.0); vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -32; i <= 32; i++) { float fi = float(i); if (abs(fi) > R) continue;
    float w = exp(-0.5 * fi * fi / (uSigma * uSigma)); acc += textureLod(uTex, vUv + uStep * fi, 0.0) * w; ws += w; }
  o = acc / ws;
}`;
// All colours are PREMULTIPLIED (the canvas is transparent over the page).
const FS_MAIN = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uSize, uRes;
uniform sampler2D uOld0, uOld1, uOld2, uNew0, uNew1, uNew2;
uniform vec4 uOldRect, uNewRect, uShape, uRadii;   // rects in canvas CSS px; radii (br, tr, bl, tl)
uniform int uMode;                                 // 0 before · 1 live · 2 after · 3 crossfade · 4 effects only (live DOM below)
uniform bool uClip;                                 // an ancestor clips the element: mask everything by the shape
uniform float uFade, uBoxless;                      // uBoxless: the element paints no box → light up its content only
uniform bool uLaunched, uRing;
uniform vec2 uOrigin;
uniform float uTilt, uSpine, uRadius, uSquash, uTime, uSwell, uEnergy, uPull, uGlow, uRim, uClear, uHairClear, uHold, uK, uSeam;
uniform float uAmp, uLensW, uAberr, uBlurMax, uBlurNear, uBlurAhead, uBlurBehind;
uniform float uLead, uTail, uBand, uRimW, uRimSoft, uUneven, uHairW;
uniform vec3 uPal[8]; uniform int uPalN;
out vec4 outColor;
const float TAU = 6.28318530718;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float vnoise(float x) { float i = floor(x), f = fract(x); return mix(h11(i), h11(i + 1.0), f * f * (3.0 - 2.0 * f)) * 2.0 - 1.0; }
float sdRoundBox(vec2 p, vec2 b, vec4 r) {         // y-down space: r = (bottom-right, top-right, bottom-left, top-left)
  r.xy = (p.x > 0.0) ? r.xy : r.zw; r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
struct Front { float d; vec2 n; vec2 q; float g; };
Front front(vec2 p) {
  vec2 q = rot(-uTilt) * (p - uOrigin); float mx = q.x * uSquash;
  vec2 v = vec2(max(abs(mx) - uSpine, 0.0), q.y); float len = max(length(v), 1e-3);
  vec2 grad = vec2(v.x * sign(q.x) * uSquash, v.y) / len; float g = max(length(grad), 1e-3);
  float wob;
  if (uRing) { float a = atan(q.y, q.x); wob = 0.5 * sin(3.0 * a + uTime * 1.3) + 0.3 * sin(5.0 * a - uTime * 0.9 + 2.1) + 0.2 * sin(2.0 * a + uTime * 2.0); }
  else { float s = mx * 0.005 / uK; wob = 0.7 * vnoise(s + uTime * 0.8) + 0.3 * vnoise(s * 2.3 - uTime * 1.1 + 5.0); }
  Front f; f.d = (len - uRadius) / g + uSwell * wob; f.n = rot(uTilt) * (grad / g); f.q = q; f.g = g; return f;
}
// The silhouette is decided by p (undisplaced); the sample by sp (displaced, clamped to the rect).
// → content bends INSIDE the element, never revealing transparency or bleeding outside.
vec4 tap(sampler2D s, vec4 rect, vec2 p, vec2 sp) {
  vec2 q = (p - rect.xy) / rect.zw;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return vec4(0.0);
  return textureLod(s, clamp((sp - rect.xy) / rect.zw, 0.0, 1.0), 0.0);
}
vec4 fetch3(sampler2D s0, sampler2D s1, sampler2D s2, vec4 rect, vec2 p, vec2 sp, float tn, float tf) {
  vec4 c = tap(s0, rect, p, sp);
  if (tn > 0.0) c = mix(c, tap(s1, rect, p, sp), tn);
  if (tf > 0.0) c = mix(c, tap(s2, rect, p, sp), tf);
  return c;
}
vec4 layerOld(vec2 p, vec2 sp, vec2 sl, float tn, float tf) {
  if (dot(sl, sl) < 0.01) return fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp, tn, tf);
  vec4 r = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp + sl, tn, tf), g = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp, tn, tf), b = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp - sl, tn, tf);
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
vec4 layerNew(vec2 p, vec2 sp, vec2 sl, float tn, float tf) {
  if (dot(sl, sl) < 0.01) return fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp, tn, tf);
  vec4 r = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp + sl, tn, tf), g = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp, tn, tf), b = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp - sl, tn, tf);
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
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
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uSize.x / uRes.x);
  float dn = (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  // element shape (per-corner radii, clipped by overflow ancestors): mask + rim
  vec2 c = p - (uShape.xy + uShape.zw * 0.5);
  float sd = sdRoundBox(c, uShape.zw * 0.5, uRadii);
  float mask = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float clipM = uClip ? mask : 1.0;
  if (uMode == 0 || uMode == 2 || uMode == 3) {
    vec4 a = tap(uOld0, uOldRect, p, p), b = tap(uNew0, uNewRect, p, p);
    vec4 v = (uMode == 0 ? a : uMode == 2 ? b : mix(a, b, uFade)) * clipM;
    outColor = vec4(v.rgb + dn * v.a, v.a); return;
  }
  Front f = front(p);
  vec2 r = p - uOrigin; float rl = max(length(r), 1.0);
  float held = uHold > 0.0 ? smoothstep(uHold * 0.9, uHold * 1.8, rl) : 1.0;
  vec4 col = vec4(0.0);
  if (uMode == 1) {
    float k = f.d / (uLensW * (f.d > 0.0 ? 0.8 : 1.6));
    vec2 bulge = f.n * (uEnergy * uAmp * exp(-k * k) * held);
    vec2 suck = (r / rl) * (uPull * (rl / (rl + 60.0 * uK)) * exp(-rl / (700.0 * uK)) * held);
    vec2 sp = p - bulge + suck;
    vec2 sl = (bulge * 0.5 - suck * exp(-rl / (240.0 * uK))) * uAberr;
    float kb = f.d / (f.d > 0.0 ? uBlurAhead : uBlurBehind);
    float bpx = uEnergy * uBlurMax * exp(-kb * kb) * held;
    float tn = smoothstep(0.0, uBlurNear, bpx);
    float tf = uBlurMax > uBlurNear ? smoothstep(uBlurNear, uBlurMax, bpx) : 0.0;
    float cover = uLaunched ? smoothstep(-uSeam, uSeam, f.d) : 1.0;
    if (cover >= 0.999) col = layerOld(p, sp, sl, tn, tf);
    else if (cover <= 0.001) col = layerNew(p, sp, sl, tn, tf);
    else col = mix(layerNew(p, sp, sl, tn, tf), layerOld(p, sp, sl, tn, tf), cover);
    // the UNdisplaced alpha fixes the silhouette (rounded corners, transparent areas): no fill-in, no fringe outside
    float aU = mix(tap(uNew0, uNewRect, p, p).a, tap(uOld0, uOldRect, p, p).a, cover);
    col *= min(1.0, aU / max(col.a, 1e-4)) * clipM;
  }
  if (uBoxless > 0.5) {
    // no background, border or shadow: the band lights the content and a soft halo around it, never the bounding box
    float sharp = max(tap(uNew0, uNewRect, p, p).a, tap(uOld0, uOldRect, p, p).a);
    float halo = max(tap(uNew2, uNewRect, p, p).a, tap(uOld2, uOldRect, p, p).a);
    mask *= max(sharp, smoothstep(0.02, 0.5, halo) * 0.8);
  }
  float inset = max(-sd, 0.0);
  float along = f.q.x * 0.0065 / uK, ang = atan(f.q.y, f.q.x);
  float lobes = uRing ? 0.5 + 0.5 * sin(2.0 * ang + uTime * 1.4) * cos(ang - uTime * 0.6 + 0.8)
                      : 0.5 + 0.5 * sin(along * 1.4 + uTime * 1.3) * cos(along * 0.7 - uTime * 0.6 + 0.8);
  float bandA = 0.0;
  if (uGlow > 0.0 && f.d < uLead) {
    if (f.d >= 0.0) { float x = f.d / uLead; bandA = exp(-4.5 * x * x); }
    else { float x = clamp(-f.d / (uTail * mix(0.55, 1.35, lobes)), 0.0, 1.0); bandA = pow(1.0 - x, 2.4); }
    bandA *= uGlow * uBand * held;
  }
  float around = atan(c.y / uShape.w, c.x / uShape.z);
  float rimA = 0.0, hairA = 0.0, shimmer = 0.5;
  if (uRim > 0.0 && uBoxless < 0.5 && inset < uRimW * 4.5) {
    float lumps = 0.5 * sin(around * 3.0 + uTime * 0.7) + 0.3 * sin(around * 5.0 - uTime * 1.2 + 2.0) + 0.2 * sin(around * 9.0 + uTime * 2.3 + 4.0);
    float thick = max(1.0 + uUneven * 0.55 * lumps, 0.15);
    float hk = inset / (uRimW * thick);
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, f.d);
    float kept = smoothstep(-uRimSoft, uRimSoft, f.d + (uRadius - uClear) / f.g);
    shimmer = 0.5 + 0.5 * sin(uTime * 3.2 - around * 4.0);
    rimA = exp(-hk * hk) * reached * kept * uRim * (0.72 + 0.28 * shimmer);
    float line = 1.0 - smoothstep(uHairW * 0.5, uHairW * 0.5 + 0.8, inset);
    float hairKept = smoothstep(-uRimSoft, uRimSoft, f.d + (uRadius - uHairClear) / f.g);
    hairA = line * reached * hairKept * uRim * 0.85 * mix(0.55, 1.0, smoothstep(0.2, 1.4, thick));
  }
  float a = (1.0 - (1.0 - bandA) * (1.0 - rimA)) * mask;
  hairA *= mask;
  if (a + hairA < 0.0005) { outColor = vec4(col.rgb + dn * col.a, col.a); return; }
  float flow = 0.6 + (uRing ? ang / TAU : along * 0.22) + uTime * 0.12 + f.d * 0.0016 / uK;
  vec3 lab = paletteAt(flow);
  lab.x += 0.10 * exp(-pow((f.d - 28.0 * uK) / (48.0 * uK), 2.0)) - 0.12 * exp(-pow((f.d + 90.0 * uK) / (70.0 * uK), 2.0));
  lab.yz *= 1.2;
  lab = mix(lab, vec3(0.985, 0.0, 0.0), 0.65 * exp(-pow((f.d + 6.0 * uK) / max(24.0 * uK, 3.0), 2.0)));
  vec3 rimLab = paletteAt(around / TAU + uTime * 0.25 + inset * 0.0012 / uK); rimLab.yz *= 1.1;
  lab = mix(lab, rimLab, rimA / (rimA + bandA + 1e-4));
  float ea = clamp(a, 0.0, 1.0);
  vec4 o = vec4(oklabToSrgb(lab) * ea, ea) + col * (1.0 - ea);
  float ha = clamp(hairA, 0.0, 1.0);
  o = vec4(mix(oklabToSrgb(rimLab), vec3(1.0), 0.6 + 0.35 * shimmer) * ha, ha) + o * (1.0 - ha);
  outColor = vec4(o.rgb + dn * 2.0 * o.a, o.a);
}`;
const VS_DOTS = `#version 300 es
layout(location = 0) in vec4 aDot; uniform vec2 uSize; uniform float uDpr; out float vA; out float vR; out float vPt;
void main() { gl_Position = vec4(aDot.x / uSize.x * 2.0 - 1.0, 1.0 - aDot.y / uSize.y * 2.0, 0.0, 1.0);
  vPt = ceil((aDot.z + 1.0) * uDpr) + 2.0; gl_PointSize = vPt; vR = aDot.z * 0.5 * uDpr; vA = aDot.w; }`;
const FS_DOTS = `#version 300 es
precision highp float; in float vA; in float vR; in float vPt; out vec4 o;
void main() { float r = length(gl_PointCoord - 0.5) * vPt; float cov = clamp(vR - r + 0.5, 0.0, 1.0); o = vec4(vec3(cov * vA), cov * vA); }`;

// ═══ WebGL2 renderer (one canvas per active transition, pooled) ══════════════
function program(gl, vs, fs) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'compile'); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const locs = new Map();
  return { p, u: (n) => { if (!locs.has(n)) locs.set(n, gl.getUniformLocation(p, n)); return locs.get(n); } };
}
class Renderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('data-dw-ignore', '');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;contain:strict;';
    this.layers = {}; this.pal = new Float32Array(24); this.palKey = ''; this.ok = false;
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; });
    const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) return;
    this.gl = gl;
    this.main = program(gl, VS_FULL, FS_MAIN); this.blur = program(gl, VS_FULL, FS_BLUR);
    this.copy = program(gl, VS_FULL, FS_COPY); this.dots = program(gl, VS_DOTS, FS_DOTS);
    this.vao = gl.createVertexArray();
    this.dvao = gl.createVertexArray(); this.dbuf = gl.createBuffer(); this.dcap = 0;
    gl.bindVertexArray(this.dvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.dbuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.ok = true;
  }
  tex(w, h, src, mips = false) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);              // correct blur on transparent edges
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  }
  target(w, h) {
    const gl = this.gl, tex = this.tex(w, h, null), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }
  pass(prog, fb, w, h) { const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(prog.p); gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  blurred(sharp, w, h, sigma) {
    const gl = this.gl, scale = Math.max(1, Math.round(sigma / 4));
    const bw = Math.max(1, Math.round(w / scale)), bh = Math.max(1, Math.round(h / scale));
    const A = this.target(bw, bh), B = this.target(bw, bh);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sharp);
    gl.useProgram(this.copy.p); gl.uniform1i(this.copy.u('uTex'), 0); gl.uniform1f(this.copy.u('uLod'), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p); gl.uniform1i(this.blur.u('uTex'), 0); gl.uniform1f(this.blur.u('uSigma'), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform2f(this.blur.u('uStep'), 1 / bw, 0); this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex); gl.uniform2f(this.blur.u('uStep'), 0, 1 / bh); this.pass(this.blur, A.fb, bw, bh);
    gl.deleteFramebuffer(B.fb); gl.deleteTexture(B.tex); gl.deleteFramebuffer(A.fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return A.tex;
  }
  /** Builds sharp + 2 blur levels (once per capture, never per frame). */
  setLayer(name, src, sigmaNear, sigmaFar) {
    if (!this.ok) return;
    this.dropLayer(name);
    const sharp = this.tex(src.width, src.height, src, true);
    this.layers[name] = { sharp, near: this.blurred(sharp, src.width, src.height, sigmaNear), far: this.blurred(sharp, src.width, src.height, sigmaFar) };
  }
  dropLayer(name) { const L = this.layers[name]; if (!L || !this.gl) return; for (const t of [L.sharp, L.near, L.far]) this.gl.deleteTexture(t); delete this.layers[name]; }
  clear() { for (const n of Object.keys(this.layers)) this.dropLayer(n); }
  render(f) {
    if (!this.ok) return;
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height, m = this.main, u = m.u;
    const old = this.layers.old || this.layers.new, nxt = this.layers.new || this.layers.old;
    if (!old) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.useProgram(m.p);
    [['uOld0', old.sharp], ['uOld1', old.near], ['uOld2', old.far], ['uNew0', nxt.sharp], ['uNew1', nxt.near], ['uNew2', nxt.far]]
      .forEach(([n, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u(n), i); });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u('uSize'), f.w, f.h); gl.uniform2f(u('uRes'), W, H);
    v4('uOldRect', R.old); v4('uNewRect', R.new || R.old); v4('uShape', R.shape);
    gl.uniform4f(u('uRadii'), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u('uMode'), f.mode); gl.uniform1f(u('uFade'), f.fade || 0); gl.uniform1f(u('uBoxless'), R.boxless ? 1 : 0); gl.uniform1i(u('uClip'), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u('uLaunched'), s.launched ? 1 : 0); gl.uniform1i(u('uRing'), s.ring ? 1 : 0);
      gl.uniform2f(u('uOrigin'), s.ox, s.oy);
      const fl = { uTilt: s.tilt, uSpine: s.spine, uRadius: s.radius, uSquash: s.squash, uTime: s.time, uSwell: s.swell, uEnergy: s.energy,
        uPull: s.pull, uGlow: s.glow, uRim: s.rim, uClear: s.clear, uHairClear: s.hairClear, uHold: s.hold, uK: c.k, uSeam: c.seam,
        uAmp: c.amplitude, uLensW: c.lensWidth, uAberr: c.aberration, uBlurMax: c.blur, uBlurNear: c.blurNear, uBlurAhead: c.blurAhead,
        uBlurBehind: c.blurBehind, uLead: c.lead, uTail: c.tail, uBand: c.band, uRimW: c.rimWidth, uRimSoft: c.rimSoftness,
        uUneven: c.uneven, uHairW: c.hairWidth };
      for (const k in fl) gl.uniform1f(u(k), fl[k]);
      const cols = Array.isArray(c.palette) ? c.palette : PALETTES[c.palette] || PALETTES.aurora;
      const key = cols.join();
      if (this.palKey !== key) { this.palKey = key; cols.slice(0, 8).forEach((h, i) => this.pal.set(hexToOklab(h), i * 3)); }
      gl.uniform3fv(u('uPal[0]'), this.pal); gl.uniform1i(u('uPalN'), Math.min(cols.length, 8));
    }
    gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (f.dotCount > 0) {
      const d = this.dots;
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(d.p); gl.uniform2f(d.u('uSize'), f.w, f.h); gl.uniform1f(d.u('uDpr'), f.dpr);
      gl.bindVertexArray(this.dvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.dbuf);
      if (this.dcap < f.dots.length) { gl.bufferData(gl.ARRAY_BUFFER, f.dots.byteLength, gl.DYNAMIC_DRAW); this.dcap = f.dots.length; }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, f.dots, 0, f.dotCount * 4);
      gl.drawArrays(gl.POINTS, 0, f.dotCount); gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
}
// Pool: creating a WebGL context + compiling shaders costs tens of ms → reuse them.
const pool = []; let alive = 0; const MAX_CONTEXTS = 4;
export function acquire() {
  while (pool.length) { const r = pool.pop(); if (r.ok) return r; alive--; }
  if (alive >= MAX_CONTEXTS) return null;
  try { const r = new Renderer(); if (!r.ok) return null; alive++; return r; } catch (e) { console.warn('[distortion-wave]', e); return null; }
}
export function release(r) { r.clear(); r.canvas.remove(); if (r.ok) pool.push(r); else alive--; }
/** Call at load/idle time: compiles the shaders before the first interaction. */
export function warmupWave() { const r = acquire(); if (r) release(r); return !!r; }

