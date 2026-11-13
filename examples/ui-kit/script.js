import { distortionWave as runWave, waveOnClick, warmupWave, setWaveDefaults } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.2/+esm';

// The Options panel (bottom right) can force one palette on every component.
let forcedPalette = '';
const distortionWave = (target, update, options = {}) => runWave(target, update, forcedPalette ? { ...options, palette: forcedPalette } : options);

// Every block below follows the same pattern:
//   distortionWave(target, () => { /* change the DOM */ }, { source, focus: event })
// target = what gets the wave, source = where it starts, focus = the touch point.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pressed = (el) => el.getAttribute('aria-pressed') === 'true';
warmupWave();                                   // compile the shaders before the first click

// ═════════════════════════════ Buttons ═════════════════════════════

// Like: no source → a ring from the touch point, inside the button itself
const like = $('.like');
like.addEventListener('click', (e) => {
  const on = !pressed(like);
  distortionWave(like, () => {
    like.setAttribute('aria-pressed', on);
    const n = like.querySelector('.n');
    n.textContent = +n.textContent + (on ? 1 : -1);
  }, { focus: e, palette: on ? 'ember' : 'aurora' });
});

// Follow
const follow = $('.follow');
follow.addEventListener('click', (e) => {
  const on = !follow.classList.contains('following');
  distortionWave(follow, () => {
    follow.classList.toggle('following', on);
    follow.textContent = on ? 'Following' : 'Follow';
  }, { focus: e, palette: 'ocean' });
});

// Bookmark
const bookmark = $('.bookmark');
bookmark.addEventListener('click', (e) => {
  const on = !pressed(bookmark);
  distortionWave(bookmark, () => {
    bookmark.setAttribute('aria-pressed', on);
    bookmark.querySelector('span').textContent = on ? 'Saved' : 'Save';
  }, { focus: e, palette: 'ocean' });
});

// Vote: the wave leaves the arrow you pressed
const vote = $('#vote');
vote.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const dir = btn.classList.contains('up') ? 1 : -1;
  const next = +vote.dataset.v === dir ? 0 : dir;
  distortionWave(vote, () => {
    vote.dataset.v = next;
    vote.querySelector('b').textContent = 42 + next;
  }, { source: btn, focus: e, palette: dir > 0 ? 'ember' : 'ocean' });
});

// Download: two waves in a row (idle → busy → done), chained on `finished`
const dl = $('.download');
const setDownload = (state, label) => { dl.dataset.state = state; dl.querySelector('span').textContent = label; };
dl.addEventListener('click', async (e) => {
  if (dl.dataset.state === 'busy') return;
  if (dl.dataset.state === 'done') return distortionWave(dl, () => setDownload('idle', 'Download'), { focus: e });
  await distortionWave(dl, () => setDownload('busy', 'Downloading…'), { focus: e, palette: 'ocean' }).finished;
  await new Promise((r) => setTimeout(r, 900));
  distortionWave(dl, () => setDownload('done', 'Downloaded'), { palette: 'mint' });
});

// Copy: the wave crosses the code block from the button
const copy = $('.copy');
copy.addEventListener('click', (e) => {
  navigator.clipboard?.writeText($('.code code').textContent).catch(() => {});
  distortionWave($('.code'), () => {
    copy.textContent = 'Copied!';
    copy.classList.add('done');
  }, { source: copy, focus: e, palette: 'mint' }).finished.then(() => setTimeout(() => {
    copy.textContent = 'Copy';
    copy.classList.remove('done');
  }, 1200));
});

// Delete · Undo: innerHTML is replaced, keyboard focus still lands on the new button
const file = $('#file');
const renderFile = (deleted) => {
  file.innerHTML = deleted
    ? '<span class="gone">invoice-0421.pdf moved to trash</span><button class="btn ghost undo">Undo</button>'
    : '<span class="file-ic">PDF</span><div><b>invoice-0421.pdf</b><small>184 KB</small></div><button class="btn danger del">Delete</button>';
};
renderFile(false);
file.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const deleted = btn.classList.contains('del');
  distortionWave(file, () => renderFile(deleted), { source: btn, focus: e, palette: deleted ? 'ember' : 'mint' });
});

