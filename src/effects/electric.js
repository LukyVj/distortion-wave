// distortion-wave/electric — the electric effect: a transition and a border.
//
//   import { distortionWave } from 'distortion-wave';
//   import { electric, electricBorder } from 'distortion-wave/electric';
//
//   distortionWave(card, update, { effect: electric, source: button });   // arcs run round the outline, the content crackles to the new state
//   const border = electricBorder(card, { trigger: 'hover' });           // a live arc on the outline; border.destroy() removes it
//
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

import { resolveElectric, electricState, electricDuration, makeSparks, sparkAt, ELECTRIC, perimeterLength, pointAt, paramAt } from '../electric.js';
import { FS_ELECTRIC } from '../shaders.js';
import { VS_FULL, program } from '../gl.js';
import { electricBorder, BORDER } from '../ambient.js';

function renderElectric(r, f) {
  if (!r.ok) return;
  const gl = r.gl, W = r.canvas.width, H = r.canvas.height;
  r.programs ||= {};
  const m = (r.programs.electric ||= program(gl, VS_FULL, FS_ELECTRIC)), u = m.u;
  const old = r.layers.old || r.layers.new, nxt = r.layers.new || r.layers.old;
  if (!old) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.useProgram(m.p);
  [['uOld0', old.sharp], ['uNew0', nxt.sharp]].forEach(([n, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u(n), i); });
  const R = f.rects, v4 = (n, q) => gl.uniform4f(u(n), q.x, q.y, q.w, q.h);
  gl.uniform2f(u('uSize'), f.w, f.h); gl.uniform2f(u('uRes'), W, H);
  v4('uOldRect', R.old); v4('uNewRect', R.new || R.old); v4('uShape', R.shape);
  gl.uniform4f(u('uRadii'), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
  gl.uniform1i(u('uMode'), f.mode); gl.uniform1f(u('uFade'), f.fade || 0); gl.uniform1i(u('uClip'), R.clipped ? 1 : 0);
  const s = f.s, c = f.cfg;
  if (s) {
    const fl = { uTime: s.time, uArc: s.arc, uS0: s.s0, uLive: s.live, uHeadOn: s.headOn, uHeadW: c.head, uSurge: s.surge, uFlash: s.flash,
      uGlitch: c.glitch, uRows: c.rows, uThick: c.thickness, uGlowW: c.glow, uChaos: c.chaos, uScale: c.scale, uCrackle: c.crackle, uOffset: c.offset };
    for (const k in fl) gl.uniform1f(u(k), fl[k]);
    r.palette(m, c.palette);
  }
  gl.bindVertexArray(r.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
  r.drawDots(f);
  gl.bindVertexArray(null);
}

/** Pass as `effect` to distortionWave() or setWaveDefaults(). */
export const electric = Object.freeze({
  name: 'electric',
  blur: false,
  resolve: (o, m) => resolveElectric(o, m.clip.w, m.clip.h),
  margin: (c) => Math.ceil(c.glow * 3 + c.chaos * 3 + Math.abs(c.offset)),
  particles: (c) => makeSparks(c.particles),
  state: electricState,
  particle: sparkAt,
  morph: (s) => s.surge,
  total: electricDuration,
  render: renderElectric,
});

export { electricBorder, ELECTRIC, BORDER, perimeterLength, pointAt, paramAt };
