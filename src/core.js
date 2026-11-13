// core.js — pure, DOM-free: config, scaling, timeline, particles (unit-tested in Node)
// Part of distortion-wave · MIT © Lucas Bonomi

// ═══ Math ════════════════════════════════════════════════════════════════════
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
export const lerp = (a, b, t) => a + (b - a) * t;
export const fract = (x) => x - Math.floor(x);
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / ((e1 - e0) || 1e-6)); return t * t * (3 - 2 * t); };
export function cubicBezier(x1, y1, x2, y2) {
  const b = (t, p1, p2) => { const u = 1 - t; return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t; };
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (b(m, x1, x2) < x) lo = m; else hi = m; }
    return b((lo + hi) / 2, y1, y2);
  };
}
const easeLaunch = cubicBezier(0.2, 1, 0.3, 1);
const easeClear = cubicBezier(0.45, 0, 0.55, 1);
export function hexToOklab(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}

// ═══ Config ══════════════════════════════════════════════════════════════════
// Does the element paint a box of its own (background, border, shadow)? If not, the wave must light up its
// content only: a rim or a band drawn on the bounding rectangle would show a rectangle nobody ever saw.
export function colorAlpha(c) {
  if (!c || c === 'transparent') return 0;
  const m = String(c).match(/\(([^)]*)\)/);
  if (!m) return 1;
  const parts = m[1].includes('/') ? [m[1].split('/')[1]] : m[1].split(',').length === 4 ? [m[1].split(',')[3]] : null;
  if (!parts) return 1;
  const v = parts[0].trim();
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
}
export function hasVisibleBox(cs) {
  if (colorAlpha(cs.backgroundColor) > 0.02) return true;
  if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
  if (cs.boxShadow && cs.boxShadow !== 'none') return true;
  return ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && cs[`border${s}Style`] !== 'hidden' && colorAlpha(cs[`border${s}Color`]) > 0.02);
}

export const PALETTES = {
  aurora: ['#FF4FD8', '#A35BFF', '#5B7CFF', '#38D9FF', '#FFD36B', '#FF7A5C'],
  ocean: ['#3A7BFF', '#2EE6D6', '#7C5CFF', '#1FB6FF', '#B8F2FF'],
  mint: ['#2BD67B', '#B6FF5C', '#1FC8A9', '#E8FFB0', '#3CE0C0'],
  ember: ['#FF5A3C', '#FFB23C', '#FF3C8E', '#FFE07A', '#FF7F50'],
};
// Reference values for a ~360×740 px screen (k = 1). scaleConfig() adapts them to the target.
export const BASE = {
  type: 'vertical', speed: 1,
  anticipation: 0.45, travel: 2.2, linger: -0.3, rimFade: 2.8, hairDelay: 0.45, hairFade: 2.8,
  pull: 22, inhale: 50, gatherGlow: 0.35, gatherDots: 1,
  amplitude: 32, lensWidth: 140, aberration: 0.75, swell: 20,
  blur: 18, blurNear: 6, blurAhead: 90, blurBehind: 230,
  lead: 120, tail: 280, band: 0.9,
  rimWidth: 14, rimSoftness: 320, rimStrength: 0.85, uneven: 1, hairWidth: 1.5,
  lean: 0.9, margin: 60, seam: 48,
  particles: 64, particleSize: 1.8, particleLife: 2.1, reach: 140, spread: 1,
  palette: 'aurora',
};
export const PRESETS = {
  vertical: BASE,
  horizontal: { ...BASE, type: 'horizontal' },
  center: { ...BASE, type: 'center', anticipation: 0.25, travel: 3.2, linger: -0.2, rimFade: 2.4, hairDelay: 0.9,
    pull: 14, inhale: 32, gatherGlow: 0.2, gatherDots: 0, amplitude: 20, lensWidth: 90, aberration: 0.35, swell: 13,
    blur: 11, blurAhead: 54, blurBehind: 140, lead: 80, tail: 180, band: 0.75, rimStrength: 0.7, rimSoftness: 200,
    particles: 90, particleLife: 3.0, reach: 90, spread: 0.65 },
};
const PX_KEYS = ['pull', 'inhale', 'amplitude', 'lensWidth', 'swell', 'blur', 'blurNear', 'blurAhead', 'blurBehind',
  'lead', 'tail', 'rimWidth', 'rimSoftness', 'reach', 'margin', 'seam'];
const T_KEYS = ['anticipation', 'travel', 'linger', 'rimFade', 'hairDelay', 'hairFade', 'particleLife'];

