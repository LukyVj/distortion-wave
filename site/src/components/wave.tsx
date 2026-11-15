"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import {
  distortionWave,
  setWaveDefaults,
  warmupWave,
  type DistortionWaveOptions,
  type PaletteName,
} from "distortion-wave";
import { electric } from "distortion-wave/electric";
import { pixel } from "distortion-wave/pixel";
import { glass } from "distortion-wave/glass";
import { burn } from "distortion-wave/burn";
import { ink } from "distortion-wave/ink";
import { halftone } from "distortion-wave/halftone";
import { metal } from "distortion-wave/metal";
import { water } from "distortion-wave/water";
import { vine } from "distortion-wave/vine";

export const EFFECTS = { electric, pixel, glass, burn, ink, halftone, metal, water, vine };
export type EffectName = "wave" | keyof typeof EFFECTS;

export const TUNING = {
  timing: {
    label: "Timing",
    keys: [
      { key: "anticipation", label: "Inhale before launch", min: 0, max: 1.5, step: 0.05, unit: "s" },
      { key: "travel", label: "Travel across", min: 0.4, max: 5, step: 0.1, unit: "s" },
      { key: "linger", label: "Edge clears after", min: -1, max: 1.5, step: 0.05, unit: "s" },
      { key: "rimFade", label: "Edge fade", min: 0.2, max: 5, step: 0.1, unit: "s" },
    ],
  },
  lens: {
    label: "Lens",
    keys: [
      { key: "amplitude", label: "Displacement", min: 0, max: 90, step: 1, unit: "px" },
      { key: "lensWidth", label: "Lens width", min: 20, max: 400, step: 5, unit: "px" },
      { key: "swell", label: "Bulge", min: 0, max: 60, step: 1, unit: "px" },
      { key: "aberration", label: "Colour split", min: 0, max: 2.5, step: 0.05, unit: "" },
      { key: "lean", label: "Lean to the touch", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  blur: {
    label: "Blur",
    keys: [
      { key: "blur", label: "Strength", min: 0, max: 40, step: 1, unit: "px" },
      { key: "blurNear", label: "At the front", min: 0, max: 20, step: 0.5, unit: "px" },
      { key: "blurAhead", label: "Reach ahead", min: 0, max: 300, step: 5, unit: "px" },
      { key: "blurBehind", label: "Reach behind", min: 0, max: 500, step: 10, unit: "px" },
    ],
  },
  band: {
    label: "Colour band",
    keys: [
      { key: "band", label: "Strength", min: 0, max: 1.5, step: 0.05, unit: "" },
      { key: "lead", label: "Length ahead", min: 0, max: 300, step: 5, unit: "px" },
      { key: "tail", label: "Length behind", min: 0, max: 600, step: 10, unit: "px" },
    ],
  },
  edge: {
    label: "Edge",
    keys: [
      { key: "rimStrength", label: "Glow strength", min: 0, max: 1.5, step: 0.05, unit: "" },
      { key: "rimWidth", label: "Glow width", min: 0, max: 40, step: 1, unit: "px" },
      { key: "rimSoftness", label: "Glow reach", min: 0, max: 600, step: 10, unit: "px" },
      { key: "hairWidth", label: "Hairline", min: 0, max: 4, step: 0.1, unit: "px" },
    ],
  },
  pull: {
    label: "Pull",
    keys: [
      { key: "pull", label: "Pull to the source", min: 0, max: 60, step: 1, unit: "px" },
      { key: "inhale", label: "Inhale ring", min: 0, max: 120, step: 1, unit: "px" },
    ],
  },
  sparks: {
    label: "Sparks",
    keys: [
      { key: "particleSize", label: "Size", min: 0.5, max: 5, step: 0.1, unit: "px" },
      { key: "particleLife", label: "Life", min: 0.3, max: 5, step: 0.1, unit: "s" },
      { key: "reach", label: "Reach", min: 0, max: 300, step: 5, unit: "px" },
      { key: "spread", label: "Spread", min: 0, max: 3, step: 0.05, unit: "" },
    ],
  },
} as const;

// electric: the wave's own groups, plus the look of the lightning
export const TUNING_ELECTRIC = {
  lightning: {
    label: "Lightning",
    keys: [
      { key: "jag", label: "Jagged front", min: 0, max: 40, step: 1, unit: "px" },
      { key: "scale", label: "Noise cell", min: 10, max: 160, step: 2, unit: "px" },
      { key: "crackle", label: "Crackle speed", min: 0, max: 6, step: 0.1, unit: "" },
      { key: "chaos", label: "Bolt stray", min: 0, max: 24, step: 0.5, unit: "px" },
      { key: "boltWidth", label: "Bolt core", min: 0.4, max: 6, step: 0.1, unit: "px" },
      { key: "boltGlow", label: "Bolt glow", min: 0, max: 50, step: 1, unit: "px" },
      { key: "bolts", label: "Bolts on the front", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "rimBolts", label: "Arcs on the outline", min: 0, max: 3, step: 0.05, unit: "" },
    ],
  },
  ...TUNING,
} as const;

// pixel: the wave's own groups, plus the pixels
export const TUNING_PIXEL = {
  pixels: {
    label: "Pixels",
    keys: [
      { key: "cell", label: "Pixel size", min: 2, max: 24, step: 1, unit: "px" },
      { key: "gap", label: "Gap", min: 0, max: 6, step: 0.5, unit: "px" },
      { key: "zone", label: "Pixel zone", min: 0.2, max: 4, step: 0.1, unit: "×" },
      { key: "density", label: "Lit pixels", min: 0, max: 1, step: 0.05, unit: "" },
      { key: "rate", label: "Flicker", min: 0, max: 40, step: 1, unit: "/s" },
      { key: "lit", label: "Lit strength", min: 0, max: 1.5, step: 0.05, unit: "" },
      { key: "rimPixels", label: "Outline pixels", min: 0, max: 2, step: 0.05, unit: "" },
    ],
  },
  ...TUNING,
} as const;

// the other looks: their own group, shown before the wave's
const FX_TUNING = {
  glass: {
    label: "Glass",
    keys: [
      { key: "thickness", label: "Slab width", min: 10, max: 240, step: 2, unit: "px" },
      { key: "refraction", label: "Refraction", min: 0, max: 80, step: 1, unit: "px" },
      { key: "dispersion", label: "RGB split", min: 0, max: 20, step: 0.5, unit: "px" },
      { key: "shine", label: "Highlights", min: 0, max: 2, step: 0.05, unit: "" },
      { key: "tint", label: "Tint", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  burn: {
    label: "Fire",
    keys: [
      { key: "roughness", label: "Ragged edge", min: 0, max: 80, step: 1, unit: "px" },
      { key: "scale", label: "Noise cell", min: 16, max: 300, step: 4, unit: "px" },
      { key: "char", label: "Scorch ahead", min: 6, max: 200, step: 2, unit: "px" },
      { key: "heat", label: "Glowing edge", min: 2, max: 30, step: 0.5, unit: "px" },
      { key: "embers", label: "Embers", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "smoke", label: "Smoke", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  ink: {
    label: "Ink",
    keys: [
      { key: "bleed", label: "Bleed", min: 0, max: 80, step: 1, unit: "px" },
      { key: "scale", label: "Noise cell", min: 16, max: 300, step: 4, unit: "px" },
      { key: "misregister", label: "Misregistration", min: 0, max: 12, step: 0.5, unit: "px" },
      { key: "grain", label: "Paper grain", min: 0, max: 1, step: 0.05, unit: "" },
      { key: "zone", label: "Print zone", min: 0.2, max: 4, step: 0.1, unit: "×" },
      { key: "ink", label: "Wet ink", min: 4, max: 120, step: 2, unit: "px" },
    ],
  },
  halftone: {
    label: "Halftone",
    keys: [
      { key: "cell", label: "Screen cell", min: 3, max: 24, step: 1, unit: "px" },
      { key: "angle", label: "Screen angle", min: 0, max: 90, step: 1, unit: "°" },
      { key: "zone", label: "Screen zone", min: 0.2, max: 4, step: 0.1, unit: "×" },
      { key: "size", label: "Largest dot", min: 0.2, max: 2, step: 0.05, unit: "×" },
      { key: "ink", label: "Palette ink", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  metal: {
    label: "Liquid metal",
    keys: [
      { key: "thickness", label: "Bead width", min: 10, max: 160, step: 2, unit: "px" },
      { key: "wobble", label: "Wobble", min: 0, max: 60, step: 1, unit: "px" },
      { key: "ripple", label: "Ripples", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "shine", label: "Specular", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "reflect", label: "Mirrors the content", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  water: {
    label: "Water",
    keys: [
      { key: "wavelength", label: "Ripple length", min: 10, max: 140, step: 2, unit: "px" },
      { key: "refraction", label: "Refraction", min: 0, max: 40, step: 0.5, unit: "px" },
      { key: "caustics", label: "Caustics", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "foam", label: "Foam", min: 0, max: 2, step: 0.05, unit: "" },
      { key: "tint", label: "Tint", min: 0, max: 1, step: 0.05, unit: "" },
    ],
  },
  vine: {
    label: "Vine",
    keys: [
      { key: "leaf", label: "Leaf size", min: 6, max: 60, step: 1, unit: "px" },
      { key: "zone", label: "Foliage depth", min: 0.2, max: 2, step: 0.05, unit: "×" },
      { key: "bumps", label: "Leafy bumps", min: 0, max: 40, step: 1, unit: "" },
      { key: "fall", label: "Falling leaves", min: 0, max: 3, step: 0.05, unit: "" },
      { key: "vine", label: "Vine around", min: 0, max: 2, step: 0.05, unit: "" },
      { key: "vineWidth", label: "Stem width", min: 1, max: 8, step: 0.5, unit: "px" },
    ],
  },
} as const;

type FxKey = (typeof FX_TUNING)[keyof typeof FX_TUNING]["keys"][number]["key"];
export type TuneKey =
  | (typeof TUNING)[keyof typeof TUNING]["keys"][number]["key"]
  | (typeof TUNING_ELECTRIC)[keyof typeof TUNING_ELECTRIC]["keys"][number]["key"]
  | (typeof TUNING_PIXEL)[keyof typeof TUNING_PIXEL]["keys"][number]["key"]
  | FxKey;
export type TuneGroup = { label: string; keys: readonly { key: TuneKey; label: string; min: number; max: number; step: number; unit: string }[] };
export function tuningFor(effect: Settings["effect"]): Record<string, TuneGroup> {
  if (effect === "electric") return TUNING_ELECTRIC as unknown as Record<string, TuneGroup>;
  if (effect === "pixel") return TUNING_PIXEL as unknown as Record<string, TuneGroup>;
  if (effect === "wave") return TUNING as unknown as Record<string, TuneGroup>;
  return { [effect]: FX_TUNING[effect], ...TUNING } as unknown as Record<string, TuneGroup>;
}
/** The groups that belong to the effect, not to the wave. */
export const isLookGroup = (key: string) => !(key in TUNING);

export type Settings = {
  effect: EffectName;
  duration: number | null;
  speed: number;
  easing: string;
  intensity: number;
  variant: "auto" | "vertical" | "horizontal" | "center";
  palette: PaletteName | "demo" | "custom";
  custom: [string, string, string];
  particles: boolean;
  particleCount: number | null;
  motion: "system" | "wave" | "fade";
  tuning: Partial<Record<TuneKey, number>>;
};

export const DEFAULT_SETTINGS: Settings = {
  effect: "wave",
  duration: null,
  speed: 1,
  easing: "default",
  intensity: 1,
  variant: "auto",
  palette: "demo",
  custom: ["#ff4fd8", "#5b7cff", "#ffd36b"],
  particles: true,
  particleCount: null,
  motion: "system",
  tuning: {},
};

export function toDefaults(s: Settings): DistortionWaveOptions {
  const o: DistortionWaveOptions = {};
  if (s.effect !== "wave") o.effect = EFFECTS[s.effect];
  if (s.duration != null) o.duration = s.duration;
  else if (s.speed !== 1) o.speed = s.speed;
  if (s.easing !== "default") o.easing = s.easing;
  if (s.intensity !== 1) o.intensity = s.intensity;
  if (s.variant !== "auto") o.variant = s.variant;
  if (s.palette === "custom") o.palette = [...s.custom];
  else if (s.palette !== "demo") o.palette = s.palette;
  if (!s.particles) o.particles = false;
  else if (s.particleCount != null) o.particles = s.particleCount;
  if (s.motion !== "system") o.reducedMotion = s.motion === "fade";
  const keys = Object.values(tuningFor(s.effect)).flatMap((g) => g.keys.map((k) => k.key as string));
  const tuning = Object.fromEntries(Object.entries(s.tuning).filter(([k]) => keys.includes(k)));
  return { ...o, ...tuning };
}

type Ctx = { settings: Settings; setSettings: (s: Settings) => void };
const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
});

export function WaveProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(trackPresses, []);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => warmupWave());
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => warmupWave(), 300);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setWaveDefaults(null);
    setWaveDefaults(toDefaults(settings));
  }, [settings]);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useWaveSettings() {
  return useContext(SettingsContext);
}

let press: { x: number; y: number; el: Element | null; at: number } | null = null;

function trackPresses() {
  const onDown = (e: PointerEvent) => {
    press = { x: e.clientX, y: e.clientY, el: e.target as Element | null, at: performance.now() };
  };
  document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  return () => document.removeEventListener("pointerdown", onDown, { capture: true });
}

// onValueChange gets no event: take the source and the touch point from the last press,
// or the focused element when the change came from the keyboard.
export function origin(selector: string) {
  const recent = press && performance.now() - press.at < 800 ? press : null;
  const from = recent?.el ?? document.activeElement;
  return {
    source: from?.closest(selector) ?? null,
    focus: recent ? { x: recent.x, y: recent.y } : null,
  };
}

type Target = RefObject<HTMLElement | null> | HTMLElement | null;

export function useWave() {
  const { settings } = useContext(SettingsContext);
  const forced = settings.palette !== "demo";
  return useCallback(
    (target: Target, update: () => void, options: DistortionWaveOptions = {}) => {
      const el = target && "current" in target ? target.current : target;
      if (!el) {
        update();
        return null;
      }
      const opts = { ...options };
      if (forced) delete opts.palette;
      return distortionWave(el, () => flushSync(update), opts);
    },
    [forced],
  );
}
