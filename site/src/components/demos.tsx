"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Rating, RatingItem } from "@ui-sdk/react/rating";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { Toggle } from "@ui-sdk/react/toggle";
import { highlight } from "./code";
import { origin, useWave } from "./wave";

function Demo({
  className,
  title,
  how,
  children,
}: {
  className?: string;
  title: string;
  how: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={`demo ${className ?? ""}`}>
      <div className="demo-body">{children}</div>
      <figcaption>
        <strong>{title}</strong> {how}
      </figcaption>
    </figure>
  );
}

function Pricing() {
  const card = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState("monthly");
  const wave = useWave();
  const yearly = plan === "yearly";

  return (
    <div ref={card} className="price-card target">
      <SegmentedControl
        aria-label="Billing period"
        value={plan}
        onValueChange={(value) => {
          if (!value || value === plan) return;
          wave(card, () => setPlan(value), origin('[data-slot="segmented-control-item"]'));
        }}
      >
        <SegmentedControlIndicator />
        <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
        <SegmentedControlItem value="yearly">Yearly</SegmentedControlItem>
      </SegmentedControl>
      <p className="price">
        <span className="price-amount">{yearly ? "$96" : "$10"}</span>
        <span className="price-unit">{yearly ? "per year" : "per month"}</span>
      </p>
      <p className="price-note">
        {yearly ? "Two months free, billed once a year." : "Billed every month. Cancel any time."}
      </p>
    </div>
  );
}

const TABS = [
  {
    value: "overview",
    label: "Overview",
    body: "Three deploys today, all green. The last one shipped the new checkout to 100% of traffic.",
    stat: "99.98%",
    statLabel: "uptime this month",
  },
  {
    value: "activity",
    label: "Activity",
    body: "Maya merged #482, Tom opened a review on the pricing page, and the nightly build finished in 4 min 12 s.",
    stat: "27",
    statLabel: "events since yesterday",
  },
  {
    value: "usage",
    label: "Usage",
    body: "You've used 62% of this month's build minutes. At this pace you'll stay under the limit.",
    stat: "1,240",
    statLabel: "build minutes used",
  },
];

function Project() {
  const panels = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("overview");
  const wave = useWave();

  return (
    <Tabs
      className="project"
      value={tab}
      onValueChange={(value) => {
        if (!value || value === tab) return;
        wave(panels, () => setTab(value), origin('[data-slot="tabs-tab"]'));
      }}
    >
      <TabsList aria-label="Project">
        {TABS.map((t) => (
          <TabsTab key={t.value} value={t.value}>
            {t.label}
          </TabsTab>
        ))}
      </TabsList>
      <div ref={panels} className="project-panels target">
        {TABS.map((t) => (
          <TabsPanel key={t.value} value={t.value} className="project-panel">
            <p className="project-stat">
              <span>{t.stat}</span> {t.statLabel}
            </p>
            <p>{t.body}</p>
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  );
}

function Like() {
  const button = useRef<HTMLButtonElement>(null);
  const [liked, setLiked] = useState(false);
  const wave = useWave();

  return (
    <Toggle
      ref={button}
      className="like target"
      pressed={liked}
      aria-label="Like"
      onPressedChange={(pressed) => {
        wave(button, () => setLiked(pressed), { focus: origin("button").focus, palette: "ember" });
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
      </svg>
      <span>{liked ? 129 : 128}</span>
    </Toggle>
  );
}

function Digest() {
  const row = useRef<HTMLLabelElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [on, setOn] = useState(true);
  const wave = useWave();

  return (
    <label ref={row} className="setting target">
      <span className="setting-text">
        <span className="setting-name">Weekly digest</span>
        <span className="setting-hint">{on ? "Every Monday at 9:00" : "Off. You won't get emails."}</span>
      </span>
      <Switch
        ref={toggle}
        checked={on}
        onCheckedChange={(checked) => {
          wave(row, () => setOn(checked), {
            source: toggle.current,
            focus: origin("button").focus,
            palette: checked ? "mint" : "ocean",
          });
        }}
      >
        <SwitchThumb />
      </Switch>
    </label>
  );
}

const STARS = ["", "Not for me", "Could be better", "It's fine", "I like it", "I love it"];

function Review() {
  const block = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState<number | null>(null);
  const wave = useWave();

  return (
    <div ref={block} className="review target">
      <p className="review-question">How was your delivery?</p>
      <Rating
        aria-label="Delivery rating"
        value={score}
        onValueChange={(value) => {
          if (value === score) return;
          wave(block, () => setScore(value), {
            ...origin('[data-slot="rating-item"]'),
            palette: ["#ffc53d", "#ff9f43", "#ff6b6b"],
          });
        }}
      >
        <RatingItem />
      </Rating>
      <p className="review-answer" aria-live="polite">
        {score ? `${STARS[score]}. Thanks!` : "Pick a star."}
      </p>
    </div>
  );
}

function Product() {
  const card = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const wave = useWave();

  function change(e: MouseEvent<HTMLElement>, next: number) {
    wave(card, () => setCount(next), {
      source: e.currentTarget,
      focus: e.nativeEvent,
      palette: next > count ? "mint" : "ember",
    });
  }

  return (
    <div ref={card} className="product target">
      <div className="product-art" aria-hidden="true" />
      <div className="product-info">
        <p className="product-name">Field notebook</p>
        <p className="product-meta">A5, dot grid, 120 pages</p>
        <p className="product-price">$18</p>
      </div>
      {count === 0 ? (
        <Button className="btn btn-primary" data-focus-key="cart" onClick={(e) => change(e, 1)}>
          Add to cart
        </Button>
      ) : (
        <div className="product-cart">
          <p>In your cart</p>
          <Button className="btn btn-quiet" data-focus-key="cart" onClick={(e) => change(e, 0)}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

const SNIPPET = `const t = distortionWave(card, update)
await t.finished`;

function Snippet() {
  const block = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const wave = useWave();

  function copy(e: MouseEvent<HTMLElement>) {
    if (copied) return;
    navigator.clipboard?.writeText(SNIPPET).catch(() => {});
    wave(block, () => setCopied(true), {
      source: e.currentTarget,
      focus: e.nativeEvent,
      palette: "ocean",
    })?.finished.then(() => setTimeout(() => setCopied(false), 1400));
  }

  return (
    <div ref={block} className="snippet target">
      <pre>
        <code>{highlight(SNIPPET)}</code>
      </pre>
      <Button className="btn btn-quiet" data-focus-key="copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function Demos() {
  return (
    <div className="demos">
      <Demo className="d-pricing" title="Billing period." how="Waves the price card, from the option you chose.">
        <Pricing />
      </Demo>
      <Demo className="d-tabs" title="Tabs." how="Waves the panel only, from the tab. The tab bar stays still.">
        <Project />
      </Demo>
      <Demo className="d-like" title="Like." how="The button waves itself, from where you pressed it.">
        <Like />
      </Demo>
      <Demo className="d-switch" title="Setting." how="Waves the whole row, since its hint changes too.">
        <Digest />
      </Demo>
      <Demo className="d-rating" title="Rating." how="Waves the block, from the star you picked.">
        <Review />
      </Demo>
      <Demo className="d-product" title="Add to cart." how="Waves the card, then focus moves to the new button.">
        <Product />
      </Demo>
      <Demo className="d-snippet" title="Copy." how="Waves the code, then the label goes back without a wave.">
        <Snippet />
      </Demo>
    </div>
  );
}
