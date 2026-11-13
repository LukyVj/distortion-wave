// capture.js — any DOM element → bitmap (through SVG <foreignObject>)
// Part of distortion-wave · MIT © Lucas Bonomi
//
// We clone the (composed) tree, open shadow DOM included, inlining every node's
// COMPUTED style, then serialize it into an SVG that the browser rasterizes itself
// (native fidelity: text, flex/grid, shadows, gradients, filters, inline SVG…).
// External resources (images, backgrounds, fonts) are turned into data URLs,
// otherwise they would not load inside an SVG image.
//
// Known limits: iframes (replaced by an empty box), cross-origin content without
// CORS, inner scroll positions, <use href="#…"> pointing outside the target.

const HTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const IGNORE_TAGS = new Set(['script', 'style', 'link', 'meta', 'template', 'noscript', 'source', 'track', 'base', 'title']);
const URL_PROPS = new Set(['background-image', 'mask-image', '-webkit-mask-image', 'border-image-source', 'list-style-image']);
const TRANSPARENT_PX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const skipProp = (p) => p.startsWith('--') || p.startsWith('transition') || p.startsWith('animation')
  || p === 'cursor' || p === 'will-change' || p === 'view-transition-name' || p === 'pointer-events';

// ── Per-tag default styles, measured in a blank iframe ──────────────────────
let sandbox = null;
const defaultsCache = new Map();
function sandboxDoc() {
  if (sandbox?.isConnected) return sandbox.contentDocument;
  sandbox = document.createElement('iframe');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.setAttribute('data-dw-ignore', '');
  sandbox.tabIndex = -1;
  sandbox.style.cssText = 'position:fixed;left:-99999px;top:0;width:16px;height:16px;border:0;opacity:0;pointer-events:none';
  document.documentElement.appendChild(sandbox);
  const d = sandbox.contentDocument;
  d.open(); d.write('<!doctype html><html><head></head><body></body></html>'); d.close();
  return d;
}
function defaultsFor(el) {
  const svg = el.namespaceURI === SVG_NS;
  const key = (svg ? 'svg:' : '') + el.localName + (el.localName === 'input' ? ':' + (el.type || 'text') : '');
  let d = defaultsCache.get(key);
  if (d) return d;
  const doc = sandboxDoc();
  const probe = svg ? doc.createElementNS(SVG_NS, el.localName) : doc.createElement(el.localName);
  if (el.localName === 'input') try { probe.type = el.type; } catch {}
  doc.body.appendChild(probe);
  const cs = sandbox.contentWindow.getComputedStyle(probe);
  d = new Map();
  for (let i = 0; i < cs.length; i++) d.set(cs[i], cs.getPropertyValue(cs[i]));
  probe.remove();
  defaultsCache.set(key, d);
  return d;
}

// Safe omission rule WITHOUT a list of inherited properties:
// a property is skipped only if its value equals the tag default AND the parent's value.
// → non-inherited: falls back to the default ✓ ; inherited: inherits from the parent ✓.
function styleText(cs, def, parentCS, isRoot, onUrl) {
  let out = '';
  for (let i = 0; i < cs.length; i++) {
    const p = cs[i];
    if (skipProp(p)) continue;
    const v = cs.getPropertyValue(p);
    if (!v) continue;
    if (v === def.get(p) && (isRoot || !parentCS || parentCS.getPropertyValue(p) === v)) continue;
    if (onUrl && URL_PROPS.has(p) && v.includes('url(')) onUrl(p, v);
    out += `${p}:${v};`;
  }
  return out;
}

