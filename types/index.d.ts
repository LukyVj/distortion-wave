// Type definitions for distortion-wave

export type Variant = 'auto' | 'vertical' | 'horizontal' | 'center';
export type PaletteName = 'aurora' | 'ocean' | 'mint' | 'ember';
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

export interface DistortionWaveOptions {
  /** Where the wave starts. An element (inside or outside the target), a rect, a point, or nothing (touch point, else center). */
  source?: Element | RectLike | Point | null;
  /** Touch point: the wave starts there and leans that way. Pass the PointerEvent/MouseEvent. Keyboard clicks are ignored. */
  focus?: MouseEvent | PointerEvent | KeyboardEvent | Point | null;
  /** 'auto' picks from the source shape: wide → vertical, tall → horizontal, square or point → center. */
  variant?: Variant;
  /** A named palette or up to 8 hex colours. Interpolated in OKLab. */
  palette?: PaletteName | string[];
  /** Time multiplier (0.3 = slow motion). Default 1. */
  speed?: number;
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
  /** Any tuning key from the presets (amplitude, blur, rimWidth, lead, tail…), at reference scale. */
  [tuning: string]: unknown;
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
