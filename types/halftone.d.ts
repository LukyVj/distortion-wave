// Type definitions for distortion-wave/halftone

import type { Effect } from './index';

/**
 * The distortion wave with a halftone look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: halftone, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): near the front the content turns into a rotated screen of dots sized by its tone, swelling with the wave and inked in the palette at its peak. Default a CMYK-like palette.
 */
export declare const halftone: Effect;

/** Defaults of the halftone keys: cell (px), angle (degrees), zone (× the band's lead), size (× the cell), ink (0 to 1). */
export const HALFTONE: Readonly<{ cell: number; angle: number; zone: number; size: number; ink: number }>;
