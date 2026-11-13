// distortion-wave — a distortion-wave transition for ANY DOM element (button, card, section, page).
// WebGL2, zero dependencies. MIT © Lucas Bonomi
//
//   const t = distortionWave(target, () => { /* mutate the DOM */ }, {
//     source: buttonEl | DOMRect | {x,y} | null,   // where the wave starts
//     focus:  pointerEvent | {x,y} | null,         // touch point (sets the lean)
//     variant: 'auto' | 'vertical' | 'horizontal' | 'center',
//     palette: 'aurora' | ['#hex', …],
//   });
//   await t.ready; await t.updateCallbackDone; await t.covered; await t.finished; t.skip();
//
// Same model as document.startViewTransition(): capture "before", update the DOM,
// capture "after", animate on top, then hand back to the real DOM (interactive as
// soon as the wave has passed).

import { snapshotElement } from './capture.js';
import { BASE, PRESETS, PALETTES, scaleConfig, totalDuration, frameState, makeParticles, particleAt, clamp, lerp, hasVisibleBox } from './core.js';
import { acquire, release, warmupWave } from './renderer.js';
import { captureFocus, restoreFocus } from './focus.js';

// ═══ Measuring & DOM helpers ═════════════════════════════════════════════════
function parseRadii(cs, w, h) {
  const one = (v, side) => { const t = String(v).trim().split(/\s+/)[0]; const n = parseFloat(t) || 0; return t.endsWith('%') ? n / 100 * side : n; };
  let tl = one(cs.borderTopLeftRadius, w), tr = one(cs.borderTopRightRadius, w), br = one(cs.borderBottomRightRadius, w), bl = one(cs.borderBottomLeftRadius, w);
  const f = Math.min(1, w / ((tl + tr) || 1e9), w / ((bl + br) || 1e9), h / ((tl + bl) || 1e9), h / ((tr + br) || 1e9));   // CSS overlapping-radii rule
  return { tl: tl * f, tr: tr * f, br: br * f, bl: bl * f };
}
function isFixed(el) { for (let n = el; n && n !== document.documentElement; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; }
function measure(el) {
  const rect = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const w = el.offsetWidth ?? rect.width, h = el.offsetHeight ?? rect.height;
  const x0 = Math.max(rect.left, 0), y0 = Math.max(rect.top, 0), x1 = Math.min(rect.right, innerWidth), y1 = Math.min(rect.bottom, innerHeight);
  const fixed = isFixed(el), sx = fixed ? 0 : scrollX, sy = fixed ? 0 : scrollY;
  return {
    w, h, fixed, opacity: cs.opacity, radii: parseRadii(cs, w, h), boxless: !hasVisibleBox(cs), visible: x1 > x0 && y1 > y0,
    clip: { x: x0 - rect.left, y: y0 - rect.top, w: x1 - x0, h: y1 - y0 },          // visible part, element space
    page: { x: x0 + sx, y: y0 + sy, w: x1 - x0, h: y1 - y0 },                   // same, page space (scroll-stable)
    el: { x: rect.left + sx, y: rect.top + sy, w: rect.width, h: rect.height },
  };
}
const union = (a, b) => { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
const rel = (r, o) => ({ x: r.x - o.x, y: r.y - o.y, w: r.w, h: r.h });
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
function deferred() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); p.catch(() => {}); return { p, res, rej }; }
function pickDpr(m, maxTex) {
  const area = Math.max(m.clip.w * m.clip.h, 1);
  return Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / area), maxTex / Math.max(m.clip.w, m.clip.h, 1)));
}

// Optional pre-capture (on trigger hover/focus): hides the latency of the "before" capture.
const prepared = new WeakMap();
export function prepareWave(target) {
  if (prepared.get(target)?.pending) return prepared.get(target).pending;
  const m = measure(target);
  if (!m.visible) return Promise.resolve(null);
  const entry = { dirty: false, m, dpr: pickDpr(m, 8192), at: performance.now() };
  entry.mo = new MutationObserver(() => { entry.dirty = true; });
  entry.mo.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  entry.pending = snapshotElement(target, { dpr: entry.dpr, clip: m.clip }).then((s) => (entry.shot = s), () => null);
  prepared.set(target, entry);
  return entry.pending;
}
function takePrepared(target, m) {
  const e = prepared.get(target);
  if (!e) return null;
  prepared.delete(target); e.mo.disconnect();
  const same = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
  if (e.dirty || !e.shot || performance.now() - e.at > 8000 || !same(e.m.page, m.page)) return null;
  return e.shot;
}

