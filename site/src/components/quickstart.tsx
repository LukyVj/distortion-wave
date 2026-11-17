"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@ui-sdk/react/button";
import { toast } from "@ui-sdk/react/toast";
import { GITHUB, GitHubIcon } from "./links";
import { origin, useWave } from "./wave";

const FALLBACK_ORIGIN = "https://distortion-wave.vercel.app";

type Framework = {
  value: string;
  label: string;
  /** How this framework makes the DOM current before the "after" capture. */
  render: string;
  /** Where the first wave goes. */
  example: string;
};

const FRAMEWORKS: Framework[] = [
  {
    value: "next",
    label: "Next.js",
    render:
      "distortion-wave runs in the browser only: call it from a 'use client' component, and wrap the state update in flushSync() from react-dom inside the update callback, so the DOM is current before the second capture.",
    example: "a client component",
  },
  {
    value: "react",
    label: "React",
    render:
      "Wrap the state update in flushSync() from react-dom inside the update callback, so the DOM is current before the second capture. A small useWave() hook that does this is fine.",
    example: "a component",
  },
  {
    value: "vue",
    label: "Vue",
    render: "Make the update callback async and await nextTick() after changing the state, so the DOM is current before the second capture.",
    example: "a component",
  },
  {
    value: "svelte",
    label: "Svelte",
    render: "Make the update callback async and await tick() after changing the state, so the DOM is current before the second capture.",
    example: "a component",
  },
  {
    value: "angular",
    label: "Angular",
    render:
      "Inside the update callback, change the state then call ChangeDetectorRef.detectChanges(), so the DOM is current before the second capture.",
    example: "a component",
  },
  {
    value: "html",
    label: "HTML",
    render:
      "With no bundler, import it from https://cdn.jsdelivr.net/npm/distortion-wave@0.4/+esm in a <script type=\"module\"> instead of installing. Change the DOM synchronously inside the update callback.",
    example: "the page",
  },
];

function setupPrompt(f: Framework, site: string) {
  const install =
    f.value === "html"
      ? "1. This page has no build step, so skip the install: load distortion-wave from the CDN (see step 4)."
      : `1. Install the package with this project's package manager: npm i distortion-wave (or the pnpm, yarn or bun equivalent). If a release-age policy (minimumReleaseAge, min-release-age, a registry cooldown…) blocks the install, stop and ask me before changing anything.`;
  return `Set up distortion-wave in this ${f.label} project. It plays a WebGL2 wave on any DOM element when its state changes, with an API shaped like document.startViewTransition().

${install}

2. Add this to AGENTS.md at the project root (create the file if it doesn't exist):

## distortion-wave
Before adding or debugging distortion-wave transitions, follow the distortion-wave skill if it's installed, and read ${site}/llms.txt. The package docs are in node_modules/distortion-wave/README.md and its types in node_modules/distortion-wave/types/.

3. Install the agent skill: npx skills add LukyVj/distortion-wave --skill distortion-wave
If that command isn't available or fails, copy skill/distortion-wave from ${GITHUB} into .claude/skills/ instead, or skip this step and tell me.

4. ${f.render}

Don't add any transition yet. When you're done, tell me what you installed and which files you changed.`;
}

function examplePrompt(f: Framework) {
  return `Using distortion-wave, make the Monthly / Yearly switch on the pricing card wave the card from one price to the other.

- Wave only the card, not the page.
- The wave should leave from the option I click (source: the button, focus: the click event).
- Keep the switch itself usable: no wave while one is already running on the card.
- Put it in ${f.example}, following the rules in AGENTS.md.

If there's no pricing card, build a small one first: a Monthly / Yearly toggle and a price.`;
}

async function copyPrompt(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Prompt copied", { description: `Paste it into your agent. ${label}` });
  } catch {
    toast("Couldn't copy", { description: "Select the prompt and copy it by hand." });
  }
}

const noSubscribe = () => () => {};
/** The site's own origin once in the browser (for the llms.txt link), the production one on the server. */
function useSiteOrigin() {
  return useSyncExternalStore(
    noSubscribe,
    () => (window.location.protocol === "https:" ? window.location.origin : FALLBACK_ORIGIN),
    () => FALLBACK_ORIGIN,
  );
}

export function QuickStart() {
  const [fw, setFw] = useState(FRAMEWORKS[0]);
  const site = useSiteOrigin();
  const body = useRef<HTMLDivElement>(null);
  const wave = useWave();
  const setup = setupPrompt(fw, site);
  const example = examplePrompt(fw);

  return (
    <div className="quick">
      <div className="quick-pick" role="radiogroup" aria-label="Framework">
        {FRAMEWORKS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={f.value === fw.value}
            className="quick-chip"
            onClick={() => {
              if (f.value === fw.value) return;
              wave(body, () => setFw(f), { ...origin(".quick-chip"), intensity: 0.55 });
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div ref={body} className="quick-body target">
        <article className="prompt">
          <header className="prompt-head">
            <span className="prompt-step">1</span>
            <div>
              <h3>Set it up</h3>
              <p>Installs the package, points your agent at the docs and adds the skill.</p>
            </div>
            <Button className="btn btn-primary" onClick={() => copyPrompt(setup, "It sets distortion-wave up.")}>
              Copy prompt
            </Button>
          </header>
          <pre className="prompt-text" tabIndex={0} aria-label={`Setup prompt for ${fw.label}`}>
            {setup}
          </pre>
        </article>

        <article className="prompt">
          <header className="prompt-head">
            <span className="prompt-step">2</span>
            <div>
              <h3>Ask for a first wave</h3>
              <p>An example to paste next. Swap the pricing card for any control of yours.</p>
            </div>
            <Button className="btn btn-quiet btn-outline" onClick={() => copyPrompt(example, "It builds a first wave.")}>
              Copy prompt
            </Button>
          </header>
          <pre className="prompt-text prompt-text-short" tabIndex={0} aria-label="Example prompt">
            {example}
          </pre>
        </article>
      </div>

      <p className="quick-foot">
        <a className="gh-link" href={GITHUB}>
          <GitHubIcon /> Source, skill and issues on GitHub
        </a>
        <span aria-hidden="true">·</span>
        <a href={`${site}/llms.txt`}>llms.txt</a>
      </p>
    </div>
  );
}
