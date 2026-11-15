// Type definitions for distortion-wave/vine

import type { Effect } from './index';

/**
 * The distortion wave as plants. Pass it as `effect`:
 * `distortionWave(card, update, { effect: vine, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front is a band of leaves, leaves fall behind it, a vine grows around the element and the sparks are leaves. Default palette: greens.
 */
export declare const vine: Effect;

/** Defaults of the vine keys: leaf (px), zone (0 to 1), bumps (leafy bumps on the front), fall, vine (strengths), vineWidth (px). */
export const VINE: Readonly<{ leaf: number; zone: number; bumps: number; fall: number; vine: number; vineWidth: number }>;
