// Type definitions for distortion-wave/electric

import type { Effect, PaletteName } from './index';

/**
 * The distortion wave with an electric look. Pass it as `effect`:
 * `distortionWave(card, update, { effect: electric, source: button })`.
 * Same behaviour as the wave (timing, lens, blur, sparks, every wave option): the front becomes a crackling bolt,
 * the colour band goes electric and the outline charges with arcs as the front passes.
 * Its own keys, at the wave's reference scale (360×740 px): jag, scale, crackle, chaos, boltWidth, boltGlow (px),
 * bolts, rimBolts (strengths). `intensity` also scales jag and chaos.
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

/** Defaults of the electric keys. */
export const ELECTRIC: Readonly<{ jag: number; scale: number; crackle: number; chaos: number; boltWidth: number; boltGlow: number; bolts: number; rimBolts: number }>;
/** Defaults of electricBorder(). */
export const BORDER: Readonly<Record<string, number | string>>;
