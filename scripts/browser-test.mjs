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
  await page.waitForSelector('canvas[data-dw-ignore]', { state: 'attached', timeout: 15000 });
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
  await page.waitForFunction(() => document.getElementById('sub').getAttribute('aria-pressed') === 'true' && !document.querySelector('canvas[data-dw-ignore]'), null, { timeout: 15000 });
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

await check('rounded corners come from overflow-clipping parents and partial radii survive', async () => {
  const { page } = await open();
  const r = await page.evaluate(async () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:300px;border-radius:16px;overflow:hidden;border:1px solid #333;margin:20px';
    wrap.innerHTML = '<pre id="clipkid" style="margin:0;padding:12px;background:#111;color:#eee">npm i distortion-wave</pre>';
    const tab = document.createElement('button');
    tab.id = 'halfround'; tab.textContent = 'tab'; tab.style.cssText = 'border-radius:12px 12px 0 0;padding:8px 16px;background:#222;color:#eee;border:0;margin:20px';
    document.querySelector('main').prepend(wrap, tab);
    const a = __dw.distortionWave(document.getElementById('clipkid'), () => { document.getElementById('clipkid').textContent = 'bun add distortion-wave'; });
    await a.ready; const ra = { ...a.rects.radii, clipped: a.rects.clipped }; a.skip(); await a.finished.catch(() => {});
    const b = __dw.distortionWave(tab, () => { tab.textContent = 'tab!'; });
    await b.ready; const rb = { ...b.rects.radii }; b.skip(); await b.finished.catch(() => {});
    return { ra, rb };
  });
  assert.ok(r.ra.clipped, 'clipped by the parent');
  assert.ok(Math.abs(r.ra.bl - 15) < 0.6 && Math.abs(r.ra.tl - 15) < 0.6, `parent radius minus border, got ${JSON.stringify(r.ra)}`);
  assert.ok(Math.abs(r.rb.tl - 12) < 0.01 && Math.abs(r.rb.tr - 12) < 0.01 && r.rb.bl === 0, `partial radii kept, got ${JSON.stringify(r.rb)}`);
});

