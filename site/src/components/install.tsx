"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { highlight } from "./code";
import { CopyButton } from "./copy";
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
          code: "import { distortionWave } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.2/+esm'",
        },
      ]}
    />
  );
}

const REACT = `'use client'
import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { distortionWave } from 'distortion-wave'

// setState renders later: flushSync makes the DOM current
// before the "after" capture
export function useWave() {
  return useCallback((el, update, options) =>
    distortionWave(el, () => flushSync(update), options), [])
}

// <button onClick={(e) => wave(card.current, () => setPlan('yearly'),
//   { source: e.currentTarget, focus: e })}>`;

const VUE = `import { nextTick } from 'vue'
import { distortionWave } from 'distortion-wave'

function pick(e, next) {
  distortionWave(panel.value, () => {
    plan.value = next
    return nextTick()
  }, { source: e.currentTarget, focus: e })
}`;

const SVELTE = `<script>
  import { tick } from 'svelte'
  import { distortionWave } from 'distortion-wave'

  let plan = $state('monthly')
  let panel

  function pick(e, next) {
    distortionWave(panel, async () => {
      plan = next
      await tick()
    }, { source: e.currentTarget, focus: e })
  }
</script>`;

const VANILLA = `import { distortionWave } from 'distortion-wave'

list.addEventListener('click', (e) => {
  const remove = e.target.closest('[data-remove]')
  if (!remove) return
  distortionWave(list, () => remove.closest('li').remove(), {
    source: remove,
    focus: e,
  })
})`;

export function FrameworkTabs() {
  return (
    <CodeTabs
      label="Framework"
      items={[
        { value: "react", label: "React", code: REACT },
        { value: "vue", label: "Vue", code: VUE },
        { value: "svelte", label: "Svelte", code: SVELTE },
        { value: "vanilla", label: "Plain JS", code: VANILLA },
      ]}
    />
  );
}
