# Recipes

Each line is a component from the official UI kit (`examples/ui-kit` in the package repo, about 40 pieces). The code for all of them is in `examples/ui-kit/script.js`.

## Contents

- Choosing target and source, per component
- Copy with a label that reverts
- Two states in a row
- Form submit
- Theme switch on the whole page
- Route change in a single-page app
- Swapping an image
- Keyboard and focus
- App-wide settings

## Choosing target and source, per component

| Component | target | source | Notes |
|---|---|---|---|
| Like, bookmark, mute, follow, status pill | the button | none | ring from the touch point; palette by meaning (ember for like, mint for success) |
| Filter chip, checklist item | the chip or item | none | |
| Vote up/down | the vote group | the arrow pressed | the wave leaves the arrow |
| Settings row with a switch | the row | the switch | the subtitle text changes too, so the row is the target |
| Radio cards, segmented control | the group | the chosen card | return early when it is already selected |
| Star rating | the rating block | the star clicked | custom palette: `['#ffc53d', '#ff9f43', '#ff6b6b']` |
| Colour swatch → preview | the preview | the swatch | `palette: [colour, '#ffffff', colour]` |
| Toolbar → paragraph (text align) | the paragraph | the toolbar button | the source sits outside the target |
| Add to cart | the product card | the button | update the header badge in the same `update`, without its own wave |
| Quantity stepper | the stepper | `+` or `−` | return early at the bounds: no wave when nothing changes |
| Wishlist heart on a card | the card | the heart | |
| Currency or unit switch | the list of prices / the value | the switch | `innerHTML` re-render is fine |
| Tabs | the panel | the tab | not the tab bar |
| Pagination | the list | the page button | the source is below the target: the wave goes up |
| Accordion | the whole accordion | the header | the size changes; the outline of the wave follows |
| Flashcard | the card | its button | two clicks, two waves (question → answer → next) |
| Delete → Undo row | the row | the button | `innerHTML` is replaced; focus lands on the new button |
| Order progress, steps | the steps row | "Next step" | a transparent row: the wave lights the content only (≥ 0.1.1) |
| Notifications "mark all read" | the list | the button | |
| Chat composer | the thread | Send | the thread grows |
| Media player | the player | play/pause | |
| Options panel open/close | the panel wrapper | the toggle | |

## Copy with a label that reverts

```js
copy.addEventListener('click', (e) => {
  navigator.clipboard?.writeText(code.textContent);
  distortionWave(codeBlock, () => { copy.textContent = 'Copied!'; }, { source: copy, focus: e, palette: 'mint' })
    .finished.then(() => setTimeout(() => { copy.textContent = 'Copy'; }, 1200));   // revert without a wave
});
```

## Two states in a row

```js
dl.addEventListener('click', async (e) => {
  await distortionWave(dl, () => setLabel('Downloading…'), { focus: e, palette: 'ocean' }).finished;
  await download();                                   // the real work, between the two waves
  distortionWave(dl, () => setLabel('Downloaded'), { palette: 'mint' });
});
```

## Form submit

`submit` has no coordinates, and Enter in a field must work too. Remember the last pointer position on the form:

```js
let point = null;
form.addEventListener('pointerdown', (e) => { point = { x: e.clientX, y: e.clientY }; });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  distortionWave(form, () => { form.innerHTML = '<p>You’re in.</p>'; },
    { source: form.querySelector('button'), focus: point, palette: 'aurora' });
  point = null;
});
```

## Theme switch on the whole page

Wrap the app in an element (the target can't be `body`), and use `waveOnClick`: it pre-captures the page on hover, so the click starts at once.

```js
waveOnClick(themeSwitch, app, () => {
  const dark = app.dataset.theme !== 'dark';
  app.dataset.theme = dark ? 'dark' : 'light';
  themeSwitch.setAttribute('aria-checked', dark);
});
```

Keep fixed UI that must not wave (a floating panel, a toast) outside the wrapper: everything inside the target is hidden while the overlay plays.

## Route change in a single-page app

Target the outlet, not the whole page; load the data first.

```js
nav.addEventListener('click', async (e) => {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  e.preventDefault();
  const data = await loadRoute(link.dataset.route);            // network outside the wave
  distortionWave(outlet, () => render(outlet, data), { source: link, focus: e, duration: 1400 });
  history.pushState({}, '', link.href);
});
```

## Swapping an image

The "after" snapshot waits for the `<img>` inside the target to decode, and the anticipation holds meanwhile. Preload so it doesn't hold:

```js
const img = new Image(); img.src = nextSrc; await img.decode();
distortionWave(card, () => { card.querySelector('img').src = nextSrc; }, { source: button, focus: e });
```

Cross-origin images need CORS (`crossorigin="anonymous"` plus the server header), or they come out transparent in the snapshot.

## Keyboard and focus

Nothing special to do for Enter and Space on a real `<button>`: the wave starts centred, and focus is moved to the equivalent control if your update replaced the focused one. Help it with a stable `id` or `data-focus-key` on controls you re-render:

```html
<button class="del" data-focus-key="file-action">Delete</button>
<!-- after the update -->
<button class="undo" data-focus-key="file-action">Undo</button>
```

## App-wide settings

```js
setWaveDefaults({ duration: 1100, easing: 'ease-out', intensity: 0.7 });
```

A UI to try settings live (sliders for duration and intensity, easing and palette pickers) is the Options panel of the UI kit.
