// Unit tests for the pure core (no DOM, no GPU): node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, scaleConfig, totalDuration, frameState, makeParticles, particleAt, colorAlpha, hasVisibleBox } from '../src/core.js';

const button = { x: 20, y: 662, w: 320, h: 54 };
const geom = (cfg, touchX = null) => ({
  w: 360, h: 740, hold: false,
  src: cfg.type === 'center' ? { x: 150, y: 168, w: 60, h: 60 } : button,
  touch: touchX == null ? null : { x: button.x + button.w * touchX, y: button.y + button.h / 2 },
});
const cases = [];
for (const name of ['vertical', 'horizontal', 'center']) for (const touch of [0.05, 0.5, 0.95, null]) cases.push([name, touch]);

for (const [name, touch] of cases) {
  const cfg = scaleConfig(PRESETS[name], 360, 740);
  const g = geom(cfg, touch);
  const T = totalDuration(cfg);

  test(`${name} · touch ${touch}: radius never shrinks after launch`, () => {
    let prev = -Infinity;
    for (let t = cfg.anticipation; t <= T; t += 1 / 240) {
      const r = frameState(t, cfg, g).radius;
      assert.ok(r >= prev - 1e-9, `radius went from ${prev} to ${r} at t=${t}`);
      prev = r;
    }
  });

  test(`${name} · touch ${touch}: energy is zero at both ends, target gets covered`, () => {
    assert.equal(frameState(0, cfg, g).energy, 0);
    assert.ok(frameState(T, cfg, g).energy < 1e-6);
    assert.ok(frameState(T, cfg, g).covered);
    assert.ok(frameState(T, cfg, g).settled);
  });

  test(`${name} · touch ${touch}: deterministic and NaN-free particles`, () => {
    assert.deepEqual(frameState(0.8, cfg, g), frameState(0.8, cfg, g));
    const P = makeParticles(cfg.particles, cfg);
    for (let t = 0; t < T; t += 0.05) {
      const s = frameState(t, cfg, g);
      for (const p of P) {
        const q = particleAt(p, s, cfg);
        if (q) assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.a));
      }
    }
  });
}

test('the wave leans toward the touch point', () => {
  const cfg = scaleConfig(PRESETS.vertical, 360, 740);
  assert.ok(frameState(1, cfg, geom(cfg, 0.95)).tilt > 0);
  assert.ok(frameState(1, cfg, geom(cfg, 0.05)).tilt < 0);
  assert.equal(frameState(1, cfg, geom(cfg, null)).tilt, 0);
});

test('the wave travels toward the bulk of the target', () => {
  const cfg = scaleConfig(PRESETS.vertical, 360, 740);
  const top = { ...geom(cfg), src: { x: 20, y: 10, w: 320, h: 40 } };
  assert.equal(frameState(1, cfg, geom(cfg)).dir, 1);   // button at the bottom → goes up
  assert.equal(frameState(1, cfg, top).dir, -1);        // tab at the top → goes down
});

test('scaleConfig shrinks a button and keeps a phone screen at reference scale', () => {
  const btn = scaleConfig(PRESETS.vertical, 160, 48);
  const screen = scaleConfig(PRESETS.vertical, 360, 740);
  assert.ok(Math.abs(screen.k - 1) < 0.01);
  assert.ok(btn.k < 0.2 && btn.rimWidth >= 2.5 && btn.lead < screen.lead);
  assert.ok(totalDuration(btn) < totalDuration(screen));
});

test('colorAlpha reads the alpha of computed colours', () => {
  assert.equal(colorAlpha('rgba(0, 0, 0, 0)'), 0);
  assert.equal(colorAlpha('rgb(19, 19, 22)'), 1);
  assert.equal(colorAlpha('transparent'), 0);
  assert.equal(colorAlpha('oklab(0.5 0.1 0.1 / 0.18)'), 0.18);
  assert.equal(colorAlpha('color(srgb 1 0 0 / 50%)'), 0.5);
});

test('hasVisibleBox: a transparent grid has no box, a card has one', () => {
  const none = { backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', boxShadow: 'none',
    borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px',
    borderTopStyle: 'none', borderRightStyle: 'none', borderBottomStyle: 'none', borderLeftStyle: 'none',
    borderTopColor: 'rgb(237, 237, 242)', borderRightColor: 'rgb(237, 237, 242)', borderBottomColor: 'rgb(237, 237, 242)', borderLeftColor: 'rgb(237, 237, 242)' };
  assert.equal(hasVisibleBox(none), false);
  assert.equal(hasVisibleBox({ ...none, backgroundColor: 'rgb(19, 19, 22)' }), true);
  assert.equal(hasVisibleBox({ ...none, backgroundImage: 'linear-gradient(red, blue)' }), true);
  assert.equal(hasVisibleBox({ ...none, boxShadow: 'rgba(0, 0, 0, 0.3) 0px 1px 3px 0px' }), true);
  assert.equal(hasVisibleBox({ ...none, borderTopWidth: '1px', borderTopStyle: 'solid' }), true);
  assert.equal(hasVisibleBox({ ...none, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'rgba(0, 0, 0, 0)' }), false);
});
