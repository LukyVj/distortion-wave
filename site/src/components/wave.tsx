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

export const TUNING_ELECTRIC = {
  timing: {
    label: "Timing",
    keys: [
      { key: "charge", label: "Arcs run round", min: 0.1, max: 2, step: 0.05, unit: "s" },
      { key: "surge", label: "Content crackles", min: 0.05, max: 1.5, step: 0.05, unit: "s" },
      { key: "discharge", label: "Outline discharges", min: 0.1, max: 3, step: 0.05, unit: "s" },
    ],
  },
  arc: {
    label: "Arc",
    keys: [
      { key: "thickness", label: "Core", min: 0.4, max: 6, step: 0.1, unit: "px" },
      { key: "glow", label: "Glow", min: 0, max: 50, step: 1, unit: "px" },
      { key: "chaos", label: "Stray", min: 0, max: 20, step: 0.5, unit: "px" },
      { key: "scale", label: "Noise cell", min: 6, max: 120, step: 1, unit: "px" },
      { key: "crackle", label: "Crackle speed", min: 0, max: 6, step: 0.1, unit: "" },
      { key: "offset", label: "Offset", min: -20, max: 20, step: 1, unit: "px" },
      { key: "head", label: "Head length", min: 0, max: 120, step: 2, unit: "px" },
    ],
  },
  glitch: {
    label: "Glitch",
    keys: [
      { key: "glitch", label: "Row jump", min: 0, max: 60, step: 1, unit: "px" },
      { key: "rows", label: "Row height", min: 4, max: 60, step: 1, unit: "px" },
    ],
  },
  sparks: {
    label: "Sparks",
    keys: [
      { key: "particleSize", label: "Size", min: 0.5, max: 5, step: 0.1, unit: "px" },
      { key: "particleLife", label: "Life", min: 0.1, max: 3, step: 0.05, unit: "s" },
    ],
  },
} as const;

type Groups = typeof TUNING | typeof TUNING_ELECTRIC;
export type TuneKey =
  | (typeof TUNING)[keyof typeof TUNING]["keys"][number]["key"]
  | (typeof TUNING_ELECTRIC)[keyof typeof TUNING_ELECTRIC]["keys"][number]["key"];
export type TuneGroup = { label: string; keys: readonly { key: TuneKey; label: string; min: number; max: number; step: number; unit: string }[] };
export function tuningFor(effect: Settings["effect"]): Record<string, TuneGroup> {
  return (effect === "electric" ? TUNING_ELECTRIC : TUNING) as Groups as Record<string, TuneGroup>;
}

export type Settings = {
  effect: "wave" | "electric";
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
  if (s.effect === "electric") o.effect = electric;
  if (s.duration != null) o.duration = s.duration;
  else if (s.speed !== 1) o.speed = s.speed;
  if (s.easing !== "default") o.easing = s.easing;
  if (s.intensity !== 1) o.intensity = s.intensity;
  if (s.variant !== "auto" && s.effect === "wave") o.variant = s.variant;
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
