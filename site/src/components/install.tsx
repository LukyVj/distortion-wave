"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { highlight } from "./code";
import { CopyButton } from "./copy";
import { useLooks } from "./looks";
import { origin, useWave } from "./wave";

type Snippet = { value: string; label: string; code: string };

function CodeTabs({ label, items }: { label: string; items: Snippet[] }) {
  const panels = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(items[0].value);
  const wave = useWave();

  return (
    <Tabs
      className="code-tabs"
      value={tab}
      onValueChange={(value) => {
        if (!value || value === tab) return;
        wave(panels, () => setTab(value), { ...origin('[data-slot="tabs-tab"]'), intensity: 0.6 });
      }}
    >
      <TabsList aria-label={label}>
        {items.map((s) => (
          <TabsTab key={s.value} value={s.value}>
            {s.label}
          </TabsTab>
        ))}
      </TabsList>
      <div ref={panels} className="code-panels target">
        {items.map((s) => (
          <TabsPanel key={s.value} value={s.value} className="code-panel">
            <pre>
              <code>{highlight(s.code)}</code>
            </pre>
            <CopyButton text={s.code} />
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  );
}

export function InstallTabs() {
  const { picked } = useLooks();
  const cdn = [
    "import { distortionWave } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.4/+esm'",
    ...picked.map((n) => `import { ${n} } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.4/dist/${n}.js'`),
  ].join("\n");
  return (
    <CodeTabs
      label="Package manager"
      items={[
        { value: "npm", label: "npm", code: "npm i distortion-wave" },
        { value: "pnpm", label: "pnpm", code: "pnpm add distortion-wave" },
        { value: "yarn", label: "yarn", code: "yarn add distortion-wave" },
        { value: "bun", label: "bun", code: "bun add distortion-wave" },
        {
          value: "cdn",
          label: "No build step",
          code: cdn,
        },
      ]}
    />
  );
}

const REACT = (L: Looks) => `'use client'
import { useCallback } from 'react'
import { flushSync } from 'react-dom'
${L.imports()}

// setState renders later: flushSync makes the DOM current
// before the "after" capture
export function useWave() {
  return useCallback((el, update, options) =>
    distortionWave(el, () => flushSync(update), options), [])
}

// <button onClick={(e) => wave(card.current, () => setPlan('yearly'),
//   { ${L.effect}source: e.currentTarget, focus: e })}>${L.others ? `\n${L.others}` : ""}`;

const VUE = (L: Looks) => `import { nextTick } from 'vue'
${L.imports()}

function pick(e, next) {
  distortionWave(panel.value, () => {
    plan.value = next
    return nextTick()
  }, { ${L.effect}source: e.currentTarget, focus: e })${L.others ? `\n  ${L.others}` : ""}
}`;

const SVELTE = (L: Looks) => `<script>
  import { tick } from 'svelte'
  ${L.imports().split('\n').join('\n  ')}

  let plan = $state('monthly')
  let panel

  function pick(e, next) {
    distortionWave(panel, async () => {
      plan = next
      await tick()
    }, { ${L.effect}source: e.currentTarget, focus: e })${L.others ? `\n    ${L.others}` : ""}
  }
</script>`;

const VANILLA = (L: Looks) => `${L.imports()}

list.addEventListener('click', (e) => {
  const remove = e.target.closest('[data-remove]')
  if (!remove) return
  distortionWave(list, () => remove.closest('li').remove(), {
    ${L.effect}source: remove,
    focus: e,
  })${L.others ? `\n  ${L.others}` : ""}
})`;

type Looks = ReturnType<typeof useLooks>;

export function FrameworkTabs() {
  const L = useLooks();
  return (
    <CodeTabs
      label="Framework"
      items={[
        { value: "react", label: "React", code: REACT(L) },
        { value: "vue", label: "Vue", code: VUE(L) },
        { value: "svelte", label: "Svelte", code: SVELTE(L) },
        { value: "vanilla", label: "Plain JS", code: VANILLA(L) },
      ]}
    />
  );
}

/** Step 3: the first call, with the looks picked above. */
export function FirstCall() {
  const L = useLooks();
  const code = `${L.imports()}

button.addEventListener('click', (e) => {
  distortionWave(card, () => {
    card.classList.toggle('done')
  }, { ${L.effect}source: button, focus: e })${L.others ? `\n  ${L.others}` : ""}
})`;
  return (
    <pre className="code" aria-label="A first call" tabIndex={0}>
      <code>{highlight(code)}</code>
    </pre>
  );
}