/** Scales px & seconds to the target size: a button is not a screen. Pure. */
export function scaleConfig(c, w, h) {
  const k = clamp(Math.sqrt(w * h) / 516, 0.12, 1.8);                  // 516 ≈ √(360×740)
  const ts = clamp(0.45 + 0.55 * Math.sqrt(k), 0.6, 1.15) / (c.speed || 1);
  const o = { ...c, k };
  for (const key of PX_KEYS) o[key] = c[key] * k;
  for (const key of T_KEYS) o[key] = c[key] * ts;
  o.blurNear = Math.max(o.blurNear, 1.2); o.blur = Math.max(o.blur, o.blurNear);
  o.rimWidth = Math.max(o.rimWidth, 2.5); o.seam = Math.max(o.seam, 4);
  o.anticipation = Math.max(o.anticipation, 0.2 / (c.speed || 1));
  // the pull toward the source before the launch is capped by the smallest side: on a 26 px row of 11 px text,
  // a 4 px pull squashes and tears the glyphs
  o.pull = Math.min(o.pull, Math.min(w, h) * 0.065);
  o.particles = Math.round(c.particles * clamp(k, 0.3, 1.5));
  o.particleSize = c.particleSize * clamp(0.6 + 0.4 * k, 0.7, 1.3);
  return o;
}
export const totalDuration = (c) => c.anticipation + Math.max(c.travel * 0.6, c.linger + c.rimFade, c.linger + c.hairDelay + c.hairFade, c.particleLife);

/** Stretches every time key so the whole transition lasts `seconds`. Mutates and returns `c`. Pure otherwise. */
export function retime(c, seconds) {
  const f = seconds / totalDuration(c);
  for (const key of T_KEYS) c[key] *= f;
  return c;
}
const EASINGS = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
/** CSS-like easing for the wave front: a keyword, 'cubic-bezier(a, b, c, d)', [a, b, c, d] or a function. null if invalid. */
export function parseEasing(e) {
  if (typeof e === 'function') return e;
  let v = Array.isArray(e) ? e : EASINGS[e];
  if (!v && typeof e === 'string') { const m = e.match(/cubic-bezier\(([^)]+)\)/); if (m) v = m[1].split(',').map(Number); }
  return v && v.length === 4 && v.every(Number.isFinite) ? cubicBezier(...v) : null;
}
const INTENSITY_KEYS = ['amplitude', 'swell', 'pull', 'inhale', 'aberration'];
/** Options → final config for a target of w×h CSS px: tuning keys, intensity, size scaling, then duration and easing. */
export function resolveConfig(preset, o, w, h) {
  const base = { ...preset };
  for (const k of Object.keys(o)) if (k in BASE && k !== 'type' && k !== 'particles' && o[k] != null) base[k] = o[k];
  if (o.particles === false) base.particles = 0; else if (typeof o.particles === 'number') base.particles = o.particles;
  if (o.intensity != null) for (const k of INTENSITY_KEYS) base[k] *= Math.max(0, o.intensity);
  const c = scaleConfig(base, w, h);
  if (o.duration > 0) retime(c, o.duration / 1000);
  c.ease = parseEasing(o.easing);
  return c;
}

// ═══ Pure timeline: (t, config, geometry) → frame state ══════════════════════
function farthestCorner(ox, oy, tilt, squash, w, h) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  let best = 0;
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const dx = x - ox, dy = y - oy;
    best = Math.max(best, Math.hypot((c * dx + s * dy) * squash, -s * dx + c * dy));
  }
  return best;
}
/**
 * @param g { w, h, src:{x,y,w,h}, touch:{x,y}|null, hold:boolean } — CSS px, canvas space.
 *          The source may sit outside the target: the wave then enters from that edge.
 */
