// Type definitions for distortion-wave/burn

import type { Effect } from './index';

/**
 * The distortion wave with a burn look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: burn, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front burns the old content away along a ragged edge: scorch ahead of it, a white-hot rim, smoke and embers drifting up behind. Default palette 'ember'.
 */
export declare const burn: Effect;

/** Defaults of the burn keys: roughness, scale, char, heat (px), embers, smoke (strengths). */
export const BURN: Readonly<{ roughness: number; scale: number; char: number; heat: number; embers: number; smoke: number }>;
