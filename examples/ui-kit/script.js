import { distortionWave, waveOnClick, warmupWave } from 'https://cdn.jsdelivr.net/npm/distortion-wave@0.1/+esm';

const $ = (s, r = document) => r.querySelector(s);
warmupWave();                                   // compile the shaders before the first click

// ── Like: the button is both target and source → a ring from the touch point
const like = $('.like');
like.addEventListener('click', (e) => {
  const on = like.getAttribute('aria-pressed') !== 'true';
  distortionWave(like, () => {
    like.setAttribute('aria-pressed', on);
    const n = like.querySelector('.n');
    n.textContent = +n.textContent + (on ? 1 : -1);
  }, { focus: e, palette: on ? 'ember' : 'aurora' });
});

// ── Follow
const follow = $('.follow');
follow.addEventListener('click', (e) => {
  const on = !follow.classList.contains('following');
  distortionWave(follow, () => {
    follow.classList.toggle('following', on);
    follow.textContent = on ? 'Following' : 'Follow';
  }, { focus: e, palette: 'ocean' });
});

// ── Status pill: cycles Online → Away → Busy
const STATUS = ['Online', 'Away', 'Busy'];
const pill = $('.pill');
pill.addEventListener('click', (e) => {
  const i = (+pill.dataset.i + 1) % STATUS.length;
  distortionWave(pill, () => {
    pill.dataset.i = i;
    pill.querySelector('span').textContent = STATUS[i];
  }, { focus: e, palette: ['#30d158', '#ffb23c', '#ff5a3c'] });
});

// ── Copy: the wave crosses the code block from the button
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

// ── Filter chips
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', (e) => {
  const on = chip.getAttribute('aria-pressed') !== 'true';
  distortionWave(chip, () => chip.setAttribute('aria-pressed', on), { focus: e });
}));

// ── Settings row: the wave leaves the switch and crosses the row
const row = $('#notif');
const sw = row.querySelector('.switch');
sw.addEventListener('click', (e) => {
  const on = sw.getAttribute('aria-checked') !== 'true';
  distortionWave(row, () => {
    sw.setAttribute('aria-checked', on);
    row.querySelector('small').textContent = on ? 'Weekly digest, mentions and replies.' : 'Muted. You will not get any email.';
  }, { source: sw, focus: e, palette: on ? 'aurora' : 'ocean' });
});

// ── Add to cart: wave over the whole product card, cart badge updates outside
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

// ── Pricing: the wave goes down from the clicked tab into the plan
const PLANS = {
  monthly: { price: '$12', per: '/ month', save: '', perks: ['3 projects', 'Community support'] },
  yearly: { price: '$120', per: '/ year', save: '2 months free', perks: ['Unlimited projects', 'Priority support', 'Early access'] },
};
const plan = $('#plan');
const renderPlan = (key) => {
  const p = PLANS[key];
  plan.innerHTML = `<div class="amount">${p.price} <small>${p.per}</small></div>
    ${p.save ? `<span class="save">${p.save}</span>` : ''}
    <ul>${p.perks.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  document.querySelectorAll('.segmented button').forEach((b) => b.setAttribute('aria-selected', b.dataset.plan === key));
};
renderPlan('monthly');
$('.segmented').addEventListener('click', (e) => {
  const tab = e.target.closest('button');
  if (!tab || tab.getAttribute('aria-selected') === 'true') return;
  distortionWave(plan, () => renderPlan(tab.dataset.plan), { source: tab, focus: e });
});

// ── Newsletter: the form turns into a success message (works with Enter too)
const form = $('#newsletter');
let pressedAt = null;                           // submit events carry no coordinates: remember the pointer
form.addEventListener('pointerdown', (e) => { pressedAt = { x: e.clientX, y: e.clientY }; });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  distortionWave(form, () => {
    form.classList.add('sent');
    form.innerHTML = '<span>You’re in. See you in your inbox ✦</span>';
  }, { source: form.querySelector('button'), focus: pressedAt, palette: 'aurora' });
  pressedAt = null;
});

// ── Theme: one wave across the whole page, from the switch
const app = $('#app');
const theme = $('#theme');
waveOnClick(theme, app, () => {
  const dark = theme.getAttribute('aria-checked') !== 'true';
  app.dataset.theme = dark ? 'dark' : 'light';
  theme.setAttribute('aria-checked', dark);
  theme.setAttribute('aria-label', dark ? 'Dark theme' : 'Light theme');
});
