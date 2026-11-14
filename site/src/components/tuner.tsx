"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { distortionWave, PALETTES, PRESETS, setWaveDefaults, type PaletteName } from "distortion-wave";
import { electric, ELECTRIC } from "distortion-wave/electric";
import { pixel, PIXEL } from "distortion-wave/pixel";
import { Button } from "@ui-sdk/react/button";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
} from "@ui-sdk/react/color-picker";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@ui-sdk/react/slider";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { highlight } from "./code";
import {
  DEFAULT_SETTINGS,
  origin,
  toDefaults,
  tuningFor,
  useWaveSettings,
  type Settings,
  type TuneKey,
} from "./wave";

const EASINGS = [
  { value: "default", label: "Launch (default)" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
  { value: "ease-in", label: "Ease in" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.7, 0, 0.2, 1)", label: "Snap" },
];

const PALETTE_ITEMS: { value: Settings["palette"]; label: string }[] = [
  { value: "demo", label: "Each demo's own" },
  { value: "aurora", label: "Aurora" },
  { value: "ocean", label: "Ocean" },
  { value: "mint", label: "Mint" },
  { value: "ember", label: "Ember" },
  { value: "custom", label: "Your colours" },
];

const BASE = PRESETS.vertical as Record<string, number>;
const BASES = {
  wave: BASE,
  electric: { ...BASE, ...(electric as unknown as { preset: Record<string, number> }).preset, ...ELECTRIC } as Record<string, number>,
  pixel: { ...BASE, ...(pixel as unknown as { preset: Record<string, number> }).preset, ...PIXEL } as Record<string, number>,
};
const THUMB = '[data-slot="slider-thumb"]';
const SEGMENT = '[data-slot="segmented-control-item"]';

function swatch(s: Settings, name: Settings["palette"]) {
  const colors =
    name === "demo" ? ["#c9d0db", "#8c94a8", "#c9d0db"] : name === "custom" ? s.custom : PALETTES[name];
  return { background: `linear-gradient(90deg, ${colors.join(", ")})` };
}

function round(v: number) {
  return Math.round(v * 1000) / 1000;
}

function code(s: Settings) {
  const o = toDefaults(s) as Record<string, unknown>;
  const show = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as { name: string }).name
      : typeof v === "string"
      ? `'${v}'`
      : Array.isArray(v)
        ? `[${v.map((c) => `'${c}'`).join(", ")}]`
        : String(v);
  const lines = Object.entries(o).map(([k, v]) => `  ${k}: ${show(v)},`);
  if (!lines.length)
    return "setWaveDefaults(null)\n// every option at its default: duration from the\n// element's size, aurora unless a call sets colours";
  const head = s.effect === "wave" ? "" : `import { ${s.effect} } from 'distortion-wave/${s.effect}'\n\n`;
  return `${head}setWaveDefaults({\n${lines.join("\n")}\n})`;
}

type Apply = (next: Settings, selector?: string) => void;

