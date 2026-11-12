// End-to-end checks in a real Chromium (WebGL2 through SwiftShader, no GPU needed).
/* global __dw */
//   npx playwright install chromium   (once)
//   npm run build && npm run test:browser
// Set CHROME_PATH to use an installed Chrome instead.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const url = pathToFileURL(resolve('demo/standalone.html')).href;
const shots = process.env.SHOTS ? resolve(process.env.SHOTS) : null;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
};
const open = async (ctxOpts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /distortion-wave/.test(m.text())) errors.push(m.text()); });
  await page.goto(url); await page.waitForSelector('body[data-ready="1"]');
  return { page, errors, ctx };
};
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : `${a.localName}.${a.className}:${(a.innerText || '').trim()}`; });

await check('events fire in order and the DOM is restored', async () => {
  const { page, errors } = await open();
  const r = await page.evaluate(async () => {
    const phone = document.getElementById('phone'), ev = [];
    const t = __dw.distortionWave(phone, () => { phone.querySelector('.cta').textContent = 'Done'; }, {
      source: phone.querySelector('.cta'), onLaunch: () => ev.push('launch'), onCovered: () => ev.push('covered'), onSettled: () => ev.push('settled'), onEnd: () => ev.push('end'),
    });
    await t.ready; ev.push('ready'); await t.updateCallbackDone; ev.push('updated'); await t.finished; ev.push('finished');
    return { ev, canvases: document.querySelectorAll('canvas').length, opacity: phone.style.opacity };
  });
  assert.deepEqual(r.ev.filter((e) => e !== 'ready' && e !== 'updated'), ['launch', 'covered', 'settled', 'end', 'finished']);
  assert.equal(r.canvases, 0); assert.equal(r.opacity, '');
  assert.deepEqual(errors, []);
});

await check('mid-transition frames render (screenshots if SHOTS=dir)', async () => {
  const { page, errors } = await open();
  const b = await (await page.$('#phone .cta')).boundingBox();
  await page.mouse.click(b.x + b.width * 0.85, b.y + b.height / 2);
  await page.waitForSelector('canvas[data-dw-ignore]', { state: 'attached', timeout: 3000 });
  if (shots) for (const [i, ms] of [300, 400, 600].entries()) { await page.waitForTimeout(ms); await page.screenshot({ path: `${shots}/phone-${i}.png`, clip: { x: b.x - 30, y: b.y - 640, width: b.width + 60, height: 720 } }); }
  await page.waitForFunction(() => !document.querySelector('canvas[data-dw-ignore]'), null, { timeout: 15000 });
  assert.match(await page.textContent('#phone .cta'), /Done/);
  assert.deepEqual(errors, []);
});

await check('keyboard focus survives an innerHTML update', async () => {
  const { page } = await open();
  await page.focus('#phone .cta'); await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  assert.equal(await active(page), 'button.cta:Done');
  await page.waitForFunction(() => !document.querySelector('canvas[data-dw-ignore]'), null, { timeout: 15000 });
  assert.equal(await active(page), 'button.cta:Done');
});

await check('preserveFocus:false keeps the browser default (focus on body)', async () => {
  const { page } = await open();
  const r = await page.evaluate(async () => {
    const box = document.createElement('div'); box.innerHTML = '<input name="q" value="hello world">'; document.querySelector('main').prepend(box);
    const i = box.querySelector('input'); i.focus(); i.setSelectionRange(2, 7);
    let t = __dw.distortionWave(box, () => { box.innerHTML = '<input name="q" value="hello world">'; });
    await t.updateCallbackDone; const kept = document.activeElement.name + ':' + document.activeElement.selectionStart + '-' + document.activeElement.selectionEnd; await t.finished;
    box.querySelector('input').focus();
    t = __dw.distortionWave(box, () => { box.innerHTML = '<input name="q">'; }, { preserveFocus: false });
    await t.updateCallbackDone; const off = document.activeElement === document.body; await t.finished;
    return { kept, off };
  });
  assert.equal(r.kept, 'q:2-7'); assert.equal(r.off, true);
});

await check('works on a plain button, a tab panel, a media card and the whole app', async () => {
  const { page, errors } = await open();
  for (const [sel, click] of [['#sub', '#sub'], ['#stats', '.tab[data-p="month"]'], ['#notif', '#notif .toggle'], ['#weather', '#weather .next'], ['#app', '#theme']]) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), click);
    await page.click(click);
    await page.waitForFunction(() => !document.querySelector('canvas[data-dw-ignore]'), null, { timeout: 20000 });
    assert.equal(await page.evaluate((s) => document.querySelector(s).style.opacity, sel), '', `${sel} left hidden`);
  }
  assert.equal(await page.evaluate(() => document.getElementById('app').dataset.theme), 'light');
  assert.deepEqual(errors, []);
});

await check('reduced motion: update runs, crossfade only, nothing left behind', async () => {
  const { page, errors } = await open({ reducedMotion: 'reduce' });
  await page.click('#sub');
  await page.waitForFunction(() => document.getElementById('sub').getAttribute('aria-pressed') === 'true' && !document.querySelector('canvas[data-dw-ignore]'), null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

await check('update still runs when no new WebGL context can be created', async () => {
  const { page } = await open();
  const pressed = await page.evaluate(async () => {
    HTMLCanvasElement.prototype.getContext = () => null;            // simulate a browser without WebGL
    const box = document.createElement('div'); box.textContent = 'a'; document.querySelector('main').prepend(box);
    const t = __dw.distortionWave(box, () => { box.textContent = 'b'; }); await t.finished; return box.textContent;
  });
  assert.equal(pressed, 'b');
});

await browser.close();
console.log(results.join('\n'));
