// electric.js — pure, DOM-free: the electric effect's config, timeline and the geometry of a rounded box's outline
// Part of distortion-wave · MIT © Lucas Bonomi

import { clamp, cubicBezier, fract, parseEasing } from './core.js';

// ═══ Outline of a rounded box ════════════════════════════════════════════════
// Arc length along the outline, clockwise in y-down space, from the left end of the top edge.
// Radii: { tl, tr, br, bl }. The shader (shaders.js · perim) uses the same parametrisation.
const Q = Math.PI / 2;
function segments(w, h, r) {
  const top = w - r.tl - r.tr, right = h - r.tr - r.br, bottom = w - r.br - r.bl, left = h - r.bl - r.tl;
  const s = [0, top];
  s.push(s[1] + Q * r.tr, s[1] + Q * r.tr + right);
  s.push(s[3] + Q * r.br, s[3] + Q * r.br + bottom);
  s.push(s[5] + Q * r.bl, s[5] + Q * r.bl + left);
  s.push(s[7] + Q * r.tl);
  return { s, top, right, bottom, left };
}
export function perimeterLength(w, h, r) { return segments(w, h, r).s[8]; }

/** Point and outward normal at arc length `t` (wrapped), in box space (top-left origin). */
export function pointAt(t, w, h, r) {
  const { s } = segments(w, h, r), P = s[8];
  t = ((t % P) + P) % P;
  const arc = (cx, cy, rad, a0, d) => { const a = a0 + d / Math.max(rad, 1e-6); return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) }; };
  if (t < s[1]) return { x: r.tl + t, y: 0, nx: 0, ny: -1 };
  if (t < s[2]) return arc(w - r.tr, r.tr, r.tr, -Q, t - s[1]);
  if (t < s[3]) return { x: w, y: r.tr + (t - s[2]), nx: 1, ny: 0 };
  if (t < s[4]) return arc(w - r.br, h - r.br, r.br, 0, t - s[3]);
  if (t < s[5]) return { x: w - r.br - (t - s[4]), y: h, nx: 0, ny: 1 };
  if (t < s[6]) return arc(r.bl, h - r.bl, r.bl, Q, t - s[5]);
  if (t < s[7]) return { x: 0, y: h - r.bl - (t - s[6]), nx: -1, ny: 0 };
  return arc(r.tl, r.tl, r.tl, Math.PI, t - s[7]);
}

/** Arc length of the outline point closest to (x, y), box space. */
export function paramAt(x, y, w, h, r) {
  const { s, top, right, bottom, left } = segments(w, h, r);
  const ang = (cx, cy) => Math.atan2(y - cy, x - cx);
  if (x > w - r.tr && y < r.tr) return s[1] + (clamp(ang(w - r.tr, r.tr), -Q, 0) + Q) * r.tr;
  if (x > w - r.br && y > h - r.br) return s[3] + clamp(ang(w - r.br, h - r.br), 0, Q) * r.br;
  if (x < r.bl && y > h - r.bl) return s[5] + (clamp(ang(r.bl, h - r.bl), Q, 2 * Q) - Q) * r.bl;
  if (x < r.tl && y < r.tl) { let a = ang(r.tl, r.tl); if (a > 0) a -= 4 * Q; return s[7] + (clamp(a, -2 * Q, -Q) + 2 * Q) * r.tl; }
  const dx = w / 2 - Math.abs(x - w / 2), dy = h / 2 - Math.abs(y - h / 2);
  if (dy < dx) return y < h / 2 ? clamp(x - r.tl, 0, top) : s[4] + clamp(w - r.br - x, 0, bottom);
  return x > w / 2 ? s[2] + clamp(y - r.tr, 0, right) : s[6] + clamp(h - r.bl - y, 0, left);
}

// ═══ Config ══════════════════════════════════════════════════════════════════
// Reference values for a ~360×740 px element, like the wave's BASE.
export const ELECTRIC = {
  charge: 0.55,      // s: two arcs leave the source and run round the outline until they meet
  surge: 0.38,       // s: the content crackles from the old state to the new one
  discharge: 1.1,    // s: the charged outline fades out
  thickness: 1.6,    // px: core of the arc
  glow: 14,          // px: glow around it
  chaos: 5,          // px: how far the arc strays from the outline
  scale: 34,         // px: size of one noise cell along the outline (smaller = more jagged)
  crackle: 1.6,      // noise speed
  offset: 0,         // px: arc distance from the outline, + outside
  glitch: 14,        // px: largest sideways jump of a row of content during the surge
  rows: 16,          // px: height of a glitch row
  head: 26,          // px: length of the bright head of each arc
  particles: 48, particleSize: 1.6, particleLife: 0.7,
  palette: 'electric',
};
const PX = ['glow', 'chaos', 'scale', 'glitch', 'rows', 'head'];
const T = ['charge', 'surge', 'discharge', 'particleLife'];
export const electricDuration = (c) => c.charge + c.surge + c.discharge;