function Range({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  changed,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  changed?: boolean;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const id = useId();
  return (
    <Slider
      className="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={(v) => onChange(round(v as number))}
      onValueCommit={(v) => onCommit(round(v as number))}
    >
      <div className="control-row">
        <span className="control-name" id={id}>
          {label}
        </span>
        <span className="control-value" data-changed={changed || undefined}>
          {round(value)}
          {unit && ` ${unit}`}
        </span>
      </div>
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          <SliderThumb aria-labelledby={id} />
        </SliderTrack>
      </SliderControl>
    </Slider>
  );
}

function CustomColours({
  settings,
  setSettings,
  apply,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  apply: Apply;
}) {
  return (
    <div className="custom-colours">
      {settings.custom.map((color, i) => {
        const set = (value: string): Settings => {
          const custom = [...settings.custom] as Settings["custom"];
          custom[i] = value;
          return { ...settings, custom };
        };
        return (
          <Popover key={i}>
            <PopoverTrigger className="colour-trigger" aria-label={`Colour ${i + 1}`}>
              <span className="colour-dot" style={{ background: color }} />
            </PopoverTrigger>
            <PopoverContent className="colour-popover" sideOffset={8}>
              <PopoverTitle className="colour-title">Colour {i + 1}</PopoverTitle>
              <ColorPicker
                aria-label={`Colour ${i + 1}`}
                format="hex"
                value={color}
                onValueChange={(value) => setSettings(set(value))}
                onValueCommit={(value) => apply(set(value), ".colour-popover")}
              >
                <ColorPickerArea className="colour-area">
                  <ColorPickerAreaThumb />
                </ColorPickerArea>
                <ColorPickerSlider channel="hue" className="colour-hue">
                  <ColorPickerSliderThumb />
                </ColorPickerSlider>
                <ColorPickerInput aria-label="Hex" />
              </ColorPicker>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

export function Tuner() {
  const { settings, setSettings } = useWaveSettings();
  const panel = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const TUNING = tuningFor(settings.effect);
  const group = picked[settings.effect] in TUNING ? picked[settings.effect] : Object.keys(TUNING)[0];
  const base = BASES[settings.effect];

  const apply: Apply = (next, selector = "button") => {
    setWaveDefaults(null);
    setWaveDefaults(toDefaults(next));
    if (!panel.current) return setSettings(next);
    distortionWave(panel.current, () => flushSync(() => setSettings(next)), origin(selector));
  };

  const auto = settings.duration == null;
  const tune = (key: TuneKey, v: number): Settings => ({
    ...settings,
    tuning: { ...settings.tuning, [key]: v },
  });
  const groupChanged = TUNING[group].keys.some((k) => k.key in settings.tuning);

  return (
    <div className="tuner">
      <div className="tuner-basics">
        <div className="control">
          <span className="control-name" id="effect-label">
            Effect
          </span>
          <SegmentedControl
            className="segmented"
            aria-labelledby="effect-label"
            value={settings.effect}
            onValueChange={(v) => v && apply({ ...settings, effect: v as Settings["effect"] }, SEGMENT)}
          >
            <SegmentedControlIndicator />
            <SegmentedControlItem value="wave">Wave</SegmentedControlItem>
            <SegmentedControlItem value="electric">Electric</SegmentedControlItem>
            <SegmentedControlItem value="pixel">Pixel</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <label className="control-row">
          <span className="control-name">Duration from the element&apos;s size</span>
          <Switch
            checked={auto}
            onCheckedChange={(c) => apply({ ...settings, duration: c ? null : 1800 })}
          >
            <SwitchThumb />
          </Switch>
        </label>
        {auto ? (
          <Range
            label="Speed"
            value={settings.speed}
            min={0.25}
            max={2.5}
            step={0.05}
            unit="×"
            changed={settings.speed !== 1}
            onChange={(v) => setSettings({ ...settings, speed: v })}
            onCommit={(v) => apply({ ...settings, speed: v }, THUMB)}
          />
        ) : (
          <Range
            label="Duration"
            value={settings.duration ?? 1800}
            min={300}
            max={5000}
            step={100}
            unit="ms"
            changed
            onChange={(v) => setSettings({ ...settings, duration: v })}
            onCommit={(v) => apply({ ...settings, duration: v }, THUMB)}
          />
        )}
        <Range
          label="Distortion"
          value={settings.intensity}
          min={0}
          max={2}
          step={0.05}
          changed={settings.intensity !== 1}
          onChange={(v) => setSettings({ ...settings, intensity: v })}
          onCommit={(v) => apply({ ...settings, intensity: v }, THUMB)}
        />

        <Select value={settings.easing} onValueChange={(v) => v && apply({ ...settings, easing: v })}>
          <div className="control-row">
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

        <div className="control">
          <span className="control-name" id="direction-label">
            Direction
          </span>
          <SegmentedControl
            className="segmented"
            aria-labelledby="direction-label"
            value={settings.variant}
            onValueChange={(v) => v && apply({ ...settings, variant: v as Settings["variant"] }, SEGMENT)}
          >
            <SegmentedControlIndicator />
            <SegmentedControlItem value="auto">Auto</SegmentedControlItem>
            <SegmentedControlItem value="vertical">Down</SegmentedControlItem>
            <SegmentedControlItem value="horizontal">Across</SegmentedControlItem>
            <SegmentedControlItem value="center">Ring</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <Select
          value={settings.palette}
          onValueChange={(v) => v && apply({ ...settings, palette: v as PaletteName | "demo" | "custom" })}
        >
          <div className="control-row">
            <SelectLabel className="control-name">Colours</SelectLabel>
            <SelectTrigger className="select-trigger">
              <SelectValue />
            </SelectTrigger>
          </div>
          <SelectContent className="select-content">
            {PALETTE_ITEMS.map((p) => (
              <SelectItem key={p.value} value={p.value} label={p.label}>
                <span className="swatch" style={swatch(settings, p.value)} aria-hidden="true" />
                {p.label}
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {settings.palette === "custom" && (
          <CustomColours settings={settings} setSettings={setSettings} apply={apply} />
        )}

        <label className="control-row">
          <span className="control-name">Sparks</span>
          <Switch
            checked={settings.particles}
            onCheckedChange={(c) => apply({ ...settings, particles: c })}
          >
            <SwitchThumb />
          </Switch>
        </label>
        {settings.particles && (
          <Range
            label="Number of sparks"
            value={settings.particleCount ?? base.particles}
            min={0}
            max={240}
            step={4}
            changed={settings.particleCount != null}
            onChange={(v) => setSettings({ ...settings, particleCount: v })}
            onCommit={(v) => apply({ ...settings, particleCount: v }, THUMB)}
          />
        )}

        <div className="control">
          <span className="control-name" id="motion-label">
            Reduced motion
          </span>
          <SegmentedControl
            className="segmented"
            aria-labelledby="motion-label"
            value={settings.motion}
            onValueChange={(v) => v && apply({ ...settings, motion: v as Settings["motion"] }, SEGMENT)}
          >
            <SegmentedControlIndicator />
            <SegmentedControlItem value="system">Follow system</SegmentedControlItem>
            <SegmentedControlItem value="wave">Always wave</SegmentedControlItem>
            <SegmentedControlItem value="fade">Always fade</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </div>

      <div className="tuner-side">
        <div ref={panel} className="tuner-code target">
          <pre aria-label="The settings, as code">
            <code>{highlight(code(settings))}</code>
          </pre>
        </div>
        <div className="tuner-actions">
          <Button
            className="btn btn-primary"
            onClick={(e) =>
              panel.current &&
              distortionWave(panel.current, undefined, { source: e.currentTarget, focus: e.nativeEvent })
            }
          >
            Play a wave here
          </Button>
          <Button className="btn btn-quiet" onClick={() => apply(DEFAULT_SETTINGS)}>
            Reset everything
          </Button>
        </div>
        <p className="tuner-note">
          The page calls this for you: every wave on it, the hero included, runs with these settings.
          Each change plays a wave on the code.
        </p>
      </div>

      <Tabs className="fine" value={group} onValueChange={(v) => v && setPicked((p) => ({ ...p, [settings.effect]: v }))}>
        <div className="fine-head">
          <h3>Fine tuning</h3>
          <p>Lengths are for a 360 × 740 element. They scale with the real size.</p>
        </div>
        <TabsList aria-label="Fine tuning">
          {Object.entries(TUNING).map(([key, g]) => (
            <TabsTab key={key} value={key}>
              {g.label}
              {g.keys.some((k) => k.key in settings.tuning) && <span className="dot" aria-hidden="true" />}
            </TabsTab>
          ))}
        </TabsList>
        {Object.entries(TUNING).map(([key, g]) => (
          <TabsPanel key={key} value={key} className="fine-panel">
            {g.keys.map((k) => (
              <Range
                key={k.key}
                label={k.label}
                value={settings.tuning[k.key] ?? base[k.key]}
                min={k.min}
                max={k.max}
                step={k.step}
                unit={k.unit}
                changed={k.key in settings.tuning}
                onChange={(v) => setSettings(tune(k.key, v))}
                onCommit={(v) => apply(tune(k.key, v), THUMB)}
              />
            ))}
          </TabsPanel>
        ))}
        <Button
          className="btn btn-quiet fine-reset"
          disabled={!groupChanged}
          onClick={() => {
            const tuning = { ...settings.tuning };
            for (const k of TUNING[group].keys) delete tuning[k.key];
            apply({ ...settings, tuning });
          }}
        >
          Reset {TUNING[group].label.toLowerCase()}
        </Button>
      </Tabs>
    </div>
  );
}
