"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { highlight } from "./code";
import { CopyInstall } from "./copy";
import { useWave } from "./wave";

const STATES = [
  {
    tone: "plate",
    title: "Wave any element into its next state.",
    note: "Give it an element and a function that changes the DOM. It captures both states and carries the old pixels into the new ones in one WebGL2 pass.",
  },
  {
    tone: "ink",
    title: "A button, a card, or the whole page.",
    note: "Same model as document.startViewTransition(), scoped to the element you pass. The wave leaves from where you pressed and follows the element's shape.",
  },
  {
    tone: "chalk",
    title: "Your update always runs.",
    note: "No WebGL2, reduced motion, an element off screen: you get the change without the wave. Keyboard focus stays where it was.",
  },
] as const;

export function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const wave = useWave();
  const state = STATES[index];

  function next(e: MouseEvent<HTMLElement>) {
    wave(stage, () => setIndex((i) => (i + 1) % STATES.length), {
      source: e.currentTarget,
      focus: e.nativeEvent,
    });
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div ref={stage} className="stage target" data-tone={state.tone}>
        <h1 id="hero-title" className="hero-title">
          {state.title}
        </h1>
        <p className="hero-note">{state.note}</p>
        <div className="hero-actions">
          <Button className="btn btn-primary" onClick={next}>
            Make a wave
          </Button>
          <CopyInstall />
        </div>
        <pre className="hero-call" aria-label="The call behind this button">
          <code>
            {highlight(
              "distortionWave(stage, () => setState(next), { source: button, focus: event })",
            )}
          </code>
        </pre>
      </div>
    </section>
  );
}