// ═══ Orchestration ═══════════════════════════════════════════════════════════
const ACTIVE = new WeakMap();
const DEFAULTS = { variant: 'auto', palette: 'aurora', speed: 1, particles: true, reducedMotion: null, timeout: 3000, preserveFocus: true };

class WaveTransition {
  constructor(target, update, opts) {
    this.target = target; this.update = update || (() => {}); this.o = { ...DEFAULTS, ...opts };
    this._d = { ready: deferred(), update: deferred(), covered: deferred(), finished: deferred() };
    this.ready = this._d.ready.p; this.updateCallbackDone = this._d.update.p; this.covered = this._d.covered.p; this.finished = this._d.finished.p;
    this.metrics = {};
    this._updated = false; this._skipped = false; this._done = false;
    this._run().catch((err) => this._abort(err));
  }
  skip() { this._skipped = true; if (this._loopStarted) this._finish(); }

  async _runUpdate() {
    if (this._updated) return this._updatePromise;
    this._updated = true;
    const focus = this.o.preserveFocus === false ? null : captureFocus(this.target);
    this._updatePromise = (async () => { await this.update(); restoreFocus(focus, this.target); })();
    this._updatePromise.then(() => this._d.update.res(), (e) => this._d.update.rej(e));
    return this._updatePromise;
  }
  async _run() {
    const prev = ACTIVE.get(this.target);
    ACTIVE.set(this.target, this);
    if (prev) { prev.skip(); await prev.finished; }
    const o = this.o, target = this.target;
    const reduced = o.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const before = measure(target);
    const r = before.visible && target !== document.body && target !== document.documentElement ? acquire() : null;
    this.r = r;
    if (!r || this._skipped) return this._plain();

    // 1 · "before" capture (or a still-valid pre-capture)
    const dpr = pickDpr(before, r.maxTex);
    let t0 = performance.now();
    const oldShot = takePrepared(target, before) || await snapshotElement(target, { dpr: Math.min(dpr, 2), clip: before.clip });
    this.metrics.captureBefore = Math.round(performance.now() - t0);
    if (this._skipped) return this._plain();

    // 2 · config scaled to the target + initial geometry
    const base = { ...(PRESETS[this._variant(before)] || BASE) };
    for (const k of Object.keys(o)) if (k in BASE && k !== 'type' && k !== 'particles') base[k] = o[k];
    if (o.particles === false) base.particles = 0; else if (typeof o.particles === 'number') base.particles = o.particles;
    const cfg = scaleConfig(base, before.clip.w, before.clip.h);
    this.cfg = cfg; this.before = before; this.dpr = oldShot.dpr;
    this.particles = makeParticles(cfg.particles, cfg); this.dots = new Float32Array(Math.max(this.particles.length, 1) * 4);
    this.origin = this._originPage(before);                               // source/touch in page coordinates
    this.canvasPage = before.page;
    this.rects = { old: rel(before.page, before.page), new: null, shape: rel(before.el, before.page), radii: before.radii, boxless: before.boxless };
    t0 = performance.now();
    r.setLayer('old', oldShot.canvas, cfg.blurNear * this.dpr, cfg.blur * this.dpr);
    this.metrics.upload = Math.round(performance.now() - t0);
    this._mount(); this._hide();
    this.mode = reduced ? 0 : 1; this.fadeOnly = reduced;
    this._d.ready.res();
    this._startLoop();

    // 3 · DOM update during the anticipation, then "after" capture
    await this._runUpdate();
    await nextFrame();
    await Promise.all([...target.querySelectorAll('img')].map((i) => i.decode?.().catch(() => {})));
    if (this._done) return;
    const after = measure(target);
    t0 = performance.now();
    const newShot = after.visible
      ? await snapshotElement(target, { dpr: this.dpr, clip: after.clip, rootOpacity: before.opacity })
      : null;
    this.metrics.captureAfter = Math.round(performance.now() - t0);
    if (this._done) return;
    if (!newShot) { this._finish(); return; }
    r.setLayer('new', newShot.canvas, cfg.blurNear * this.dpr, cfg.blur * this.dpr);
    // 4 · open the gate: the canvas covers the union of before/after
    this.after = after;
    this.canvasPage = union(before.page, after.page);
    this.rects = { old: rel(before.page, this.canvasPage), new: rel(after.page, this.canvasPage), shape: rel(before.el, this.canvasPage), radii: before.radii, boxless: before.boxless && after.boxless };
    this.shapes = { from: rel(before.el, this.canvasPage), to: rel(after.el, this.canvasPage), r0: before.radii, r1: after.radii };
    this._resizeCanvas();
    this.gateOpen = true;
    if (this.fadeOnly) { this.mode = 3; this.fadeStart = this.now; }
  }
  _variant(m) {
    if (this.o.variant !== 'auto') return this.o.variant;
    const s = this.o.source;
    if (!(s instanceof Element) || s === this.target) return 'center';
    const r = s.getBoundingClientRect();
    return r.width >= r.height * 1.4 ? 'vertical' : r.height >= r.width * 1.4 ? 'horizontal' : 'center';
  }
  _originPage(m) {
    const sx = m.fixed ? 0 : scrollX, sy = m.fixed ? 0 : scrollY, o = this.o;
    const pt = (v) => (v && 'clientX' in v ? { x: v.clientX, y: v.clientY } : v && 'x' in v ? { x: v.x, y: v.y } : null);
    let touch = pt(o.focus);
    if (o.focus instanceof KeyboardEvent || (o.focus && o.focus.detail === 0 && o.focus.type === 'click')) touch = null;   // keyboard: no touch point, no lean
    let src;
    if (o.source instanceof Element && o.source !== this.target) { const r = o.source.getBoundingClientRect(); src = { x: r.left, y: r.top, w: r.width, h: r.height }; }
    else if (o.source && 'width' in o.source) src = { x: o.source.x, y: o.source.y, w: o.source.width, h: o.source.height };
    else {
      const p = (!(o.source instanceof Element) && pt(o.source)) || touch || { x: m.el.x - sx + m.w / 2, y: m.el.y - sy + m.h / 2 };
      const d = Math.max(8, Math.min(m.w, m.h) * 0.08);
      src = { x: p.x - d, y: p.y - d, w: 2 * d, h: 2 * d };
    }
    return { src: { x: src.x + sx, y: src.y + sy, w: src.w, h: src.h }, touch: touch && { x: touch.x + sx, y: touch.y + sy },
      hold: o.source instanceof Element && o.source !== this.target && this.target.contains(o.source) };
  }
  _mount() {
    const c = this.r.canvas;
    document.body.appendChild(c);
    this._resizeCanvas();
  }
  _resizeCanvas() {
    const c = this.r.canvas, p = this.canvasPage;
    c.width = Math.max(1, Math.round(p.w * this.dpr)); c.height = Math.max(1, Math.round(p.h * this.dpr));
    c.style.width = p.w + 'px'; c.style.height = p.h + 'px';
    this._place();
  }
  _place() {
    const p = this.canvasPage, f = this.before.fixed;
    this.r.canvas.style.transform = `translate3d(${p.x - (f ? 0 : scrollX)}px,${p.y - (f ? 0 : scrollY)}px,0)`;
  }
  _hide() {
    const s = this.target.style;
    this._saved = ['opacity', 'transition'].map((k) => [k, s.getPropertyValue(k), s.getPropertyPriority(k)]);
    s.setProperty('transition', 'none', 'important'); s.setProperty('opacity', '0', 'important');
  }
  _show() {
    if (!this._saved) return;
    for (const [k, v, pr] of this._saved) { if (v) this.target.style.setProperty(k, v, pr); else this.target.style.removeProperty(k); }
    this._saved = null;
  }
  _startLoop() {
    this._loopStarted = true; this.held = 0; this.start = performance.now(); this.now = this.start; this.last = this.start;
    const tick = (now) => {
      if (this._done) return;
      const dt = Math.min(now - this.last, 100); this.last = now; this.now = now;
      this.metrics.worstFrame = Math.max(this.metrics.worstFrame || 0, dt);
      this._place();
      let t = (now - this.start - this.held) / 1000;
      const gateAt = this.cfg.anticipation - 1e-3;
      if (!this.gateOpen && t >= gateAt) {                                 // "after" capture not ready: hold the anticipation
        this.held += t * 1000 - gateAt * 1000; t = gateAt;
        if (now - this.start > this.o.timeout) { this._finish(); return; }
      }
      this.t = t;
      if (this.mode === 3) {                                               // reduced motion: plain crossfade
        const k = clamp((now - this.fadeStart) / 220);
        this.r.render({ mode: 3, fade: k, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dotCount: 0 });
        if (k >= 1) { this._finish(); return; }
      } else if (this.mode === 0) {
        this.r.render({ mode: 0, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dotCount: 0 });
      } else {
        const g = { w: this.canvasPage.w, h: this.canvasPage.h, src: rel(this.origin.src, this.canvasPage),
          touch: this.origin.touch && rel({ ...this.origin.touch, w: 0, h: 0 }, this.canvasPage), hold: this.origin.hold };
        const s = frameState(t, this.cfg, g);
        if (this.shapes) {                                                 // the silhouette follows the wave when the size changes
          const k = s.moved, A = this.shapes.from, B = this.shapes.to, ra = this.shapes.r0, rb = this.shapes.r1;
          this.rects.shape = { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), w: lerp(A.w, B.w, k), h: lerp(A.h, B.h, k) };
          this.rects.radii = { tl: lerp(ra.tl, rb.tl, k), tr: lerp(ra.tr, rb.tr, k), br: lerp(ra.br, rb.br, k), bl: lerp(ra.bl, rb.bl, k) };
        }
        if (s.launched && !this._launched) { this._launched = true; this.o.onLaunch?.(); }
        if (s.covered && !this._covered) { this._covered = true; this._d.covered.res(); this.o.onCovered?.(); }
        if (s.settled && this.mode === 1) { this.mode = 4; this._show(); this.o.onSettled?.(); }   // the real DOM takes over
        let n = 0;
        for (const P of this.particles) {
          const q = particleAt(P, s, this.cfg);
          if (!q || q.a <= 0.002) continue;
          this.dots[n * 4] = q.x; this.dots[n * 4 + 1] = q.y; this.dots[n * 4 + 2] = P.size; this.dots[n * 4 + 3] = Math.min(q.a, 1); n++;
        }
        this.r.render({ mode: this.mode, s, cfg: this.cfg, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dots: this.dots, dotCount: n });
        if (t >= totalDuration(this.cfg)) { this._finish(); return; }
      }
      if (this._skipped) { this._finish(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  async _plain() {                                                         // no WebGL / offscreen / skipped: just run the update
    try { await this._runUpdate(); } finally { this._done = true; this._release(); this._d.ready.res(); this._d.covered.res(); this._d.finished.res(); }
  }
  async _finish() {
    if (this._done) return;
    this._done = true;
    try { await this._runUpdate(); } catch {}                             // returns the in-flight promise if already started
    this._show(); this._release();
    if (!this._covered) this._d.covered.res();
    this._d.finished.res();
    this.o.onEnd?.(this.metrics);
  }
  _release() { if (this.r) { release(this.r); this.r = null; } if (ACTIVE.get(this.target) === this) ACTIVE.delete(this.target); }
  _abort(err) {
    console.warn('[distortion-wave] repli sans animation :', err);
    this._done = true; this._show(); this._release();
    (this._updated ? Promise.resolve() : this._runUpdate()).catch(() => {}).finally(() => {
      this._d.ready.res(); this._d.covered.res(); this._d.finished.res();
    });
  }
}

/** Entry point. Always runs `update` (even without WebGL, offscreen or with reduced motion). */
export function distortionWave(target, update, options = {}) {
  return new WaveTransition(target, update, options);
}
/** Helper: plays a wave on `target` when `trigger` is clicked (source = trigger, focus = pointer). */
export function waveOnClick(trigger, target, update, options = {}) {
  const prep = () => prepareWave(target);
  trigger.addEventListener('pointerenter', prep);
  trigger.addEventListener('focus', prep);
  trigger.addEventListener('click', (e) => distortionWave(target, () => update(e), { source: trigger, focus: e, ...options }));
}
export { snapshotElement, warmupWave, PALETTES, PRESETS, scaleConfig, totalDuration, frameState };
