// distortion-wave/all — the core and every effect in one entry.
//
//   import { distortionWave, burn, glass } from 'distortion-wave/all';
//
// For a bundler, the separate entries are just as good (it only keeps what you import). This one is for a single
// <script> tag or a single file: dist/all.iife.min.js puts everything on window.DistortionWave.
// Part of distortion-wave · MIT © Lucas Bonomi

export * from './index.js';
export * from './effects/electric.js';
export * from './effects/pixel.js';
export * from './effects/glass.js';
export * from './effects/burn.js';
export * from './effects/ink.js';
export * from './effects/halftone.js';
export * from './effects/metal.js';
export * from './effects/water.js';
export * from './effects/vine.js';