// Mute
const mute = $('.mute');
mute.addEventListener('click', (e) => {
  const on = !pressed(mute);
  distortionWave(mute, () => {
    mute.setAttribute('aria-pressed', on);
    mute.setAttribute('aria-label', on ? 'Unmute' : 'Mute');
  }, { focus: e, palette: on ? 'ember' : 'mint' });
});

// ═════════════════════════ Toggles & selection ═════════════════════════

// Status pill: cycles Online → Away → Busy, with a custom palette
const STATUS = ['Online', 'Away', 'Busy'];
const pill = $('.pill');
pill.addEventListener('click', (e) => {
  const i = (+pill.dataset.i + 1) % STATUS.length;
  distortionWave(pill, () => {
    pill.dataset.i = i;
    pill.querySelector('span').textContent = STATUS[i];
  }, { focus: e, palette: ['#30d158', '#ffb23c', '#ff5a3c'] });
});

// Filter chips
$$('.chip').forEach((chip) => chip.addEventListener('click', (e) => {
  const on = !pressed(chip);
  distortionWave(chip, () => chip.setAttribute('aria-pressed', on), { focus: e });
}));

// Settings row: the wave leaves the switch and crosses the row
const row = $('#notif');
const rowSwitch = row.querySelector('.switch');
rowSwitch.addEventListener('click', (e) => {
  const on = rowSwitch.getAttribute('aria-checked') !== 'true';
  distortionWave(row, () => {
    rowSwitch.setAttribute('aria-checked', on);
    row.querySelector('small').textContent = on ? 'Weekly digest, mentions and replies.' : 'Muted. No emails at all.';
  }, { source: rowSwitch, focus: e, palette: on ? 'aurora' : 'ocean' });
});

// Checklist
$$('.todo').forEach((todo) => todo.addEventListener('click', (e) => {
  const on = !pressed(todo);
  distortionWave(todo, () => todo.setAttribute('aria-pressed', on), { focus: e, palette: on ? 'mint' : 'aurora' });
}));

// Radio cards: the whole group gets the wave, from the card you picked
const radios = $('#radios');
radios.addEventListener('click', (e) => {
  const card = e.target.closest('.radio-card');
  if (!card || card.getAttribute('aria-checked') === 'true') return;
  distortionWave(radios, () => {
    $$('.radio-card', radios).forEach((c) => c.setAttribute('aria-checked', c === card));
  }, { source: card, focus: e });
});

// Star rating
const rating = $('#rating');
const STARS = $$('.stars button', rating);
const RATING_LABELS = ['Meh', 'Okay', 'Good', 'Great', 'Loved it'];
rating.addEventListener('click', (e) => {
  const star = e.target.closest('button');
  if (!star) return;
  const n = STARS.indexOf(star) + 1;
  distortionWave(rating, () => {
    STARS.forEach((s, i) => s.classList.toggle('on', i < n));
    rating.querySelector('small').textContent = `${n}/5 · ${RATING_LABELS[n - 1]}`;
  }, { source: star, focus: e, palette: ['#ffc53d', '#ff9f43', '#ff6b6b'] });
});

// Colour: the preview changes, the wave leaves the swatch in that colour
const tee = $('#tee');
$('.swatches').addEventListener('click', (e) => {
  const swatch = e.target.closest('button');
  if (!swatch || pressed(swatch)) return;
  const c = swatch.style.getPropertyValue('--c');
  distortionWave(tee, () => {
    tee.style.setProperty('--c', c);
    tee.querySelector('small').textContent = swatch.getAttribute('aria-label');
    $$('.swatches button').forEach((b) => b.setAttribute('aria-pressed', b === swatch));
  }, { source: swatch, focus: e, palette: [c, '#ffffff', c] });
});

