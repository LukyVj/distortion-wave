// distortion-wave/electric — the distortion wave with an electric look; and an electric border.
//
//   import { distortionWave } from 'distortion-wave';
//   import { electric, electricBorder } from 'distortion-wave/electric';
//
//   distortionWave(card, update, { effect: electric, source: button });   // the same wave: lens, blur, front… as lightning
//   const border = electricBorder(card, { trigger: 'hover' });           // a live arc on the outline; border.destroy() removes it
//
// A separate entry: the core stays as light when you don't use it.
// Part of distortion-wave · MIT © Lucas Bonomi

import { ELECTRIC_WAVE } from '../shaders.js';
import { electricBorder, BORDER } from '../ambient.js';

// Same behaviour as the wave (timing, lens, blur, sparks): only the look changes. The colour band goes electric
// and thinner, and the outline's soft glow and hairline make room for the arcs.
const PRESET = { palette: 'electric', band: 0.6, rimStrength: 0.45, hairWidth: 0 };
// Its own keys, at the wave's reference scale (360×740 px): px unless said otherwise.
export const ELECTRIC = {
  jag: 8,           // how jagged the front is
  scale: 46,        // one noise cell along the front (smaller = more jagged)
  crackle: 1.8,     // speed of the crackle
  chaos: 6,         // how far the bolts stray from the front
  boltWidth: 1.5,   // bright core of a bolt
  boltGlow: 14,     // glow around it
  bolts: 1.2,       // strength of the bolts on the front (0 = none)
  rimBolts: 1.3,    // strength of the arcs on the outline (0 = none)
};
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** Pass as `effect` to distortionWave() or setWaveDefaults(). Takes every wave option, plus the ELECTRIC keys. */
export const electric = Object.freeze({
  name: 'electric',
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => (o[key] ?? ELECTRIC[key]);
    c.jag = v('jag') * k * i; c.chaos = v('chaos') * k * i;
    c.scale = Math.max(v('scale') * k, 10); c.crackle = v('crackle');
    c.boltWidth = Math.max(v('boltWidth') * clamp(k, 0.6, 1.3), 0.6);
    c.boltGlow = Math.max(v('boltGlow') * k, 3);
    c.bolts = v('bolts'); c.rimBolts = v('rimBolts');
  },
  shader: Object.freeze({ key: 'electric', chunk: ELECTRIC_WAVE }),
  uniforms: (c) => ({ uEJag: c.jag, uEScale: c.scale, uECrackle: c.crackle, uEBoltW: c.boltWidth, uEBoltGlow: c.boltGlow,
    uEChaos: c.chaos, uEBolt: c.bolts, uERim: c.rimBolts, uERimNorm: 1 / Math.max(c.rimStrength, 0.05) }),
});

export { electricBorder, BORDER };
