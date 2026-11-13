/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/capture.js
var HTML_NS = "http://www.w3.org/1999/xhtml";
var SVG_NS = "http://www.w3.org/2000/svg";
var XLINK_NS = "http://www.w3.org/1999/xlink";
var IGNORE_TAGS = /* @__PURE__ */ new Set(["script", "style", "link", "meta", "template", "noscript", "source", "track", "base", "title"]);
var URL_PROPS = /* @__PURE__ */ new Set(["background-image", "mask-image", "-webkit-mask-image", "border-image-source", "list-style-image"]);
var TRANSPARENT_PX = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
var skipProp = (p) => p.startsWith("--") || p.startsWith("transition") || p.startsWith("animation") || p === "cursor" || p === "will-change" || p === "view-transition-name" || p === "pointer-events";
var sandbox = null;
var defaultsCache = /* @__PURE__ */ new Map();
function sandboxDoc() {
  if (sandbox?.isConnected) return sandbox.contentDocument;
  sandbox = document.createElement("iframe");
  sandbox.setAttribute("aria-hidden", "true");
  sandbox.setAttribute("data-dw-ignore", "");
  sandbox.tabIndex = -1;
  sandbox.style.cssText = "position:fixed;left:-99999px;top:0;width:16px;height:16px;border:0;opacity:0;pointer-events:none";
  document.documentElement.appendChild(sandbox);
  const d = sandbox.contentDocument;
  d.open();
  d.write("<!doctype html><html><head></head><body></body></html>");
  d.close();
  return d;
}
function defaultsFor(el) {
  const svg = el.namespaceURI === SVG_NS;
  const key = (svg ? "svg:" : "") + el.localName + (el.localName === "input" ? ":" + (el.type || "text") : "");
  let d = defaultsCache.get(key);
  if (d) return d;
  const doc = sandboxDoc();
  const probe = svg ? doc.createElementNS(SVG_NS, el.localName) : doc.createElement(el.localName);
  if (el.localName === "input") try {
    probe.type = el.type;
  } catch {
  }
  doc.body.appendChild(probe);
  const cs = sandbox.contentWindow.getComputedStyle(probe);
  d = /* @__PURE__ */ new Map();
  for (let i = 0; i < cs.length; i++) d.set(cs[i], cs.getPropertyValue(cs[i]));
  probe.remove();
  defaultsCache.set(key, d);
  return d;
}
function styleText(cs, def, parentCS, isRoot, onUrl) {
  let out = "";
  for (let i = 0; i < cs.length; i++) {
    const p = cs[i];
    if (skipProp(p)) continue;
    const v = cs.getPropertyValue(p);
    if (!v) continue;
    if (v === def.get(p) && (isRoot || !parentCS || parentCS.getPropertyValue(p) === v)) continue;
    if (onUrl && URL_PROPS.has(p) && v.includes("url(")) onUrl(p, v);
    out += `${p}:${v};`;
  }
  return out;
}
var dataUrlCache = /* @__PURE__ */ new Map();
function fetchDataURL(url) {
  if (url.startsWith("data:")) return Promise.resolve(url);
  let p = dataUrlCache.get(url);
  if (!p) {
    p = fetch(url, { mode: "cors", credentials: "same-origin" }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.blob();
    }).then((b) => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    }));
    p.catch(() => dataUrlCache.delete(url));
    dataUrlCache.set(url, p);
  }
  return p;
}
async function inlineUrls(value) {
  const urls = [...value.matchAll(/url\((['"]?)(.*?)\1\)/g)].map((m) => m[2]).filter((u) => !u.startsWith("data:"));
  let out = value;
  for (const u of urls) {
    try {
      out = out.split(u).join(await fetchDataURL(new URL(u, document.baseURI).href));
    } catch {
    }
  }
  return out;
}
function drawableToDataURL(el) {
  if (el.localName === "canvas") return el.toDataURL();
  const c = document.createElement("canvas");
  c.width = el.videoWidth || el.clientWidth;
  c.height = el.videoHeight || el.clientHeight;
  c.getContext("2d").drawImage(el, 0, 0, c.width, c.height);
  return c.toDataURL();
}
async function inlineImage(img, url) {
  try {
    return await fetchDataURL(url);
  } catch {
  }
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL();
  } catch {
    return TRANSPARENT_PX;
  }
}
var fontKey = "";
var fontCss = null;
function embeddedFonts() {
  const faces = [...document.fonts].filter((f) => f.status === "loaded");
  const key = faces.map((f) => `${f.family}|${f.style}|${f.weight}|${f.unicodeRange}`).join(";");
  if (fontCss && key === fontKey) return fontCss;
  fontKey = key;
  fontCss = buildFontCss(faces);
  return fontCss;
}
async function buildFontCss(faces) {
  if (!faces.length) return "";
  const norm = (s) => String(s || "").replace(/["']/g, "").replace(/\s+/g, "").toLowerCase();
  const weightOk = (a, b) => {
    const n = (x) => {
      x = String(x || "400").trim().toLowerCase();
      return { normal: "400", bold: "700" }[x] || x;
    };
    a = n(a);
    b = n(b);
    return a === b || a.includes(" ") || b.includes(" ");
  };
  const wanted = (st) => faces.some((f) => norm(f.family) === norm(st.getPropertyValue("font-family")) && norm(f.style) === norm(st.getPropertyValue("font-style") || "normal") && weightOk(f.weight, st.getPropertyValue("font-weight") || "400") && norm(f.unicodeRange) === norm(st.getPropertyValue("unicode-range") || "U+0-10FFFF"));
  const rules = [];
  const walk = (list, base) => {
    for (const r of list) {
      if (r instanceof CSSFontFaceRule) rules.push([r, base]);
      else if (r instanceof CSSImportRule) {
        try {
          if (r.styleSheet) walk(r.styleSheet.cssRules, r.styleSheet.href || base);
        } catch {
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets || []]) {
    const base = sheet.href || document.baseURI;
    try {
      walk(sheet.cssRules, base);
    } catch {
      if (!sheet.href) continue;
      try {
        const txt = await (await fetch(sheet.href)).text();
        const s = new CSSStyleSheet();
        s.replaceSync(txt.replace(/@import[^;]+;/g, ""));
        walk(s.cssRules, sheet.href);
      } catch {
      }
    }
  }
  const out = [];
  for (const [r, base] of rules) {
    if (!wanted(r.style)) continue;
    const m = r.style.getPropertyValue("src").match(/url\((['"]?)(.*?)\1\)/);
    if (!m) continue;
    try {
      const data = await fetchDataURL(new URL(m[2], base).href);
      const desc = [...r.style].filter((p) => p !== "src").map((p) => `${p}:${r.style.getPropertyValue(p)};`).join("");
      out.push(`@font-face{${desc}src:url("${data}");}`);
    } catch {
    }
  }
  return out.join("\n");
}
function* composedChildren(node) {
  const root = node.shadowRoot || node;
  for (const ch of root.childNodes) {
    if (ch.nodeType === 1 && ch.localName === "slot") {
      const assigned = ch.assignedNodes({ flatten: true });
      if (assigned.length) {
        yield* assigned;
        continue;
      }
    }
    yield ch;
  }
}
var spanProbe = null;
function cloneTree(src, parentCS, isRoot, ctx) {
  if (src.nodeType === 3) return document.createTextNode(src.data);
  if (src.nodeType !== 1) return null;
  const tag = src.localName;
  if (IGNORE_TAGS.has(tag) || src.hasAttribute("data-dw-ignore")) return null;
  const cs = getComputedStyle(src);
  if (cs.display === "none") return null;
  let clone;
  if (tag === "canvas" || tag === "video") {
    clone = document.createElement("img");
    try {
      clone.setAttribute("src", drawableToDataURL(src));
    } catch {
      clone = document.createElement("div");
    }
  } else if (tag === "iframe" || tag === "embed" || tag === "object") {
    clone = document.createElement("div");
  } else {
    clone = src.cloneNode(false);
  }
  for (const a of [...clone.attributes]) {
    const n = a.name.toLowerCase();
    if (n.startsWith("on") || n === "srcset" || n === "sizes" || n === "loading" || n === "style" || n === "class") clone.removeAttribute(a.name);
  }
  if (tag === "img") {
    const url = src.currentSrc || src.src;
    clone.setAttribute("src", TRANSPARENT_PX);
    if (url) ctx.tasks.push(inlineImage(src, url).then((d) => clone.setAttribute("src", d)));
  }
  if (src.namespaceURI === SVG_NS && tag === "image") {
    const href = src.getAttribute("href") || src.getAttributeNS(XLINK_NS, "href");
    if (href && !href.startsWith("data:")) {
      clone.removeAttribute("href");
      clone.removeAttributeNS(XLINK_NS, "href");
      ctx.tasks.push(fetchDataURL(new URL(href, document.baseURI).href).then((d) => clone.setAttribute("href", d)).catch(() => {
      }));
    }
  }
  const urlProps = [];
  let st = styleText(cs, defaultsFor(src), parentCS, isRoot, (p, v) => urlProps.push([p, v]));
  if (isRoot) st += ctx.rootOverrides(cs);
  st += "transition:none;animation:none;";
  clone.setAttribute("style", st);
  for (const [p, v] of urlProps) ctx.tasks.push(inlineUrls(v).then((nv) => {
    if (nv !== v) clone.setAttribute("style", clone.getAttribute("style").replace(`${p}:${v};`, `${p}:${nv};`));
  }));
  if (src.namespaceURI === HTML_NS || !src.namespaceURI) {
    for (const ps of ["::before", "::after"]) {
      const pcs = getComputedStyle(src, ps);
      const content = pcs.getPropertyValue("content");
      if (!content || content === "none" || content === "normal") continue;
      const cls = "dw" + (ctx.n++).toString(36);
      clone.classList.add(cls);
      spanProbe ??= document.createElement("span");
      ctx.css += `.${cls}${ps}{${styleText(pcs, defaultsFor(spanProbe), cs, false, null)}}`;
    }
  }
  if (tag === "input") {
    if (src.type === "checkbox" || src.type === "radio") {
      if (src.checked) clone.setAttribute("checked", "");
      else clone.removeAttribute("checked");
    } else if (src.type === "password") clone.setAttribute("value", "\u2022".repeat(src.value.length));
    else if (src.type !== "file") clone.setAttribute("value", src.value);
  }
  if (tag === "textarea") {
    clone.textContent = src.value;
    return clone;
  }
  if (tag === "canvas" || tag === "video" || tag === "iframe" || tag === "embed" || tag === "object") return clone;
  for (const ch of composedChildren(src)) {
    const c = cloneTree(ch, cs, false, ctx);
    if (c) clone.appendChild(c);
  }
  if (tag === "select") [...clone.querySelectorAll("option")].forEach((o, i) => {
    if (i === src.selectedIndex) o.setAttribute("selected", "");
    else o.removeAttribute("selected");
  });
  return clone;
}
var escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function snapshotElement(el, { dpr = 1, clip = null, rootOpacity = null } = {}) {
  const t0 = performance.now();
  await document.fonts.ready;
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth ?? r.width, h = el.offsetHeight ?? r.height;
  const c = clip ?? { x: 0, y: 0, w, h };
  const ctx = {
    tasks: [],
    css: "",
    n: 0,
    rootOverrides: (cs) => `margin:0!important;position:relative!important;inset:auto!important;float:none!important;transform:none!important;translate:none!important;rotate:none!important;scale:none!important;box-sizing:border-box!important;width:${w}px!important;height:${h}px!important;` + (cs.display.startsWith("inline") && cs.display !== "inline-block" && cs.display !== "inline-flex" && cs.display !== "inline-grid" ? "display:inline-block!important;" : "") + (rootOpacity != null ? `opacity:${rootOpacity}!important;` : "")
  };
  const clone = cloneTree(el, null, true, ctx);
  if (!clone) throw new Error("distortion-wave: element is not rendered (display:none?)");
  await Promise.all(ctx.tasks);
  const fonts = await embeddedFonts();
  const xml = new XMLSerializer().serializeToString(clone);
  const cw = Math.max(1, Math.round(c.w)), ch = Math.max(1, Math.round(c.h));
  const svg = `<svg xmlns="${SVG_NS}" width="${cw}" height="${ch}"><foreignObject x="0" y="0" width="${cw}" height="${ch}"><div xmlns="${HTML_NS}" style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;margin:0;padding:0"><style>${escapeXml(fonts + ctx.css)}</style><div style="position:absolute;left:${-c.x}px;top:${-c.y}px;width:${w}px;height:${h}px">${xml}</div></div></foreignObject></svg>`;
  const img = new Image();
  img.decoding = "async";
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cw * dpr));
  canvas.height = Math.max(1, Math.round(ch * dpr));
  const g = canvas.getContext("2d", { willReadFrequently: false });
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  g.getImageData(0, 0, 1, 1);
  return { canvas, w: cw, h: ch, dpr, ms: performance.now() - t0, bytes: svg.length };
}

// src/core.js
var TAU = Math.PI * 2;
var clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
var lerp = (a, b, t) => a + (b - a) * t;
var fract = (x) => x - Math.floor(x);
var smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};
function cubicBezier(x1, y1, x2, y2) {
  const b = (t, p1, p2) => {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) {
      const m = (lo + hi) / 2;
      if (b(m, x1, x2) < x) lo = m;
      else hi = m;
    }
    return b((lo + hi) / 2, y1, y2);
  };
}
var easeLaunch = cubicBezier(0.2, 1, 0.3, 1);
var easeClear = cubicBezier(0.45, 0, 0.55, 1);
function hexToOklab(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function colorAlpha(c) {
  if (!c || c === "transparent") return 0;
  const m = String(c).match(/\(([^)]*)\)/);
  if (!m) return 1;
  const parts = m[1].includes("/") ? [m[1].split("/")[1]] : m[1].split(",").length === 4 ? [m[1].split(",")[3]] : null;
  if (!parts) return 1;
  const v = parts[0].trim();
  return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
}
function hasVisibleBox(cs) {
  if (colorAlpha(cs.backgroundColor) > 0.02) return true;
  if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
  if (cs.boxShadow && cs.boxShadow !== "none") return true;
  return ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none" && cs[`border${s}Style`] !== "hidden" && colorAlpha(cs[`border${s}Color`]) > 0.02);
}
var PALETTES = {
  aurora: ["#FF4FD8", "#A35BFF", "#5B7CFF", "#38D9FF", "#FFD36B", "#FF7A5C"],
  ocean: ["#3A7BFF", "#2EE6D6", "#7C5CFF", "#1FB6FF", "#B8F2FF"],
  mint: ["#2BD67B", "#B6FF5C", "#1FC8A9", "#E8FFB0", "#3CE0C0"],
  ember: ["#FF5A3C", "#FFB23C", "#FF3C8E", "#FFE07A", "#FF7F50"]
};
var BASE = {
  type: "vertical",
  speed: 1,
  anticipation: 0.45,
  travel: 2.2,
  linger: -0.3,
  rimFade: 2.8,
  hairDelay: 0.45,
  hairFade: 2.8,
  pull: 22,
  inhale: 50,
  gatherGlow: 0.35,
  gatherDots: 1,
  amplitude: 32,
  lensWidth: 140,
  aberration: 0.75,
  swell: 20,
  blur: 18,
  blurNear: 6,
  blurAhead: 90,
  blurBehind: 230,
  lead: 120,
  tail: 280,
  band: 0.9,
  rimWidth: 14,
  rimSoftness: 320,
  rimStrength: 0.85,
  uneven: 1,
  hairWidth: 1.5,
  lean: 0.9,
  margin: 60,
  seam: 48,
  particles: 64,
  particleSize: 1.8,
  particleLife: 2.1,
  reach: 140,
  spread: 1,
  palette: "aurora"
};
var PRESETS = {
  vertical: BASE,
  horizontal: { ...BASE, type: "horizontal" },
  center: {
    ...BASE,
    type: "center",
    anticipation: 0.25,
    travel: 3.2,
    linger: -0.2,
    rimFade: 2.4,
    hairDelay: 0.9,
    pull: 14,
    inhale: 32,
    gatherGlow: 0.2,
    gatherDots: 0,
    amplitude: 20,
    lensWidth: 90,
    aberration: 0.35,
    swell: 13,
    blur: 11,
    blurAhead: 54,
    blurBehind: 140,
    lead: 80,
    tail: 180,
    band: 0.75,
    rimStrength: 0.7,
    rimSoftness: 200,
    particles: 90,
    particleLife: 3,
    reach: 90,
    spread: 0.65
  }
};
var PX_KEYS = [
  "pull",
  "inhale",
  "amplitude",
  "lensWidth",
  "swell",
  "blur",
  "blurNear",
  "blurAhead",
  "blurBehind",
  "lead",
  "tail",
  "rimWidth",
  "rimSoftness",
  "reach",
  "margin",
  "seam"
];
var T_KEYS = ["anticipation", "travel", "linger", "rimFade", "hairDelay", "hairFade", "particleLife"];
function scaleConfig(c, w, h) {
  const k = clamp(Math.sqrt(w * h) / 516, 0.12, 1.8);
  const ts = clamp(0.45 + 0.55 * Math.sqrt(k), 0.6, 1.15) / (c.speed || 1);
  const o = { ...c, k };
  for (const key of PX_KEYS) o[key] = c[key] * k;
  for (const key of T_KEYS) o[key] = c[key] * ts;
  o.blurNear = Math.max(o.blurNear, 1.2);
  o.blur = Math.max(o.blur, o.blurNear);
  o.rimWidth = Math.max(o.rimWidth, 2.5);
  o.seam = Math.max(o.seam, 4);
  o.anticipation = Math.max(o.anticipation, 0.2 / (c.speed || 1));
  o.particles = Math.round(c.particles * clamp(k, 0.3, 1.5));
  o.particleSize = c.particleSize * clamp(0.6 + 0.4 * k, 0.7, 1.3);
  return o;
}
var totalDuration = (c) => c.anticipation + Math.max(c.travel * 0.6, c.linger + c.rimFade, c.linger + c.hairDelay + c.hairFade, c.particleLife);
function retime(c, seconds) {
  const f = seconds / totalDuration(c);
  for (const key of T_KEYS) c[key] *= f;
  return c;
}
var EASINGS = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1] };
function parseEasing(e) {
  if (typeof e === "function") return e;
  let v = Array.isArray(e) ? e : EASINGS[e];
  if (!v && typeof e === "string") {
    const m = e.match(/cubic-bezier\(([^)]+)\)/);
    if (m) v = m[1].split(",").map(Number);
  }
  return v && v.length === 4 && v.every(Number.isFinite) ? cubicBezier(...v) : null;
}
var INTENSITY_KEYS = ["amplitude", "swell", "pull", "inhale", "aberration"];
function resolveConfig(preset, o, w, h) {
  const base = { ...preset };
  for (const k of Object.keys(o)) if (k in BASE && k !== "type" && k !== "particles" && o[k] != null) base[k] = o[k];
  if (o.particles === false) base.particles = 0;
  else if (typeof o.particles === "number") base.particles = o.particles;
  if (o.intensity != null) for (const k of INTENSITY_KEYS) base[k] *= Math.max(0, o.intensity);
  const c = scaleConfig(base, w, h);
  if (o.duration > 0) retime(c, o.duration / 1e3);
  c.ease = parseEasing(o.easing);
  return c;
}
function farthestCorner(ox, oy, tilt, squash, w, h) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  let best = 0;
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const dx = x - ox, dy = y - oy;
    best = Math.max(best, Math.hypot((c * dx + s * dy) * squash, -s * dx + c * dy));
  }
  return best;
}
function frameState(t, c, g) {
  const ring = c.type === "center", horiz = c.type === "horizontal";
  const T = totalDuration(c), time = clamp(t, 0, T);
  const fly = time - c.anticipation, pre = smooth(0, c.anticipation, time);
  const prog = clamp(fly / c.travel), e = (c.ease || easeLaunch)(prog);
  const s = g.src, cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const r0 = Math.max(Math.min(s.w, s.h) / 2, 1);
  const half = (horiz ? s.h : s.w) / 2, perp = (horiz ? s.w : s.h) / 2;
  const base = horiz ? Math.PI / 2 : 0, ax = Math.cos(base), ay = Math.sin(base);
  const dir = (g.w / 2 - cx) * Math.sin(base) + (g.h / 2 - cy) * -Math.cos(base) >= 0 ? 1 : -1;
  let lean = 0;
  if (!ring && g.touch) lean = clamp(((g.touch.x - cx) * ax + (g.touch.y - cy) * ay) / Math.max(half, 1), -1, 1) * c.lean;
  const settle = smooth(0, 0.45, e);
  const ox = cx + ax * lean * half * settle, oy = cy + ay * lean * half * settle;
  const tilt = base + dir * lean * 0.45 * settle;
  const squashMax = ring ? 1 : 1.4;
  const reach = farthestCorner(ox, oy, tilt, squashMax, g.w, g.h) + c.swell * squashMax + c.margin;
  const radius = fly < 0 ? r0 + c.inhale * (1 - pre) : r0 + (reach + c.margin * 1.6 - r0) * e;
  const fade = 1 - smooth(0.2, 0.55, prog);
  const lift = c.gatherGlow * 0.5;
  const energy = smooth(0, 0.05, prog) * fade;
  const covered = fly > 0 && radius - c.swell > reach;
  return {
    time,
    fly,
    pre,
    prog,
    moved: e,
    ring,
    dir,
    r0,
    half,
    perp,
    cx,
    cy,
    ox,
    oy,
    tilt,
    squash: lerp(1, squashMax, smooth(0, 0.5, e)),
    spine: ring ? 0 : Math.max(0, half - r0) * (1 - settle),
    lx: Math.cos(tilt),
    ly: Math.sin(tilt),
    fx: dir * Math.sin(tilt),
    fy: -dir * Math.cos(tilt),
    radius,
    swell: c.swell * smooth(0, 0.3, e),
    energy,
    pull: c.pull * pre * (1 - smooth(0, 0.22, fly)),
    glow: fly < 0 ? lift * pre : lerp(lift, 1, smooth(0, 0.07, prog)) * fade,
    clear: lerp(r0 - c.rimSoftness, reach + c.rimSoftness, easeClear((fly - c.linger) / c.rimFade)),
    hairClear: lerp(r0 - c.rimSoftness, reach + c.rimSoftness, easeClear((fly - c.linger - c.hairDelay) / c.hairFade)),
    rim: c.rimStrength * smooth(0, 0.1, prog) * (1 - smooth(0.9, 1, time / T)),
    hold: ring && g.hold ? r0 : 0,
    launched: fly > 0,
    covered,
    settled: covered && prog >= 0.55
    // no more lens or blur → the live DOM can take over
  };
}
function makeParticles(n, c) {
  return Array.from({ length: n }, (_, i) => {
    const h = (k) => fract((i + 1) * k);
    return {
      col: h(0.6180339887) * 2 - 1,
      gy: h(0.7071067812),
      head: h(0.1618033989) * TAU,
      pace: 0.4 + 0.65 * Math.sqrt(h(0.7548776662)),
      drift: 12 + 45 * h(0.569840291),
      sway: 3 + 10 * h(0.4142135624),
      swayHz: 2 + 3 * h(0.7320508076),
      tw: 7 + 10 * h(0.2360679775),
      ph: h(0.3819660113) * TAU,
      hop: h(0.5497004779),
      life: c.particleLife * (0.45 + 0.55 * h(0.6457513111)),
      size: c.particleSize * (0.55 + 0.45 * h(0.8774) ** 2),
      bright: 0.35 + 0.65 * h(0.6055512755)
    };
  });
}
function particleAt(P, s, c) {
  const tw = 0.75 + 0.25 * Math.sin(s.time * P.tw + P.ph), k = c.k;
  if (!s.launched) {
    if (!c.gatherDots) return null;
    const cyc = s.time / 0.32 + P.hop, f = fract(cyc);
    const a2 = smooth(0, 0.3, f) * (1 - smooth(0.6, 1, f)) * P.bright * tw * smooth(0, c.anticipation * 0.35, s.time) * (1 - smooth(c.anticipation * 0.75, c.anticipation, s.time));
    const fall = c.reach * (1 - f * f);
    if (s.ring) {
      const ang = P.head + Math.floor(cyc) * 2.399963;
      const rr = s.r0 + 12 * k + fall;
      return { x: s.cx + Math.cos(ang) * rr, y: s.cy + Math.sin(ang) * rr, a: a2 };
    }
    const lat2 = P.col * (s.half + 16 * k) * (1 - 0.35 * (1 - f)), fwd2 = s.perp + 10 * k + fall * (0.45 + 0.55 * P.gy);
    return { x: s.cx + s.lx * lat2 + s.fx * fwd2, y: s.cy + s.ly * lat2 + s.fy * fwd2, a: a2 };
  }
  const fly = s.fly;
  const a = (1 - smooth(P.life * 0.55, P.life, fly)) * P.bright * tw * smooth(0, 0.08, fly);
  const sway = P.sway * Math.max(k, 0.3) * Math.sin(P.swayHz * fly + P.ph) * Math.min(fly / 0.25, 1);
  const travel = (s.radius - s.r0) * P.pace * c.spread;
  if (s.ring) {
    const rr = s.r0 + travel + P.drift * k * fly, co = Math.cos(P.head), si = Math.sin(P.head);
    return { x: s.ox + co * rr - si * sway, y: s.oy + si * rr + co * sway, a };
  }
  const lat = P.col * s.half * (1 + 0.25 * s.moved * P.pace) + sway;
  const fwd = (s.r0 + travel) * (1 - 0.3 * P.col * P.col) + P.drift * k * fly;
  return { x: s.ox + s.lx * lat + s.fx * fwd, y: s.oy + s.ly * lat + s.fy * fwd, a };
}

// src/renderer.js
var VS_FULL = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
var FS_COPY = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uLod; out vec4 o;
void main() { o = textureLod(uTex, vUv, uLod); }`;
var FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uStep; uniform float uSigma; out vec4 o;
void main() {
  float R = min(ceil(uSigma * 3.0), 32.0); vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -32; i <= 32; i++) { float fi = float(i); if (abs(fi) > R) continue;
    float w = exp(-0.5 * fi * fi / (uSigma * uSigma)); acc += textureLod(uTex, vUv + uStep * fi, 0.0) * w; ws += w; }
  o = acc / ws;
}`;
var FS_MAIN = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uSize, uRes;
uniform sampler2D uOld0, uOld1, uOld2, uNew0, uNew1, uNew2;
uniform vec4 uOldRect, uNewRect, uShape, uRadii;   // rects in canvas CSS px; radii (br, tr, bl, tl)
uniform int uMode;                                 // 0 before \xB7 1 live \xB7 2 after \xB7 3 crossfade \xB7 4 effects only (live DOM below)
uniform bool uClip;                                 // an ancestor clips the element: mask everything by the shape
uniform float uFade, uBoxless;                      // uBoxless: the element paints no box \u2192 light up its content only
uniform bool uLaunched, uRing;
uniform vec2 uOrigin;
uniform float uTilt, uSpine, uRadius, uSquash, uTime, uSwell, uEnergy, uPull, uGlow, uRim, uClear, uHairClear, uHold, uK, uSeam;
uniform float uAmp, uLensW, uAberr, uBlurMax, uBlurNear, uBlurAhead, uBlurBehind;
uniform float uLead, uTail, uBand, uRimW, uRimSoft, uUneven, uHairW;
uniform vec3 uPal[8]; uniform int uPalN;
out vec4 outColor;
const float TAU = 6.28318530718;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float vnoise(float x) { float i = floor(x), f = fract(x); return mix(h11(i), h11(i + 1.0), f * f * (3.0 - 2.0 * f)) * 2.0 - 1.0; }
float sdRoundBox(vec2 p, vec2 b, vec4 r) {         // y-down space: r = (bottom-right, top-right, bottom-left, top-left)
  r.xy = (p.x > 0.0) ? r.xy : r.zw; r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
struct Front { float d; vec2 n; vec2 q; float g; };
Front front(vec2 p) {
  vec2 q = rot(-uTilt) * (p - uOrigin); float mx = q.x * uSquash;
  vec2 v = vec2(max(abs(mx) - uSpine, 0.0), q.y); float len = max(length(v), 1e-3);
  vec2 grad = vec2(v.x * sign(q.x) * uSquash, v.y) / len; float g = max(length(grad), 1e-3);
  float wob;
  if (uRing) { float a = atan(q.y, q.x); wob = 0.5 * sin(3.0 * a + uTime * 1.3) + 0.3 * sin(5.0 * a - uTime * 0.9 + 2.1) + 0.2 * sin(2.0 * a + uTime * 2.0); }
  else { float s = mx * 0.005 / uK; wob = 0.7 * vnoise(s + uTime * 0.8) + 0.3 * vnoise(s * 2.3 - uTime * 1.1 + 5.0); }
  Front f; f.d = (len - uRadius) / g + uSwell * wob; f.n = rot(uTilt) * (grad / g); f.q = q; f.g = g; return f;
}
// The silhouette is decided by p (undisplaced); the sample by sp (displaced, clamped to the rect).
// \u2192 content bends INSIDE the element, never revealing transparency or bleeding outside.
vec4 tap(sampler2D s, vec4 rect, vec2 p, vec2 sp) {
  vec2 q = (p - rect.xy) / rect.zw;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return vec4(0.0);
  return textureLod(s, clamp((sp - rect.xy) / rect.zw, 0.0, 1.0), 0.0);
}
vec4 fetch3(sampler2D s0, sampler2D s1, sampler2D s2, vec4 rect, vec2 p, vec2 sp, float tn, float tf) {
  vec4 c = tap(s0, rect, p, sp);
  if (tn > 0.0) c = mix(c, tap(s1, rect, p, sp), tn);
  if (tf > 0.0) c = mix(c, tap(s2, rect, p, sp), tf);
  return c;
}
vec4 layerOld(vec2 p, vec2 sp, vec2 sl, float tn, float tf) {
  if (dot(sl, sl) < 0.01) return fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp, tn, tf);
  vec4 r = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp + sl, tn, tf), g = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp, tn, tf), b = fetch3(uOld0, uOld1, uOld2, uOldRect, p, sp - sl, tn, tf);
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
vec4 layerNew(vec2 p, vec2 sp, vec2 sl, float tn, float tf) {
  if (dot(sl, sl) < 0.01) return fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp, tn, tf);
  vec4 r = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp + sl, tn, tf), g = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp, tn, tf), b = fetch3(uNew0, uNew1, uNew2, uNewRect, p, sp - sl, tn, tf);
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
vec3 paletteAt(float u) {
  float x = fract(u) * float(uPalN); int i = min(int(floor(x)), uPalN - 1); int j = (i + 1) % uPalN;
  return mix(uPal[i], uPal[j], smoothstep(0.0, 1.0, fract(x)));
}
vec3 oklabToSrgb(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 lin = clamp(vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
  return mix(12.92 * lin, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), lin));
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uSize.x / uRes.x);
  float dn = (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  // element shape (per-corner radii, clipped by overflow ancestors): mask + rim
  vec2 c = p - (uShape.xy + uShape.zw * 0.5);
  float sd = sdRoundBox(c, uShape.zw * 0.5, uRadii);
  float mask = clamp(0.5 - sd * (uRes.x / uSize.x), 0.0, 1.0);
  float clipM = uClip ? mask : 1.0;
  if (uMode == 0 || uMode == 2 || uMode == 3) {
    vec4 a = tap(uOld0, uOldRect, p, p), b = tap(uNew0, uNewRect, p, p);
    vec4 v = (uMode == 0 ? a : uMode == 2 ? b : mix(a, b, uFade)) * clipM;
    outColor = vec4(v.rgb + dn * v.a, v.a); return;
  }
  Front f = front(p);
  vec2 r = p - uOrigin; float rl = max(length(r), 1.0);
  float held = uHold > 0.0 ? smoothstep(uHold * 0.9, uHold * 1.8, rl) : 1.0;
  vec4 col = vec4(0.0);
  if (uMode == 1) {
    float k = f.d / (uLensW * (f.d > 0.0 ? 0.8 : 1.6));
    vec2 bulge = f.n * (uEnergy * uAmp * exp(-k * k) * held);
    vec2 suck = (r / rl) * (uPull * (rl / (rl + 60.0 * uK)) * exp(-rl / (700.0 * uK)) * held);
    vec2 sp = p - bulge + suck;
    vec2 sl = (bulge * 0.5 - suck * exp(-rl / (240.0 * uK))) * uAberr;
    float kb = f.d / (f.d > 0.0 ? uBlurAhead : uBlurBehind);
    float bpx = uEnergy * uBlurMax * exp(-kb * kb) * held;
    float tn = smoothstep(0.0, uBlurNear, bpx);
    float tf = uBlurMax > uBlurNear ? smoothstep(uBlurNear, uBlurMax, bpx) : 0.0;
    float cover = uLaunched ? smoothstep(-uSeam, uSeam, f.d) : 1.0;
    if (cover >= 0.999) col = layerOld(p, sp, sl, tn, tf);
    else if (cover <= 0.001) col = layerNew(p, sp, sl, tn, tf);
    else col = mix(layerNew(p, sp, sl, tn, tf), layerOld(p, sp, sl, tn, tf), cover);
    // the UNdisplaced alpha fixes the silhouette (rounded corners, transparent areas): no fill-in, no fringe outside
    float aU = mix(tap(uNew0, uNewRect, p, p).a, tap(uOld0, uOldRect, p, p).a, cover);
    col *= min(1.0, aU / max(col.a, 1e-4)) * clipM;
  }
  if (uBoxless > 0.5) {
    // no background, border or shadow: the band lights the content and a soft halo around it, never the bounding box
    float sharp = max(tap(uNew0, uNewRect, p, p).a, tap(uOld0, uOldRect, p, p).a);
    float halo = max(tap(uNew2, uNewRect, p, p).a, tap(uOld2, uOldRect, p, p).a);
    mask *= max(sharp, smoothstep(0.02, 0.5, halo) * 0.8);
  }
  float inset = max(-sd, 0.0);
  float along = f.q.x * 0.0065 / uK, ang = atan(f.q.y, f.q.x);
  float lobes = uRing ? 0.5 + 0.5 * sin(2.0 * ang + uTime * 1.4) * cos(ang - uTime * 0.6 + 0.8)
                      : 0.5 + 0.5 * sin(along * 1.4 + uTime * 1.3) * cos(along * 0.7 - uTime * 0.6 + 0.8);
  float bandA = 0.0;
  if (uGlow > 0.0 && f.d < uLead) {
    if (f.d >= 0.0) { float x = f.d / uLead; bandA = exp(-4.5 * x * x); }
    else { float x = clamp(-f.d / (uTail * mix(0.55, 1.35, lobes)), 0.0, 1.0); bandA = pow(1.0 - x, 2.4); }
    bandA *= uGlow * uBand * held;
  }
  float around = atan(c.y / uShape.w, c.x / uShape.z);
  float rimA = 0.0, hairA = 0.0, shimmer = 0.5;
  if (uRim > 0.0 && uBoxless < 0.5 && inset < uRimW * 4.5) {
    float lumps = 0.5 * sin(around * 3.0 + uTime * 0.7) + 0.3 * sin(around * 5.0 - uTime * 1.2 + 2.0) + 0.2 * sin(around * 9.0 + uTime * 2.3 + 4.0);
    float thick = max(1.0 + uUneven * 0.55 * lumps, 0.15);
    float hk = inset / (uRimW * thick);
    float reached = 1.0 - smoothstep(-uLead * 0.6, uLead * 0.4, f.d);
    float kept = smoothstep(-uRimSoft, uRimSoft, f.d + (uRadius - uClear) / f.g);
    shimmer = 0.5 + 0.5 * sin(uTime * 3.2 - around * 4.0);
    rimA = exp(-hk * hk) * reached * kept * uRim * (0.72 + 0.28 * shimmer);
    float line = 1.0 - smoothstep(uHairW * 0.5, uHairW * 0.5 + 0.8, inset);
    float hairKept = smoothstep(-uRimSoft, uRimSoft, f.d + (uRadius - uHairClear) / f.g);
    hairA = line * reached * hairKept * uRim * 0.85 * mix(0.55, 1.0, smoothstep(0.2, 1.4, thick));
  }
  float a = (1.0 - (1.0 - bandA) * (1.0 - rimA)) * mask;
  hairA *= mask;
  if (a + hairA < 0.0005) { outColor = vec4(col.rgb + dn * col.a, col.a); return; }
  float flow = 0.6 + (uRing ? ang / TAU : along * 0.22) + uTime * 0.12 + f.d * 0.0016 / uK;
  vec3 lab = paletteAt(flow);
  lab.x += 0.10 * exp(-pow((f.d - 28.0 * uK) / (48.0 * uK), 2.0)) - 0.12 * exp(-pow((f.d + 90.0 * uK) / (70.0 * uK), 2.0));
  lab.yz *= 1.2;
  lab = mix(lab, vec3(0.985, 0.0, 0.0), 0.65 * exp(-pow((f.d + 6.0 * uK) / max(24.0 * uK, 3.0), 2.0)));
  vec3 rimLab = paletteAt(around / TAU + uTime * 0.25 + inset * 0.0012 / uK); rimLab.yz *= 1.1;
  lab = mix(lab, rimLab, rimA / (rimA + bandA + 1e-4));
  float ea = clamp(a, 0.0, 1.0);
  vec4 o = vec4(oklabToSrgb(lab) * ea, ea) + col * (1.0 - ea);
  float ha = clamp(hairA, 0.0, 1.0);
  o = vec4(mix(oklabToSrgb(rimLab), vec3(1.0), 0.6 + 0.35 * shimmer) * ha, ha) + o * (1.0 - ha);
  outColor = vec4(o.rgb + dn * 2.0 * o.a, o.a);
}`;
var VS_DOTS = `#version 300 es
layout(location = 0) in vec4 aDot; uniform vec2 uSize; uniform float uDpr; out float vA; out float vR; out float vPt;
void main() { gl_Position = vec4(aDot.x / uSize.x * 2.0 - 1.0, 1.0 - aDot.y / uSize.y * 2.0, 0.0, 1.0);
  vPt = ceil((aDot.z + 1.0) * uDpr) + 2.0; gl_PointSize = vPt; vR = aDot.z * 0.5 * uDpr; vA = aDot.w; }`;
var FS_DOTS = `#version 300 es
precision highp float; in float vA; in float vR; in float vPt; out vec4 o;
void main() { float r = length(gl_PointCoord - 0.5) * vPt; float cov = clamp(vR - r + 0.5, 0.0, 1.0); o = vec4(vec3(cov * vA), cov * vA); }`;
function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile");
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  const locs = /* @__PURE__ */ new Map();
  return { p, u: (n) => {
    if (!locs.has(n)) locs.set(n, gl.getUniformLocation(p, n));
    return locs.get(n);
  } };
}
var Renderer = class {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("data-dw-ignore", "");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;contain:strict;";
    this.layers = {};
    this.pal = new Float32Array(24);
    this.palKey = "";
    this.ok = false;
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ok = false;
    });
    const gl = this.canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) return;
    this.gl = gl;
    this.main = program(gl, VS_FULL, FS_MAIN);
    this.blur = program(gl, VS_FULL, FS_BLUR);
    this.copy = program(gl, VS_FULL, FS_COPY);
    this.dots = program(gl, VS_DOTS, FS_DOTS);
    this.vao = gl.createVertexArray();
    this.dvao = gl.createVertexArray();
    this.dbuf = gl.createBuffer();
    this.dcap = 0;
    gl.bindVertexArray(this.dvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dbuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.ok = true;
  }
  tex(w, h, src, mips = false) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  }
  target(w, h) {
    const gl = this.gl, tex = this.tex(w, h, null), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }
  pass(prog, fb, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  blurred(sharp, w, h, sigma) {
    const gl = this.gl, scale = Math.max(1, Math.round(sigma / 4));
    const bw = Math.max(1, Math.round(w / scale)), bh = Math.max(1, Math.round(h / scale));
    const A = this.target(bw, bh), B = this.target(bw, bh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sharp);
    gl.useProgram(this.copy.p);
    gl.uniform1i(this.copy.u("uTex"), 0);
    gl.uniform1f(this.copy.u("uLod"), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p);
    gl.uniform1i(this.blur.u("uTex"), 0);
    gl.uniform1f(this.blur.u("uSigma"), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blur.u("uStep"), 1 / bw, 0);
    this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blur.u("uStep"), 0, 1 / bh);
    this.pass(this.blur, A.fb, bw, bh);
    gl.deleteFramebuffer(B.fb);
    gl.deleteTexture(B.tex);
    gl.deleteFramebuffer(A.fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return A.tex;
  }
  /** Builds sharp + 2 blur levels (once per capture, never per frame). */
  setLayer(name, src, sigmaNear, sigmaFar) {
    if (!this.ok) return;
    this.dropLayer(name);
    const sharp = this.tex(src.width, src.height, src, true);
    this.layers[name] = { sharp, near: this.blurred(sharp, src.width, src.height, sigmaNear), far: this.blurred(sharp, src.width, src.height, sigmaFar) };
  }
  dropLayer(name) {
    const L = this.layers[name];
    if (!L || !this.gl) return;
    for (const t of [L.sharp, L.near, L.far]) this.gl.deleteTexture(t);
    delete this.layers[name];
  }
  clear() {
    for (const n of Object.keys(this.layers)) this.dropLayer(n);
  }
  render(f) {
    if (!this.ok) return;
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height, m = this.main, u = m.u;
    const old = this.layers.old || this.layers.new, nxt = this.layers.new || this.layers.old;
    if (!old) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(m.p);
    [["uOld0", old.sharp], ["uOld1", old.near], ["uOld2", old.far], ["uNew0", nxt.sharp], ["uNew1", nxt.near], ["uNew2", nxt.far]].forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(n), i);
    });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u("uSize"), f.w, f.h);
    gl.uniform2f(u("uRes"), W, H);
    v4("uOldRect", R.old);
    v4("uNewRect", R.new || R.old);
    v4("uShape", R.shape);
    gl.uniform4f(u("uRadii"), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u("uMode"), f.mode);
    gl.uniform1f(u("uFade"), f.fade || 0);
    gl.uniform1f(u("uBoxless"), R.boxless ? 1 : 0);
    gl.uniform1i(u("uClip"), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u("uLaunched"), s.launched ? 1 : 0);
      gl.uniform1i(u("uRing"), s.ring ? 1 : 0);
      gl.uniform2f(u("uOrigin"), s.ox, s.oy);
      const fl = {
        uTilt: s.tilt,
        uSpine: s.spine,
        uRadius: s.radius,
        uSquash: s.squash,
        uTime: s.time,
        uSwell: s.swell,
        uEnergy: s.energy,
        uPull: s.pull,
        uGlow: s.glow,
        uRim: s.rim,
        uClear: s.clear,
        uHairClear: s.hairClear,
        uHold: s.hold,
        uK: c.k,
        uSeam: c.seam,
        uAmp: c.amplitude,
        uLensW: c.lensWidth,
        uAberr: c.aberration,
        uBlurMax: c.blur,
        uBlurNear: c.blurNear,
        uBlurAhead: c.blurAhead,
        uBlurBehind: c.blurBehind,
        uLead: c.lead,
        uTail: c.tail,
        uBand: c.band,
        uRimW: c.rimWidth,
        uRimSoft: c.rimSoftness,
        uUneven: c.uneven,
        uHairW: c.hairWidth
      };
      for (const k in fl) gl.uniform1f(u(k), fl[k]);
      const cols = Array.isArray(c.palette) ? c.palette : PALETTES[c.palette] || PALETTES.aurora;
      const key = cols.join();
      if (this.palKey !== key) {
        this.palKey = key;
        cols.slice(0, 8).forEach((h, i) => this.pal.set(hexToOklab(h), i * 3));
      }
      gl.uniform3fv(u("uPal[0]"), this.pal);
      gl.uniform1i(u("uPalN"), Math.min(cols.length, 8));
    }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (f.dotCount > 0) {
      const d = this.dots;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(d.p);
      gl.uniform2f(d.u("uSize"), f.w, f.h);
      gl.uniform1f(d.u("uDpr"), f.dpr);
      gl.bindVertexArray(this.dvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dbuf);
      if (this.dcap < f.dots.length) {
        gl.bufferData(gl.ARRAY_BUFFER, f.dots.byteLength, gl.DYNAMIC_DRAW);
        this.dcap = f.dots.length;
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, f.dots, 0, f.dotCount * 4);
      gl.drawArrays(gl.POINTS, 0, f.dotCount);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
};
var pool = [];
var alive = 0;
var MAX_CONTEXTS = 4;
function acquire() {
  while (pool.length) {
    const r = pool.pop();
    if (r.ok) return r;
    alive--;
  }
  if (alive >= MAX_CONTEXTS) return null;
  try {
    const r = new Renderer();
    if (!r.ok) return null;
    alive++;
    return r;
  } catch (e) {
    console.warn("[distortion-wave]", e);
    return null;
  }
}
function release(r) {
  r.clear();
  r.canvas.remove();
  if (r.ok) pool.push(r);
  else alive--;
}
function warmupWave() {
  const r = acquire();
  if (r) release(r);
  return !!r;
}

// src/focus.js
var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function captureFocus(root) {
  const el = document.activeElement;
  if (!el || el === document.body || !root.contains(el)) return null;
  const path = [];
  for (let n = el; n && n !== root; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
  const sel = "selectionStart" in el ? (() => {
    try {
      return [el.selectionStart, el.selectionEnd];
    } catch {
      return null;
    }
  })() : null;
  return {
    el,
    id: el.id,
    key: el.getAttribute("data-focus-key") || el.getAttribute("name"),
    tag: el.localName,
    path,
    order: [...root.querySelectorAll(FOCUSABLE)].indexOf(el),
    sel
  };
}
function restoreFocus(info, root) {
  if (!info || info.el.isConnected) return;
  const now = document.activeElement;
  if (now && now !== document.body && now !== document.documentElement) return;
  let c = null;
  if (info.id) c = root.querySelector("#" + CSS.escape(info.id));
  if (!c && info.key) c = root.querySelector(`[data-focus-key="${CSS.escape(info.key)}"],[name="${CSS.escape(info.key)}"]`);
  if (!c) {
    let n = root;
    for (const i of info.path) n = n?.children[i];
    if (n && n !== root && n.localName === info.tag && n.matches(FOCUSABLE)) c = n;
  }
  if (!c && info.order >= 0) {
    const f = root.querySelectorAll(FOCUSABLE);
    c = f[Math.min(info.order, f.length - 1)] || null;
  }
  if (!c && root.matches(FOCUSABLE)) c = root;
  if (!c) return;
  c.focus({ preventScroll: true });
  if (info.sel && typeof c.setSelectionRange === "function") try {
    c.setSelectionRange(info.sel[0], info.sel[1]);
  } catch {
  }
}

// src/index.js
var fit = (side, a, b) => a + b > 0 ? side / (a + b) : Infinity;
function parseRadii(cs, w, h) {
  const one = (v, side) => {
    const t = String(v).trim().split(/\s+/)[0];
    const n = parseFloat(t) || 0;
    return t.endsWith("%") ? n / 100 * side : n;
  };
  let tl = one(cs.borderTopLeftRadius, w), tr = one(cs.borderTopRightRadius, w), br = one(cs.borderBottomRightRadius, w), bl = one(cs.borderBottomLeftRadius, w);
  const f = Math.min(1, fit(w, tl, tr), fit(w, bl, br), fit(h, tl, bl), fit(h, tr, br));
  return { tl: tl * f, tr: tr * f, br: br * f, bl: bl * f };
}
function clippedShape(el, rect, radii) {
  let x0 = rect.left, y0 = rect.top, x1 = rect.right, y1 = rect.bottom, changed = false;
  const r = { ...radii };
  for (let n = el, cs = getComputedStyle(el); n.parentElement && n.parentElement !== document.body; ) {
    if (cs.position === "fixed") break;
    n = n.parentElement;
    cs = getComputedStyle(n);
    const clips = cs.overflowX !== "visible" || cs.overflowY !== "visible" || /paint|strict|content/.test(cs.contain);
    if (!clips) continue;
    const b = n.getBoundingClientRect();
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    const px0 = b.left + bl, py0 = b.top + bt, px1 = b.right - br, py1 = b.bottom - bb;
    if (px0 > x0 + 0.5 || py0 > y0 + 0.5 || px1 < x1 - 0.5 || py1 < y1 - 0.5) changed = true;
    x0 = Math.max(x0, px0);
    y0 = Math.max(y0, py0);
    x1 = Math.min(x1, px1);
    y1 = Math.min(y1, py1);
    const R = parseRadii(cs, b.width, b.height);
    const inner = { tl: Math.max(0, R.tl - Math.max(bl, bt)), tr: Math.max(0, R.tr - Math.max(br, bt)), br: Math.max(0, R.br - Math.max(br, bb)), bl: Math.max(0, R.bl - Math.max(bl, bb)) };
    const corner = (k, dx, dy) => {
      const v = inner[k] - Math.max(dx, dy);
      if (v > r[k] + 0.5) {
        r[k] = v;
        changed = true;
      }
    };
    corner("tl", x0 - px0, y0 - py0);
    corner("tr", px1 - x1, y0 - py0);
    corner("br", px1 - x1, py1 - y1);
    corner("bl", x0 - px0, py1 - y1);
  }
  const w = Math.max(x1 - x0, 0), h = Math.max(y1 - y0, 0);
  const f = Math.min(1, fit(w, r.tl, r.tr), fit(w, r.bl, r.br), fit(h, r.tl, r.bl), fit(h, r.tr, r.br));
  return { x: x0, y: y0, w, h, radii: { tl: r.tl * f, tr: r.tr * f, br: r.br * f, bl: r.bl * f }, clipped: changed };
}
function isFixed(el) {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true;
  return false;
}
function measure(el) {
  const rect = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const w = el.offsetWidth ?? rect.width, h = el.offsetHeight ?? rect.height;
  const x0 = Math.max(rect.left, 0), y0 = Math.max(rect.top, 0), x1 = Math.min(rect.right, innerWidth), y1 = Math.min(rect.bottom, innerHeight);
  const fixed = isFixed(el), sx = fixed ? 0 : scrollX, sy = fixed ? 0 : scrollY;
  const radii = parseRadii(cs, w, h), sh = clippedShape(el, rect, radii);
  return {
    w,
    h,
    fixed,
    opacity: cs.opacity,
    radii,
    boxless: !hasVisibleBox(cs),
    visible: x1 > x0 && y1 > y0,
    shape: { x: sh.x + sx, y: sh.y + sy, w: sh.w, h: sh.h },
    shapeRadii: sh.radii,
    clipped: sh.clipped,
    // what is actually visible
    clip: { x: x0 - rect.left, y: y0 - rect.top, w: x1 - x0, h: y1 - y0 },
    // visible part, element space
    page: { x: x0 + sx, y: y0 + sy, w: x1 - x0, h: y1 - y0 },
    // same, page space (scroll-stable)
    el: { x: rect.left + sx, y: rect.top + sy, w: rect.width, h: rect.height }
  };
}
var union = (a, b) => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
var rel = (r, o) => ({ x: r.x - o.x, y: r.y - o.y, w: r.w, h: r.h });
var nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
function deferred() {
  let res, rej;
  const p = new Promise((a, b) => {
    res = a;
    rej = b;
  });
  p.catch(() => {
  });
  return { p, res, rej };
}
function pickDpr(m, maxTex) {
  const area = Math.max(m.clip.w * m.clip.h, 1);
  return Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(42e5 / area), maxTex / Math.max(m.clip.w, m.clip.h, 1)));
}
var prepared = /* @__PURE__ */ new WeakMap();
function prepareWave(target) {
  if (prepared.get(target)?.pending) return prepared.get(target).pending;
  const m = measure(target);
  if (!m.visible) return Promise.resolve(null);
  const entry = { dirty: false, m, dpr: pickDpr(m, 8192), at: performance.now() };
  entry.mo = new MutationObserver(() => {
    entry.dirty = true;
  });
  entry.mo.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  entry.pending = snapshotElement(target, { dpr: entry.dpr, clip: m.clip }).then((s) => entry.shot = s, () => null);
  prepared.set(target, entry);
  return entry.pending;
}
function takePrepared(target, m) {
  const e = prepared.get(target);
  if (!e) return null;
  prepared.delete(target);
  e.mo.disconnect();
  const same = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
  if (e.dirty || !e.shot || performance.now() - e.at > 8e3 || !same(e.m.page, m.page)) return null;
  return e.shot;
}
var ACTIVE = /* @__PURE__ */ new WeakMap();
var DEFAULTS = { variant: "auto", palette: "aurora", speed: 1, particles: true, reducedMotion: null, timeout: 3e3, preserveFocus: true };
var USER_DEFAULTS = {};
var merge = (...objs) => {
  const out = {};
  for (const o of objs) for (const k in o) if (o[k] !== void 0) out[k] = o[k];
  return out;
};
function setWaveDefaults(options) {
  USER_DEFAULTS = options ? merge(USER_DEFAULTS, options) : {};
  return { ...USER_DEFAULTS };
}
var WaveTransition = class {
  constructor(target, update, opts) {
    this.target = target;
    this.update = update || (() => {
    });
    this.o = merge(DEFAULTS, USER_DEFAULTS, opts);
    this._d = { ready: deferred(), update: deferred(), covered: deferred(), finished: deferred() };
    this.ready = this._d.ready.p;
    this.updateCallbackDone = this._d.update.p;
    this.covered = this._d.covered.p;
    this.finished = this._d.finished.p;
    this.metrics = {};
    this._updated = false;
    this._skipped = false;
    this._done = false;
    this._run().catch((err) => this._abort(err));
  }
  skip() {
    this._skipped = true;
    if (this._loopStarted) this._finish();
  }
  async _runUpdate() {
    if (this._updated) return this._updatePromise;
    this._updated = true;
    const focus = this.o.preserveFocus === false ? null : captureFocus(this.target);
    this._updatePromise = (async () => {
      await this.update();
      restoreFocus(focus, this.target);
    })();
    this._updatePromise.then(() => this._d.update.res(), (e) => this._d.update.rej(e));
    return this._updatePromise;
  }
  async _run() {
    const prev = ACTIVE.get(this.target);
    ACTIVE.set(this.target, this);
    if (prev) {
      prev.skip();
      await prev.finished;
    }
    const o = this.o, target = this.target;
    const reduced = o.reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = measure(target);
    const r = before.visible && target !== document.body && target !== document.documentElement ? acquire() : null;
    this.r = r;
    if (!r || this._skipped) return this._plain();
    const dpr = pickDpr(before, r.maxTex);
    let t0 = performance.now();
    const oldShot = takePrepared(target, before) || await snapshotElement(target, { dpr: Math.min(dpr, 2), clip: before.clip });
    this.metrics.captureBefore = Math.round(performance.now() - t0);
    if (this._skipped) return this._plain();
    const cfg = resolveConfig(PRESETS[this._variant(before)] || BASE, o, before.clip.w, before.clip.h);
    this.cfg = cfg;
    this.before = before;
    this.dpr = oldShot.dpr;
    this.particles = makeParticles(cfg.particles, cfg);
    this.dots = new Float32Array(Math.max(this.particles.length, 1) * 4);
    this.origin = this._originPage(before);
    this.canvasPage = before.page;
    this.rects = { old: rel(before.page, before.page), new: null, shape: rel(before.shape, before.page), radii: before.shapeRadii, boxless: before.boxless, clipped: before.clipped };
    t0 = performance.now();
    r.setLayer("old", oldShot.canvas, cfg.blurNear * this.dpr, cfg.blur * this.dpr);
    this.metrics.upload = Math.round(performance.now() - t0);
    this._mount();
    this._hide();
    this.mode = reduced ? 0 : 1;
    this.fadeOnly = reduced;
    this._d.ready.res();
    this._startLoop();
    await this._runUpdate();
    await nextFrame();
    await Promise.all([...target.querySelectorAll("img")].map((i) => i.decode?.().catch(() => {
    })));
    if (this._done) return;
    const after = measure(target);
    t0 = performance.now();
    const newShot = after.visible ? await snapshotElement(target, { dpr: this.dpr, clip: after.clip, rootOpacity: before.opacity }) : null;
    this.metrics.captureAfter = Math.round(performance.now() - t0);
    if (this._done) return;
    if (!newShot) {
      this._finish();
      return;
    }
    r.setLayer("new", newShot.canvas, cfg.blurNear * this.dpr, cfg.blur * this.dpr);
    this.after = after;
    this.canvasPage = union(before.page, after.page);
    this.rects = { old: rel(before.page, this.canvasPage), new: rel(after.page, this.canvasPage), shape: rel(before.shape, this.canvasPage), radii: before.shapeRadii, boxless: before.boxless && after.boxless, clipped: before.clipped || after.clipped };
    this.shapes = { from: rel(before.shape, this.canvasPage), to: rel(after.shape, this.canvasPage), r0: before.shapeRadii, r1: after.shapeRadii };
    this._resizeCanvas();
    this.gateOpen = true;
    if (this.fadeOnly) {
      this.mode = 3;
      this.fadeStart = this.now;
    }
  }
  _variant(m) {
    if (this.o.variant !== "auto") return this.o.variant;
    const s = this.o.source;
    if (!(s instanceof Element) || s === this.target) return "center";
    const r = s.getBoundingClientRect();
    return r.width >= r.height * 1.4 ? "vertical" : r.height >= r.width * 1.4 ? "horizontal" : "center";
  }
  _originPage(m) {
    const sx = m.fixed ? 0 : scrollX, sy = m.fixed ? 0 : scrollY, o = this.o;
    const pt = (v) => v && "clientX" in v ? { x: v.clientX, y: v.clientY } : v && "x" in v ? { x: v.x, y: v.y } : null;
    let touch = pt(o.focus);
    if (o.focus instanceof KeyboardEvent || o.focus && o.focus.detail === 0 && o.focus.type === "click") touch = null;
    let src;
    if (o.source instanceof Element && o.source !== this.target) {
      const r = o.source.getBoundingClientRect();
      src = { x: r.left, y: r.top, w: r.width, h: r.height };
    } else if (o.source && "width" in o.source) src = { x: o.source.x, y: o.source.y, w: o.source.width, h: o.source.height };
    else {
      const p = !(o.source instanceof Element) && pt(o.source) || touch || { x: m.el.x - sx + m.w / 2, y: m.el.y - sy + m.h / 2 };
      const d = Math.max(8, Math.min(m.w, m.h) * 0.08);
      src = { x: p.x - d, y: p.y - d, w: 2 * d, h: 2 * d };
    }
    return {
      src: { x: src.x + sx, y: src.y + sy, w: src.w, h: src.h },
      touch: touch && { x: touch.x + sx, y: touch.y + sy },
      hold: o.source instanceof Element && o.source !== this.target && this.target.contains(o.source)
    };
  }
  _mount() {
    const c = this.r.canvas;
    document.body.appendChild(c);
    this._resizeCanvas();
  }
  _resizeCanvas() {
    const c = this.r.canvas, p = this.canvasPage;
    c.width = Math.max(1, Math.round(p.w * this.dpr));
    c.height = Math.max(1, Math.round(p.h * this.dpr));
    c.style.width = p.w + "px";
    c.style.height = p.h + "px";
    this._place();
  }
  _place() {
    const p = this.canvasPage, f = this.before.fixed;
    this.r.canvas.style.transform = `translate3d(${p.x - (f ? 0 : scrollX)}px,${p.y - (f ? 0 : scrollY)}px,0)`;
  }
  _hide() {
    const s = this.target.style;
    this._saved = ["opacity", "transition"].map((k) => [k, s.getPropertyValue(k), s.getPropertyPriority(k)]);
    s.setProperty("transition", "none", "important");
    s.setProperty("opacity", "0", "important");
  }
  _show() {
    if (!this._saved) return;
    for (const [k, v, pr] of this._saved) {
      if (v) this.target.style.setProperty(k, v, pr);
      else this.target.style.removeProperty(k);
    }
    this._saved = null;
  }
  _startLoop() {
    this._loopStarted = true;
    this.held = 0;
    this.start = performance.now();
    this.now = this.start;
    this.last = this.start;
    const tick = (now) => {
      if (this._done) return;
      const dt = Math.min(now - this.last, 100);
      this.last = now;
      this.now = now;
      this.metrics.worstFrame = Math.max(this.metrics.worstFrame || 0, dt);
      this._place();
      let t = (now - this.start - this.held) / 1e3;
      const gateAt = this.cfg.anticipation - 1e-3;
      if (!this.gateOpen && t >= gateAt) {
        this.held += t * 1e3 - gateAt * 1e3;
        t = gateAt;
        if (now - this.start > this.o.timeout) {
          this._finish();
          return;
        }
      }
      this.t = t;
      if (this.mode === 3) {
        const k = clamp((now - this.fadeStart) / 220);
        this.r.render({ mode: 3, fade: k, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dotCount: 0 });
        if (k >= 1) {
          this._finish();
          return;
        }
      } else if (this.mode === 0) {
        this.r.render({ mode: 0, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dotCount: 0 });
      } else {
        const g = {
          w: this.canvasPage.w,
          h: this.canvasPage.h,
          src: rel(this.origin.src, this.canvasPage),
          touch: this.origin.touch && rel({ ...this.origin.touch, w: 0, h: 0 }, this.canvasPage),
          hold: this.origin.hold
        };
        const s = frameState(t, this.cfg, g);
        if (this.shapes) {
          const k = s.moved, A = this.shapes.from, B = this.shapes.to, ra = this.shapes.r0, rb = this.shapes.r1;
          this.rects.shape = { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), w: lerp(A.w, B.w, k), h: lerp(A.h, B.h, k) };
          this.rects.radii = { tl: lerp(ra.tl, rb.tl, k), tr: lerp(ra.tr, rb.tr, k), br: lerp(ra.br, rb.br, k), bl: lerp(ra.bl, rb.bl, k) };
        }
        if (s.launched && !this._launched) {
          this._launched = true;
          this.o.onLaunch?.();
        }
        if (s.covered && !this._covered) {
          this._covered = true;
          this._d.covered.res();
          this.o.onCovered?.();
        }
        if (s.settled && this.mode === 1) {
          this.mode = 4;
          this._show();
          this.o.onSettled?.();
        }
        let n = 0;
        for (const P of this.particles) {
          const q = particleAt(P, s, this.cfg);
          if (!q || q.a <= 2e-3) continue;
          this.dots[n * 4] = q.x;
          this.dots[n * 4 + 1] = q.y;
          this.dots[n * 4 + 2] = P.size;
          this.dots[n * 4 + 3] = Math.min(q.a, 1);
          n++;
        }
        this.r.render({ mode: this.mode, s, cfg: this.cfg, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dots: this.dots, dotCount: n });
        if (t >= totalDuration(this.cfg)) {
          this._finish();
          return;
        }
      }
      if (this._skipped) {
        this._finish();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  async _plain() {
    try {
      await this._runUpdate();
    } finally {
      this._done = true;
      this._release();
      this._d.ready.res();
      this._d.covered.res();
      this._d.finished.res();
    }
  }
  async _finish() {
    if (this._done) return;
    this._done = true;
    try {
      await this._runUpdate();
    } catch {
    }
    this._show();
    this._release();
    if (!this._covered) this._d.covered.res();
    this._d.finished.res();
    this.o.onEnd?.(this.metrics);
  }
  _release() {
    if (this.r) {
      release(this.r);
      this.r = null;
    }
    if (ACTIVE.get(this.target) === this) ACTIVE.delete(this.target);
  }
  _abort(err) {
    console.warn("[distortion-wave] falling back to a plain update:", err);
    this._done = true;
    this._show();
    this._release();
    (this._updated ? Promise.resolve() : this._runUpdate()).catch(() => {
    }).finally(() => {
      this._d.ready.res();
      this._d.covered.res();
      this._d.finished.res();
    });
  }
};
function distortionWave(target, update, options = {}) {
  return new WaveTransition(target, update, options);
}
function waveOnClick(trigger, target, update, options = {}) {
  const prep = () => prepareWave(target);
  trigger.addEventListener("pointerenter", prep);
  trigger.addEventListener("focus", prep);
  trigger.addEventListener("click", (e) => distortionWave(target, () => update(e), { source: trigger, focus: e, ...options }));
}
export {
  PALETTES,
  PRESETS,
  distortionWave,
  frameState,
  prepareWave,
  scaleConfig,
  setWaveDefaults,
  snapshotElement,
  totalDuration,
  warmupWave,
  waveOnClick
};