// Text align: the source (toolbar) sits outside the target (paragraph)
const alignText = $('#alignText');
$('#align').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || pressed(b)) return;
  distortionWave(alignText, () => {
    alignText.style.textAlign = b.dataset.a;
    $$('#align button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }, { source: b, focus: e });
});

// Units
const temp = $('#temp');
const unit = $('.unit');
unit.addEventListener('click', (e) => {
  const toF = unit.dataset.u === 'c';
  distortionWave(temp, () => {
    unit.dataset.u = toF ? 'f' : 'c';
    unit.textContent = toF ? '°F' : '°C';
    temp.querySelector('b').textContent = toF ? '70°' : '21°';
  }, { source: unit, focus: e, palette: 'ember' });
});

// ═════════════════════════════ Commerce ═════════════════════════════

// Add to cart: wave over the whole product card, cart badge updates outside
const product = $('#product');
const badge = $('.cart .badge');
let cartCount = 0;
product.addEventListener('click', (e) => {
  const add = e.target.closest('.add');
  if (!add) return;
  const inCart = !product.classList.contains('in-cart');
  distortionWave(product, () => {
    product.classList.toggle('in-cart', inCart);
    add.textContent = inCart ? 'Added ✓' : 'Add to cart';
    add.classList.toggle('done', inCart);
  }, { source: add, focus: e, palette: 'mint' });
  cartCount += inCart ? 1 : -1;
  badge.hidden = cartCount === 0;
  badge.textContent = cartCount;
  $('.cart').setAttribute('aria-label', `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`);
});

// Quantity stepper
const qty = $('#qty');
qty.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const out = qty.querySelector('output');
  const n = +out.textContent;
  const up = b.classList.contains('plus');
  const next = Math.max(1, Math.min(9, n + (up ? 1 : -1)));
  if (next === n) return;
  distortionWave(qty, () => { out.textContent = next; }, { source: b, focus: e, palette: up ? 'mint' : 'ember' });
});

// Wishlist: a small button on top of a card, the whole card gets the wave
const thumb = $('#thumb');
const heart = $('.heart');
heart.addEventListener('click', (e) => {
  const on = !pressed(heart);
  distortionWave(thumb, () => {
    heart.setAttribute('aria-pressed', on);
    heart.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
    thumb.classList.toggle('wished', on);
  }, { source: heart, focus: e, palette: 'ember' });
});

// Currency: a list re-rendered with innerHTML
const RATES = { usd: ['$', 1, 2], eur: ['€', 0.92, 2], jpy: ['¥', 151, 0] };
const ITEMS = [['Halo Lamp', 49], ['Lounge chair', 320], ['Desk mat', 24]];
const prices = $('#prices');
const renderPrices = (cur) => {
  const [sym, rate, digits] = RATES[cur];
  const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  prices.innerHTML = ITEMS.map(([name, usd]) => `<li><span>${name}</span><b>${sym}${fmt(usd * rate)}</b></li>`).join('');
  $$('#cur button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === cur));
};
renderPrices('usd');
$('#cur').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || pressed(b)) return;
  distortionWave(prices, () => renderPrices(b.dataset.c), { source: b, focus: e });
});

// ═════════════════════════ Navigation & content ═════════════════════════