export function frameState(t, c, g) {
  const ring = c.type === 'center', horiz = c.type === 'horizontal';
  const T = totalDuration(c), time = clamp(t, 0, T);
  const fly = time - c.anticipation, pre = smooth(0, c.anticipation, time);
  const prog = clamp(fly / c.travel), e = (c.ease || easeLaunch)(prog);
  const s = g.src, cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const r0 = Math.max(Math.min(s.w, s.h) / 2, 1);
  const half = (horiz ? s.h : s.w) / 2, perp = (horiz ? s.w : s.h) / 2;
  const base = horiz ? Math.PI / 2 : 0, ax = Math.cos(base), ay = Math.sin(base);
  // "forward" = the side where most of the target lies (the wave travels inward)
  const dir = (g.w / 2 - cx) * Math.sin(base) + (g.h / 2 - cy) * -Math.cos(base) >= 0 ? 1 : -1;
  let lean = 0;
  if (!ring && g.touch) lean = clamp(((g.touch.x - cx) * ax + (g.touch.y - cy) * ay) / Math.max(half, 1), -1, 1) * c.lean;
  const settle = smooth(0, 0.45, e);
  const ox = cx + ax * lean * half * settle, oy = cy + ay * lean * half * settle;
  const tilt = base + dir * lean * 0.45 * settle;
  const squashMax = ring ? 1 : 1.4;
  const reach = farthestCorner(ox, oy, tilt, squashMax, g.w, g.h) + c.swell * squashMax + c.margin;
  const radius = fly < 0 ? r0 + c.inhale * (1 - pre) : r0 + (reach + c.margin * 1.6 - r0) * e;
  const fade = 1 - smooth(0.2, 0.55, prog);
  const lift = c.gatherGlow * 0.5;
  const energy = smooth(0, 0.05, prog) * fade;
  const covered = fly > 0 && radius - c.swell > reach;
  return {
    time, fly, pre, prog, moved: e, ring, dir, r0, half, perp, cx, cy,
    ox, oy, tilt, squash: lerp(1, squashMax, smooth(0, 0.5, e)),
    spine: ring ? 0 : Math.max(0, half - r0) * (1 - settle),
    lx: Math.cos(tilt), ly: Math.sin(tilt), fx: dir * Math.sin(tilt), fy: -dir * Math.cos(tilt),
    radius, swell: c.swell * smooth(0, 0.3, e), energy,
    pull: c.pull * pre * (1 - smooth(0, 0.22, fly)),
    glow: fly < 0 ? lift * pre : lerp(lift, 1, smooth(0, 0.07, prog)) * fade,
    clear: lerp(r0 - c.rimSoftness, reach + c.rimSoftness, easeClear((fly - c.linger) / c.rimFade)),
    hairClear: lerp(r0 - c.rimSoftness, reach + c.rimSoftness, easeClear((fly - c.linger - c.hairDelay) / c.hairFade)),
    rim: c.rimStrength * smooth(0, 0.1, prog) * (1 - smooth(0.9, 1, time / T)),
    hold: ring && g.hold ? r0 : 0,
    launched: fly > 0, covered,
    settled: covered && prog >= 0.55,                                   // no more lens or blur → the live DOM can take over
  };
}

// ═══ Deterministic particles ═════════════════════════════════════════════════
export function makeParticles(n, c) {
  return Array.from({ length: n }, (_, i) => {
    const h = (k) => fract((i + 1) * k);
    return {
      col: h(0.6180339887) * 2 - 1, gy: h(0.7071067812), head: h(0.1618033989) * TAU,
      pace: 0.4 + 0.65 * Math.sqrt(h(0.7548776662)), drift: 12 + 45 * h(0.5698402910),
      sway: 3 + 10 * h(0.4142135624), swayHz: 2 + 3 * h(0.7320508076), tw: 7 + 10 * h(0.2360679775),
      ph: h(0.3819660113) * TAU, hop: h(0.5497004779), life: c.particleLife * (0.45 + 0.55 * h(0.6457513111)),
      size: c.particleSize * (0.55 + 0.45 * h(0.8774) ** 2), bright: 0.35 + 0.65 * h(0.6055512755),
    };
  });
}
export function particleAt(P, s, c) {
  const tw = 0.75 + 0.25 * Math.sin(s.time * P.tw + P.ph), k = c.k;
  if (!s.launched) {
    if (!c.gatherDots) return null;
    const cyc = s.time / 0.32 + P.hop, f = fract(cyc);
    const a = smooth(0, 0.3, f) * (1 - smooth(0.6, 1, f)) * P.bright * tw
      * smooth(0, c.anticipation * 0.35, s.time) * (1 - smooth(c.anticipation * 0.75, c.anticipation, s.time));
    const fall = c.reach * (1 - f * f);
    if (s.ring) { const ang = P.head + Math.floor(cyc) * 2.399963; const rr = s.r0 + 12 * k + fall; return { x: s.cx + Math.cos(ang) * rr, y: s.cy + Math.sin(ang) * rr, a }; }
    const lat = P.col * (s.half + 16 * k) * (1 - 0.35 * (1 - f)), fwd = s.perp + 10 * k + fall * (0.45 + 0.55 * P.gy);
    return { x: s.cx + s.lx * lat + s.fx * fwd, y: s.cy + s.ly * lat + s.fy * fwd, a };
  }
  const fly = s.fly;
  const a = (1 - smooth(P.life * 0.55, P.life, fly)) * P.bright * tw * smooth(0, 0.08, fly);
  const sway = P.sway * Math.max(k, 0.3) * Math.sin(P.swayHz * fly + P.ph) * Math.min(fly / 0.25, 1);
  const travel = (s.radius - s.r0) * P.pace * c.spread;
  if (s.ring) {
    const rr = s.r0 + travel + P.drift * k * fly, co = Math.cos(P.head), si = Math.sin(P.head);
    return { x: s.ox + co * rr - si * sway, y: s.oy + si * rr + co * sway, a };
  }
  const lat = P.col * s.half * (1 + 0.25 * s.moved * P.pace) + sway;
  const fwd = (s.r0 + travel) * (1 - 0.3 * P.col * P.col) + P.drift * k * fly;
  return { x: s.ox + s.lx * lat + s.fx * fwd, y: s.oy + s.ly * lat + s.fy * fwd, a };
}

