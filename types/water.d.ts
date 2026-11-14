// Type definitions for distortion-wave/water

import type { Effect } from './index';

/**
 * The distortion wave with a water look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: water, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): ripples trail the front and refract the content, the water tints it, caustics dance on it and foam breaks on the front. Default palette 'ocean'.
 */
export declare const water: Effect;

/** Defaults of the water keys: wavelength, refraction (px), caustics, foam (strengths), tint (0 to 1). */
export const WATER: Readonly<{ wavelength: number; refraction: number; caustics: number; foam: number; tint: number }>;
