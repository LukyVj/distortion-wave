"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { electric, electricBorder, type ElectricBorder } from "distortion-wave/electric";
import { pixel } from "distortion-wave/pixel";
import { Button } from "@ui-sdk/react/button";
import { useWave } from "./wave";

type BorderOptions = { trigger?: "always" | "hover" | "focus"; color?: string; glow?: number; chaos?: number };

function useBorder(target: React.RefObject<HTMLElement | null>, options: BorderOptions) {
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

function Build() {
  const card = useRef<HTMLDivElement>(null);
  const [passed, setPassed] = useState(false);
  const wave = useWave();

  function rerun(e: MouseEvent<HTMLElement>) {
    wave(card, () => setPassed((p) => !p), { effect: pixel, source: e.currentTarget, focus: e.nativeEvent });
  }

  return (
    <div ref={card} className="build target" data-passed={passed || undefined}>
      <p className="build-head">
        <span className="build-dot" aria-hidden="true" />
        {passed ? "Build #219 passed" : "Build #218 failed"}
      </p>
      <p className="build-meta">{passed ? "42 tests, 1 min 08 s. Deployed to preview." : "2 tests failed in checkout.spec.ts."}</p>
      <Button className="btn btn-primary" data-focus-key="rerun" onClick={rerun}>
        {passed ? "Run again" : "Re-run build"}
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
  useBorder(ref, { trigger: "hover", color, glow: 10, chaos: 4 });
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
      <div className="fx-row">
        <figure className="demo">
          <div className="demo-body dark-bench">
            <Publish />
          </div>
          <figcaption>
            <strong>Electric.</strong> The same wave, same timing and lens: the front is a crackling bolt and
            the outline charges as it passes. <code>effect: electric</code>
          </figcaption>
        </figure>
        <figure className="demo">
          <div className="demo-body dark-bench">
            <Build />
          </div>
          <figcaption>
            <strong>Pixel.</strong> The same wave again: near the front the content breaks into small pixels
            that flip one by one, and the outline goes out pixel by pixel. <code>effect: pixel</code>
          </figcaption>
        </figure>
      </div>
      <figure className="demo fx-wide">
        <div className="demo-body dark-bench">
          <div className="tiers">
            {TIERS.map((t) => (
              <Tier key={t.name} {...t} />
            ))}
          </div>
        </div>
        <figcaption>
          <strong>Electric border, on hover.</strong> The electric arcs also make a border that stays on. Three
          borders, one canvas: every border of the page draws in the same WebGL context.
        </figcaption>
      </figure>
    </>
  );
}
