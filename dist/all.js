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
  ember: ["#FF5A3C", "#FFB23C", "#FF3C8E", "#FFE07A", "#FF7F50"],
  electric: ["#8FF7FF", "#3FA9FF", "#6B7CFF", "#C6FBFF"],
  pixel: ["#FF6B2C", "#FFA15E", "#FFE2C9", "#FF4F2E"]
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
  o.pull = Math.min(o.pull, Math.min(w, h) * 0.065);
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

// src/gl.js
var VS_FULL = `#version 300 es
out vec2 b9; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));b9=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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

// src/renderer.js
var FS_COPY = `#version 300 es
precision highp float;in vec2 b9;uniform sampler2D co;uniform float eE;out vec4 p; void main(){p=textureLod(co,b9,eE);}`;
var FS_BLUR = `#version 300 es
precision highp float;in vec2 b9;uniform sampler2D co;uniform vec2 d4;uniform float bt;out vec4 p; void main(){ float cX=min(ceil(bt*3.0),32.0);vec4 O=vec4(0.0);float e8=0.0; for(int B=-32;B<=32;B++){float dJ=float(B);if(abs(dJ)>cX)continue; float aJ=exp(-0.5*dJ*dJ/(bt*bt));O +=textureLod(co,b9 + d4*dJ,0.0)*aJ;e8 +=aJ;} p=O/e8; }`;
var FS_MAIN = `#version 300 es
precision highp float;precision highp int; uniform vec2 t,I; uniform sampler2D y,bb,aU,x,ba,aT; uniform vec4 g,f,m,ak; uniform int aA; uniform bool dX; uniform float dY,X; uniform bool e,J; uniform vec2 bJ; uniform float cH,du,V,bK,a,dv,bE,d3,j,am,aR,bU,bV,L,cG; uniform float eD,dl,dg,aH,au,bT,by; uniform float w,R,dW,cF,r,cV,b3; uniform vec3 aI[8];uniform int af; out vec4 W; const float an=6.28318530718;
#ifdef FX
float v(vec2 Y,vec2 b); vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh);
#endif
mat2 bB(float H){float E=cos(H),z=sin(H);return mat2(E,z,-z,E);} float cv(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float c6(float ah){return fract(sin(ah*127.1)*43758.5453);} float ca(float ah){float B=floor(ah),o=fract(ah);return mix(c6(B),c6(B + 1.0),o*o*(3.0 - 2.0*o))*2.0 - 1.0;} float Q(vec2 b,vec2 M,vec4 s){ s.xy=(b.x>0.0)?s.xy:s.zw;s.x=(b.y>0.0)?s.x:s.y; vec2 Y=abs(b)- M + s.x;return min(max(Y.x,Y.y),0.0)+ length(max(Y,0.0))- s.x; } struct aK{float d;vec2 n;vec2 q;float g;}; aK ad(vec2 b){ vec2 Y=bB(-cH)*(b - bJ);float eT=Y.x*bK; vec2 dD=vec2(max(abs(eT)- du,0.0),Y.y);float d8=max(length(dD),1e-3); vec2 c5=vec2(dD.x*sign(Y.x)*bK,dD.y)/d8;float aF=max(length(c5),1e-3); float dF; if(J){float H=atan(Y.y,Y.x);dF=0.5*sin(3.0*H + a*1.3)+ 0.3*sin(5.0*H - a*0.9 + 2.1)+ 0.2*sin(2.0*H + a*2.0);} else{float z=eT*0.005/L;dF=0.7*ca(z + a*0.8)+ 0.3*ca(z*2.3 - a*1.1 + 5.0);} aK o;o.d=(d8 - V)/aF + dv*dF;o.n=bB(cH)*(c5/aF);o.q=Y;o.g=aF;
#ifdef FX
o.d +=v(Y,b);
#endif
return o; } vec4 u(sampler2D z,vec4 ar,vec2 b,vec2 C){ vec2 Y=(b - ar.xy)/ar.zw; if(Y.x<0.0||Y.y<0.0||Y.x>1.0||Y.y>1.0)return vec4(0.0); return textureLod(z,clamp((C - ar.xy)/ar.zw,0.0,1.0),0.0); } vec4 K(sampler2D fk,sampler2D dT,sampler2D dU,vec4 ar,vec2 b,vec2 C,float at,float as){ vec4 E=u(fk,ar,b,C); if(at>0.0)E=mix(E,u(dT,ar,b,C),at); if(as>0.0)E=mix(E,u(dU,ar,b,C),as); return E; } vec4 bl(vec2 b,vec2 C,vec2 aO,float at,float as){ if(dot(aO,aO)<0.01)return K(y,bb,aU,g,b,C,at,as); vec4 s=K(y,bb,aU,g,b,C + aO,at,as),aF=K(y,bb,aU,g,b,C,at,as),M=K(y,bb,aU,g,b,C - aO,at,as); return vec4(s.r,aF.g,M.b,max(max(s.a,aF.a),M.a)); } vec4 bk(vec2 b,vec2 C,vec2 aO,float at,float as){ if(dot(aO,aO)<0.01)return K(x,ba,aT,f,b,C,at,as); vec4 s=K(x,ba,aT,f,b,C + aO,at,as),aF=K(x,ba,aT,f,b,C,at,as),M=K(x,ba,aT,f,b,C - aO,at,as); return vec4(s.r,aF.g,M.b,max(max(s.a,aF.a),M.a)); } vec3 h(float bS){ float ah=fract(bS)*float(af);int B=min(int(floor(ah)),af - 1);int ao=(B + 1)%af; return mix(aI[B],aI[ao],smoothstep(0.0,1.0,fract(ah))); } vec3 d(vec3 E){ float az=E.x + 0.3963377774*E.y + 0.2158037573*E.z,aV=E.x - 0.1055613458*E.y - 0.0638541728*E.z,z=E.x - 0.0894841775*E.y - 1.2914855480*E.z; az=az*az*az;aV=aV*aV*aV;z=z*z*z; vec3 bm=clamp(vec3(4.0767416621*az - 3.3077115913*aV + 0.2309699292*z,-1.2684380046*az + 2.6097574011*aV - 0.3413193965*z,-0.0041960863*az - 0.7034186147*aV + 1.7076147010*z),0.0,1.0); return mix(12.92*bm,1.055*pow(bm,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),bm)); } 
/*@FX*/
 vec4 d7(vec4 p,vec2 b,vec2 E,float A,aK o){
#ifdef FX
p=D(p,b,E,A,o.d,o.q,o.g);
#endif
return p; } void main(){ vec2 b=vec2(gl_FragCoord.x,I.y - gl_FragCoord.y)*(t.x/I.x); float ei=(cv(gl_FragCoord.xy)- 0.5)/255.0; vec2 E=b -(m.xy + m.zw*0.5); float A=Q(E,m.zw*0.5,ak); float bQ=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float cs=dX?bQ:1.0; if(aA==0||aA==2||aA==3){ vec4 H=u(y,g,b,b),M=u(x,f,b,b); vec4 dD=(aA==0?H:aA==2?M:mix(H,M,dY))*cs; W=vec4(dD.rgb + ei*dD.a,dD.a);return; } aK o=ad(b); vec2 s=b - bJ;float cN=max(length(s),1.0); float bO=bV>0.0?smoothstep(bV*0.9,bV*1.8,cN):1.0; vec4 l=vec4(0.0); if(aA==1){ float ai=o.d/(dl*(o.d>0.0?0.8:1.6)); vec2 cr=o.n*(bE*eD*exp(-ai*ai)*bO); vec2 de=(s/cN)*(d3*(cN/(cN + 60.0*L))*exp(-cN/(700.0*L))*bO); vec2 C=b - cr + de; vec2 aO=(cr*0.5 - de*exp(-cN/(240.0*L)))*dg; float eR=o.d/(o.d>0.0?bT:by); float d6=bE*aH*exp(-eR*eR)*bO; float at=smoothstep(0.0,au,d6); float as=aH>au?smoothstep(au,aH,d6):0.0; float a5=e?smoothstep(-cG,cG,o.d):1.0; if(a5>=0.999)l=bl(b,C,aO,at,as); else if(a5<=0.001)l=bk(b,C,aO,at,as); else l=mix(bk(b,C,aO,at,as),bl(b,C,aO,at,as),a5); float fb=mix(u(x,f,b,b).a,u(y,g,b,b).a,a5); l*=min(1.0,fb/max(l.a,1e-4))*cs; } if(X>0.5){ float dV=max(u(x,f,b,b).a,u(y,g,b,b).a); float ep=max(u(aT,f,b,b).a,u(aU,g,b,b).a); bQ*=max(dV,smoothstep(0.02,0.5,ep)*0.8); } float a9=max(-A,0.0); float aa=o.q.x*0.0065/L,cY=atan(o.q.y,o.q.x); float dO=J?0.5 + 0.5*sin(2.0*cY + a*1.4)*cos(cY - a*0.6 + 0.8) :0.5 + 0.5*sin(aa*1.4 + a*1.3)*cos(aa*0.7 - a*0.6 + 0.8); float aL=0.0; if(j>0.0&&o.d<w){ if(o.d>=0.0){float ah=o.d/w;aL=exp(-4.5*ah*ah);} else{float ah=clamp(-o.d/(R*mix(0.55,1.35,dO)),0.0,1.0);aL=pow(1.0 - ah,2.4);} aL*=j*dW*bO; } float aq=atan(E.y/m.w,E.x/m.z); float bR=0.0,a7=0.0,aX=0.5; if(am>0.0&&X<0.5&&a9<cF*4.5){ float dP=0.5*sin(aq*3.0 + a*0.7)+ 0.3*sin(aq*5.0 - a*1.2 + 2.0)+ 0.2*sin(aq*9.0 + a*2.3 + 4.0); float cA=max(1.0 + cV*0.55*dP,0.15); float eO=a9/(cF*cA); float F=1.0 - smoothstep(-w*0.6,w*0.4,o.d); float aG=smoothstep(-r,r,o.d +(V - aR)/o.g); aX=0.5 + 0.5*sin(a*3.2 - aq*4.0); bR=exp(-eO*eO)*F*aG*am*(0.72 + 0.28*aX); float ev=1.0 - smoothstep(b3*0.5,b3*0.5 + 0.8,a9); float ch=smoothstep(-r,r,o.d +(V - bU)/o.g); a7=ev*F*ch*am*0.85*mix(0.55,1.0,smoothstep(0.2,1.4,cA)); } float H=(1.0 -(1.0 - aL)*(1.0 - bR))*bQ; a7*=bQ; if(H + a7<0.0005){W=d7(vec4(l.rgb + ei*l.a,l.a),b,E,A,o);return;} float ek=0.6 +(J?cY/an:aa*0.22)+ a*0.12 + o.d*0.0016/L; vec3 aj=h(ek); aj.x +=0.10*exp(-pow((o.d - 28.0*L)/(48.0*L),2.0))- 0.12*exp(-pow((o.d + 90.0*L)/(70.0*L),2.0)); aj.yz*=1.2; aj=mix(aj,vec3(0.985,0.0,0.0),0.65*exp(-pow((o.d + 6.0*L)/max(24.0*L,3.0),2.0))); vec3 bn=h(aq/an + a*0.25 + a9*0.0012/L);bn.yz*=1.1; aj=mix(aj,bn,bR/(bR + aL + 1e-4)); float cf=clamp(H,0.0,1.0); vec4 p=vec4(d(aj)*cf,cf)+ l*(1.0 - cf); float eo=clamp(a7,0.0,1.0); p=vec4(mix(d(bn),vec3(1.0),0.6 + 0.35*aX)*eo,eo)+ p*(1.0 - eo); W=d7(vec4(p.rgb + ei*2.0*p.a,p.a),b,E,A,o); }`;
var VS_DOTS = `#version 300 es
layout(location=0)in vec4 be;uniform vec2 t;uniform float br;out float a4;out float bw;out float a1; void main(){gl_Position=vec4(be.x/t.x*2.0 - 1.0,1.0 - be.y/t.y*2.0,0.0,1.0); a1=ceil((be.z + 1.0)*br)+ 2.0;gl_PointSize=a1;bw=be.z*0.5*br;a4=be.w;}`;
var FS_DOTS = `#version 300 es
precision highp float;in float a4;in float bw;in float a1;out vec4 p; void main(){float s=length(gl_PointCoord - 0.5)*a1;float ab=clamp(bw - s + 0.5,0.0,1.0);p=vec4(vec3(ab*a4),ab*a4);}`;
var FS_DOTS_SQUARE = `#version 300 es
precision highp float;in float a4;in float bw;in float a1;out vec4 p; void main(){vec2 bf=abs(gl_PointCoord - 0.5)*a1;float ab=clamp(bw - max(bf.x,bf.y)+ 0.5,0.0,1.0);p=vec4(vec3(ab*a4),ab*a4);}`;
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
    gl.uniform1i(this.copy.u("co"), 0);
    gl.uniform1f(this.copy.u("eE"), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p);
    gl.uniform1i(this.blur.u("co"), 0);
    gl.uniform1f(this.blur.u("bt"), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blur.u("d4"), 1 / bw, 0);
    this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blur.u("d4"), 0, 1 / bh);
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
    this.layers[name] = sigmaFar == null ? { sharp, near: sharp, far: sharp } : { sharp, near: this.blurred(sharp, src.width, src.height, sigmaNear), far: this.blurred(sharp, src.width, src.height, sigmaFar) };
  }
  dropLayer(name) {
    const L = this.layers[name];
    if (!L || !this.gl) return;
    for (const t of /* @__PURE__ */ new Set([L.sharp, L.near, L.far])) this.gl.deleteTexture(t);
    delete this.layers[name];
  }
  clear() {
    for (const n of Object.keys(this.layers)) this.dropLayer(n);
  }
  palette(prog, palette) {
    const gl = this.gl, cols = Array.isArray(palette) ? palette : PALETTES[palette] || PALETTES.aurora;
    const key = cols.join();
    if (this.palKey !== key) {
      this.palKey = key;
      this.pal.fill(0);
      cols.slice(0, 8).forEach((h, i) => this.pal.set(hexToOklab(h), i * 3));
    }
    gl.uniform3fv(prog.u("aI[0]"), this.pal);
    gl.uniform1i(prog.u("af"), Math.min(cols.length, 8));
  }
  /** shape: none (round), 'square', or an effect's own fragment shader for the sparks (vA, vR, vPt in, o out). */
  drawDots(f, shape) {
    if (!(f.dotCount > 0)) return;
    const gl = this.gl, d = shape ? (this.dotShapes ||= {})[shape] ||= program(gl, VS_DOTS, shape === "square" ? FS_DOTS_SQUARE : shape) : this.dots;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(d.p);
    gl.uniform2f(d.u("t"), f.w, f.h);
    gl.uniform1f(d.u("br"), f.dpr);
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
  /** variant: { key, chunk, uniforms } from an effect: the wave shader compiled with that effect's GLSL. */
  shader(variant) {
    if (!variant) return this.main;
    this.variants ||= {};
    return this.variants[variant.key] ||= program(
      this.gl,
      VS_FULL,
      FS_MAIN.replace("#version 300 es", "#version 300 es\n#define FX").replace("/*@FX*/", () => variant.chunk)
    );
  }
  render(f, variant) {
    if (!this.ok) return;
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height, m = this.shader(variant), u = m.u;
    const old = this.layers.old || this.layers.new, nxt = this.layers.new || this.layers.old;
    if (!old) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(m.p);
    [["y", old.sharp], ["bb", old.near], ["aU", old.far], ["x", nxt.sharp], ["ba", nxt.near], ["aT", nxt.far]].forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(n), i);
    });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u("t"), f.w, f.h);
    gl.uniform2f(u("I"), W, H);
    v4("g", R.old);
    v4("f", R.new || R.old);
    v4("m", R.shape);
    gl.uniform4f(u("ak"), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u("aA"), f.mode);
    gl.uniform1f(u("dY"), f.fade || 0);
    gl.uniform1f(u("X"), R.boxless ? 1 : 0);
    gl.uniform1i(u("dX"), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u("e"), s.launched ? 1 : 0);
      gl.uniform1i(u("J"), s.ring ? 1 : 0);
      gl.uniform2f(u("bJ"), s.ox, s.oy);
      const fl = {
        cH: s.tilt,
        du: s.spine,
        V: s.radius,
        bK: s.squash,
        a: s.time,
        dv: s.swell,
        bE: s.energy,
        d3: s.pull,
        j: s.glow,
        am: s.rim,
        aR: s.clear,
        bU: s.hairClear,
        bV: s.hold,
        L: c.k,
        cG: c.seam,
        eD: c.amplitude,
        dl: c.lensWidth,
        dg: c.aberration,
        aH: c.blur,
        au: c.blurNear,
        bT: c.blurAhead,
        by: c.blurBehind,
        w: c.lead,
        R: c.tail,
        dW: c.band,
        cF: c.rimWidth,
        r: c.rimSoftness,
        cV: c.uneven,
        b3: c.hairWidth
      };
      for (const k in fl) gl.uniform1f(u(k), fl[k]);
      this.palette(m, c.palette);
      if (variant?.uniforms) for (const k in variant.uniforms) gl.uniform1f(u(k), variant.uniforms[k]);
    }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.drawDots(f, variant?.dots);
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
var WAVE = {
  name: "wave",
  resolve(o, m, tr) {
    const fx = tr.fx, base = { ...PRESETS[tr._variant(m)] || BASE, ...fx.preset || {} };
    const c = resolveConfig(base, o, m.clip.w, m.clip.h);
    fx.tune?.(c, o);
    return c;
  },
  render(r, f, fx) {
    r.render(f, fx.shader ? { key: fx.shader.key, chunk: fx.shader.chunk, dots: fx.shader.dots, uniforms: fx.uniforms?.(f.cfg, f.s) } : null);
  }
};
function effectOf(e) {
  if (e && typeof e === "object" && e.shader) return { ...WAVE, ...e, resolve: WAVE.resolve, render: WAVE.render };
  if (e && e !== "wave") console.warn(`[distortion-wave] unknown effect "${e}": import it from its entry, e.g. import { electric } from 'distortion-wave/electric'`);
  return WAVE;
}
var ACTIVE = /* @__PURE__ */ new WeakMap();
var DEFAULTS = { effect: "wave", variant: "auto", speed: 1, particles: true, reducedMotion: null, timeout: 3e3, preserveFocus: true };
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
    const fx = this.fx = effectOf(o.effect);
    const cfg = fx.resolve(o, before, this);
    this.cfg = cfg;
    this.before = before;
    this.dpr = oldShot.dpr;
    this.particles = makeParticles(cfg.particles, cfg);
    this.dots = new Float32Array(Math.max(this.particles.length, 1) * 4);
    this.origin = this._originPage(before);
    this.canvasPage = before.page;
    this.rects = { old: rel(before.page, this.canvasPage), new: null, shape: rel(before.shape, this.canvasPage), radii: before.shapeRadii, boxless: before.boxless, clipped: before.clipped };
    t0 = performance.now();
    const layer = (name, shot) => r.setLayer(name, shot.canvas, cfg.blurNear * this.dpr, cfg.blur * this.dpr);
    layer("old", oldShot);
    this.metrics.upload = Math.round(performance.now() - t0);
    this._mount();
    this._hide();
    this.mode = reduced ? 0 : 1;
    this.fadeOnly = reduced;
    this._d.ready.res();
    this._startLoop();
    await this._runUpdate();
    await nextFrame();
    for (const a of target.getAnimations?.({ subtree: true }) || []) if (a instanceof CSSTransition) try {
      a.finish();
    } catch {
    }
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
    layer("new", newShot);
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
        const frame2 = { mode: this.mode, s, cfg: this.cfg, w: this.canvasPage.w, h: this.canvasPage.h, rects: this.rects, dpr: this.dpr, dots: this.dots, dotCount: n };
        this.fx.render(this.r, frame2, this.fx);
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

// src/shaders.js
var COMMON = `
const float cq=1.5707963; float cv(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float c6(float ah){return fract(sin(ah*127.1)*43758.5453);} float Q(vec2 b,vec2 M,vec4 s){ s.xy=(b.x>0.0)?s.xy:s.zw;s.x=(b.y>0.0)?s.x:s.y; vec2 Y=abs(b)- M + s.x;return min(max(Y.x,Y.y),0.0)+ length(max(Y,0.0))- s.x; } float ck(vec2 M,vec4 s){ return 4.0*(M.x + M.y)- 2.0*(s.x + s.y + s.z + s.w)+ cq*(s.x + s.y + s.z + s.w); } float dS(vec2 b,vec2 M,vec4 s){ float eb=2.0*M.x - s.w - s.y,cx=2.0*M.y - s.y - s.x,bY=2.0*M.x - s.x - s.z,bP=2.0*M.y - s.z - s.w; float dT=eb,dU=dT + cq*s.y,eY=dU + cx,eZ=eY + cq*s.x,e0=eZ + bY,e1=e0 + cq*s.z,fl=e1 + bP; if(b.x>M.x - s.y&&b.y<-M.y + s.y)return dT +(clamp(atan(b.y + M.y - s.y,b.x - M.x + s.y),-cq,0.0)+ cq)*s.y; if(b.x>M.x - s.x&&b.y>M.y - s.x)return eY + clamp(atan(b.y - M.y + s.x,b.x - M.x + s.x),0.0,cq)*s.x; if(b.x<-M.x + s.z&&b.y>M.y - s.z)return e0 +(clamp(atan(b.y - M.y + s.z,b.x + M.x - s.z),cq,2.0*cq)- cq)*s.z; if(b.x<-M.x + s.w&&b.y<-M.y + s.w){ float H=atan(b.y + M.y - s.w,b.x + M.x - s.w);if(H>0.0)H -=4.0*cq; return fl +(clamp(H,-2.0*cq,-cq)+ 2.0*cq)*s.w; } float fd=M.x - abs(b.x),fe=M.y - abs(b.y); if(fe<fd)return b.y<0.0?clamp(b.x + M.x - s.w,0.0,eb):eZ + clamp(M.x - s.x - b.x,0.0,bY); return b.x>0.0?dU + clamp(b.y + M.y - s.y,0.0,cx):e1 + clamp(M.y - s.z - b.y,0.0,bP); } float ae(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float c9(vec3 ah){ vec3 B=floor(ah),o=fract(ah);o=o*o*(3.0 - 2.0*o); return mix(mix(mix(ae(B),ae(B + vec3(1,0,0)),o.x),mix(ae(B + vec3(0,1,0)),ae(B + vec3(1,1,0)),o.x),o.y), mix(mix(ae(B + vec3(0,0,1)),ae(B + vec3(1,0,1)),o.x),mix(ae(B + vec3(0,1,1)),ae(B + vec3(1,1,1)),o.x),o.y),o.z); } float c4(vec3 b){float z=0.0,H=0.5;for(int B=0;B<5;B++){z +=H*c9(b);b=b*2.03 + vec3(13.1,7.7,3.3);H*=0.5;}return z/0.96875;} uniform vec3 aI[8];uniform int af; vec3 h(float bS){ float ah=fract(bS)*float(af);int B=min(int(floor(ah)),af - 1);int ao=(B + 1)%af; return mix(aI[B],aI[ao],smoothstep(0.0,1.0,fract(ah))); } vec3 d(vec3 E){ float az=E.x + 0.3963377774*E.y + 0.2158037573*E.z,aV=E.x - 0.1055613458*E.y - 0.0638541728*E.z,z=E.x - 0.0894841775*E.y - 1.2914855480*E.z; az=az*az*az;aV=aV*aV*aV;z=z*z*z; vec3 bm=clamp(vec3(4.0767416621*az - 3.3077115913*aV + 0.2309699292*z,-1.2684380046*az + 2.6097574011*aV - 0.3413193965*z,-0.0041960863*az - 0.7034186147*aV + 1.7076147010*z),0.0,1.0); return mix(12.92*bm,1.055*pow(bm,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),bm)); } uniform float dw,aS,bp,dt,bq,bI; vec4 dG(float A,float z,float eI,float aP,float ai,float cu){ if(ai<=0.001||abs(A - bI)>aS*6.0 + bp*3.0)return vec4(0.0); float e6=6.2831853*z/eI,cX=eI/(6.2831853*dt); vec3 Y=vec3(cos(e6)*cX,sin(e6)*cX,aP*bq); float dQ=c4(Y)- 0.5,ez=c4(Y*1.9 + vec3(4.1,1.7,aP*bq*0.7))- 0.5; float eg=A - bI,bL=eg + dQ*2.4*bp,cd=eg + ez*2.0*bp; float aJ=max(dw,0.6); float cc=exp(-(bL*bL)/(aJ*aJ))+ 0.55*exp(-(cd*cd)/(aJ*aJ*0.5)); float cg=0.6*exp(-(bL*bL)/(aS*aS))+ 0.28*exp(-abs(eg)/(aS*2.2)); vec3 aj=h(z/eI + dQ*0.4 + aP*0.03);aj.yz*=1.15; vec3 aW=d(aj); vec3 eq=mix(aW,vec3(1.0),0.72 + 0.28*cu); float cK=clamp(cg*ai,0.0,1.0),c0=clamp(cc*ai*(1.0 + cu),0.0,1.0); vec4 p=vec4(aW*cK,cK); return vec4(eq*c0,c0)+ p*(1.0 - c0); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 d5; uniform float br,a,dm; uniform vec4 m,ak; out vec4 W;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,d5.y*br - gl_FragCoord.y)/br; vec2 ci=m.zw*0.5,E=b -(m.xy + ci); float A=Q(E,ci,ak); float eI=ck(ci,ak),z=dS(E,ci,ak); vec4 c3=dG(A,z,eI,a,dm,0.0); W=vec4(c3.rgb +(cv(gl_FragCoord.xy)- 0.5)/255.0*c3.a,c3.a); }`;
var ELECTRIC_WAVE = `
uniform float cB,aY,av,cQ,q,U,dh,cC,b2; float ac(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float bZ(vec3 ah){ vec3 B=floor(ah),o=fract(ah);o=o*o*(3.0 - 2.0*o); return mix(mix(mix(ac(B),ac(B + vec3(1,0,0)),o.x),mix(ac(B + vec3(0,1,0)),ac(B + vec3(1,1,0)),o.x),o.y), mix(mix(ac(B + vec3(0,0,1)),ac(B + vec3(1,0,1)),o.x),mix(ac(B + vec3(0,1,1)),ac(B + vec3(1,1,1)),o.x),o.y),o.z); } float bN(vec3 b,int eU){ float z=0.0,H=0.5,aC=0.0; for(int B=0;B<5;B++){if(B>=eU)break;z +=H*bZ(b);aC +=H;b=b*2.03 + vec3(13.1,7.7,3.3);H*=0.5;} return z/aC; } float v(vec2 Y,vec2 b){ if(!e)return 0.0; return(bN(vec3(Y/aY,a*av),3)- 0.5)*2.0*cB; } vec3 ay(float bS,float cu){vec3 aj=h(bS);aj.yz*=1.15;return mix(d(aj),vec3(1.0),cu);} vec4 a6(vec3 bA,float H,vec4 p){H=clamp(H,0.0,1.0);return vec4(bA*H,H)+ p*(1.0 - H);} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0)return p; float ct=0.7 + 0.3*bZ(vec3(a*19.0,3.7,0.0)); float aJ=max(cQ,0.5); if(e&&j>0.001&&abs(i)<U*3.0 + q*3.0 + cB){ vec3 ah=vec3(N/(aY*0.55),a*av*1.6); float dQ=bN(ah,4)- 0.5,ez=bN(ah*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float bL=i + dQ*2.0*U,cd=i + 0.7*U + ez*1.8*U; float cc=exp(-bL*bL/(aJ*aJ))+ 0.6*exp(-cd*cd/(aJ*aJ*0.5)); float cg=0.55*exp(-bL*bL/(q*q))+ 0.22*exp(-abs(i)/(q*2.2)); float ai=dh*j*ct*c; float bS=0.55 +(J?atan(N.y,N.x)/an:N.x*0.004/L)+ a*0.1; p=a6(ay(bS,0.0),cg*ai,p); p=a6(ay(bS,0.8),cc*ai,p); } if(cC>0.0&&X<0.5&&am>0.0&&A>-(q*2.5 + U*2.0 + aJ*3.0)){ float F=1.0 - smoothstep(-w*0.6,w*0.4,i); float aG=smoothstep(-r,r,i +(V - aR)/bh); float ai=cC*min(am*b2,1.0)*F*aG*ct*c; if(ai>0.001){ float aC=bN(vec3(E/aY,a*av),4)- 0.5; float dI=A + aJ*2.0 + aC*2.0*U*0.7; float bS=atan(E.y/m.w,E.x/m.z)/an + a*0.2; p=a6(ay(bS,0.0),(0.5*exp(-dI*dI/(q*q*0.6))+ 0.2*exp(-abs(A)/(q*2.0)))*ai,p); p=a6(ay(bS,0.75),exp(-dI*dI/(aJ*aJ*0.8))*ai,p); } } return p; }
`;

// src/ambient.js
var BORDER = {
  thickness: 1.6,
  glow: 14,
  chaos: 5,
  scale: 34,
  crackle: 1,
  offset: 0,
  intensity: 1,
  palette: "electric",
  trigger: "always",
  fadeIn: 220,
  fadeOut: 380
};
var items = /* @__PURE__ */ new Set();
var stage = null;
var raf = 0;
var lastNow = 0;
function makeStage() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-dw-ignore", "");
  canvas.setAttribute("data-dw-ambient", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;contain:strict;";
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return { ok: false };
  let prog;
  try {
    prog = program(gl, VS_FULL, FS_BORDER);
  } catch (e) {
    console.warn("[distortion-wave]", e);
    return { ok: false };
  }
  const s = { ok: true, canvas, gl, prog, vao: gl.createVertexArray(), pal: new Float32Array(24), lost: false };
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    s.lost = true;
  });
  return s;
}
function radiiOf(cs, w, h) {
  const one = (v, side) => {
    const t = String(v).trim().split(/\s+/)[0];
    const n = parseFloat(t) || 0;
    return t.endsWith("%") ? n / 100 * side : n;
  };
  const r = { tl: one(cs.borderTopLeftRadius, w), tr: one(cs.borderTopRightRadius, w), br: one(cs.borderBottomRightRadius, w), bl: one(cs.borderBottomLeftRadius, w) };
  const fit2 = (side, a, b) => a + b > 0 ? side / (a + b) : Infinity;
  const f = Math.min(1, fit2(w, r.tl, r.tr), fit2(w, r.bl, r.br), fit2(h, r.tl, r.bl), fit2(h, r.tr, r.br));
  return { tl: r.tl * f, tr: r.tr * f, br: r.br * f, bl: r.bl * f };
}
function frame(now) {
  raf = 0;
  const dt = lastNow ? Math.min(now - lastNow, 100) : 16;
  lastNow = now;
  const s = stage;
  if (!s || !s.ok || s.lost) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), vw = innerWidth, vh = innerHeight;
  const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
  if (s.canvas.width !== W || s.canvas.height !== H) {
    s.canvas.width = W;
    s.canvas.height = H;
  }
  const gl = s.gl, u = s.prog.u;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.SCISSOR_TEST);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(s.prog.p);
  gl.bindVertexArray(s.vao);
  gl.uniform2f(u("d5"), vw, vh);
  gl.uniform1f(u("br"), dpr);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive2 = false;
  for (const it of items) {
    const o = it.o, goal = it.on ? 1 : 0, rate = dt / (goal > it.level ? o.fadeIn : o.fadeOut);
    it.level = goal > it.level ? Math.min(goal, it.level + rate) : Math.max(goal, it.level - rate);
    if (it.level > 0 || goal > 0) alive2 = true;
    if (it.level <= 1e-3 || !it.el.isConnected) {
      if (it.dead) items.delete(it);
      continue;
    }
    if (!still) it.time += dt / 1e3;
    const b = it.el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (it.dirty || Math.abs(b.width - it.w) > 0.5 || Math.abs(b.height - it.h) > 0.5) {
      it.w = b.width;
      it.h = b.height;
      it.dirty = false;
      it.radii = radiiOf(getComputedStyle(it.el), b.width, b.height);
    }
    const m = o.glow * 6 + o.chaos * 3 + Math.abs(o.offset) + 2;
    const x0 = Math.max(0, Math.floor((b.left - m) * dpr)), y0 = Math.max(0, Math.floor((vh - b.bottom - m) * dpr));
    const x1 = Math.min(W, Math.ceil((b.right + m) * dpr)), y1 = Math.min(H, Math.ceil((vh - b.top + m) * dpr));
    if (x1 <= x0 || y1 <= y0) continue;
    gl.viewport(0, 0, W, H);
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    gl.uniform4f(u("m"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("ak"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("dm"), it.level * o.intensity);
    const f = { dw: o.thickness, aS: o.glow, bp: o.chaos, dt: o.scale, bq: o.crackle, bI: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("aI[0]"), it.pal);
    gl.uniform1i(u("af"), it.palN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  if (alive2) raf = requestAnimationFrame(frame);
  else {
    s.canvas.remove();
    lastNow = 0;
  }
}
function wake() {
  if (!stage) stage = makeStage();
  if (!stage.ok) return false;
  if (!stage.canvas.isConnected) document.body.appendChild(stage.canvas);
  if (!raf) raf = requestAnimationFrame(frame);
  return true;
}
function setPalette(it) {
  const p = it.o.color ? [it.o.color] : Array.isArray(it.o.palette) ? it.o.palette : PALETTES[it.o.palette] || PALETTES.electric;
  it.pal = new Float32Array(24);
  p.slice(0, 8).forEach((h, i) => it.pal.set(hexToOklab(h), i * 3));
  it.palN = Math.min(p.length, 8);
}
function electricBorder(el, options = {}) {
  const it = { el, o: { ...BORDER, ...options }, level: 0, on: false, time: Math.random() * 20, w: 0, h: 0, dirty: true, dead: false };
  if (it.o.zIndex != null && stage?.canvas) stage.canvas.style.zIndex = String(it.o.zIndex);
  setPalette(it);
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    it.dirty = true;
  }) : null;
  ro?.observe(el);
  const triggers = String(it.o.trigger);
  const listeners = [];
  const on = (type, fn) => {
    el.addEventListener(type, fn);
    listeners.push([type, fn]);
  };
  let hover = false, focus = false;
  const sync = () => {
    it.on = triggers.includes("always") || triggers.includes("hover") && hover || triggers.includes("focus") && focus;
    if (it.on) wake();
  };
  if (triggers.includes("hover")) {
    on("pointerenter", () => {
      hover = true;
      sync();
    });
    on("pointerleave", () => {
      hover = false;
      sync();
    });
  }
  if (triggers.includes("focus")) {
    on("focusin", () => {
      focus = true;
      sync();
    });
    on("focusout", () => {
      focus = el.matches(":focus-within");
      sync();
    });
  }
  items.add(it);
  sync();
  const ctl = {
    get active() {
      return it.on;
    },
    start() {
      it.on = true;
      wake();
      return ctl;
    },
    stop() {
      it.on = false;
      return ctl;
    },
    set(options2) {
      Object.assign(it.o, options2);
      if ("color" in options2 || "palette" in options2) setPalette(it);
      wake();
      return ctl;
    },
    destroy() {
      it.on = false;
      it.dead = true;
      ro?.disconnect();
      for (const [t, f] of listeners) el.removeEventListener(t, f);
      if (it.level <= 1e-3) items.delete(it);
    }
  };
  return ctl;
}

// src/effects/electric.js
var PRESET = { palette: "electric", band: 0.6, rimStrength: 0.45, hairWidth: 0 };
var ELECTRIC = {
  jag: 8,
  // how jagged the front is
  scale: 46,
  // one noise cell along the front (smaller = more jagged)
  crackle: 1.8,
  // speed of the crackle
  chaos: 6,
  // how far the bolts stray from the front
  boltWidth: 1.5,
  // bright core of a bolt
  boltGlow: 14,
  // glow around it
  bolts: 1.2,
  // strength of the bolts on the front (0 = none)
  rimBolts: 1.3
  // strength of the arcs on the outline (0 = none)
};
var clamp2 = (x, a, b) => Math.min(Math.max(x, a), b);
var electric = Object.freeze({
  name: "electric",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? ELECTRIC[key];
    c.jag = v("jag") * k * i;
    c.chaos = v("chaos") * k * i;
    c.scale = Math.max(v("scale") * k, 10);
    c.crackle = v("crackle");
    c.boltWidth = Math.max(v("boltWidth") * clamp2(k, 0.6, 1.3), 0.6);
    c.boltGlow = Math.max(v("boltGlow") * k, 3);
    c.bolts = v("bolts");
    c.rimBolts = v("rimBolts");
  },
  shader: Object.freeze({ key: "electric", chunk: ELECTRIC_WAVE }),
  uniforms: (c) => ({
    cB: c.jag,
    aY: c.scale,
    av: c.crackle,
    cQ: c.boltWidth,
    q: c.boltGlow,
    U: c.chaos,
    dh: c.bolts,
    cC: c.rimBolts,
    b2: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float G,d2,dp,a0,dn,cD,cE,b5; float cw(vec2 E){return fract(sin(dot(E,vec2(127.1,311.7)))*43758.5453);} float v(vec2 Y,vec2 b){return 0.0;} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0)return p; vec2 Z=floor(b/G),a2=(Z + 0.5)*G,dK=fract(b/G)*G; float aF=d2*0.5; float dc=step(aF,dK.x)*step(dK.x,G - aF)*step(aF,dK.y)*step(dK.y,G - aF); vec2 ci=m.zw*0.5; float ea=Q(a2 -(m.xy + ci),ci,ak); if(ea>0.0)return p; float df=floor(a*dn); float aN=cw(Z + vec2(df*0.371,df*0.137)),a3=cw(Z*1.731 + 3.1); aK aE=ad(a2); float k=max(w*dp,G*3.0); vec3 c8=d(h(0.5 + Z.x*0.021 + Z.y*0.013 + a*0.2)); if(e&&j>0.001){ if(aE.d<k&&aE.d>-k*1.8){ bool dL=aE.d +(a3 - 0.5)*G*3.0>0.0; vec4 aV=dL?u(y,g,a2,a2):u(x,f,a2,a2); float aJ=(1.0 - smoothstep(k*0.25,k,abs(aE.d)))*smoothstep(0.0,0.3,j); float eA=step(1.0 - a0*(0.35 + 0.65*aJ),aN)*cD*min(j*1.5,1.0); vec4 cl=mix(aV,vec4(c8,1.0),eA); cl=vec4(cl.rgb*mix(0.55,1.0,dc),cl.a); p=mix(p,cl,aJ*c); }else if(aE.d<=-k*1.8&&aE.d>-R*1.3){ float fm=1.0 - clamp(-aE.d/(R*1.3),0.0,1.0); float eA=step(1.0 - a0*0.3*fm,aN)*cD*j; p=mix(p,vec4(c8,1.0),eA*dc*c); } } if(cE>0.0&&X<0.5&&am>0.0&&ea>-G*1.2){ float F=1.0 - smoothstep(-w*0.6,w*0.4,aE.d); float aG=smoothstep(-r,r,aE.d +(V - aR)/aE.g); float ai=cE*min(am*b5,1.0)*F*aG; p=mix(p,vec4(c8,1.0),step(aN,ai)*dc*c); } return p; }
`;
var PRESET2 = { palette: "pixel", band: 0.35, rimStrength: 0.4, hairWidth: 0 };
var PIXEL = {
  cell: 6,
  // px: size of a pixel
  gap: 1,
  // px: gap between pixels (0 = a plain mosaic)
  zone: 1,
  // width of the pixel zone around the front, × the band's lead
  density: 0.45,
  // share of lit pixels at the front (0 to 1)
  rate: 14,
  // flicker, changes per second
  lit: 1,
  // strength of the lit pixels (0 = only the mosaic)
  rimPixels: 1
  // strength of the pixels on the outline (0 = none)
};
var clamp3 = (x, a, b) => Math.min(Math.max(x, a), b);
var pixel = Object.freeze({
  name: "pixel",
  preset: Object.freeze({ ...PRESET2 }),
  tune(c, o) {
    const v = (key) => o[key] ?? PIXEL[key];
    c.cell = Math.max(v("cell") * clamp3(Math.sqrt(c.k), 0.7, 1.3), 2);
    c.gap = clamp3(v("gap"), 0, c.cell * 0.6);
    c.zone = v("zone");
    c.density = clamp3(v("density"), 0, 1);
    c.rate = v("rate");
    c.lit = v("lit");
    c.rimPixels = v("rimPixels");
  },
  shader: Object.freeze({ key: "pixel", chunk: PIXEL_WAVE, dots: "square" }),
  uniforms: (c) => ({
    G: c.cell,
    d2: c.gap,
    dp: c.zone,
    a0: c.density,
    dn: c.rate,
    cD: c.lit,
    cE: c.rimPixels,
    b5: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dr,dq,cU,cT,ds; float v(vec2 Y,vec2 b){return 0.0;} vec4 cm(vec2 b,vec2 C,float bf){return mix(u(x,f,b,C),u(y,g,b,C),smoothstep(-1.5,1.5,bf));} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float aN=cU*0.5,ah=(i + aN)/aN; if(c<=0.0||!e||j<0.001||abs(ah)>=1.0)return p; vec2 aC=ad(b).n; float z=sqrt(1.0 - ah*ah),cZ=ah/max(z,0.3),ai=min(j*1.5,1.0); vec2 ce=aC*(dr*cZ*ai),c3=aC*(dq*cZ*ai); float bM=i - dot(ce,aC); vec4 s=cm(b,b - ce - c3,bM - dot(c3,aC)),aF=cm(b,b - ce,bM),M=cm(b,b - ce + c3,bM + dot(c3,aC)); vec4 bi=vec4(s.r,aF.g,M.b,max(max(s.a,aF.a),M.a)); bi +=p*(1.0 - bi.a); float aa=(J?atan(N.y,N.x)/an:N.x*0.003/L)+ a*0.08; vec3 bo=d(h(aa + ah*0.15)); bi.rgb=mix(bi.rgb,bi.rgb*bo,ds*z); float dd=exp(-pow((ah + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(aa*40.0 + a*2.0))+ 0.45*exp(-pow((ah - 0.55)/0.08,2.0)); float em=pow(1.0 - z,3.0); float fi=clamp((dd + em*0.8)*cT,0.0,1.0)*bi.a; bi=vec4(mix(bi.rgb,mix(bo,vec3(1.0),0.75)*bi.a,fi),bi.a); return mix(p,bi,smoothstep(1.0,0.85,abs(ah))*ai*c); }
`;
var PRESET3 = { palette: ["#DFF6FF", "#9FDCFF", "#C9B8FF", "#FFFFFF", "#B8FFF0"], band: 0.3, rimStrength: 0.55 };
var GLASS = {
  thickness: 90,
  // width of the slab behind the front
  refraction: 26,
  // how far the slab bends what's under it
  dispersion: 5,
  // RGB split at the slab's slopes
  shine: 1,
  // strength of the highlights (0 = none)
  tint: 0.25
  // palette tint of the glass (0 = clear)
};
var glass = Object.freeze({
  name: "glass",
  preset: Object.freeze({ ...PRESET3 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? GLASS[key];
    c.thickness = Math.max(v("thickness") * k, 14);
    c.refraction = v("refraction") * k * i;
    c.dispersion = v("dispersion") * Math.min(k, 1.2) * i;
    c.shine = v("shine");
    c.tint = v("tint");
  },
  shader: Object.freeze({ key: "glass", chunk: GLASS_WAVE }),
  uniforms: (c) => ({ dr: c.refraction, dq: c.dispersion, cU: c.thickness, cT: c.shine, ds: c.tint })
});

// src/effects/burn.js
var BURN_WAVE = `
uniform float cO,bD,b1,aQ,bC,cP; float ax(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bX(vec2 b){ vec2 B=floor(b),o=fract(b);o=o*o*(3.0 - 2.0*o); return mix(mix(ax(B),ax(B + vec2(1,0)),o.x),mix(ax(B + vec2(0,1)),ax(B + vec2(1,1)),o.x),o.y); } float ec(vec2 b){float z=0.0,H=0.5;for(int B=0;B<4;B++){z +=H*bX(b);b=b*2.07 + vec2(5.3,1.7);H*=0.5;}return z/0.9375;} float v(vec2 Y,vec2 b){ if(!e)return 0.0; return(ec(b/bD + vec2(0.0,a*0.12))- 0.5)*2.0*cO; } vec3 aD(float aP){return vec3(smoothstep(0.0,0.45,aP),smoothstep(0.3,0.8,aP),smoothstep(0.65,1.0,aP));} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0||!e||j<0.001)return p; float ai=min(j*1.5,1.0),aC=bX(b/(bD*0.18)+ a*0.7); if(i>0.0&&i<b1){ float eK=pow(1.0 - i/b1,1.6)*(0.75 + 0.5*aC); p.rgb=mix(p.rgb,p.rgb*vec3(0.55,0.32,0.16),clamp(eK*1.6,0.0,1.0)*ai); p.rgb*=1.0 - smoothstep(0.45,0.95,eK)*0.92*ai; } if(i<0.0)p.rgb*=1.0 - cP*0.7*exp(i/(aQ*2.5))*(0.6 + 0.4*aC)*ai; float c3=exp(-pow(i/aQ,2.0))*(0.7 + 0.6*aC); float aP=clamp(c3,0.0,1.0); vec3 fg=mix(aD(aP),d(h(0.3 + aC*0.4 + a*0.1)),0.3*(1.0 - aP)); float cK=clamp(exp(-abs(i)/(aQ*2.2))*0.6*(0.6 + 0.4*aC)*ai,0.0,1.0)*c; p=vec4(aD(0.42)*cK,cK*0.5)+ p*(1.0 - cK*0.5); float H=clamp(smoothstep(0.08,0.6,c3)*ai,0.0,1.0)*c; p=vec4(fg*H,H)+ p*(1.0 - H); if(bC>0.0&&i<aQ&&i>-R){ float ag=9.0*L + 4.0; vec2 aF=(b + vec2(0.0,a*38.0*L))/ag,Z=floor(aF),o=fract(aF)- 0.5; float aN=ax(Z),a3=ax(Z + 7.3); vec2 bz=(vec2(aN,a3)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + aN*9.0),0.0); float bf=length(o - bz)*ag,s=0.8 + 1.5*a3; float ew=step(1.0 - bC*0.45*(1.0 - clamp(-i/R,0.0,1.0)),aN); float fn=0.6 + 0.4*sin(a*12.0 + aN*40.0); float cf=clamp(exp(-bf*bf/(s*s))*ew*fn*ai,0.0,1.0)*c; p=vec4(aD(0.45 + 0.3*a3)*cf,cf)+ p*(1.0 - cf); } return p; }
`;
var PRESET4 = { palette: "ember", band: 0.3, rimStrength: 0.6, hairWidth: 0 };
var BURN = {
  roughness: 32,
  // how ragged the burning edge is
  scale: 100,
  // one noise cell of the edge (smaller = more ragged)
  char: 70,
  // scorched zone ahead of the edge
  heat: 11,
  // width of the glowing edge
  embers: 1,
  // embers behind the edge (0 = none)
  smoke: 0.5
  // smoke behind the edge (0 = none)
};
var clamp4 = (x, a, b) => Math.min(Math.max(x, a), b);
var burn = Object.freeze({
  name: "burn",
  preset: Object.freeze({ ...PRESET4 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? BURN[key];
    c.roughness = v("roughness") * k * i;
    c.scale = Math.max(v("scale") * k, 16);
    c.char = Math.max(v("char") * k, 6);
    c.heat = Math.max(v("heat") * clamp4(k, 0.5, 1.4), 2);
    c.embers = clamp4(v("embers"), 0, 3);
    c.smoke = clamp4(v("smoke"), 0, 1);
  },
  shader: Object.freeze({ key: "burn", chunk: BURN_WAVE }),
  uniforms: (c) => ({ cO: c.roughness, bD: c.scale, b1: c.char, aQ: c.heat, bC: c.embers, cP: c.smoke })
});

// src/effects/ink.js
var INK_WAVE = `
uniform float bG,bH,bs,cR,dk,d0; float a8(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bj(vec2 b){ vec2 B=floor(b),o=fract(b);o=o*o*(3.0 - 2.0*o); return mix(mix(a8(B),a8(B + vec2(1,0)),o.x),mix(a8(B + vec2(0,1)),a8(B + vec2(1,1)),o.x),o.y); } float er(vec2 b){float z=0.0,H=0.5;for(int B=0;B<4;B++){z +=H*bj(b);b=b*2.11 + vec2(3.1,8.7);H*=0.5;}return z/0.9375;} float v(vec2 Y,vec2 b){ if(!e)return 0.0; return(er(b/bH + a*0.04)- 0.5)*2.0*bG +(bj(b/(bH*0.12))- 0.5)*bG*0.35; } vec4 c7(vec2 b,float bf){return mix(u(x,f,b,b),u(y,g,b,b),step(0.0,bf));} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float k=max(w*dk,24.0*L); if(c<=0.0||!e||j<0.001||i>k||i<-k*1.6)return p; float ai=min(j*1.5,1.0); vec2 aC=ad(b).n,bz=vec2(bs,bs*0.55); vec4 H=c7(b + bz,i + dot(bz,aC)),M=c7(b - bz,i - dot(bz,aC)); float aM=mix(0.5,0.25 + 0.3*cv(floor(b*1.2))+ 0.2*bj(b*0.5),cR); vec3 c0=H.a>0.0?H.rgb/H.a:vec3(1.0),fc=M.a>0.0?M.rgb/M.a:vec3(1.0); float ee=smoothstep(aM - 0.12,aM + 0.12,(1.0 - c0.g)*1.05); float ef=smoothstep(aM - 0.12,aM + 0.12,(1.0 - fc.r)*1.05); vec3 es=d(aI[0]),et=d(aI[1%af]); vec3 dR=vec3(0.965,0.945,0.9); vec3 l=dR*mix(vec3(1.0),es,ee*0.95)*mix(vec3(1.0),et,ef*0.85); float eC=(1.0 - smoothstep(0.0,d0,-i))*step(i,0.0)*smoothstep(0.15,0.55,aM + 0.25); vec3 eu=d(h((J?atan(N.y,N.x)/an:N.x*0.002/L)+ a*0.05)); l*=mix(vec3(1.0),eu,eC*0.9); float eJ=max(max(H.a,M.a),p.a); float aJ=(1.0 - smoothstep(k*0.35,k,i>0.0?i:-i/1.6))*ai*c; return mix(p,vec4(l*eJ,eJ),aJ); }
`;
var PRESET5 = { palette: ["#FF48B0", "#0078BF", "#FFE800", "#00A95C"], band: 0.25, rimStrength: 0.5, hairWidth: 0 };
var INK = {
  bleed: 30,
  // how far the ink spreads ahead and behind the front
  scale: 110,
  // one noise cell of the bleed (smaller = more feathered)
  misregister: 3,
  // offset between the two inks
  grain: 1,
  // paper grain in the print (0 = flat)
  zone: 1.2,
  // width of the printed zone around the front, × the band's lead
  ink: 36
  // width of the wet ink behind the front
};
var clamp5 = (x, a, b) => Math.min(Math.max(x, a), b);
var ink = Object.freeze({
  name: "ink",
  preset: Object.freeze({ ...PRESET5 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? INK[key];
    c.bleed = v("bleed") * k * i;
    c.scale = Math.max(v("scale") * k, 16);
    c.misregister = v("misregister") * clamp5(k, 0.6, 1.3);
    c.grain = clamp5(v("grain"), 0, 1);
    c.zone = v("zone");
    c.ink = Math.max(v("ink") * k, 4);
  },
  shader: Object.freeze({ key: "ink", chunk: INK_WAVE }),
  uniforms: (c) => ({ bG: c.bleed, bH: c.scale, bs: c.misregister, cR: c.grain, dk: c.zone, d0: c.ink })
});

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aw,bF,dj,di,dZ; float v(vec2 Y,vec2 b){return 0.0;} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float k=max(w*dj,aw*3.0); if(c<=0.0||!e||j<0.001||i>k*1.2||i<-k*2.0)return p; vec2 aF=bB(bF)*b/aw,Z=floor(aF)+ 0.5,a2=bB(-bF)*(Z*aw); float c1=ad(a2).d; vec4 aV=c1>0.0?u(y,g,a2,a2):u(x,f,a2,a2); if(aV.a<0.01)aV=c1>0.0?u(y,g,b,b):u(x,f,b,b); vec3 l=aV.rgb/max(aV.a,1e-3); float az=dot(l,vec3(0.299,0.587,0.114)); float aJ=1.0 - smoothstep(k*0.1,k,c1>0.0?c1:-c1/1.6),ai=min(j*1.5,1.0); bool cj=az>0.5; float s=aw*0.5*di*sqrt(clamp((cj?1.0 - az:az)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aJ); float bf=length((fract(aF)- 0.5)*aw),P=t.x/I.x; float ab=clamp((s - bf)/P + 0.5,0.0,1.0); vec3 eQ=d(h(Z.x*0.021 + Z.y*0.034 + a*0.15)); vec3 ej=mix(cj?l*0.2:l,eQ,dZ*aJ*aJ),eN=cj?mix(l,vec3(1.0),0.4):l*0.14; vec4 aN=vec4(mix(eN,ej,ab)*aV.a,aV.a); return mix(p,aN,smoothstep(0.0,0.35,aJ)*ai*c); }
`;
var PRESET6 = { palette: ["#00AEEF", "#EC008C", "#FFF200", "#FF6A3D"], band: 0.3, rimStrength: 0.55 };
var HALFTONE = {
  cell: 7,
  // px: one cell of the screen
  angle: 45,
  // degrees: angle of the screen
  zone: 1.1,
  // width of the screen around the front, × the band's lead
  size: 1.2,
  // largest dot, × the cell (above 1 the dots merge)
  ink: 0.7
  // palette ink at the front (0 = the content's own colours)
};
var clamp6 = (x, a, b) => Math.min(Math.max(x, a), b);
var halftone = Object.freeze({
  name: "halftone",
  preset: Object.freeze({ ...PRESET6 }),
  tune(c, o) {
    const v = (key) => o[key] ?? HALFTONE[key];
    c.cell = Math.max(v("cell") * clamp6(Math.sqrt(c.k), 0.7, 1.3), 3);
    c.angle = v("angle") * Math.PI / 180;
    c.zone = v("zone");
    c.size = clamp6(v("size"), 0.2, 2);
    c.ink = clamp6(v("ink"), 0, 1);
  },
  shader: Object.freeze({ key: "halftone", chunk: HALFTONE_WAVE }),
  uniforms: (c) => ({ aw: c.cell, bF: c.angle, dj: c.zone, di: c.size, dZ: c.ink })
});

// src/effects/metal.js
var METAL_WAVE = `
uniform float aZ,d1,cn,cS,b4; float v(vec2 Y,vec2 b){ if(!e)return 0.0; float z=J?atan(Y.y,Y.x)*2.0:Y.x/(80.0*L); return d1*(0.6*sin(z*1.3 + a*2.1)+ 0.4*sin(z*2.9 - a*2.7 + 1.3)); } vec3 ey(vec3 s,float bS){ float fo=-s.y; vec3 e4=mix(vec3(0.62,0.66,0.74),d(h(bS)),0.35); vec3 E=mix(vec3(0.05,0.055,0.07),e4,smoothstep(-0.25,0.35,fo)); E +=vec3(1.0)*exp(-pow((fo - 0.05)/0.07,2.0))*0.9; E +=vec3(0.9)*exp(-pow((fo - 0.75)/0.12,2.0))*0.5; return E; } vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float aN=aZ*0.5,ah=(i + aN*0.9)/aN; if(c<=0.0||!e||j<0.001||abs(ah)>=1.0)return p; vec2 aC=ad(b).n; float ai=min(j*1.5,1.0),z=sqrt(1.0 - ah*ah); float e2=J?atan(N.y,N.x)*9.0:N.x*0.07/L; float eX=0.6*sin(e2 + a*3.0)+ 0.4*sin(e2*2.3 - a*2.1 + ah*2.0); vec3 fp=normalize(vec3(aC*ah + vec2(-aC.y,aC.x)*eX*cn*0.3,z)); vec3 cX=reflect(vec3(0.0,0.0,-1.0),fp); float aa=(J?atan(N.y,N.x)/an:N.x*0.002/L)+ a*0.05; vec3 l=ey(cX,aa); vec2 C=b + cX.xy*aZ*0.6; vec4 aV=mix(u(x,f,b,C),u(y,g,b,C),step(0.0,i + dot(cX.xy,aC)*aZ*0.6)); l=mix(l,aV.rgb/max(aV.a,1e-3),b4*aV.a*(0.4 + 0.6*z)); vec3 ap=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(fp,ap),0.0),60.0)*cS*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,z)); float H=smoothstep(1.0,0.86,abs(ah))*ai*c; return vec4(clamp(l,0.0,1.0)*H,H)+ p*(1.0 - H); }
`;
var PRESET7 = { palette: ["#C9D6FF", "#F2F6FF", "#FFE3C2", "#B9F3FF", "#E3C9FF"], band: 0.25, rimStrength: 0.55 };
var METAL = {
  thickness: 46,
  // width of the metal bead
  wobble: 14,
  // slow liquid wobble of the front
  ripple: 0.6,
  // small ripples on the surface (0 = smooth)
  shine: 1,
  // strength of the specular highlight
  reflect: 0.35
  // how much of the content the metal mirrors (0 to 1)
};
var clamp7 = (x, a, b) => Math.min(Math.max(x, a), b);
var metal = Object.freeze({
  name: "metal",
  preset: Object.freeze({ ...PRESET7 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? METAL[key];
    c.thickness = Math.max(v("thickness") * k, 10);
    c.wobble = v("wobble") * k * i;
    c.ripple = Math.max(v("ripple"), 0);
    c.shine = Math.max(v("shine"), 0);
    c.reflect = clamp7(v("reflect"), 0, 1);
  },
  shader: Object.freeze({ key: "metal", chunk: METAL_WAVE }),
  uniforms: (c) => ({ aZ: c.thickness, d1: c.wobble, cn: c.ripple, cS: c.shine, b4: c.reflect })
});

// src/effects/water.js
var WATER_WAVE = `
uniform float S,dB,dz,dA,dC; float bd(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bx(vec2 b){ vec2 B=floor(b),o=fract(b);o=o*o*(3.0 - 2.0*o); return mix(mix(bd(B),bd(B + vec2(1,0)),o.x),mix(bd(B + vec2(0,1)),bd(B + vec2(1,1)),o.x),o.y); } float v(vec2 Y,vec2 b){ if(!e)return 0.0; return(bx(b/(S*2.5)+ a*0.3)- 0.5)*S*0.5; } vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0||!e||j<0.001||i>S*1.5||i<-R*1.6)return p; vec2 aC=ad(b).n; float ai=min(j*1.5,1.0); float b0=i>0.0?exp(-i/(S*0.35)):exp(i/(R*0.8)); float cM=an*i/S + a*7.0; vec2 cW=b/S; vec2 cz=vec2(sin(cW.y*1.7 + a*1.6)+ sin(cW.x*1.1 - a*1.2 + cW.y*0.6), cos(cW.x*1.9 - a*1.4)+ cos(cW.y*1.2 + a*1.1 + cW.x*0.7))*0.3; vec2 ce=(aC*cos(cM)+ cz)*dB*b0*ai; vec2 C=b - ce; float bM=i + dot(ce,aC); vec4 z=mix(u(x,f,b,C),u(y,g,b,C),smoothstep(-1.5,1.5,bM)); z +=p*(1.0 - z.a); vec3 bo=d(h(0.4 + i*0.0015/L + a*0.04)); vec3 bA=mix(z.rgb,z.rgb*bo*1.15,dC*b0); vec2 dH=b/(S*0.45)+ cz*2.0; float dD=sin(dH.x + sin(dH.y*1.3 + a*1.5))+ sin(dH.y*1.1 + sin(dH.x*0.9 - a*1.7)); float ed=pow(clamp(1.0 - abs(dD)*0.7,0.0,1.0),5.0); bA +=(ed*dz*0.4 + smoothstep(0.8,1.0,sin(cM + 0.9))*0.22*b0)*b0*z.a*mix(bo,vec3(1.0),0.5); float ff=bx(b/5.0 + vec2(a*2.0,0.0))*0.6 + bx(b/13.0 - a)*0.4; float el=smoothstep(0.35,0.7,ff + 0.45 - abs(i + S*0.15)/max(S*0.35,1.0))*dA; bA=mix(bA,vec3(0.97,0.99,1.0)*z.a,clamp(el,0.0,1.0)); return mix(p,vec4(bA,z.a),clamp(b0*3.0,0.0,1.0)*ai*c); }
`;
var PRESET8 = { palette: "ocean", band: 0.4, rimStrength: 0.6 };
var WATER = {
  wavelength: 44,
  // distance between two ripples
  refraction: 9,
  // how far the ripples bend the content
  caustics: 1,
  // strength of the light patterns (0 = none)
  foam: 1,
  // foam on the front (0 = none)
  tint: 0.35
  // palette tint of the water (0 = clear)
};
var clamp8 = (x, a, b) => Math.min(Math.max(x, a), b);
var water = Object.freeze({
  name: "water",
  preset: Object.freeze({ ...PRESET8 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? WATER[key];
    c.wavelength = Math.max(v("wavelength") * k, 10);
    c.refraction = v("refraction") * k * i;
    c.caustics = Math.max(v("caustics"), 0);
    c.foam = clamp8(v("foam"), 0, 2);
    c.tint = clamp8(v("tint"), 0, 1);
  },
  shader: Object.freeze({ key: "water", chunk: WATER_WAVE }),
  uniforms: (c) => ({ S: c.wavelength, dB: c.refraction, dz: c.caustics, dA: c.foam, dC: c.tint })
});

// src/effects/vine.js
var VINE_WAVE = `
uniform float n,dy,b6,b7,al,dx,bW; float T(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float cI(float aP,float ap){return ap*0.29*pow(max(sin(3.14159*pow(clamp(aP,0.0,1.0),0.72)),0.0),0.62);} float bv(vec2 aB,float ap){return max(abs(aB.x)- cI(aB.y/ap,ap),max(-aB.y,aB.y - ap));} vec3 dE(float aN){return d(h(aN));} vec4 cJ(vec2 aB,float ap,float aN,float bg,float P){ float bf=bv(aB,ap); float d9=max(abs(aB.x)- max(ap*0.016,P*0.45),max(aB.y - ap*0.1,-aB.y - ap*0.14)); float ab=clamp(0.5 - min(bf,d9)/P,0.0,1.0); if(ab<=0.0)return vec4(0.0); float aP=clamp(aB.y/ap,0.0,1.0),aJ=max(cI(aP,ap),1e-3),cp=clamp(aB.x/aJ,-1.0,1.0); vec3 aW=dE(aN),l=aW; l*=0.86 + 0.2*bg*smoothstep(-0.3,0.3,cp); l*=1.0 - 0.22*cp*cp; l*=0.9 + 0.2*aP; float c2=smoothstep(14.0,34.0,ap/P); float eW=(1.0 - smoothstep(P*0.4,P*0.4 + ap*0.018,abs(aB.x)))*(1.0 - 0.7*aP); float bS=aP*6.5 - abs(cp)*1.6,e9=P*6.5/ap; float eF=(1.0 - smoothstep(e9*0.4,e9*1.4,abs(fract(bS + 0.5)- 0.5)))*smoothstep(0.08,0.25,abs(cp))*(1.0 - smoothstep(0.7,0.95,abs(cp)))*(1.0 - aP*0.6); vec3 dN=mix(aW,vec3(0.85,0.92,0.55),0.45); l=mix(l,dN,max(eW*0.8,eF*0.35*c2)); l*=0.68 + 0.32*smoothstep(0.0,max(P*1.5,ap*0.035),-bf); l +=vec3(0.07,0.08,0.04)*smoothstep(0.55,0.0,length(vec2(cp + 0.4*bg,(aP - 0.45)*2.2))); if(d9<bf)l=mix(aW,vec3(0.32,0.36,0.16),0.5)*0.8; return vec4(l*ab,ab); } vec4 b8(vec2 b,vec2 cb,float ap,float H,float bg,float aN,float P){ mat2 cX=bB(H);float eM=max(abs(bg),0.18); vec2 aB=cX*(b - cb);aB.x/=eM;aB.y +=ap*0.5; vec4 az=cJ(aB,ap,aN,sign(bg),P); vec2 C=cX*(b - cb - vec2(0.05,0.09)*ap);C.x/=eM;C.y +=ap*0.5; float eB=clamp(0.5 - bv(C,ap)/(P + ap*0.07),0.0,1.0)*0.3; return az + vec4(0.0,0.0,0.0,eB)*(1.0 - az.a); } vec4 bc(vec4 p,vec4 az,float ai){az*=ai;return az + p*(1.0 - az.a);} vec4 bu(vec2 b,float i,vec2 aC,float ag,float k,float P,float da){ vec2 aF=b/ag,M=floor(aF - 0.5); vec4 az[4];float eG[4]; for(int ao=0;ao<4;ao++){ vec2 Z=M + vec2(float(ao&1),float(ao>>1))+ da; float aN=T(Z),a3=T(Z + 4.7),cL=T(Z + 9.1); vec2 cb=(Z - da + 0.5 +(vec2(a3,cL)- 0.5)*0.5)*ag; float aE=i + dot(aC,cb - b); float eh=aE>0.0?1.0 - aE/(k*0.35):1.0 - smoothstep(k*0.15,k*1.5,-aE); float en=clamp(1.0 - aE/(k*0.35),0.0,1.0); eG[ao]=cL; az[ao]=aN<eh*0.9?b8(b,cb,ag*(0.95 + 0.45*cL)*(0.45 + 0.55*en),aN*an,0.75 + 0.25*a3,a3*0.85,P):vec4(0.0); } for(int B=0;B<3;B++)for(int ao=0;ao<3 - B;ao++)if(eG[ao]>eG[ao + 1]){float aP=eG[ao];eG[ao]=eG[ao + 1];eG[ao + 1]=aP;vec4 dD=az[ao];az[ao]=az[ao + 1];az[ao + 1]=dD;} vec4 O=vec4(0.0); for(int ao=0;ao<4;ao++)O=az[ao]+ O*(1.0 - az[ao].a); return O; } float v(vec2 Y,vec2 b){ if(!e)return 0.0; float z=(J?atan(Y.y,Y.x)*40.0*L:Y.x)/max(n*1.6,1.0); return dx*(abs(sin(z + a*0.6))*0.7 + abs(sin(z*2.3 - a*0.4 + 1.7))*0.3); } vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float cl=I.x/t.x,P=1.0/cl; float c=clamp(0.5 - A*cl,0.0,1.0); if(!e||j<0.001)return p; float ai=min(j*1.5,1.0),k=max(w*dy,n*3.0); if(c>0.0){ vec2 aC=ad(b).n; if(i<k*0.35 + n&&i>-k*1.5 - n){ p=bc(p,bu(b,i,aC,n*0.95,k,P,0.0),ai*c); p=bc(p,bu(b + n*0.41,i,aC,n*0.8,k*0.8,P,17.0),ai*c); } if(b6>0.0&&i<-k*0.2&&i>-R*1.4){ float aP=a,ag=n*2.2; vec2 Y=b - vec2(0.0,aP*46.0*L); vec2 Z=floor(Y/ag); float aN=T(Z + 31.0),a3=T(Z + 2.3),cL=T(Z + 5.9); float bP=1.0 - clamp(-i/(R*1.4),0.0,1.0); if(aN<b6*0.32*bP){ float cM=aP*(1.6 + a3)+ aN*an; vec2 cb=(Z + 0.5)*ag + vec2(sin(cM)*ag*0.2,aP*46.0*L); float ap=n*(0.75 + 0.3*cL); p=bc(p,b8(b,cb,ap,aN*an + sin(cM)*0.9,cos(cM*1.3),mix(a3*0.8,0.98,0.35*cL),P),ai*c); } } } if(b7>0.0&&X<0.5&&am>0.0&&A>-al*6.0 - n*1.6){ float F=1.0 - smoothstep(-w*0.6,w*0.4,i); float aG=smoothstep(-r,r,i +(V - aR)/bh); float eS=b7*min(am*bW,1.0)*F*aG*c; if(eS>0.001){ float eV=2.0*(m.z + m.w),z=(atan(E.y/m.w,E.x/m.z)/an + 0.5)*eV; float eH=al*(0.85 + 0.3*sin(z/(n*2.7))); float e7=sin(z/(n*1.3))*al*1.4 + sin(z/(n*0.55)+ 1.3)*al*0.4; float bf=A + al*2.5 + e7; float cd=bf + sin(z/(n*0.35))*eH*1.1; vec4 O=vec4(0.0); for(int ao=0;ao<2;ao++){ float bM=ao==0?cd:bf,fa=ao==0?eH*0.32:eH*0.5; float eL=clamp(fa - abs(bM)*1.0 + 0.5*P,0.0,P)/P; float bS=clamp(bM/max(fa,1e-3),-1.0,1.0); vec3 e3=vec3(0.24,0.33,0.13)*(0.55 + 0.55*sqrt(1.0 - bS*bS))+ vec3(0.05,0.05,0.02)*smoothstep(0.2,-0.6,bS); e3*=0.9 + 0.1*sin(z*1.7 + bM); vec4 e5=vec4(e3*eL,eL); O=e5 + O*(1.0 - e5.a); } float eB=clamp(1.0 - abs(bf - eH*0.9)/(eH*1.4 + P),0.0,1.0)*0.25; O=O + vec4(0.0,0.0,0.0,eB)*(1.0 - O.a); float cy=n*1.15,o=z/cy,fh=floor(o); for(int ao=0;ao<2;ao++){ float B=fh +(ao==0?(fract(o)<0.5?-1.0:1.0):0.0); float eP=T(vec2(B,3.0)); if(eP<0.12)continue; float db=mod(B,2.0)*2.0 - 1.0; vec2 Y=vec2(z -(B + 0.5)*cy,bf); float ap=n*(0.7 + 0.35*T(vec2(B,1.0))); float H=-0.55*db - 0.25*(eP - 0.5); vec2 ex=bB(H)*vec2(Y.x,-Y.y); ex.y -=eH*0.4; vec4 dM=cJ(ex,ap,T(vec2(B,2.0))*0.85,db,P); vec2 dc=ex - vec2(0.04,-0.07)*ap; float fj=clamp(0.5 - bv(dc,ap)/(P + ap*0.07),0.0,1.0)*0.28; dM=dM + vec4(0.0,0.0,0.0,fj)*(1.0 - dM.a); O=O + dM*(1.0 - O.a); } p=bc(p,O,eS); } } return p; }
`;
var VINE_DOTS = `#version 300 es
precision highp float;in float a4;in float bw;in float a1;out vec4 p; void main(){ float H=a4*7.0 + bw*2.0,E=cos(H),z=sin(H),o=max(abs(cos(a4*9.0 + bw)),0.25); vec2 b=mat2(E,z,-z,E)*(gl_PointCoord - 0.5)*a1; float ap=bw*2.6,aP=b.y/ap + 0.5; b.x/=o; float aJ=ap*0.29*pow(max(sin(3.14159*pow(clamp(aP,0.0,1.0),0.72)),0.0),0.62); float bf=max(abs(b.x)- aJ,max(-aP,aP - 1.0)*ap); float ab=clamp(0.5 - bf,0.0,1.0)*a4; vec3 aF=mix(vec3(0.24,0.5,0.2),vec3(0.5,0.72,0.28),fract(bw*3.7)); aF*=0.8 + 0.3*step(0.0,b.x*sign(cos(a4*9.0 + bw))); aF=mix(aF,vec3(0.8,0.88,0.55),(1.0 - smoothstep(0.3,0.9,abs(b.x)))*0.5); p=vec4(aF*ab,ab); }`;
var PRESET9 = { palette: ["#3E7B35", "#5C9A43", "#2B5E2B", "#7FAF4E", "#47853B"], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
var VINE = {
  leaf: 26,
  // size of a leaf
  zone: 0.8,
  // width of the foliage around the front, × the band's lead
  bumps: 14,
  // leafy bumps of the front
  fall: 1,
  // falling leaves behind the front (0 = none)
  vine: 1,
  // strength of the vine on the outline (0 = none)
  vineWidth: 2.5
  // thickness of its stem
};
var clamp9 = (x, a, b) => Math.min(Math.max(x, a), b);
var vine = Object.freeze({
  name: "vine",
  preset: Object.freeze({ ...PRESET9 }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? VINE[key];
    c.leaf = Math.max(v("leaf") * clamp9(Math.sqrt(k), 0.55, 1.4), 6);
    c.zone = v("zone");
    c.bumps = v("bumps") * k * i;
    c.fall = clamp9(v("fall"), 0, 3);
    c.vine = Math.max(v("vine"), 0);
    c.vineWidth = Math.max(v("vineWidth") * clamp9(k, 0.6, 1.4), 1);
  },
  shader: Object.freeze({ key: "vine", chunk: VINE_WAVE, dots: VINE_DOTS }),
  uniforms: (c) => ({
    n: c.leaf,
    dy: c.zone,
    b6: c.fall,
    b7: c.vine,
    al: c.vineWidth,
    dx: c.bumps,
    bW: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  BORDER,
  BURN,
  ELECTRIC,
  GLASS,
  HALFTONE,
  INK,
  METAL,
  PALETTES,
  PIXEL,
  PRESETS,
  VINE,
  WATER,
  burn,
  distortionWave,
  electric,
  electricBorder,
  frameState,
  glass,
  halftone,
  ink,
  metal,
  pixel,
  prepareWave,
  scaleConfig,
  setWaveDefaults,
  snapshotElement,
  totalDuration,
  vine,
  warmupWave,
  water,
  waveOnClick
};
