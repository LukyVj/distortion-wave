// Type definitions for distortion-wave

export type Variant = 'auto' | 'vertical' | 'horizontal' | 'center';
export type PaletteName = 'aurora' | 'ocean' | 'mint' | 'ember' | 'electric' | 'pixel';
export type Point = { x: number; y: number };
export type RectLike = { x: number; y: number; width: number; height: number };

export interface Metrics {
  /** ms spent capturing the element before the update */
  captureBefore?: number;
  /** ms spent capturing the element after the update */
  captureAfter?: number;
  /** ms spent uploading + blurring the first capture */
  upload?: number;
  /** longest frame seen during the transition, in ms */
  worstFrame?: number;
}

/** An effect from its own entry, like `electric` from 'distortion-wave/electric'. Opaque: pass it as `effect`. */
export interface Effect {
  readonly name: string;
}

export interface DistortionWaveOptions {
  /** The look of the wave. Default: the plain wave. Others come from their entry: `import { electric } from 'distortion-wave/electric'`, `import { pixel } from 'distortion-wave/pixel'`. */
  effect?: 'wave' | Effect;
  /** Where the wave starts. An element (inside or outside the target), a rect, a point, or nothing (touch point, else center). */
  source?: Element | RectLike | Point | null;
  /** Touch point: the wave starts there and leans that way. Pass the PointerEvent/MouseEvent. Keyboard clicks are ignored. */
  focus?: MouseEvent | PointerEvent | KeyboardEvent | Point | null;
  /** 'auto' picks from the source shape: wide → vertical, tall → horizontal, square or point → center. */
  variant?: Variant;
  /** A named palette or up to 8 hex colours. Interpolated in OKLab. */
  palette?: PaletteName | string[];
  /** Total length in ms, until `finished`. Default: from the size of the target (about 2 s for a button, 4 s for a page, the last half being the glow fading out). */
  duration?: number;
  /** How the front travels: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(…)', [x1, y1, x2, y2] or a function. */
  easing?: string | [number, number, number, number] | ((t: number) => number);
  /** Time multiplier on the automatic duration (0.3 = slow motion). Ignored when `duration` is set. Default 1. */
  speed?: number;
  /** Strength of the distortion (displacement, bulge, chromatic aberration). 0 keeps only the colours. Default 1. */
  intensity?: number;
  /** false to disable particles, or a particle count at reference scale. */
  particles?: boolean | number;
  /** Force reduced motion on/off. Default: follows prefers-reduced-motion. */
  reducedMotion?: boolean | null;
  /** Max ms to wait for the "after" capture before finishing without animation. Default 3000. */
  timeout?: number;
  /** Move keyboard focus to the equivalent control when the update replaces the focused node. Default true. */
  preserveFocus?: boolean;
  onLaunch?: () => void;
  onCovered?: () => void;
  onSettled?: () => void;
  onEnd?: (metrics: Metrics) => void;
  // Fine tuning, at reference scale (360×740 px): lengths in px, times in seconds. See the README.
  anticipation?: number; travel?: number; linger?: number; rimFade?: number;
  amplitude?: number; lensWidth?: number; swell?: number; aberration?: number;
  blur?: number; blurNear?: number; blurAhead?: number; blurBehind?: number;
  lead?: number; tail?: number; band?: number;
  rimWidth?: number; rimSoftness?: number; rimStrength?: number; hairWidth?: number;
  lean?: number; pull?: number; inhale?: number;
  particleSize?: number; particleLife?: number; reach?: number; spread?: number;
  // Electric effect only (same reference scale). See 'distortion-wave/electric'.
  jag?: number; scale?: number; crackle?: number; chaos?: number;
  boltWidth?: number; boltGlow?: number; bolts?: number; rimBolts?: number;
  // Pixel effect only. See 'distortion-wave/pixel'.
  cell?: number; gap?: number; zone?: number; density?: number; rate?: number; lit?: number; rimPixels?: number;
}

export interface WaveTransition {
  /** Resolves when the overlay is up and the animation started (or immediately when there is no animation). */
  readonly ready: Promise<void>;
  /** Resolves when your update callback finished. Rejects if it threw. */
  readonly updateCallbackDone: Promise<void>;
  /** Resolves when the wave has fully covered the target: safe to assume the old state is gone. */
  readonly covered: Promise<void>;
  /** Resolves when the overlay is gone and the real DOM is back. */
  readonly finished: Promise<void>;
  readonly metrics: Metrics;
  /** Jump to the end. The update still runs. */
  skip(): void;
}

/** Plays a distortion wave on `target` while `update` changes the DOM. `update` always runs, even without WebGL. */
export function distortionWave(target: Element, update?: () => void | Promise<void>, options?: DistortionWaveOptions): WaveTransition;

/** Click `trigger` → wave on `target`, starting from `trigger` at the touch point. Pre-captures on hover/focus. */
export function waveOnClick(trigger: Element, target: Element, update: (event: MouseEvent) => void | Promise<void>, options?: DistortionWaveOptions): void;

/** Options applied to every wave, under the per-call options. `null` resets them. Returns the current defaults. */
export function setWaveDefaults(options: DistortionWaveOptions | null): DistortionWaveOptions;

/** Pre-captures `target` (e.g. on hover) to hide the "before" capture latency. Invalidated by any DOM mutation. */
export function prepareWave(target: Element): Promise<unknown>;

/** Creates a WebGL context and compiles the shaders ahead of the first interaction. Returns false without WebGL2. */
export function warmupWave(): boolean;

/** Rasterizes an element as currently rendered (SVG foreignObject). */
export function snapshotElement(el: Element, options?: { dpr?: number; clip?: { x: number; y: number; w: number; h: number }; rootOpacity?: string }): Promise<{
  canvas: HTMLCanvasElement; w: number; h: number; dpr: number; ms: number; bytes: number;
}>;

export const PALETTES: Record<PaletteName, string[]>;
export const PRESETS: Record<'vertical' | 'horizontal' | 'center', Record<string, unknown>>;
export function scaleConfig(config: Record<string, unknown>, width: number, height: number): Record<string, unknown>;
export function totalDuration(config: Record<string, unknown>): number;
export function frameState(t: number, config: Record<string, unknown>, geometry: Record<string, unknown>): Record<string, unknown>;
