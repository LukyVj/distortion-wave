import { test } from 'node:test';
import assert from 'node:assert/strict';
import { electric, ELECTRIC } from '../src/effects/electric.js';
import { BASE, resolveConfig } from '../src/core.js';

const resolve = (o, w = 360, h = 740) => { const c = resolveConfig({ ...BASE, ...electric.preset }, o, w, h); electric.tune(c, o); return c; };

test('electric keeps the wave behaviour: its preset only changes the look', () => {
  const behaviour = ['anticipation', 'travel', 'linger', 'amplitude', 'lensWidth', 'swell', 'aberration', 'blur', 'blurNear', 'blurAhead', 'blurBehind', 'pull', 'inhale', 'lean', 'speed', 'particles'];
  for (const k of behaviour) assert.ok(!(k in electric.preset), `preset must not change ${k}`);
  const wave = resolveConfig(BASE, {}, 360, 740), el = resolve({});
  for (const k of ['anticipation', 'travel', 'amplitude', 'lensWidth', 'blur']) assert.equal(el[k], wave[k]);
  assert.equal(el.palette, 'electric');
});

test('electric keys: defaults, size scaling, intensity and overrides', () => {
  const big = resolve({}), small = resolve({}, 120, 40);
  assert.ok(Math.abs(big.jag - ELECTRIC.jag) < 0.01);
  assert.ok(small.jag < big.jag && small.boltGlow < big.boltGlow);
  assert.ok(small.scale >= 10 && small.boltWidth >= 0.6, 'floors keep the bolts visible on a button');
  const calm = resolve({ intensity: 0 });
  assert.equal(calm.jag, 0); assert.equal(calm.chaos, 0); assert.equal(calm.amplitude, 0);
  assert.equal(resolve({ bolts: 0 }).bolts, 0);
  assert.equal(resolve({ palette: 'ember' }).palette, 'ember');
  const u = electric.uniforms(big);
  assert.ok(Object.values(u).every(Number.isFinite));
  assert.ok(Math.abs(u.uERimNorm - 1 / big.rimStrength) < 1e-9);
});
