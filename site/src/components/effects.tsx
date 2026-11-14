"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { BORDER, electric, electricBorder, type ElectricBorder } from "distortion-wave/electric";
import { Button } from "@ui-sdk/react/button";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@ui-sdk/react/slider";
import { highlight } from "./code";
import { useWave } from "./wave";

const COLOURS = [
  { value: "#7df9ff", label: "Cyan" },
  { value: "#b18cff", label: "Violet" },
  { value: "#ffb347", label: "Amber" },
  { value: "#ff6fae", label: "Rose" },
  { value: "#6dffb3", label: "Mint" },
];

type BorderSettings = {
  trigger: "always" | "hover" | "focus";
  color: string;
  thickness: number;
  glow: number;
  chaos: number;
  scale: number;
  crackle: number;
  offset: number;
  intensity: number;
};

const D = BORDER as unknown as Record<string, number>;
const START: BorderSettings = {
  trigger: "always",
  color: COLOURS[0].value,
  thickness: D.thickness,
  glow: D.glow,
  chaos: D.chaos,
  scale: D.scale,
  crackle: D.crackle,
  offset: D.offset,
  intensity: D.intensity,
};

const RANGES: { key: keyof BorderSettings; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: "thickness", label: "Core", min: 0.4, max: 5, step: 0.1, unit: "px" },
  { key: "glow", label: "Glow", min: 0, max: 40, step: 1, unit: "px" },
  { key: "chaos", label: "Stray", min: 0, max: 16, step: 0.5, unit: "px" },
  { key: "scale", label: "Noise cell", min: 6, max: 100, step: 1, unit: "px" },
  { key: "crackle", label: "Crackle speed", min: 0, max: 4, step: 0.1 },
  { key: "offset", label: "Offset", min: -12, max: 12, step: 1, unit: "px" },
  { key: "intensity", label: "Strength", min: 0, max: 1.5, step: 0.05 },
];