export function resolveElectric(o, w, h) {
  const c = { ...ELECTRIC };
  for (const k of Object.keys(o)) if (k in ELECTRIC && k !== 'particles' && o[k] != null) c[k] = o[k];
  if (o.particles === false) c.particles = 0; else if (typeof o.particles === 'number') c.particles = o.particles;
  if (o.intensity != null) { const i = Math.max(0, o.intensity); c.glitch *= i; c.chaos *= i; }
  if (typeof o.color === 'string') c.palette = [o.color];
  const k = clamp(Math.sqrt(w * h) / 516, 0.12, 1.8), kl = clamp(k, 0.35, 1.4);
  const ts = clamp(0.5 + 0.5 * Math.sqrt(k), 0.65, 1.15) / (o.speed || 1);
  c.k = k;
  for (const key of PX) c[key] *= kl;
  for (const key of T) c[key] *= ts;
  c.glitch = Math.min(c.glitch, w * 0.08);
  c.rows = Math.max(c.rows, 5);
  c.particles = Math.round(c.particles * clamp(k, 0.4, 1.4));
  if (o.duration != null) { const f = Math.max(o.duration / 1000, 0.05) / electricDuration(c); for (const key of T) c[key] *= f; }
  c.ease = parseEasing(o.easing) || easeArc;
  c.gate = c.charge;
  return c;
}
const easeArc = cubicBezier(0.25, 0.55, 0.45, 1);
const easeOut = (x) => 1 - (1 - x) ** 3;

// ═══ Timeline ════════════════════════════════════════════════════════════════
// g: { shape: {x, y, w, h} canvas space, radii, src: {x, y, w, h}, touch: {x, y} | null }
export function electricState(t, c, g) {
  const sh = g.shape, P = perimeterLength(sh.w, sh.h, g.radii);
  const o = g.touch || { x: g.src.x + g.src.w / 2, y: g.src.y + g.src.h / 2 };
  const s0 = paramAt(o.x - sh.x, o.y - sh.y, sh.w, sh.h, g.radii);
  const T1 = c.charge, T2 = T1 + c.surge, T3 = T2 + c.discharge;
  const arc = c.ease(clamp(t / T1)) * (P / 2 + c.head);
  const surge = clamp((t - T1) / Math.max(c.surge, 1e-3));
  const live = t < T2 ? 1 : 1 - easeOut(clamp((t - T2) / Math.max(c.discharge, 1e-3)));
  const headOn = t < T1 ? 1 : clamp(1 - (t - T1) / 0.12);
  const flash = surge > 0 && surge < 1 ? Math.sin(Math.PI * surge) ** 2 * (0.55 + 0.45 * Math.sin(t * 71)) : 0;
  return {
    t, P, s0, arc, surge, live, headOn, flash, time: t,
    launched: t > 0, covered: t >= T2, settled: t >= T2 + 0.04, done: t >= T3,
  };
}

// Sparks: shed by the two heads while they run, then all along the outline during the surge.
const rnd = (i, k) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
export function makeSparks(n) {
  return Array.from({ length: n }, (_, i) => ({ i, surge: i % 3 === 2, side: i % 2 ? 1 : -1, a: rnd(i, 1), b: rnd(i, 2), c: rnd(i, 3), d: rnd(i, 4) }));
}
export function sparkAt(p, s, c, g) {
  const T1 = c.charge;
  const born = p.surge ? T1 + p.a * c.surge : p.a * T1 * 0.95;
  const age = s.t - born, life = c.particleLife * (0.6 + 0.6 * p.b);
  if (age < 0 || age > life) return null;
  let at;
  if (p.surge) at = p.c * s.P;
  else at = s.s0 + p.side * c.ease(clamp(born / T1)) * (s.P / 2 + c.head);
  const sh = g.shape, q = pointAt(at, sh.w, sh.h, g.radii);
  const v = (40 + 160 * p.c) * c.k ** 0.5, tang = (p.d - 0.5) * 120 * c.k ** 0.5;
  const x = sh.x + q.x + q.nx * v * age - q.ny * tang * age;
  const y = sh.y + q.y + q.ny * v * age + q.nx * tang * age + 160 * age * age;
  const k = age / life;
  return { x, y, a: (1 - k) ** 1.6 * (0.55 + 0.45 * p.d), size: c.particleSize * (0.7 + 0.9 * p.b) };
}
