"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { distortionWave, PALETTES, setWaveDefaults, type PaletteName } from "distortion-wave";
import { Button } from "@ui-sdk/react/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { highlight } from "./code";
import { DEFAULT_SETTINGS, origin, toDefaults, useWaveSettings, type Settings } from "./wave";

const EASINGS = [
  { value: "default", label: "Launch (default)" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
  { value: "linear", label: "Linear" },
];

const PALETTE_ITEMS: { value: Settings["palette"]; label: string }[] = [
  { value: "demo", label: "Each demo's own" },
  { value: "aurora", label: "Aurora" },
  { value: "ocean", label: "Ocean" },
  { value: "mint", label: "Mint" },
  { value: "ember", label: "Ember" },
];

function swatch(name: Settings["palette"]) {
  const colors = name === "demo" ? ["#c9d0db", "#8c94a8", "#c9d0db"] : PALETTES[name];
  return { background: `linear-gradient(90deg, ${colors.join(", ")})` };
}

const UNSET: Record<string, string> = {
  duration: "from the element's size",
  intensity: "1",
  easing: "the launch curve",
  palette: "each call's own, aurora when none",
  particles: "true",
};

function code(s: Settings) {
  const o = toDefaults(s) as Record<string, unknown>;
  const lines = Object.keys(UNSET).map((k) =>
    k in o
      ? `  ${k}: ${typeof o[k] === "string" ? `'${o[k]}'` : o[k]},`
      : `  // ${k}: ${UNSET[k]}`,
  );
  return `setWaveDefaults({\n${lines.join("\n")}\n})`;
}

export function Tuner() {
  const { settings, setSettings } = useWaveSettings();
  const panel = useRef<HTMLDivElement>(null);

  function apply(next: Settings, selector = "button") {
    setWaveDefaults(null);
    setWaveDefaults(toDefaults(next));
    if (!panel.current) return setSettings(next);
    distortionWave(panel.current, () => flushSync(() => setSettings(next)), origin(selector));
  }

  const auto = settings.duration == null;

  return (
    <div className="tuner">
      <div className="tuner-controls">
        <div className="control">
          <label className="control-row">
            <span className="control-name">Duration from the element&apos;s size</span>
            <Switch
              checked={auto}
              onCheckedChange={(checked) => apply({ ...settings, duration: checked ? null : 1800 })}
            >
              <SwitchThumb />
            </Switch>
          </label>
          <Slider
            className="slider"
            min={400}
            max={4000}
            step={100}
            disabled={auto}
            value={settings.duration ?? 1800}
            format={{ style: "unit", unit: "millisecond", unitDisplay: "short" }}
            onValueChange={(value) => setSettings({ ...settings, duration: value as number })}
            onValueCommit={(value) =>
              apply({ ...settings, duration: value as number }, '[data-slot="slider-thumb"]')
            }
          >
            <div className="control-row">
              <span className="control-name" id="duration-label">
                Duration
              </span>
              <SliderValue className="control-value" />
            </div>
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-labelledby="duration-label" />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>

        <Slider
          className="slider control"
          min={0}
          max={1.5}
          step={0.1}
          value={settings.intensity}
          format={{ maximumFractionDigits: 1 }}
          onValueChange={(value) => setSettings({ ...settings, intensity: value as number })}
          onValueCommit={(value) =>
            apply({ ...settings, intensity: value as number }, '[data-slot="slider-thumb"]')
          }
        >
          <div className="control-row">
            <span className="control-name" id="intensity-label">
              Distortion
            </span>
            <SliderValue className="control-value" />
          </div>
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-labelledby="intensity-label" />
            </SliderTrack>
          </SliderControl>
        </Slider>

        <Select
          value={settings.easing}
          onValueChange={(value) => value && apply({ ...settings, easing: value })}
        >
          <div className="control control-row">
            <SelectLabel className="control-name">Easing</SelectLabel>
            <SelectTrigger className="select-trigger">
              <SelectValue />
            </SelectTrigger>
          </div>
          <SelectContent className="select-content">
            {EASINGS.map((e) => (
              <SelectItem key={e.value} value={e.value} label={e.label}>
                {e.label}
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={settings.palette}
          onValueChange={(value) =>
            value && apply({ ...settings, palette: value as PaletteName | "demo" })
          }
        >
          <div className="control control-row">
            <SelectLabel className="control-name">Colours</SelectLabel>
            <SelectTrigger className="select-trigger">
              <SelectValue />
            </SelectTrigger>
          </div>
          <SelectContent className="select-content">
            {PALETTE_ITEMS.map((p) => (
              <SelectItem key={p.value} value={p.value} label={p.label}>
                <span className="swatch" style={swatch(p.value)} aria-hidden="true" />
                {p.label}
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="control control-row">
          <span className="control-name">Sparks</span>
          <Switch
            checked={settings.particles}
            onCheckedChange={(checked) => apply({ ...settings, particles: checked })}
          >
            <SwitchThumb />
          </Switch>
        </label>

        <Button className="btn btn-quiet" onClick={() => apply(DEFAULT_SETTINGS)}>
          Reset
        </Button>
      </div>

      <div ref={panel} className="tuner-code target">
        <pre aria-label="The settings above, as code">
          <code>{highlight(code(settings))}</code>
        </pre>
        <p>
          The page calls this for you. Every wave on it, the hero included, now runs with these
          settings.
        </p>
      </div>
    </div>
  );
}
