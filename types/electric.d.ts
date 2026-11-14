// Type definitions for distortion-wave/electric

import type { Effect, PaletteName } from './index';

/**
 * The electric transition. Pass it as `effect`:
 * `distortionWave(card, update, { effect: electric, source: button })`.
 * Two arcs leave the source and run round the outline, the content crackles to the new state, then the outline discharges.
 * Tuning keys (reference 360×740 px, seconds and px): charge, surge, discharge, thickness, glow, chaos, scale, crackle,
 * offset, glitch, rows, head; plus color, palette, duration, easing, speed, intensity, particles.
 */
export declare const electric: Effect;

export interface ElectricBorderOptions {
  /** One colour for the arc. Wins over `palette`. */
  color?: string;
  /** A named palette or up to 8 hex colours, spread along the outline. Default 'electric'. */
  palette?: PaletteName | string[];
  /** When the border shows. Default 'always'. 'manual' waits for start(). */
  trigger?: 'always' | 'hover' | 'focus' | 'hover focus' | 'manual';
  /** px: width of the bright core. Default 1.6 */
  thickness?: number;
  /** px: glow around the arc. Default 14 */
  glow?: number;
  /** px: how far the arc strays from the outline. Default 5 */
  chaos?: number;
  /** px: size of one noise cell along the outline; smaller is more jagged. Default 34 */
  scale?: number;
  /** Speed of the crackle. Default 1 */
  crackle?: number;
  /** px: distance of the arc from the outline, + outside, - inside. Default 0 */
  offset?: number;
  /** 0 to 1+: overall strength. Default 1 */
  intensity?: number;
  /** ms to fade in and out. Defaults 220 and 380 */
  fadeIn?: number;
  fadeOut?: number;
  /** z-index of the shared canvas (all borders draw in one fixed canvas). Default 2147482000 */
  zIndex?: number;
}

export interface ElectricBorder {
  /** true while the border is meant to show (it may still be fading). */
  readonly active: boolean;
  start(): ElectricBorder;
  stop(): ElectricBorder;
  /** Change options live. */
  set(options: ElectricBorderOptions): ElectricBorder;
  /** Fade out and remove listeners for good. */
  destroy(): void;
}

/** An animated electric arc on the element's outline (rounded corners included). Respects prefers-reduced-motion (the arc stops moving). */
export function electricBorder(element: Element, options?: ElectricBorderOptions): ElectricBorder;

export const ELECTRIC: Readonly<Record<string, number | string>>;
export const BORDER: Readonly<Record<string, number | string>>;

type Radii = { tl: number; tr: number; br: number; bl: number };
/** Outline length of a w×h box with these corner radii. */
export function perimeterLength(w: number, h: number, radii: Radii): number;
/** Point and outward normal at an arc length along the outline (clockwise from the top-left end of the top edge). */
export function pointAt(t: number, w: number, h: number, radii: Radii): { x: number; y: number; nx: number; ny: number };
/** Arc length of the outline point closest to (x, y). */
export function paramAt(x: number, y: number, w: number, h: number, radii: Radii): number;