function Range({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <Slider className="range" min={min} max={max} step={step} value={value} onValueChange={(v) => onChange(Math.round((v as number) * 100) / 100)}>
      <div className="control-row">
        <span className="control-name" id={id}>
          {label}
        </span>
        <span className="control-value">
          {value}
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

function useBorder(target: React.RefObject<HTMLElement | null>, options: Partial<BorderSettings>) {
  const border = useRef<ElectricBorder | null>(null);
  const { trigger, ...rest } = options;
  useEffect(() => {
    if (!target.current) return;
    border.current = electricBorder(target.current, { ...rest, trigger });
    return () => border.current?.destroy();
    // the trigger sets listeners: a new border when it changes; the rest goes through set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  const json = JSON.stringify(rest);
  useEffect(() => {
    border.current?.set(JSON.parse(json));
  }, [json]);
}

function code(s: BorderSettings) {
  const lines = (Object.keys(START) as (keyof BorderSettings)[])
    .filter((k) => s[k] !== START[k] || k === "color")
    .map((k) => `  ${k}: ${typeof s[k] === "string" ? `'${s[k]}'` : s[k]},`);
  return `import { electricBorder } from 'distortion-wave/electric'\n\nconst border = electricBorder(card, {\n${lines.join("\n")}\n})\n// later: border.destroy()`;
}

function BorderLab() {
  const card = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(START);
  useBorder(card, s);
  const set = <K extends keyof BorderSettings>(k: K, v: BorderSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="chamber">
      <div className="chamber-stage">
        <div ref={card} className="plan">
          <p className="plan-name">Pro</p>
          <p className="plan-price">
            $24 <span>per seat, per month</span>
          </p>
          <ul>
            <li>Unlimited projects</li>
            <li>Preview deployments</li>
            <li>Priority support</li>
          </ul>
          <Button className="btn btn-primary">Choose Pro</Button>
        </div>
        <p className="chamber-hint">
          {s.trigger === "always"
            ? "Always on."
            : s.trigger === "hover"
              ? "Point at the card."
              : "Tab to the button inside the card."}
        </p>
      </div>
      <div className="chamber-controls">
        <div className="control">
          <span className="control-name" id="trigger-label">
            Shows
          </span>
          <SegmentedControl
            className="segmented"
            aria-labelledby="trigger-label"
            value={s.trigger}
            onValueChange={(v) => v && set("trigger", v as BorderSettings["trigger"])}
          >
            <SegmentedControlIndicator />
            <SegmentedControlItem value="always">Always</SegmentedControlItem>
            <SegmentedControlItem value="hover">On hover</SegmentedControlItem>
            <SegmentedControlItem value="focus">On focus</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <div className="control">
          <span className="control-name" id="colour-label">
            Colour
          </span>
          <SegmentedControl
            className="segmented"
            aria-labelledby="colour-label"
            value={s.color}
            onValueChange={(v) => v && set("color", v)}
          >
            <SegmentedControlIndicator />
            {COLOURS.map((c) => (
              <SegmentedControlItem key={c.value} value={c.value}>
                <span className="colour-chip" style={{ background: c.value }} aria-hidden="true" />
                {c.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <div className="chamber-ranges">
          {RANGES.map((r) => (
            <Range
              key={r.key}
              label={r.label}
              value={s[r.key] as number}
              min={r.min}
              max={r.max}
              step={r.step}
              unit={r.unit}
              onChange={(v) => set(r.key, v as never)}
            />
          ))}
        </div>
        <pre className="chamber-code" aria-label="The border above, as code">
          <code>{highlight(code(s))}</code>
        </pre>
        <Button className="btn btn-quiet" onClick={() => setS(START)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

function Publish() {
  const card = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const wave = useWave();

  function toggle(e: MouseEvent<HTMLElement>) {
    wave(card, () => setLive((l) => !l), {
      effect: electric,
      source: e.currentTarget,
      focus: e.nativeEvent,
      palette: live ? ["#ffb347", "#ff6f3c", "#ffe08a"] : "electric",
    });
  }

  return (
    <div ref={card} className="post target" data-live={live || undefined}>
      <p className="post-status">{live ? "Live" : "Draft"}</p>
      <p className="post-title">Distortion waves on the web</p>
      <p className="post-meta">{live ? "Published just now. 3 readers." : "Last edited 2 minutes ago."}</p>
      <Button className="btn btn-primary" data-focus-key="publish" onClick={toggle}>
        {live ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}

const TIERS = [
  { name: "Starter", price: "Free", color: "#7df9ff" },
  { name: "Team", price: "$12", color: "#b18cff" },
  { name: "Scale", price: "$48", color: "#ffb347" },
];

function Tier({ name, price, color }: (typeof TIERS)[number]) {
  const ref = useRef<HTMLButtonElement>(null);
  useBorder(ref, { trigger: "hover", color, glow: 10, chaos: 4 } as Partial<BorderSettings>);
  return (
    <button ref={ref} type="button" className="tier">
      <span>{name}</span>
      <strong>{price}</strong>
    </button>
  );
}

export function Effects() {
  return (
    <>
      <BorderLab />
      <div className="fx-row">
        <figure className="demo">
          <div className="demo-body dark-bench">
            <Publish />
          </div>
          <figcaption>
            <strong>Electric transition.</strong> Two arcs leave the button and run round the card, then
            the content crackles to its new state. Same call, with <code>effect: electric</code>.
          </figcaption>
        </figure>
        <figure className="demo">
          <div className="demo-body dark-bench">
            <div className="tiers">
              {TIERS.map((t) => (
                <Tier key={t.name} {...t} />
              ))}
            </div>
          </div>
          <figcaption>
            <strong>On hover.</strong> Three borders, one canvas: every border of the page draws in the same
            WebGL context.
          </figcaption>
        </figure>
      </div>
    </>
  );
}
