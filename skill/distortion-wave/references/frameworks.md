# Framework patterns

Everything comes back to one rule: when `update` returns (or its promise resolves), the DOM must show the new state. Each framework has its own way to force or await the render. The rest (picking target, source and focus) is the same everywhere: see SKILL.md.

## Contents

- Plain DOM
- React (and Next.js)
- Vue 3
- Svelte 5
- Angular
- Solid
- Lit and web components
- htmx and server-rendered HTML

## Plain DOM

Change the DOM inside `update`. Use event delegation for lists and groups, so one listener covers re-rendered children.

```js
import { distortionWave, warmupWave } from 'distortion-wave';
warmupWave();

list.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-remove]');
  if (!btn) return;
  distortionWave(list, () => btn.closest('li').remove(), { source: btn, focus: e, palette: 'ember' });
});
```

## React (and Next.js)

`setState` is batched and rendered later, so wrap it in `flushSync`. A small hook keeps that in one place:

```jsx
import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { distortionWave } from 'distortion-wave';

export function useWave(defaults) {
  return useCallback((target, update, options) => {
    const el = target && 'current' in target ? target.current : target;   // a ref or an element
    if (!el) { update(); return null; }
    return distortionWave(el, () => flushSync(update), { ...defaults, ...options });
  }, [defaults]);
}
```

```jsx
function Pricing() {
  const wave = useWave();
  const panel = useRef(null);
  const [plan, setPlan] = useState('monthly');
  return (
    <>
      <button onClick={(e) => plan !== 'yearly' && wave(panel, () => setPlan('yearly'), { source: e.currentTarget, focus: e })}>
        Yearly
      </button>
      <div ref={panel}>{plan === 'yearly' ? <Yearly /> : <Monthly />}</div>
    </>
  );
}
```

- Pass `defaults` from `useMemo` or a module constant, or the callback changes on every render.
- Use `e.currentTarget` (the button), not `e.target` (maybe an icon inside it).
- Don't call `distortionWave` during render or in a `useEffect` that reacts to the state change: by then the DOM already shows the new state, and the "before" snapshot would be wrong. Call it from the event handler that causes the change.
- `useTransition` / `startTransition` defer the render: don't use them inside `update`.
- Next.js App Router: the component that calls it needs `'use client'`. Importing the package on the server is harmless (no side effects).
- A full example lives in the package repo: `examples/react/` (React 19 + Vite) and `examples/react/codepen.jsx`.

## Vue 3

Set the state, then return `nextTick()`:

```js
// useWave.js
import { nextTick, unref } from 'vue';
import { distortionWave } from 'distortion-wave';

export function useWave(defaults = {}) {
  return (target, update, options) => {
    const t = unref(target);
    const el = t?.$el ?? t;                       // template ref to an element or a component
    if (!el) return update();
    return distortionWave(el, async () => { await update(); await nextTick(); }, { ...defaults, ...options });
  };
}
```

```vue
<script setup>
import { ref } from 'vue';
import { useWave } from './useWave';

const wave = useWave();
const panel = ref(null);
const plan = ref('monthly');
const pick = (e, p) => plan.value !== p && wave(panel, () => { plan.value = p; }, { source: e.currentTarget, focus: e });
</script>

<template>
  <button @click="pick($event, 'yearly')">Yearly</button>
  <div ref="panel">{{ plan }}</div>
</template>
```

`<Transition>` on the same element would animate twice: pick one.

## Svelte 5

```svelte
<script>
  import { tick } from 'svelte';
  import { distortionWave } from 'distortion-wave';

  let plan = $state('monthly');
  let panel;

  function pick(e, p) {
    if (plan === p) return;
    distortionWave(panel, async () => { plan = p; await tick(); }, { source: e.currentTarget, focus: e });
  }
</script>

<button onclick={(e) => pick(e, 'yearly')}>Yearly</button>
<div bind:this={panel}>{plan}</div>
```

Svelte 4: same thing with `on:click` and a plain `let`.

## Angular

Run change detection inside `update`:

```ts
@ViewChild('panel') panel!: ElementRef<HTMLElement>;
plan = signal('monthly');
constructor(private cdr: ChangeDetectorRef) {}

pick(e: MouseEvent, p: string) {
  if (this.plan() === p) return;
  distortionWave(this.panel.nativeElement, () => { this.plan.set(p); this.cdr.detectChanges(); },
    { source: e.currentTarget as Element, focus: e });
}
```

Works the same with plain fields instead of signals.

## Solid

Signals update the DOM synchronously, so set them and you are done: `distortionWave(panel, () => setPlan(p), { source: e.currentTarget, focus: e })`. Don't wrap the update in `startTransition`.

## Lit and web components

```js
pick(e, p) {
  distortionWave(this.renderRoot.querySelector('.panel'), async () => { this.plan = p; await this.updateComplete; },
    { source: e.currentTarget, focus: e });
}
```

Open shadow roots inside the target are captured. Closed shadow roots are not.

## htmx and server-rendered HTML

Fetch first, then swap inside `update`, so the wave never waits on the network:

```js
const html = await (await fetch('/cart/summary')).text();
distortionWave(summary, () => { summary.innerHTML = html; }, { source: button, focus: e, palette: 'mint' });
```

With htmx, take over the swap for elements you mark:

```js
document.body.addEventListener('htmx:beforeSwap', (evt) => {
  const target = evt.detail.target;
  if (!target.matches('[data-wave]')) return;
  evt.detail.shouldSwap = false;
  distortionWave(target, () => { target.innerHTML = evt.detail.serverResponse; htmx.process(target); });
});
```

This handles `innerHTML` swaps only: other `hx-swap` strategies need their own DOM code.
