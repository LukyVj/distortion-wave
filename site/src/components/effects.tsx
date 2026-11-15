"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { electric, electricBorder, type ElectricBorder } from "distortion-wave/electric";
import { pixel } from "distortion-wave/pixel";
import type { Effect } from "distortion-wave";
import { Button } from "@ui-sdk/react/button";
import { EFFECTS, useWave } from "./wave";

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

// The other looks: one card each, two states, the same wave.
type LookCard = {
  effect: keyof typeof EFFECTS;
  name: string;
  caption: string;
  paper?: boolean;
  tag: [string, string];
  title: [string, string];
  meta: [string, string];
  action: [string, string];
};

const LOOKS: LookCard[] = [
  {
    effect: "glass",
    name: "Glass",
    caption: "A thick slab of glass trails the front: it bends what's under it, splits it into RGB at its slopes and catches the light.",
    tag: ["Notifications on", "Focus"],
    title: ["Inbox, 24 unread", "Quiet until 2 pm"],
    meta: ["3 threads mention you.", "Only calls from favourites get through."],
    action: ["Start focus", "End focus"],
  },
  {
    effect: "burn",
    name: "Burn",
    caption: "The front burns the old content away along a ragged edge: scorch ahead, a white-hot rim, smoke and embers behind. Made for a delete.",
    paper: true,
    tag: ["Draft", "Deleted"],
    title: ["Q3 plan, rough notes", "Moved to the trash"],
    meta: ["Edited yesterday, 1,240 words.", "Kept for 30 days, then gone for good."],
    action: ["Delete", "Restore"],
  },
  {
    effect: "ink",
    name: "Ink",
    caption: "The front bleeds like ink into paper, and around it the content is reprinted in two inks, out of register, risograph style.",
    paper: true,
    tag: ["Proof", "Printed"],
    title: ["Zine #04, cover", "Zine #04, 200 copies"],
    meta: ["Pink and blue, on cream paper.", "Ready at the shop on Friday."],
    action: ["Print", "Back to proof"],
  },
  {
    effect: "halftone",
    name: "Halftone",
    caption: "Near the front the content turns into a dot screen sized by its tone, and the dots swell with the wave.",
    paper: true,
    tag: ["Issue 12", "Issue 13"],
    title: ["The weekly, on type", "The weekly, on colour"],
    meta: ["Seven minutes. Grotesques, again.", "Nine minutes. Why print looks warmer."],
    action: ["Next issue", "Previous issue"],
  },
  {
    effect: "metal",
    name: "Liquid metal",
    caption: "The front is a rolling bead of liquid chrome that mirrors a studio and, faintly, the content. Best on a dark page.",
    tag: ["Free", "Pro"],
    title: ["Upgrade to Pro", "Pro unlocked"],
    meta: ["Unlimited projects, priority support.", "Thanks. Every feature is on."],
    action: ["Upgrade", "Manage plan"],
  },
  {
    effect: "water",
    name: "Water",
    caption: "Ripples trail the front and refract the content, caustics play on it, and foam breaks on the front.",
    tag: ["Not backed up", "Backed up"],
    title: ["Photos, 1,204 items", "All photos are safe"],
    meta: ["Last backup 12 days ago.", "Synced to the cloud just now."],
    action: ["Back up", "Back up again"],
  },
  {
    effect: "vine",
    name: "Vine",
    caption: "The front is a band of leaves, leaves fall behind it, a vine grows around the card and the sparks are leaves.",
    tag: ["Seedling", "In bloom"],
    title: ["Garden, week 1", "Garden, week 6"],
    meta: ["Water every two days.", "Ready to repot."],
    action: ["Next week", "Back to week 1"],
  },
  {
    effect: "christmas",
    name: "Christmas",
    caption: "The front is a candy cane, snow falls behind it, lights go up around the card and snow settles on top.",
    tag: ["Dec 1", "Dec 24"],
    title: ["24 days to go", "It's Christmas Eve"],
    meta: ["The calendar is still closed.", "Every door is open."],
    action: ["Open the calendar", "Start again"],
  },
];

function Look({ effect, paper, tag, title, meta, action }: LookCard) {
  const card = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const wave = useWave();
  const i = on ? 1 : 0;

  function toggle(e: MouseEvent<HTMLElement>) {
    wave(card, () => setOn((v) => !v), { effect: EFFECTS[effect] as Effect, source: e.currentTarget, focus: e.nativeEvent });
  }

  return (
    <div ref={card} className="post look target" data-paper={paper || undefined} data-live={on || undefined}>
      <p className="post-status">{tag[i]}</p>
      <p className="post-title">{title[i]}</p>
      <p className="post-meta">{meta[i]}</p>
      <Button className="btn btn-primary" data-focus-key={effect} onClick={toggle}>
        {action[i]}
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
        {LOOKS.map((l) => (
          <figure className="demo" key={l.effect}>
            <div className="demo-body dark-bench">
              <Look {...l} />
            </div>
            <figcaption>
              <strong>{l.name}.</strong> {l.caption} <code>effect: {l.effect}</code>
            </figcaption>
          </figure>
        ))}
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
