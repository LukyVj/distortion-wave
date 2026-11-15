// Type definitions for distortion-wave/christmas

import type { Effect } from './index';

/**
 * The distortion wave, dressed for Christmas. Pass it as `effect`:
 * `distortionWave(card, update, { effect: christmas, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front is a twisted candy cane with frost ahead of it, snow falls behind it, a string of lights hangs along the outline, snow and icicles settle on the top edge, and the sparks are snowflakes. Red, white, green and gold palette.
 */
export declare const christmas: Effect;

/** Defaults of the christmas keys: cane, stripe, flake, bulbs, cap (px); snow, lights, frost (strengths). */
export const CHRISTMAS: Readonly<{ cane: number; stripe: number; snow: number; flake: number; lights: number; bulbs: number; cap: number; frost: number }>;