// ── Resources → data URLs (cached per URL) ──────────────────────────────────
const dataUrlCache = new Map();
export function fetchDataURL(url) {
  if (url.startsWith('data:')) return Promise.resolve(url);
  let p = dataUrlCache.get(url);
  if (!p) {
    p = fetch(url, { mode: 'cors', credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.blob(); })
      .then((b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }));
    p.catch(() => dataUrlCache.delete(url));
    dataUrlCache.set(url, p);
  }
  return p;
}
async function inlineUrls(value) {
  const urls = [...value.matchAll(/url\((['"]?)(.*?)\1\)/g)].map((m) => m[2]).filter((u) => !u.startsWith('data:'));
  let out = value;
  for (const u of urls) {
    try { out = out.split(u).join(await fetchDataURL(new URL(u, document.baseURI).href)); } catch {}
  }
  return out;
}
function drawableToDataURL(el) {
  if (el.localName === 'canvas') return el.toDataURL();
  const c = document.createElement('canvas');                          // <video>: current frame
  c.width = el.videoWidth || el.clientWidth; c.height = el.videoHeight || el.clientHeight;
  c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
  return c.toDataURL();
}
async function inlineImage(img, url) {
  try { return await fetchDataURL(url); } catch {}
  try {                                                                 // already-decoded, untainted image
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL();
  } catch { return TRANSPARENT_PX; }
}

// ── Fonts: embed only the @font-face rules actually loaded ───────────────────
let fontKey = '', fontCss = null;
function embeddedFonts() {
  const faces = [...document.fonts].filter((f) => f.status === 'loaded');
  const key = faces.map((f) => `${f.family}|${f.style}|${f.weight}|${f.unicodeRange}`).join(';');
  if (fontCss && key === fontKey) return fontCss;
  fontKey = key;
  fontCss = buildFontCss(faces);
  return fontCss;
}
async function buildFontCss(faces) {
  if (!faces.length) return '';
  const norm = (s) => String(s || '').replace(/["']/g, '').replace(/\s+/g, '').toLowerCase();
  const weightOk = (a, b) => {                                          // a range ("100 900") accepts anything
    const n = (x) => { x = String(x || '400').trim().toLowerCase(); return { normal: '400', bold: '700' }[x] || x; };
    a = n(a); b = n(b);
    return a === b || a.includes(' ') || b.includes(' ');
  };
  const wanted = (st) => faces.some((f) => norm(f.family) === norm(st.getPropertyValue('font-family'))
    && norm(f.style) === norm(st.getPropertyValue('font-style') || 'normal')
    && weightOk(f.weight, st.getPropertyValue('font-weight') || '400')
    && norm(f.unicodeRange) === norm(st.getPropertyValue('unicode-range') || 'U+0-10FFFF'));
  const rules = [];
  const walk = (list, base) => {
    for (const r of list) {
      if (r instanceof CSSFontFaceRule) rules.push([r, base]);
      else if (r instanceof CSSImportRule) { try { if (r.styleSheet) walk(r.styleSheet.cssRules, r.styleSheet.href || base); } catch {} }
      else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const sheet of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
    const base = sheet.href || document.baseURI;
    try { walk(sheet.cssRules, base); } catch {
      if (!sheet.href) continue;                                        // cross-origin sheet: re-read its text
      try {
        const txt = await (await fetch(sheet.href)).text();
        const s = new CSSStyleSheet(); s.replaceSync(txt.replace(/@import[^;]+;/g, ''));
        walk(s.cssRules, sheet.href);
      } catch {}
    }
  }
  const out = [];
  for (const [r, base] of rules) {
    if (!wanted(r.style)) continue;
    const m = r.style.getPropertyValue('src').match(/url\((['"]?)(.*?)\1\)/);
    if (!m) continue;
    try {
      const data = await fetchDataURL(new URL(m[2], base).href);
      out.push(r.cssText.replace(/src\s*:[^;}]+;?/, `src:url("${data}");`));
    } catch {}
  }
  return out.join('\n');
}

// ── Cloning ──────────────────────────────────────────────────────────────────
function* composedChildren(node) {
  const root = node.shadowRoot || node;                                 // open shadow DOM
  for (const ch of root.childNodes) {
    if (ch.nodeType === 1 && ch.localName === 'slot') {
      const assigned = ch.assignedNodes({ flatten: true });
      if (assigned.length) { yield* assigned; continue; }
    }
    yield ch;
  }
}
let spanProbe = null;
function cloneTree(src, parentCS, isRoot, ctx) {
  if (src.nodeType === 3) return document.createTextNode(src.data);
  if (src.nodeType !== 1) return null;
  const tag = src.localName;
  if (IGNORE_TAGS.has(tag) || src.hasAttribute('data-dw-ignore')) return null;
  const cs = getComputedStyle(src);
  if (cs.display === 'none') return null;

  let clone;
  if (tag === 'canvas' || tag === 'video') {
    clone = document.createElement('img');
    try { clone.setAttribute('src', drawableToDataURL(src)); } catch { clone = document.createElement('div'); }
  } else if (tag === 'iframe' || tag === 'embed' || tag === 'object') {
    clone = document.createElement('div');
  } else {
    clone = src.cloneNode(false);
  }
  for (const a of [...clone.attributes]) {
    const n = a.name.toLowerCase();
    // keep ids: inline SVGs reference them (gradients, clipPath, <use>)
    if (n.startsWith('on') || n === 'srcset' || n === 'sizes' || n === 'loading' || n === 'style' || n === 'class') clone.removeAttribute(a.name);
  }
  if (tag === 'img') {
    const url = src.currentSrc || src.src;
    clone.setAttribute('src', TRANSPARENT_PX);
    if (url) ctx.tasks.push(inlineImage(src, url).then((d) => clone.setAttribute('src', d)));
  }
  if (src.namespaceURI === SVG_NS && tag === 'image') {
    const href = src.getAttribute('href') || src.getAttributeNS(XLINK_NS, 'href');
    if (href && !href.startsWith('data:')) {
      clone.removeAttribute('href'); clone.removeAttributeNS(XLINK_NS, 'href');
      ctx.tasks.push(fetchDataURL(new URL(href, document.baseURI).href).then((d) => clone.setAttribute('href', d)).catch(() => {}));
    }
  }

  const urlProps = [];
  let st = styleText(cs, defaultsFor(src), parentCS, isRoot, (p, v) => urlProps.push([p, v]));
  if (isRoot) st += ctx.rootOverrides(cs);
  st += 'transition:none;animation:none;';
  clone.setAttribute('style', st);
  for (const [p, v] of urlProps) ctx.tasks.push(inlineUrls(v).then((nv) => {
    if (nv !== v) clone.setAttribute('style', clone.getAttribute('style').replace(`${p}:${v};`, `${p}:${nv};`));
  }));

  if (src.namespaceURI === HTML_NS || !src.namespaceURI) {             // ::before / ::after → CSS rules
    for (const ps of ['::before', '::after']) {
      const pcs = getComputedStyle(src, ps);
      const content = pcs.getPropertyValue('content');
      if (!content || content === 'none' || content === 'normal') continue;
      const cls = 'dw' + (ctx.n++).toString(36);
      clone.classList.add(cls);
      spanProbe ??= document.createElement('span');
      ctx.css += `.${cls}${ps}{${styleText(pcs, defaultsFor(spanProbe), cs, false, null)}}`;
    }
  }

  // form control state (properties are not attributes)
  if (tag === 'input') {
    if (src.type === 'checkbox' || src.type === 'radio') { if (src.checked) clone.setAttribute('checked', ''); else clone.removeAttribute('checked'); }
    // password: same number of characters, never the real value (the browser masks them anyway)
    else if (src.type === 'password') clone.setAttribute('value', '•'.repeat(src.value.length));
    else if (src.type !== 'file') clone.setAttribute('value', src.value);
  }
  if (tag === 'textarea') { clone.textContent = src.value; return clone; }
  if (tag === 'canvas' || tag === 'video' || tag === 'iframe' || tag === 'embed' || tag === 'object') return clone;

  for (const ch of composedChildren(src)) {
    const c = cloneTree(ch, cs, false, ctx);
    if (c) clone.appendChild(c);
  }
  if (tag === 'select') [...clone.querySelectorAll('option')].forEach((o, i) => {
    if (i === src.selectedIndex) o.setAttribute('selected', ''); else o.removeAttribute('selected');
  });
  return clone;
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Rasterizes an element as it is currently rendered.
 * @param {Element} el
 * @param {{ dpr?: number, clip?: {x,y,w,h}, rootOpacity?: string }} o
 *   clip: part of the element (CSS px, relative to its top-left corner) — typically
 *         the part visible in the viewport, to bound the cost.
 * @returns {Promise<{ canvas: HTMLCanvasElement, w: number, h: number, dpr: number, ms: number, bytes: number }>}
 */
export async function snapshotElement(el, { dpr = 1, clip = null, rootOpacity = null } = {}) {
  const t0 = performance.now();
  await document.fonts.ready;
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth ?? r.width, h = el.offsetHeight ?? r.height;
  const c = clip ?? { x: 0, y: 0, w, h };
  const ctx = {
    tasks: [], css: '', n: 0,
    rootOverrides: (cs) => `margin:0!important;position:relative!important;inset:auto!important;float:none!important;`
      + `transform:none!important;translate:none!important;rotate:none!important;scale:none!important;`
      + `box-sizing:border-box!important;width:${w}px!important;height:${h}px!important;`
      + (cs.display.startsWith('inline') && cs.display !== 'inline-block' && cs.display !== 'inline-flex' && cs.display !== 'inline-grid' ? 'display:inline-block!important;' : '')
      + (rootOpacity != null ? `opacity:${rootOpacity}!important;` : ''),
  };
  const clone = cloneTree(el, null, true, ctx);
  if (!clone) throw new Error('distortion-wave: element is not rendered (display:none?)');
  await Promise.all(ctx.tasks);
  const fonts = await embeddedFonts();
  const xml = new XMLSerializer().serializeToString(clone);
  const cw = Math.max(1, Math.round(c.w)), ch = Math.max(1, Math.round(c.h));
  const svg = `<svg xmlns="${SVG_NS}" width="${cw}" height="${ch}"><foreignObject x="0" y="0" width="${cw}" height="${ch}">`
    + `<div xmlns="${HTML_NS}" style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;margin:0;padding:0">`
    + `<style>${escapeXml(fonts + ctx.css)}</style>`
    + `<div style="position:absolute;left:${-c.x}px;top:${-c.y}px;width:${w}px;height:${h}px">${xml}</div>`
    + `</div></foreignObject></svg>`;
  const img = new Image();
  img.decoding = 'async';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cw * dpr)); canvas.height = Math.max(1, Math.round(ch * dpr));
  const g = canvas.getContext('2d', { willReadFrequently: false });
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  g.getImageData(0, 0, 1, 1);                                            // throws SecurityError if tainted → fallback
  return { canvas, w: cw, h: ch, dpr, ms: performance.now() - t0, bytes: svg.length };
}
