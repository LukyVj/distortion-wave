// Type definitions for distortion-wave/metal

import type { Effect } from './index';

/**
 * The distortion wave with a liquid metal look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: metal, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front is a rolling bead of liquid chrome that wobbles, mirrors a procedural studio and, faintly, the content. Default a chrome palette that tints the reflections.
 */
export declare const metal: Effect;

/** Defaults of the metal keys: thickness, wobble (px), ripple, shine (strengths), reflect (0 to 1). */
export const METAL: Readonly<{ thickness: number; wobble: number; ripple: number; shine: number; reflect: number }>;
