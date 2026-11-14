// ambient.js — effects that stay on an element (no state change): the electric border.
// All borders of the page share ONE full-screen WebGL canvas, so a grid of cards costs one context.
// Part of distortion-wave · MIT © Lucas Bonomi

import { PALETTES, hexToOklab } from './core.js';
import { program, VS_FULL } from './gl.js';
import { FS_BORDER } from './shaders.js';

export const BORDER = {
  thickness: 1.6, glow: 14, chaos: 5, scale: 34, crackle: 1, offset: 0, intensity: 1,
  palette: 'electric', trigger: 'always', fadeIn: 220, fadeOut: 380,
};

const items = new Set();
let stage = null, raf = 0, lastNow = 0;

function makeStage() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-dw-ignore', ''); canvas.setAttribute('data-dw-ambient', ''); canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;contain:strict;';
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return { ok: false };
  let prog;
  try { prog = program(gl, VS_FULL, FS_BORDER); } catch (e) { console.warn('[distortion-wave]', e); return { ok: false }; }
  const s = { ok: true, canvas, gl, prog, vao: gl.createVertexArray(), pal: new Float32Array(24), lost: false };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); s.lost = true; });
  return s;
}

// The visible outline of the element: its rect, radii, and the cut of overflow-clipping ancestors.
function radiiOf(cs, w, h) {
  const one = (v, side) => { const t = String(v).trim().split(/\s+/)[0]; const n = parseFloat(t) || 0; return t.endsWith('%') ? n / 100 * side : n; };
  const r = { tl: one(cs.borderTopLeftRadius, w), tr: one(cs.borderTopRightRadius, w), br: one(cs.borderBottomRightRadius, w), bl: one(cs.borderBottomLeftRadius, w) };
  const fit = (side, a, b) => (a + b > 0 ? side / (a + b) : Infinity);
  const f = Math.min(1, fit(w, r.tl, r.tr), fit(w, r.bl, r.br), fit(h, r.tl, r.bl), fit(h, r.tr, r.br));
  return { tl: r.tl * f, tr: r.tr * f, br: r.br * f, bl: r.bl * f };
}

function frame(now) {
  raf = 0;
  const dt = lastNow ? Math.min(now - lastNow, 100) : 16; lastNow = now;
  const s = stage;
  if (!s || !s.ok || s.lost) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), vw = innerWidth, vh = innerHeight;
  const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
  if (s.canvas.width !== W || s.canvas.height !== H) { s.canvas.width = W; s.canvas.height = H; }
  const gl = s.gl, u = s.prog.u;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(s.prog.p); gl.bindVertexArray(s.vao);
  gl.uniform2f(u('uView'), vw, vh); gl.uniform1f(u('uDpr'), dpr);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alive = false;
  for (const it of items) {
    const o = it.o, goal = it.on ? 1 : 0, rate = dt / (goal > it.level ? o.fadeIn : o.fadeOut);
    it.level = goal > it.level ? Math.min(goal, it.level + rate) : Math.max(goal, it.level - rate);
    if (it.level > 0 || goal > 0) alive = true;
    if (it.level <= 0.001 || !it.el.isConnected) { if (it.dead) items.delete(it); continue; }
    if (!still) it.time += dt / 1000;
    const b = it.el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (it.dirty || Math.abs(b.width - it.w) > 0.5 || Math.abs(b.height - it.h) > 0.5) {
      it.w = b.width; it.h = b.height; it.dirty = false;
      it.radii = radiiOf(getComputedStyle(it.el), b.width, b.height);
    }
    const m = o.glow * 6 + o.chaos * 3 + Math.abs(o.offset) + 2;
    const x0 = Math.max(0, Math.floor((b.left - m) * dpr)), y0 = Math.max(0, Math.floor((vh - b.bottom - m) * dpr));
    const x1 = Math.min(W, Math.ceil((b.right + m) * dpr)), y1 = Math.min(H, Math.ceil((vh - b.top + m) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    gl.viewport(0, 0, W, H); gl.scissor(x0, y0, x1 - x0, y1 - y0);
    gl.uniform4f(u('uShape'), b.left, b.top, b.width, b.height);
    gl.uniform4f(u('uRadii'), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u('uTime'), it.time); gl.uniform1f(u('uLevel'), it.level * o.intensity);
    const f = { uThick: o.thickness, uGlowW: o.glow, uChaos: o.chaos, uScale: o.scale, uCrackle: o.crackle, uOffset: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u('uPal[0]'), it.pal); gl.uniform1i(u('uPalN'), it.palN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
  if (alive) raf = requestAnimationFrame(frame);
  else { s.canvas.remove(); lastNow = 0; }
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
  it.pal = new Float32Array(24); p.slice(0, 8).forEach((h, i) => it.pal.set(hexToOklab(h), i * 3)); it.palN = Math.min(p.length, 8);
}

/**
 * An animated electric arc that follows the element's outline (rounded corners included).
 * trigger: 'always' | 'hover' | 'focus' | 'hover focus' | 'manual'. Returns a controller.
 */
export function electricBorder(el, options = {}) {
  const it = { el, o: { ...BORDER, ...options }, level: 0, on: false, time: Math.random() * 20, w: 0, h: 0, dirty: true, dead: false };
  if (it.o.zIndex != null && stage?.canvas) stage.canvas.style.zIndex = String(it.o.zIndex);
  setPalette(it);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { it.dirty = true; }) : null;
  ro?.observe(el);
  const triggers = String(it.o.trigger);
  const listeners = [];
  const on = (type, fn) => { el.addEventListener(type, fn); listeners.push([type, fn]); };
  let hover = false, focus = false;
  const sync = () => { it.on = triggers.includes('always') || (triggers.includes('hover') && hover) || (triggers.includes('focus') && focus); if (it.on) wake(); };
  if (triggers.includes('hover')) { on('pointerenter', () => { hover = true; sync(); }); on('pointerleave', () => { hover = false; sync(); }); }
  if (triggers.includes('focus')) { on('focusin', () => { focus = true; sync(); }); on('focusout', () => { focus = el.matches(':focus-within'); sync(); }); }
  items.add(it);
  sync();
  const ctl = {
    get active() { return it.on; },
    start() { it.on = true; wake(); return ctl; },
    stop() { it.on = false; return ctl; },
    set(options2) { Object.assign(it.o, options2); if ('color' in options2 || 'palette' in options2) setPalette(it); wake(); return ctl; },
    destroy() { it.on = false; it.dead = true; ro?.disconnect(); for (const [t, f] of listeners) el.removeEventListener(t, f); if (it.level <= 0.001) items.delete(it); },
  };
  return ctl;
}
