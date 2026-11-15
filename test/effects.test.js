import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, resolveConfig } from '../src/core.js';

// The looks added after electric and pixel: each is the wave with another look, nothing else.
const LOOKS = {
  glass: ['thickness', 'refraction', 'dispersion', 'shine', 'tint'],
  burn: ['roughness', 'scale', 'char', 'heat', 'embers', 'smoke'],
  ink: ['bleed', 'scale', 'misregister', 'grain', 'zone', 'ink'],
  halftone: ['cell', 'angle', 'zone', 'size', 'ink'],
  metal: ['thickness', 'wobble', 'ripple', 'shine', 'reflect'],
  water: ['wavelength', 'refraction', 'caustics', 'foam', 'tint'],
  vine: ['leaf', 'zone', 'bumps', 'fall', 'vine', 'vineWidth'],
};
const BEHAVIOUR = ['anticipation', 'travel', 'linger', 'amplitude', 'lensWidth', 'swell', 'aberration', 'blur', 'blurNear', 'blurAhead', 'blurBehind', 'pull', 'inhale', 'lean', 'speed', 'particles'];
const HEX = /^#[0-9a-f]{6}$/i;

for (const [name, keys] of Object.entries(LOOKS)) {
  test(`${name}: the wave's behaviour, its own keys, finite uniforms`, async () => {
    const mod = await import(`../src/effects/${name}.js`);
    const fx = mod[name], DEF = mod[name.toUpperCase()];
    assert.equal(fx.name, name);
    assert.ok(Object.isFrozen(fx) && Object.isFrozen(fx.preset));
    for (const k of BEHAVIOUR) assert.ok(!(k in fx.preset), `preset must not change ${k}`);
    assert.deepEqual(Object.keys(DEF).sort(), [...keys].sort());
    const pal = fx.preset.palette;
    assert.ok(typeof pal === 'string' || (Array.isArray(pal) && pal.length >= 2 && pal.length <= 8 && pal.every((h) => HEX.test(h))));
    const resolve = (o, w = 360, h = 740) => { const c = resolveConfig({ ...BASE, ...fx.preset }, o, w, h); fx.tune(c, o); return c; };
    const wave = resolveConfig(BASE, {}, 360, 740), c = resolve({});
    for (const k of ['anticipation', 'travel', 'amplitude', 'lensWidth', 'blur']) assert.equal(c[k], wave[k]);
    const u = fx.uniforms(c);
    assert.ok(Object.keys(u).length >= 5 && Object.keys(u).every((k) => /^u[A-Z]\w+$/.test(k)));
    assert.ok(Object.values(u).every(Number.isFinite));
    // tiny element, wild values: still finite
    const odd = Object.fromEntries(keys.map((k) => [k, 1e3]));
    assert.ok(Object.values(fx.uniforms(resolve(odd, 40, 20))).every(Number.isFinite));
    assert.ok(Object.values(fx.uniforms(resolve({ intensity: 0 }, 40, 20))).every(Number.isFinite));
    assert.match(fx.shader.chunk, /float fxFront\(vec2 q, vec2 p\)/);
    assert.match(fx.shader.chunk, /vec4 fxOver\(vec4 o, vec2 p, vec2 c, float sd, float fd, vec2 fq, float fg\)/);
    for (const k of Object.keys(u)) assert.match(fx.shader.chunk, new RegExp(`\\b${k}\\b`), `${k} is declared in the shader`);
  });
}

test('the looks scale with the element: a button gets a thinner glass slab and a smaller bead', async () => {
  const { glass } = await import('../src/effects/glass.js'), { metal } = await import('../src/effects/metal.js');
  const at = (fx, w, h) => { const c = resolveConfig({ ...BASE, ...fx.preset }, {}, w, h); fx.tune(c, {}); return c; };
  assert.ok(at(glass, 120, 40).thickness < at(glass, 360, 740).thickness);
  assert.ok(at(metal, 120, 40).thickness >= 10);
  const { halftone } = await import('../src/effects/halftone.js');
  assert.ok(Math.abs(at(halftone, 360, 740).angle - Math.PI / 4) < 1e-9);
});
