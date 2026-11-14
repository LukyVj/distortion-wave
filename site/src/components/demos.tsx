"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input";
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@ui-sdk/react/pagination";
import { Radio, RadioGroup, RadioIndicator } from "@ui-sdk/react/radio";
import { Rating, RatingItem } from "@ui-sdk/react/rating";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle";
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

const TASKS = [
  { id: "copy", label: "Write the launch post" },
  { id: "demo", label: "Record the demo" },
  { id: "ship", label: "Publish to npm" },
];

function Checklist() {
  const list = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<string[]>(["copy"]);
  const wave = useWave();

  return (
    <div ref={list} className="checklist target">
      <p className="checklist-head">
        Launch <span>{done.length === TASKS.length ? "All done" : `${done.length} of ${TASKS.length} done`}</span>
      </p>
      {TASKS.map((t) => (
        <label key={t.id} className="task" data-done={done.includes(t.id) || undefined}>
          <Checkbox
            checked={done.includes(t.id)}
            onCheckedChange={(checked) =>
              wave(
                list,
                () => setDone((d) => (checked ? [...d, t.id] : d.filter((x) => x !== t.id))),
                { ...origin('[data-slot="checkbox"]'), palette: "mint" },
              )
            }
          >
            <CheckboxIndicator />
          </Checkbox>
          {t.label}
        </label>
      ))}
    </div>
  );
}

const SPEEDS = {
  standard: { label: "Standard", when: "Arrives Thursday", price: 0 },
  express: { label: "Express", when: "Arrives tomorrow", price: 12 },
  pickup: { label: "Pick up in store", when: "Ready in 2 hours", price: 0 },
};

function Shipping() {
  const card = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>("standard");
  const wave = useWave();
  const current = SPEEDS[speed];

  return (
    <div ref={card} className="shipping target">
      <RadioGroup
        aria-label="Delivery"
        className="radios"
        value={speed}
        onValueChange={(value) => {
          if (!value || value === speed) return;
          wave(card, () => setSpeed(value as keyof typeof SPEEDS), {
            ...origin('[data-slot="radio"]'),
            palette: "ocean",
          });
        }}
      >
        {Object.entries(SPEEDS).map(([value, o]) => (
          <label key={value} className="radio-row">
            <Radio value={value}>
              <RadioIndicator />
            </Radio>
            {o.label}
          </label>
        ))}
      </RadioGroup>
      <p className="shipping-sum">
        <span>{current.when}</span>
        <strong>{current.price ? `$${current.price}` : "Free"}</strong>
      </p>
    </div>
  );
}

function Quantity() {
  const card = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState<number | null>(2);
  const wave = useWave();
  const n = qty ?? 0;

  return (
    <div ref={card} className="quantity target">
      <div>
        <p className="quantity-name">Ticket, early bird</p>
        <p className="quantity-total">
          ${n * 24} <span>for {n} {n === 1 ? "ticket" : "tickets"}</span>
        </p>
      </div>
      <NumberInput
        value={qty}
        min={0}
        max={9}
        onValueChange={(value, details) => {
          if (details.reason === "increment-press" || details.reason === "decrement-press" || details.reason === "step-key") {
            wave(card, () => setQty(value), {
              ...origin('[data-slot="number-input-increment"], [data-slot="number-input-decrement"]'),
              palette: (value ?? 0) > n ? "mint" : "ember",
            });
          } else setQty(value);
        }}
      >
        <NumberInputGroup>
          <NumberInputDecrement aria-label="Fewer tickets" />
          <NumberInputControl aria-label="Tickets" />
          <NumberInputIncrement aria-label="More tickets" />
        </NumberInputGroup>
      </NumberInput>
    </div>
  );
}

const ALIGN = ["left", "center", "right"] as const;

function Align() {
  const text = useRef<HTMLParagraphElement>(null);
  const [align, setAlign] = useState<(typeof ALIGN)[number]>("left");
  const wave = useWave();

  return (
    <div className="align">
      <ToggleGroup
        className="align-tools"
        aria-label="Text alignment"
        value={[align]}
        onValueChange={(value) => {
          const next = value[value.length - 1] as (typeof ALIGN)[number] | undefined;
          if (!next || next === align) return;
          wave(text, () => setAlign(next), { ...origin('[data-slot="toggle"]'), intensity: 0.7 });
        }}
      >
        {ALIGN.map((a) => (
          <Toggle key={a} value={a} aria-label={`Align ${a}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {a === "left" && <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />}
              {a === "center" && <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />}
              {a === "right" && <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />}
            </svg>
          </Toggle>
        ))}
      </ToggleGroup>
      <p ref={text} className="align-text target" style={{ textAlign: align }}>
        The source sits outside the target: the wave leaves the toolbar and crosses the paragraph.
      </p>
    </div>
  );
}

const RELEASES = [
  ["0.2.1", "Thin rows of text keep their letters"],
  ["0.2.0", "Duration, easing, intensity, app-wide defaults"],
  ["0.1.2", "Rounded corners from clipping parents"],
  ["0.1.1", "No box around transparent elements"],
  ["0.1.0", "First version"],
];

function Releases() {
  const list = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const wave = useWave();
  const shown = RELEASES.slice((page - 1) * 2, page * 2);

  return (
    <div className="releases">
      <div ref={list} className="release-list target">
        {shown.map(([v, t]) => (
          <p key={v}>
            <strong>{v}</strong> {t}
          </p>
        ))}
      </div>
      <Pagination
        aria-label="Releases"
        pageCount={3}
        page={page}
        onPageChange={(next) => {
          if (next === page) return;
          wave(list, () => setPage(next), {
            ...origin('[data-slot="pagination-link"], [data-slot="pagination-previous"], [data-slot="pagination-next"]'),
            intensity: 0.7,
          });
        }}
      >
        <PaginationList>
          {({ items }) => (
            <>
              <PaginationItem>
                <PaginationPrevious>Newer</PaginationPrevious>
              </PaginationItem>
              {items.map((item) =>
                typeof item === "number" ? (
                  <PaginationItem key={item}>
                    <PaginationLink page={item} />
                  </PaginationItem>
                ) : null,
              )}
              <PaginationItem>
                <PaginationNext>Older</PaginationNext>
              </PaginationItem>
            </>
          )}
        </PaginationList>
      </Pagination>
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
      <Demo className="d-check" title="Checklist." how="Waves the list, since the count in its header changes too.">
        <Checklist />
      </Demo>
      <Demo className="d-ship" title="Delivery." how="Waves the card, from the radio you picked.">
        <Shipping />
      </Demo>
      <Demo className="d-qty" title="Quantity." how="The + and − buttons wave the card. Typing a number doesn't.">
        <Quantity />
      </Demo>
      <Demo className="d-align" title="Alignment." how="Waves the paragraph only, from the toolbar above it.">
        <Align />
      </Demo>
      <Demo className="d-pages" title="Pages." how="Waves the list, from the page you picked below it.">
        <Releases />
      </Demo>
    </div>
  );
}
