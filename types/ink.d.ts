// Type definitions for distortion-wave/ink

import type { Effect } from './index';

/**
 * The distortion wave with a risograph ink look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: ink, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front bleeds like ink soaking into paper, and around it the content is reprinted in two inks, out of register, with the paper's grain. Default a riso palette (fluorescent pink, blue, yellow, green): the first two colours are the inks.
 */
export declare const ink: Effect;

/** Defaults of the ink keys: bleed, scale, misregister, ink (px), grain (0 to 1), zone (× the band's lead). */
export const INK: Readonly<{ bleed: number; scale: number; misregister: number; grain: number; zone: number; ink: number }>;
