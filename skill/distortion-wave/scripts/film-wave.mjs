#!/usr/bin/env node
// Films a distortion-wave frame by frame, with the page clock frozen, so you can look at it.
//
//   node film-wave.mjs --url http://localhost:5173 --click '#add' --clip '.product' --out /tmp/wave
//
// Needs Playwright in the project you run it from:  npm i -D playwright && npx playwright install chromium
//
// Options
//   --url <url|path>     page to load (http(s):// or a local .html file)                 required
//   --click <selector>   element to click; the click happens at its centre               required
//   --clip <selector>    area to screenshot (with --pad around it). Default: the viewport
//   --out <dir>          where to write the PNGs. Default: ./wave-frames
//   --frames <n>         frames to film after the click, at 30 fps. Default: 60 (2 s)
//   --every <n>          keep one frame out of n (the first 4 are always kept). Default: 3
//   --viewport <WxH>     Default: 1280x800
//   --dpr <n>            device pixel ratio. Default: 2
//   --pad <px>           margin around --clip. Default: 24
//   --settle <ms>        real time given to the snapshots after the click, clock frozen. Default: 800
//   --wait <selector>    wait for this selector before clicking (an app that renders late)
//   --reduced-motion     emulate prefers-reduced-motion: reduce
//
// How it works: performance.now() and requestAnimationFrame are replaced before the page loads,
// so time only moves when the script says so. After the click, the clock stays frozen for
// --settle ms of real time while the "before" and "after" snapshots are taken, then advances by
// 1/30 s per frame. Frame 0 is the state before the click; the last one should be the new state.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
if (!args.url || !args.click) {
  console.error('usage: node film-wave.mjs --url <url|file> --click <selector> [--clip <selector>] [--out dir]');
  process.exit(1);
}
const out = resolve(args.out || 'wave-frames');
const frames = +(args.frames || 60), every = +(args.every || 3), pad = +(args.pad || 24), settle = +(args.settle || 800);
const [vw, vh] = String(args.viewport || '1280x800').split('x').map(Number);
const url = /^https?:|^file:/.test(args.url) ? args.url : pathToFileURL(resolve(args.url)).href;

let chromium;
try {
  const require = createRequire(resolve(process.cwd(), 'noop.js'));
  const pw = await import(pathToFileURL(require.resolve('playwright')).href);
  chromium = pw.chromium ?? pw.default?.chromium;
} catch {
  console.error('Playwright not found from this folder. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

function frozenClock() {
  let now = 1000; const queue = []; let id = 0;
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { queue.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { const k = queue.findIndex((q) => q[0] === i); if (k >= 0) queue.splice(k, 1); };
  window.__advance = (ms) => { now += ms; for (const [, cb] of queue.splice(0)) { try { cb(now); } catch (e) { console.error(e); } } };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],   // WebGL2 without a GPU
});
const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: +(args.dpr || 2), reducedMotion: args['reduced-motion'] ? 'reduce' : 'no-preference' });
const page = await context.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || /distortion-wave/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
await page.addInitScript(frozenClock);
await page.goto(url, { waitUntil: 'load' });
if (args.wait) await page.waitForSelector(args.wait);
await page.evaluate(() => document.fonts.ready);
const flush = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) { await page.evaluate(() => window.__advance(0)); await page.waitForTimeout(16); } };
await flush(300);                                                     // let the page finish its first frames

const focusSel = args.clip || args.click;
await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), focusSel);
await flush(100);
const clip = args.clip ? await page.evaluate(([s, p]) => {
  const r = document.querySelector(s).getBoundingClientRect();
  const x = Math.max(0, r.left - p), y = Math.max(0, r.top - p);
  return { x, y, width: Math.min(innerWidth - x, r.width + p * 2), height: Math.min(innerHeight - y, r.height + p * 2) };
}, [args.clip, pad]) : undefined;
const target = await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, args.click);
if (!target) { console.error(`--click: nothing matches ${args.click}`); process.exit(1); }

await mkdir(out, { recursive: true });
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, clip });
const written = [];
await shot('f000-before'); written.push('f000-before.png');
await page.mouse.click(target.x, target.y);
await flush(settle);                                                  // snapshots run in real time, the wave doesn't move
for (let f = 1; f <= frames; f++) {
  await page.evaluate((dt) => window.__advance(dt), 1000 / 30);
  if (f <= 4 || f % every === 0 || f === frames) {
    const name = `f${String(f).padStart(3, '0')}-${(f / 30).toFixed(2)}s`;
    await shot(name); written.push(`${name}.png`);
  }
}
await writeFile(`${out}/index.txt`, `${url}\nclick ${args.click}\n\n${written.join('\n')}\n${logs.length ? `\nconsole:\n${logs.join('\n')}\n` : ''}`);
console.log(`${written.length} frames in ${out}${logs.length ? `\n${logs.join('\n')}` : ''}`);
await browser.close();
