// Type definitions for distortion-wave/pixel

import type { Effect } from './index';

/**
 * The distortion wave with a pixel look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: pixel, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, every wave option): near the front the content turns into small
 * pixels that flip from the old state to the new one cell by cell, some light up in the palette, the outline is
 * drawn in pixels that go out one by one, and the sparks are square. Default palette 'pixel'.
 */
export declare const pixel: Effect;

/** Defaults of the pixel keys: cell, gap (px), zone (× the band's lead), density (0 to 1), rate (per second), lit, rimPixels (strengths). */
export const PIXEL: Readonly<{ cell: number; gap: number; zone: number; density: number; rate: number; lit: number; rimPixels: number }>;
