import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perimeterLength, pointAt, paramAt, resolveElectric, electricState, electricDuration, makeSparks, sparkAt, ELECTRIC } from '../src/electric.js';

const R0 = { tl: 0, tr: 0, br: 0, bl: 0 };
const R = { tl: 20, tr: 10, br: 30, bl: 0 };
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('perimeter of a rectangle and of a rounded box', () => {
  close(perimeterLength(300, 100, R0), 800);
  const r = 50, w = 100, h = 100;                                   // a circle
  close(perimeterLength(w, h, { tl: r, tr: r, br: r, bl: r }), Math.PI * 100, 1e-9);
  close(perimeterLength(300, 100, R), 800 - 2 * 60 + (Math.PI / 2) * 60, 1e-9);
});

test('pointAt walks the outline clockwise from the top-left end of the top edge', () => {
  const p0 = pointAt(0, 300, 100, R);
  assert.deepEqual([p0.x, p0.y, p0.nx, p0.ny], [20, 0, 0, -1]);
  const right = pointAt(perimeterLength(300, 100, R) * 0.3, 300, 100, R);
  assert.ok(right.x <= 300 + 1e-9 && right.y >= 0);
  const P = perimeterLength(300, 100, R);
  const a = pointAt(-5, 300, 100, R), b = pointAt(P - 5, 300, 100, R);   // wraps
  close(a.x, b.x); close(a.y, b.y);
});

test('paramAt is the inverse of pointAt on every segment, corners included', () => {
  const w = 300, h = 100, P = perimeterLength(w, h, R);
  for (let i = 0; i < 200; i++) {
    const t = (i + 0.5) / 200 * P, q = pointAt(t, w, h, R);
    close(paramAt(q.x, q.y, w, h, R), t, 1e-6);
    // points slightly inside along the normal map to the same arc length
    close(paramAt(q.x - q.nx * 0.5, q.y - q.ny * 0.5, w, h, R), t, 1e-6);
  }
});

test('the electric timeline: arcs meet, then the surge, then the discharge', () => {
  const c = resolveElectric({}, 360, 740);
  const g = { shape: { x: 0, y: 0, w: 360, h: 740 }, radii: R0, src: { x: 170, y: 730, w: 20, h: 20 }, touch: null };
  const s0 = electricState(0, c, g), s1 = electricState(c.charge, c, g), s2 = electricState(c.charge + c.surge, c, g), s3 = electricState(electricDuration(c), c, g);
  close(s0.arc, 0);
  assert.ok(s1.arc >= s1.P / 2, 'the two arcs have met at the end of the charge');
  assert.equal(s1.surge, 0); close(s2.surge, 1, 1e-9);
  const s2b = electricState(c.charge + c.surge + 1e-6, c, g);
  assert.ok(!s1.covered && s2b.covered && s2b.live > 0.99);
  assert.ok(s3.done && s3.live < 1e-6);
  close(s0.s0, 360 + 740 + 180, 1e-6);                                 // middle of the bottom edge, below the source
});

test('options: duration, tuning keys, colour, intensity and size scaling', () => {
  const c = resolveElectric({ duration: 2000 }, 360, 740);
  close(electricDuration(c), 2, 1e-9);
  const big = resolveElectric({}, 360, 740), small = resolveElectric({}, 120, 40);
  assert.ok(small.glow < big.glow && small.charge < big.charge);
  assert.deepEqual(resolveElectric({ color: '#ff8800' }, 100, 100).palette, ['#ff8800']);
  const calm = resolveElectric({ intensity: 0 }, 360, 740);
  assert.equal(calm.glitch, 0); assert.equal(calm.chaos, 0);
  close(resolveElectric({ chaos: 9 }, 360, 740).chaos, 9, 0.01);
  assert.equal(resolveElectric({ particles: false }, 360, 740).particles, 0);
  assert.equal(ELECTRIC.palette, 'electric');
});

test('sparks are born on the outline and fade out', () => {
  const c = resolveElectric({}, 360, 740);
  const g = { shape: { x: 10, y: 20, w: 360, h: 740 }, radii: R0, src: { x: 170, y: 750, w: 20, h: 20 }, touch: null };
  const sparks = makeSparks(c.particles);
  let seen = 0;
  for (const t of [0.1, 0.3, c.charge + c.surge / 2]) {
    const s = electricState(t, c, g);
    for (const p of sparks) {
      const q = sparkAt(p, s, c, g);
      if (!q) continue;
      seen++;
      assert.ok(q.a > 0 && q.a <= 1 && q.size > 0);
      assert.ok(q.x > -200 && q.x < 600 && q.y > -200 && q.y < 1100);
    }
  }
  assert.ok(seen > 10);
});
