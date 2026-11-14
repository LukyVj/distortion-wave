"use client";

import { useRef, useState } from "react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion";
import { origin, useWave } from "./wave";

const QUESTIONS = [
  {
    value: "fallback",
    q: "What happens in a browser without WebGL2?",
    a: "Your update runs and the page changes, without the wave. Same when the element is off screen, has no size, or the capture fails. Every promise still resolves, so code that waits on the transition keeps working.",
  },
  {
    value: "motion",
    q: "Does it respect reduced motion?",
    a: "Yes. With prefers-reduced-motion set, the wave becomes a 220 ms crossfade. You can force either one with the reducedMotion option.",
  },
  {
    value: "update",
    q: "When does my update run?",
    a: "Once, right after the element is captured. If it returns a promise, the second capture waits for it. In React, wrap setState in flushSync; in Vue, return nextTick(); in Svelte, await tick().",
  },
  {
    value: "capture",
    q: "Is there anything it can't capture?",
    a: "Iframes show as an empty box, and cross-origin images without CORS come out transparent. Scrolled containers inside the element are shown at the top. Fonts need to be loaded before the first wave.",
  },
  {
    value: "size",
    q: "How heavy is it?",
    a: "About 18 kB gzipped, with no dependencies. Importing it does nothing until you call it, so it's safe in server-rendered code. Up to four waves can play at once.",
  },
  {
    value: "browsers",
    q: "Which browsers does it support?",
    a: "Any browser with WebGL2. It's tested in Chromium; test Safari and Firefox before you ship, since they render SVG captures a little differently.",
  },
];

export function Faq() {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string[]>([]);
  const wave = useWave();

  return (
    <Accordion
      ref={root}
      className="faq target"
      value={open}
      onValueChange={(value) =>
        wave(root, () => setOpen(value), { ...origin('[data-slot="accordion-trigger"]'), intensity: 0.5 })
      }
    >
      {QUESTIONS.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionHeader>
            <AccordionTrigger>{item.q}</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>
            <p>{item.a}</p>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