// Pricing tabs: the wave goes down from the clicked tab into the plan
const PLANS = {
  monthly: { price: '$12', per: '/ month', save: '', perks: ['3 projects', 'Community support'] },
  yearly: { price: '$120', per: '/ year', save: '2 months free', perks: ['Unlimited projects', 'Priority support', 'Early access'] },
};
const plan = $('#plan');
const renderPlan = (key) => {
  const p = PLANS[key];
  plan.innerHTML = `<div class="amount">${p.price} <small>${p.per}</small></div>`
    + (p.save ? `<span class="save">${p.save}</span>` : '')
    + `<ul>${p.perks.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  $$('#planTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.plan === key));
};
renderPlan('monthly');
$('#planTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('button');
  if (!tab || tab.getAttribute('aria-selected') === 'true') return;
  distortionWave(plan, () => renderPlan(tab.dataset.plan), { source: tab, focus: e });
});

// Install tabs
const PM = { npm: 'npm i distortion-wave', pnpm: 'pnpm add distortion-wave', yarn: 'yarn add distortion-wave', bun: 'bun add distortion-wave' };
const pmCode = $('#pmCode');
$('#pmTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('button');
  if (!tab || tab.getAttribute('aria-selected') === 'true') return;
  distortionWave(pmCode, () => {
    pmCode.querySelector('code').textContent = PM[tab.textContent.trim()];
    $$('#pmTabs button').forEach((b) => b.setAttribute('aria-selected', b === tab));
  }, { source: tab, focus: e, palette: 'ocean' });
});

// Pagination: the source (page buttons) is below the target (list), so the wave goes up
const PAGES = [
  [['Aurora', 'Gradient', '#ff4fd8'], ['Nebula', 'Noise', '#5b7cff'], ['Comet', 'Particles', '#38d9ff']],
  [['Ember', 'Glow', '#ffb23c'], ['Lagoon', 'Water', '#2ec4d6'], ['Moss', 'Texture', '#30d158']],
  [['Prism', 'Refraction', '#8b7bff'], ['Dune', 'Displacement', '#ffd36b'], ['Coral', 'Blur', '#ff5a7a']],
];
const list = $('#list');
const pageButtons = $$('#pages button');
const renderList = (page) => {
  list.innerHTML = PAGES[page].map(([name, kind, c]) => `<li><i style="--c:${c}"></i><div><b>${name}</b><small>${kind}</small></div></li>`).join('');
  pageButtons.forEach((b, i) => (i === page ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
};
renderList(0);
$('#pages').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.hasAttribute('aria-current')) return;
  distortionWave(list, () => renderList(pageButtons.indexOf(b)), { source: b, focus: e });
});

// Accordion: the element changes size, the wave's shape follows it
const acc = $('#acc');
const accHead = acc.querySelector('.acc-head');
accHead.addEventListener('click', (e) => {
  const open = accHead.getAttribute('aria-expanded') !== 'true';
  distortionWave(acc, () => {
    accHead.setAttribute('aria-expanded', open);
    acc.querySelector('.acc-body').hidden = !open;
  }, { source: accHead, focus: e, palette: 'ocean' });
});

// Flashcard
const CARDS = [
  ['Which browser API does distortion-wave copy?', 'document.startViewTransition()'],
  ['What draws the wave?', 'One WebGL2 full-screen pass.'],
  ['What happens without WebGL?', 'Your update still runs, just without the wave.'],
];
const flash = $('#flash');
let card = 0, showAnswer = false;
const renderFlash = () => {
  const [q, a] = CARDS[card];
  flash.classList.toggle('answer', showAnswer);
  flash.innerHTML = showAnswer
    ? `<small>Answer</small><p>${a}</p><button class="btn">Next question</button>`
    : `<small>Question ${card + 1}/${CARDS.length}</small><p>${q}</p><button class="btn">Show answer</button>`;
};
renderFlash();
flash.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const toAnswer = !showAnswer;
  distortionWave(flash, () => {
    if (toAnswer) showAnswer = true;
    else { showAnswer = false; card = (card + 1) % CARDS.length; }
    renderFlash();
  }, { source: b, focus: e, palette: toAnswer ? 'aurora' : 'ocean' });
});

// Language
const HELLO = [['Hello, world', 'English'], ['Bonjour le monde', 'Français'], ['Hola, mundo', 'Español'], ['Hallo Welt', 'Deutsch'], ['こんにちは世界', '日本語']];
const hello = $('#hello');
const lang = $('.lang');
let li = 0;
lang.addEventListener('click', (e) => {
  li = (li + 1) % HELLO.length;
  distortionWave(hello, () => {
    hello.querySelector('b').textContent = HELLO[li][0];
    hello.querySelector('small').textContent = HELLO[li][1];
  }, { source: lang, focus: e });
});

// ═════════════════════════ Forms & feedback ═════════════════════════

// Newsletter: the form turns into a success message (works with Enter too)
const form = $('#newsletter');
let formPoint = null;                           // submit events carry no coordinates: remember the pointer
form.addEventListener('pointerdown', (e) => { formPoint = { x: e.clientX, y: e.clientY }; });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  distortionWave(form, () => {
    form.classList.add('sent');
    form.innerHTML = '<span>You’re in. See you in your inbox ✦</span>';
  }, { source: form.querySelector('button'), focus: formPoint, palette: 'aurora' });
  formPoint = null;
});

// Password reveal
const pw = $('#pw');
const eye = pw.querySelector('.eye');
const pwInput = pw.querySelector('input');
eye.addEventListener('click', (e) => {
  const show = !pressed(eye);
  distortionWave(pw, () => {
    pwInput.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', show);
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }, { source: eye, focus: e });
});

// Order progress
const STEPS = ['Ordered', 'Packed', 'Shipped', 'Delivered'];
const order = $('#order');
const nextStep = $('.next-step');
const renderOrder = () => {
  const step = +order.dataset.step;
  order.innerHTML = STEPS.map((name, i) => `<span class="${i < step ? 'done' : ''}">${name}</span>`).join('');
  nextStep.textContent = step >= STEPS.length ? 'Start over' : 'Next step';
};
renderOrder();
nextStep.addEventListener('click', (e) => {
  const step = +order.dataset.step;
  distortionWave(order, () => {
    order.dataset.step = step >= STEPS.length ? 1 : step + 1;
    renderOrder();
  }, { source: nextStep, focus: e, palette: 'mint' });
});

// Notifications
const notifs = $('#notifs');
const mark = $('.mark');
mark.addEventListener('click', (e) => {
  const read = mark.textContent === 'Mark all as read';
  distortionWave(notifs, () => {
    $$('li', notifs).slice(0, 2).forEach((item) => item.classList.toggle('unread', !read));
    mark.textContent = read ? 'Mark as unread' : 'Mark all as read';
  }, { source: mark, focus: e, palette: 'ocean' });
});

// Chat: a message is appended, the thread grows and the shape follows
const thread = $('#thread');
const composer = $('#composer');
const NEXT_MESSAGES = ['Wait, it works on a single button too?', 'Shipping this tomorrow.', 'That rim glow 👌'];
let mi = 0, chatPoint = null;
composer.addEventListener('pointerdown', (e) => { chatPoint = { x: e.clientX, y: e.clientY }; });
composer.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = composer.querySelector('input');
  const text = input.value.trim();
  if (!text) return;
  distortionWave(thread, () => {
    const msg = document.createElement('p');
    msg.className = 'msg me';
    msg.textContent = text;
    thread.append(msg);
    while (thread.children.length > 4) thread.firstElementChild.remove();
  }, { source: composer.querySelector('button'), focus: chatPoint, palette: 'aurora' });
  input.value = NEXT_MESSAGES[mi++ % NEXT_MESSAGES.length];
  chatPoint = null;
});

// Player
const player = $('#player');
const play = player.querySelector('.play');
play.addEventListener('click', (e) => {
  const on = !pressed(play);
  distortionWave(player, () => {
    play.setAttribute('aria-pressed', on);
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    player.classList.toggle('playing', on);
    player.querySelector('small').textContent = on ? 'Playing · 1:24 / 3:58' : 'Paused';
  }, { source: play, focus: e, palette: 'aurora' });
});

// ═════════════════════════ The whole page ═════════════════════════

// Theme: one wave across everything, from the switch (waveOnClick also pre-captures on hover)
const app = $('#app');
const theme = $('#theme');
waveOnClick(theme, app, () => {
  const dark = theme.getAttribute('aria-checked') !== 'true';
  app.dataset.theme = dark ? 'dark' : 'light';
  theme.setAttribute('aria-checked', dark);
  theme.setAttribute('aria-label', dark ? 'Dark theme' : 'Light theme');
});

// ═════════════════════════ React ═════════════════════════
// React is loaded from esm.sh on demand (htm instead of JSX, so no build step).
// useWave() renders the state change with flushSync: the DOM is up to date when the "after" capture runs.

const reactRoot = $('#react-root');
Promise.all([
  import('https://esm.sh/react@19'),
  import('https://esm.sh/react-dom@19'),
  import('https://esm.sh/react-dom@19/client'),
  import('https://esm.sh/htm@3'),
]).then(([{ default: React }, { flushSync }, { createRoot }, { default: htm }]) => {
  const { useCallback, useRef, useState } = React;
  const html = htm.bind(React.createElement);
  const useWave = () => useCallback((ref, update, options) => distortionWave(ref.current, () => flushSync(update), options), []);

  function Star() {
    const wave = useWave();
    const ref = useRef(null);
    const [on, setOn] = useState(false);
    return html`<button ref=${ref} className="btn bookmark" aria-pressed=${on}
      onClick=${(e) => wave(ref, () => setOn((v) => !v), { focus: e, palette: 'ember' })}>
      <span>${on ? '★ Starred · 1,205' : '☆ Star · 1,204'}</span>
    </button>`;
  }

  const PLANS = { Hobby: ['$0', '1 project, community support'], Pro: ['$12', 'Unlimited projects, priority support'], Team: ['$40', '10 seats, SSO, audit log'] };
  function Plans() {
    const wave = useWave();
    const panel = useRef(null);
    const [plan, setPlan] = useState('Hobby');
    return html`<div className="react-root">
      <div className="segmented" role="tablist">
        ${Object.keys(PLANS).map((k) => html`<button key=${k} role="tab" aria-selected=${plan === k}
          onClick=${(e) => plan !== k && wave(panel, () => setPlan(k), { source: e.currentTarget, focus: e })}>${k}</button>`)}
      </div>
      <div className="react-panel" ref=${panel}>
        <b>${PLANS[plan][0]} <small>/ month</small></b>
        <small>${PLANS[plan][1]}</small>
      </div>
    </div>`;
  }

  createRoot(reactRoot).render(html`<div className="react-root"><div className="react-row"><${Star} /></div><${Plans} /></div>`);
}).catch((err) => {
  reactRoot.innerHTML = '<p class="react-note">This part loads React from esm.sh, it needs a network connection.</p>';
  console.info('[ui-kit] React demo not loaded:', err);
});

// ═════════════════════════ Options panel ═════════════════════════
// Duration, easing and intensity go through setWaveDefaults(): every wave on the page picks them up.

const tweaks = $('#tweaks');
const tweaksToggle = $('.tweaks-toggle');
const tweaksBody = $('#tweaksBody');
tweaksToggle.addEventListener('click', (e) => {
  const open = tweaksBody.hidden;
  distortionWave(tweaks, () => {
    tweaksBody.hidden = !open;
    tweaksToggle.setAttribute('aria-expanded', open);
  }, { source: tweaksToggle, focus: e, palette: 'ocean' });
});
const applyTweaks = () => {
  const duration = +$('#tDur').value, intensity = +$('#tInt').value, easing = $('#tEase').value;
  forcedPalette = $('#tPal').value;
  $('#tDurOut').textContent = duration ? `${duration} ms` : 'auto';
  $('#tIntOut').textContent = intensity.toFixed(1);
  const opts = { duration: duration || undefined, easing, intensity };
  setWaveDefaults(null); setWaveDefaults(opts);
  const shown = Object.entries(opts)
    .filter(([k, v]) => v !== undefined && !(k === 'intensity' && v === 1) && !(k === 'easing' && v.startsWith('cubic-bezier(0.2, 1')))
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`);
  $('#tCode').textContent = `setWaveDefaults({ ${shown.join(', ')} })`.replace('({  })', '({})')
    + (forcedPalette ? `\n// and on every call: { palette: '${forcedPalette}' }` : '');
};
['#tDur', '#tInt', '#tEase', '#tPal'].forEach((id) => $(id).addEventListener('input', applyTweaks));
applyTweaks();
