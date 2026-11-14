// Type definitions for distortion-wave/glass

import type { Effect } from './index';

/**
 * The distortion wave with a glass look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: glass, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): behind the front a thick slab of glass bends the content like a lens, splits it into RGB at its slopes and catches the light on its faces. Default a pale glass palette.
 */
export declare const glass: Effect;

/** Defaults of the glass keys: thickness, refraction, dispersion (px), shine (strength), tint (0 to 1). */
export const GLASS: Readonly<{ thickness: number; refraction: number; dispersion: number; shine: number; tint: number }>;