// Subset of JetBrains Mono ("$ab" only), © 2020 The JetBrains Mono Project Authors, SIL Open Font License 1.1.
const TINY_FONT = 'data:font/woff;base64,d09GRgABAAAAAAVoAA8AAAAABfAAAQABAAAAAAAAAAAAAAAAAAAAAAAAAABHREVGAAAEuAAAABMAAAAUAA8AAkdQT1MAAATMAAAAIAAAACBEdkx1R1NVQgAABOwAAAAqAAAAKrj6uPRPUy8yAAADVAAAAE4AAABgE3ZYDVNUQVQAAAUYAAAATwAAAF7mY9MfY21hcAAAA6QAAAAzAAAAPACzAENnYXNwAAAEsAAAAAgAAAAIAAAAEGdseWYAAAFYAAABagAAAXjOvmQZaGVhZAAAAvAAAAA2AAAANhSQ8UNoaGVhAAADNAAAACAAAAAkAcoBFWhtdHgAAAMoAAAACgAAAAoC4QC2bG9jYQAAAuQAAAAKAAAACgD1AG9tYXhwAAACxAAAAB0AAAAgAHwCb25hbWUAAAPYAAAAwAAAAWIhIDY/cG9zdAAABJgAAAAXAAAAIP9oADN4nCXPTS8DQRyA8f9OdXYrJBo7swmC7LCraWu7nZ1Zjaq2Gu+EtqiNkLARjaYJcXWqODn3zE18Hid3X0EcRAWf4Pc8gKDU+1C+UQbGwAYwTEt4knPhWczEKpOSZymJM8Gwiu2sFIKZmOj06yAM914W5txyNIjdHJy0G0p0xvGL1ee0t9h/uLnV8LmfYCv10/r3fdOdYCvF7HY2OSsAEBz1PlAEvQGFKYCoaVs2IyzOicql/+cR/d/6iyBEp8pmJWFiJQhQBLPEUi0Mr3Llcs4vlfqnxzNN9PZ460xMt0+ejtvblWK3WFkudAvLABFY7d2gocg5MEgCB4gKy7K5To24bf2e+oITSg3mWTYxKCU6VomQUniWgwTGRDeoMnx8iYJ5Obqxe1bP10IlcNMzazvNhiud1EA+5U4aDx2tue8WVAVrRmtt50K762gXVWde/Rw02uvVVqzzquUzqfJg3/W7KpMeG/kBY8tOzwAAeJxjYGRgYGBh3MGQx7CFgY0BxEMAZgYmACvxAe0AAAAAAAAAADkAbwC8AAAAAQAAAAI2BBD0ToZfDzz1AAMD6AAAAADb0qaaAAAAANva0PL5Of7UBJID/AAAAAYAAgAAAAAAAAJYAFoAQQBcAEgAAHicY2BkYGD+8+8KAwPLhp+Wf/tZJjEwMqACRgCvswbdeJxjYGGKYpzAwMrAwNTFFMHAwOANoRnjGIwYHRgYmBgYOBlggJEBCXg5MTAwHGBQYUhi/vPvCgMD8x9GHZgaJjWmWwwMDAoMrADh8QrlAAB4nB3KSw3AIAAFsPIJCpDAYbY2ZXOGlEfCqZeiomFqyrV7MHRFtXwJljfJzn8XDpBNCPAAeJx9zzFKxFAUheEvOiDKoC7AIqU2Rizt1EpBkEEQposhJJExb8gkhXubhbgCF+ACRHhGsRgsLvwczr3nXOyY25ZMdrFm5MSR9chb9r19c8LU+8iTP/qBqY+RD+35dC1YetVpVGq91LmzOKkHtVLqVql3pZNrtFZSd4JWkLrXCZ6Virh/adCrBV10Hse7vaWVC5lMpYmOwZNTheBFtiFlk/aTe/Jvq5lSZbCQ6zwqf/+70cstNAqzmJxrvwC9DzeAeJxjYGYAg/+pDEYMDAyMDGgAACWjAZsAAAEAAf//AA94nGNgZGBg4GGAAEYIBAAA6wASAAABAAAACgAcAB4AAURGTFQACAAEAAAAAP//AAAAAAAAAAEAAAAKACYAKAACREZMVAAObGF0bgAYAAQAAAAA//8AAAAAAAAAAAAAAAB4nC3LMQ6CYBQE4W8fxNhBQUVt5aFMrICEkoRreCArT2b843YzmRVxVZh0uKlzWY9gO557BnExu7em0udFHuRDe/xdvRtHZfRb+AJ0Nwc3AA==';
await check('a data: URL font does not break the CSS of the snapshot (::before survives)', async () => {
  const { page } = await open();
  const r = await page.evaluate(async (font) => {
    const st = document.createElement('style');
    st.textContent = `@font-face{font-family:Tiny;src:url(${font}) format('woff')} .tiny{font-family:Tiny} .tiny::before{content:"$ "}`;
    document.head.append(st);
    const el = document.createElement('code'); el.className = 'tiny'; el.textContent = 'ab'; document.querySelector('main').prepend(el);
    await document.fonts.load('16px Tiny');
    let svg = '';
    const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get() { return d.get.call(this); }, set(v) { if (v.startsWith('data:image/svg')) svg = decodeURIComponent(v.split(',')[1]); d.set.call(this, v); } });
    await __dw.snapshotElement(el);
    Object.defineProperty(HTMLImageElement.prototype, 'src', d);
    const css = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('style').textContent;
    const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
    const rules = [...sheet.cssRules];
    return { fontFaces: rules.filter((x) => x instanceof CSSFontFaceRule).length, before: rules.some((x) => /::before/.test(x.selectorText || '') && /"\$ "/.test(x.cssText)) };
  }, TINY_FONT);
  assert.ok(r.fontFaces >= 1, 'font embedded');
  assert.ok(r.before, '::before rule parsed after the @font-face');
});

await browser.close();
console.log(results.join('\n'));
