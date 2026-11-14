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

export type Settings = {
  duration: number | null;
  intensity: number;
  easing: string;
  palette: PaletteName | "demo";
  particles: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  duration: null,
  intensity: 1,
  easing: "default",
  palette: "demo",
  particles: true,
};

export function toDefaults(s: Settings): DistortionWaveOptions {
  const o: DistortionWaveOptions = {};
  if (s.duration != null) o.duration = s.duration;
  if (s.intensity !== 1) o.intensity = s.intensity;
  if (s.easing !== "default") o.easing = s.easing;
  if (s.palette !== "demo") o.palette = s.palette;
  if (!s.particles) o.particles = false;
  return o;
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
