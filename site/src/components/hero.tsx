"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Mark } from "./brand";
import { GITHUB, GitHubIcon } from "./links";
import { useWave } from "./wave";

// The hero is the product: a small app on a glass device that waves from one screen to the
// next on its own, every few seconds, and on every press.
const STEPS = ["checkout", "paid", "ticket"] as const;
type Step = (typeof STEPS)[number];

function Screen({ step, onNext }: { step: Step; onNext: (e: MouseEvent<HTMLElement>) => void }) {
  if (step === "checkout")
    return (
      <div className="app app-checkout">
        <p className="app-kicker">Checkout</p>
        <div className="app-art" aria-hidden="true">
          <Mark state="before" size={56} />
        </div>
        <p className="app-title">Lagune, live in Paris</p>
        <p className="app-sub">Sat 12 Dec · La Cigale · 2 seats</p>
        <div className="seats" aria-hidden="true">
          <span className="seats-stage">Stage</span>
          <div className="seats-grid">
            {Array.from({ length: 36 }, (_, i) => (
              <i key={i} data-s={i === 15 || i === 16 ? "mine" : [2, 7, 9, 20, 23, 28, 31, 33].includes(i) ? "taken" : undefined} />
            ))}
          </div>
        </div>
        <dl className="app-rows">
          <div><dt>Seats</dt><dd>Balcony B 14–15</dd></div>
          <div><dt>Fees</dt><dd>€4.00</dd></div>
          <div className="app-total"><dt>Total</dt><dd>€84.00</dd></div>
        </dl>
        <button className="app-btn" data-wave-source onClick={onNext}>
          Pay €84.00
        </button>
      </div>
    );
  if (step === "paid")
    return (
      <div className="app app-paid">
        <p className="app-kicker">Payment</p>
        <div className="app-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34">
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="app-big">€84.00</p>
        <p className="app-sub">Paid with Visa ···· 4242</p>
        <dl className="app-rows">
          <div><dt>Order</dt><dd>#DW-0412</dd></div>
          <div><dt>Sent to</dt><dd>maya@lagune.fm</dd></div>
        </dl>
        <button className="app-btn" data-wave-source onClick={onNext}>
          Show tickets
        </button>
      </div>
    );
  return (
    <div className="app app-ticket">
      <p className="app-kicker">Your tickets</p>
      <div className="ticket">
        <div className="ticket-top">
          <p className="ticket-title">Lagune</p>
          <p className="ticket-sub">La Cigale, Paris</p>
        </div>
        <div className="ticket-grid">
          <div><span>Date</span>Sat 12 Dec</div>
          <div><span>Doors</span>19:30</div>
          <div><span>Row</span>B</div>
          <div><span>Seats</span>14–15</div>
        </div>
        <div className="ticket-code" aria-hidden="true" />
      </div>
      <button className="app-btn app-btn-quiet" data-wave-source onClick={onNext}>
        Done
      </button>
    </div>
  );
}

export function Hero() {
  const screen = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const busy = useRef(false);
  const paused = useRef(false);
  const wave = useWave();

  function next(source: Element | null, focus?: MouseEvent["nativeEvent"]) {
    if (busy.current) return;
    busy.current = true;
    const t = wave(screen, () => setIndex((i) => (i + 1) % STEPS.length), {
      source,
      focus: focus ?? null,
    });
    const done = () => {
      busy.current = false;
    };
    if (t) t.finished.then(done, done);
    else done();
  }

  // Autoplay while the device is on screen and nobody is touching it.
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (!visible || paused.current || busy.current || document.hidden) return;
      next(el.querySelector("[data-wave-source]"));
    }, 3600);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" /> WebGL2 · zero dependencies · ~17 kB
        </p>
        <h1 id="hero-title" className="hero-title">
          Wave any element into its next state.
        </h1>
        <p className="hero-note">
          Pass an element and the function that changes it. distortion-wave captures both states and
          carries the old pixels into the new ones, like <code>startViewTransition()</code> with a
          material.
        </p>
        <div className="hero-actions">
          <Button className="btn btn-primary btn-lg" onClick={(e) => next(screen.current?.querySelector("[data-wave-source]") ?? e.currentTarget, e.nativeEvent)}>
            Make a wave
          </Button>
          <a className="btn btn-quiet btn-outline btn-lg" href="#install">
            Set it up with your agent
          </a>
        </div>
        <p className="hero-alt">
          <a className="gh-link" href={GITHUB}>
            <GitHubIcon /> LukyVj/distortion-wave
          </a>
          <span aria-hidden="true">·</span>
          <code>npm i distortion-wave</code>
        </p>
      </div>

      <div
        className="device-wrap"
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
      >
        <div className="device">
          <div ref={screen} className="device-screen target" data-step={STEPS[index]}>
            <Screen step={STEPS[index]} onNext={(e) => next(e.currentTarget, e.nativeEvent)} />
          </div>
        </div>
        <p className="device-caption">
          <code>distortionWave(screen, () =&gt; setStep(next), {"{ source: button }"})</code>
        </p>
      </div>
    </section>
  );
}

export function Facts() {
  return (
    <ul className="facts" aria-label="At a glance">
      <li>
        <strong>~17 kB</strong>
        <span>gzipped core</span>
      </li>
      <li>
        <strong>0</strong>
        <span>dependencies</span>
      </li>
      <li>
        <strong>10</strong>
        <span>looks: ink, glass, metal…</span>
      </li>
      <li>
        <strong>1 call</strong>
        <span>same model as View Transitions</span>
      </li>
    </ul>
  );
}
