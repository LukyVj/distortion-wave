// Clicks every component of examples/ui-kit in a real Chromium and checks the DOM change landed.
//   npm run build && node scripts/ui-kit-test.mjs        (SHOTS=dir to save screenshots)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const url = pathToFileURL(resolve('examples/ui-kit/standalone.html')).href;
const shots = process.env.SHOTS ? resolve(process.env.SHOTS) : null;
if (shots) await mkdir(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message/.test(m.text())) errors.push(m.text()); });   // SwiftShader perf notes are noise

// Count running transitions: wrap the global before the page script destructures it.
await page.addInitScript(() => {
  let lib;
  window.__active = 0; window.__waves = 0; window.__rejected = [];
  Object.defineProperty(window, 'DistortionWave', {
    configurable: true,
    get: () => lib,
    set(x) {
      lib = { ...x, distortionWave(...args) {
        const t = x.distortionWave(...args);
        window.__active++; window.__waves++;
        t.finished.then(() => window.__active--, (e) => { window.__active--; window.__rejected.push(String(e)); });
        return t;
      } };
    },
  });
});
await page.goto(url);
await page.waitForSelector('body[data-ready="1"]');
if (shots) await page.screenshot({ path: `${shots}/ui-kit-dark.png`, fullPage: true });

const idle = () => page.waitForFunction(() => window.__active === 0, null, { timeout: 10000 });
const results = [];
const step = async (name, selector, expect) => {
  try {
    await page.click(selector);
    await page.waitForTimeout(50);
    await idle();
    const ok = await page.evaluate(expect);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('#app *')].filter((e) => getComputedStyle(e).opacity === '0' && !e.closest('[hidden]')).map((e) => e.id || e.className));
    if (!ok) throw new Error('state did not change');
    if (hidden.length) throw new Error(`still hidden: ${hidden.join(', ')}`);
    results.push(`ok   ${name}`);
  } catch (e) { results.push(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

await step('like', '.like', () => document.querySelector('.like .n').textContent === '129');
await step('follow (avatar stays round)', '.follow', () => {
  const a = document.querySelector('.avatar').getBoundingClientRect();
  return document.querySelector('.follow').textContent === 'Following' && a.width === 40 && a.height === 40;
});
await step('unfollow', '.follow', () => document.querySelector('.follow').textContent === 'Follow');
await step('bookmark', '.bookmark', () => document.querySelector('.bookmark span').textContent === 'Saved');
await step('vote up', '#vote .up', () => document.querySelector('#vote b').textContent === '43');
await step('vote down', '#vote .down', () => document.querySelector('#vote b').textContent === '41');
await step('download', '.download', () => true);
await page.waitForFunction(() => document.querySelector('.download span').textContent === 'Downloaded', null, { timeout: 10000 }).then(() => results.push('ok   download → downloaded'), () => { results.push('FAIL download chain'); process.exitCode = 1; });
await idle();
await step('copy', '.copy', () => document.querySelector('.copy').textContent === 'Copied!');
await step('delete', '#file .del', () => !!document.querySelector('#file .undo'));
await step('undo', '#file .undo', () => !!document.querySelector('#file .del'));
await step('mute', '.mute', () => document.querySelector('.mute').getAttribute('aria-pressed') === 'true');
await step('status pill', '.pill', () => document.querySelector('.pill span').textContent === 'Away');
await step('chip', '.chip:nth-child(2)', () => document.querySelector('.chip:nth-child(2)').getAttribute('aria-pressed') === 'true');
await step('settings switch', '#notif .switch', () => document.querySelector('#notif .switch').getAttribute('aria-checked') === 'false');
await step('todo', '.todos li:nth-child(2) .todo', () => document.querySelector('.todos li:nth-child(2) .todo').getAttribute('aria-pressed') === 'true');
await step('radio card', '#radios .radio-card:nth-child(2)', () => document.querySelector('#radios .radio-card:nth-child(2)').getAttribute('aria-checked') === 'true');
await step('rating', '#rating .stars button:nth-child(4)', () => document.querySelectorAll('#rating .on').length === 4);
await step('swatch', '.swatches button:nth-child(3)', () => document.querySelector('#tee small').textContent === 'Lagoon');
await step('align', '#align button:nth-child(2)', () => document.querySelector('#alignText').style.textAlign === 'center');
await step('units', '.unit', () => document.querySelector('#temp b').textContent === '70°');
await step('add to cart', '#product .add', () => !document.querySelector('.cart .badge').hidden && document.querySelector('.cart .badge').textContent === '1');
await step('qty +', '#qty .plus', () => document.querySelector('#qty output').textContent === '2');
await step('qty −', '#qty .minus', () => document.querySelector('#qty output').textContent === '1');
await step('wishlist', '#thumb .heart', () => document.querySelector('#thumb').classList.contains('wished'));
await step('currency', '#cur button:nth-child(3)', () => document.querySelector('#prices b').textContent === '¥7,399');
await step('pricing tabs', '#planTabs button:nth-child(2)', () => document.querySelector('#plan .amount').textContent.startsWith('$120'));
await step('install tabs', '#pmTabs button:nth-child(4)', () => document.querySelector('#pmCode code').textContent === 'bun add distortion-wave');
await step('pagination', '#pages button:nth-child(3)', () => document.querySelector('#list b').textContent === 'Prism');
await step('accordion', '#acc .acc-head', () => !document.querySelector('#acc .acc-body').hidden);
await step('flashcard answer', '#flash button', () => document.querySelector('#flash').classList.contains('answer'));
await step('flashcard next', '#flash button', () => document.querySelector('#flash small').textContent === 'Question 2/3');
await step('language', '.lang', () => document.querySelector('#hello b').textContent === 'Bonjour le monde');
await page.fill('#newsletter input', 'test@example.com');
await step('newsletter', '#newsletter button', () => document.querySelector('#newsletter').classList.contains('sent'));
await step('password reveal', '#pw .eye', () => document.querySelector('#pw input').type === 'text');
await step('order step', '.next-step', () => document.querySelectorAll('#order .done').length === 2);
await step('notifications', '.mark', () => document.querySelectorAll('#notifs .unread').length === 0);
await step('chat', '#composer button', () => document.querySelector('#thread .msg:last-child').textContent === 'This is so smooth 🔥');
await step('player', '#player .play', () => document.querySelector('#player').classList.contains('playing'));

// keyboard: Delete with Enter, focus must land on the new Undo button
try {
  await page.focus('#file .del');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50); await idle();
  const f = await page.evaluate(() => document.activeElement.className);
  if (!/undo/.test(f)) throw new Error(`focus on "${f}"`);
  results.push('ok   keyboard focus survives innerHTML');
} catch (e) { results.push(`FAIL keyboard focus: ${e.message}`); process.exitCode = 1; }

// theme (waveOnClick), mid-wave screenshot then the final state
await page.evaluate(() => window.scrollTo(0, 0));
await page.hover('#theme'); await page.waitForTimeout(300);
await page.click('#theme');
if (shots) { await page.waitForTimeout(500); await page.screenshot({ path: `${shots}/ui-kit-theme-mid.png` }); }
await page.waitForTimeout(3500);
const light = await page.evaluate(() => document.getElementById('app').dataset.theme);
results.push(light === 'light' ? 'ok   theme' : `FAIL theme: ${light}`);
if (shots) await page.screenshot({ path: `${shots}/ui-kit-light.png`, fullPage: true });

const { waves, rejected } = await page.evaluate(() => ({ waves: window.__waves, rejected: window.__rejected }));
console.log(results.join('\n'));
console.log(`\n${waves} waves, ${rejected.length} rejected, ${errors.length} console errors`);
if (rejected.length || errors.length) { console.log([...rejected, ...errors].join('\n')); process.exitCode = 1; }
await browser.close();
