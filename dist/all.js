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
out vec2 ct; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));ct=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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
precision highp float;in vec2 ct;uniform sampler2D cI;uniform float fh;out vec4 m; void main(){m=textureLod(cI,ct,fh);}`;
var FS_BLUR = `#version 300 es
precision highp float;in vec2 ct;uniform sampler2D cI;uniform vec2 eA;uniform float bG;out vec4 m; void main(){ float bh=min(ceil(bG*3.0),32.0);vec4 J=vec4(0.0);float fQ=0.0; for(int F=-32;F<=32;F++){float ee=float(F);if(abs(ee)>bh)continue; float aW=exp(-0.5*ee*ee/(bG*bG));J +=textureLod(cI,ct + eA*ee,0.0)*aW;fQ +=aW;} m=J/fQ; }`;
var FS_MAIN = `#version 300 es
precision highp float;precision highp int; uniform vec2 v,S; uniform sampler2D E,bp,a5,D,bo,a4; uniform vec4 i,h,g,I; uniform int aJ; uniform bool et; uniform float eu,M; uniform bool e,T; uniform vec2 bW; uniform float c1,dX,N,bX,a,dY,bR,ez,k,af,aE,b9,ca,Q,c0; uniform float fg,dP,dK,aS,aD,b8,bL; uniform float s,U,es,cZ,o,dk,ck; uniform vec3 aT[8];uniform int al; out vec4 ae; const float ar=6.28318530718;
#ifdef FX
float w(vec2 V,vec2 b); vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9);
#endif
mat2 bO(float O){float A=cos(O),y=sin(O);return mat2(A,y,-y,A);} float cP(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float dy(float ag){return fract(sin(ag*127.1)*43758.5453);} float cu(float ag){float F=floor(ag),p=fract(ag);return mix(dy(F),dy(F + 1.0),p*p*(3.0 - 2.0*p))*2.0 - 1.0;} float r(vec2 b,vec2 X,vec4 t){ t.xy=(b.x>0.0)?t.xy:t.zw;t.x=(b.y>0.0)?t.x:t.y; vec2 V=abs(b)- X + t.x;return min(max(V.x,V.y),0.0)+ length(max(V,0.0))- t.x; } struct aX{float d;vec2 n;vec2 q;float g;}; aX aj(vec2 b){ vec2 V=bO(-c1)*(b - bW);float fz=V.x*bX; vec2 cr=vec2(max(abs(fz)- dX,0.0),V.y);float ch=max(length(cr),1e-3); vec2 dx=vec2(cr.x*sign(V.x)*bX,cr.y)/ch;float as=max(length(dx),1e-3); float d9; if(T){float O=atan(V.y,V.x);d9=0.5*sin(3.0*O + a*1.3)+ 0.3*sin(5.0*O - a*0.9 + 2.1)+ 0.2*sin(2.0*O + a*2.0);} else{float y=fz*0.005/Q;d9=0.7*cu(y + a*0.8)+ 0.3*cu(y*2.3 - a*1.1 + 5.0);} aX p;p.d=(ch - N)/as + dY*d9;p.n=bO(c1)*(dx/as);p.q=V;p.g=as;
#ifdef FX
p.d +=w(V,b);
#endif
return p; } vec2 c8(vec2 x){ vec2 a0=g.zw*0.5,A=x -(g.xy + a0); float aK=r(A,a0,I); if(aK<-2.0)return x; vec2 as=vec2(r(A + vec2(0.5,0.0),a0,I)- r(A - vec2(0.5,0.0),a0,I), r(A + vec2(0.0,0.5),a0,I)- r(A - vec2(0.0,0.5),a0,I)); return x - as/max(length(as),1e-4)*(aK + 2.0); } vec4 B(sampler2D y,vec4 aA,vec2 b,vec2 x){ vec2 V=(b - aA.xy)/aA.zw; if(V.x<0.0||V.y<0.0||V.x>1.0||V.y>1.0)return vec4(0.0); if(x!=b&&M<0.5)x=c8(x); return textureLod(y,clamp((x - aA.xy)/aA.zw,0.0,1.0),0.0); } vec4 Y(sampler2D f6,sampler2D en,sampler2D eo,vec4 aA,vec2 b,vec2 x,float aC,float aB){ vec4 A=B(f6,aA,b,x); if(aC>0.0)A=mix(A,B(en,aA,b,x),aC); if(aB>0.0)A=mix(A,B(eo,aA,b,x),aB); return A; } vec4 by(vec2 b,vec2 x,vec2 a1,float aC,float aB){ if(dot(a1,a1)<0.01)return Y(E,bp,a5,i,b,x,aC,aB); vec4 t=Y(E,bp,a5,i,b,x + a1,aC,aB),as=Y(E,bp,a5,i,b,x,aC,aB),X=Y(E,bp,a5,i,b,x - a1,aC,aB); return vec4(t.r,as.g,X.b,max(max(t.a,as.a),X.a)); } vec4 bx(vec2 b,vec2 x,vec2 a1,float aC,float aB){ if(dot(a1,a1)<0.01)return Y(D,bo,a4,h,b,x,aC,aB); vec4 t=Y(D,bo,a4,h,b,x + a1,aC,aB),as=Y(D,bo,a4,h,b,x,aC,aB),X=Y(D,bo,a4,h,b,x - a1,aC,aB); return vec4(t.r,as.g,X.b,max(max(t.a,as.a),X.a)); } vec3 j(float bn){ float ag=fract(bn)*float(al);int F=min(int(floor(ag)),al - 1);int av=(F + 1)%al; return mix(aT[F],aT[av],smoothstep(0.0,1.0,fract(ag))); } vec3 d(vec3 A){ float au=A.x + 0.3963377774*A.y + 0.2158037573*A.z,a7=A.x - 0.1055613458*A.y - 0.0638541728*A.z,y=A.x - 0.0894841775*A.y - 1.2914855480*A.z; au=au*au*au;a7=a7*a7*a7;y=y*y*y; vec3 bz=clamp(vec3(4.0767416621*au - 3.3077115913*a7 + 0.2309699292*y,-1.2684380046*au + 2.6097574011*a7 - 0.3413193965*y,-0.0041960863*au - 0.7034186147*a7 + 1.7076147010*y),0.0,1.0); return mix(12.92*bz,1.055*pow(bz,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),bz)); } 
/*@FX*/
 vec4 eE(vec4 m,vec2 b,vec2 A,float z,aX p){
#ifdef FX
m=H(m,b,A,z,p.d,p.q,p.g);
#endif
return m; } void main(){ vec2 b=vec2(gl_FragCoord.x,S.y - gl_FragCoord.y)*(v.x/S.x); float eP=(cP(gl_FragCoord.xy)- 0.5)/255.0; vec2 A=b -(g.xy + g.zw*0.5); float z=r(A,g.zw*0.5,I); float b6=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float cM=et?b6:1.0; if(aJ==0||aJ==2||aJ==3){ vec4 O=B(E,i,b,b),X=B(D,h,b,b); vec4 cr=(aJ==0?O:aJ==2?X:mix(O,X,eu))*cM; ae=vec4(cr.rgb + eP*cr.a,cr.a);return; } aX p=aj(b); vec2 t=b - bW;float da=max(length(t),1.0); float b4=ca>0.0?smoothstep(ca*0.9,ca*1.8,da):1.0; vec4 l=vec4(0.0); if(aJ==1){ float Z=p.d/(dP*(p.d>0.0?0.8:1.6)); vec2 cL=p.n*(bR*fg*exp(-Z*Z)*b4); vec2 dI=(t/da)*(ez*(da/(da + 60.0*Q))*exp(-da/(700.0*Q))*b4); vec2 x=b - cL + dI; vec2 a1=(cL*0.5 - dI*exp(-da/(240.0*Q)))*dK; float fx=p.d/(p.d>0.0?b8:bL); float eD=bR*aS*exp(-fx*fx)*b4; float aC=smoothstep(0.0,aD,eD); float aB=aS>aD?smoothstep(aD,aS,eD):0.0; float bj=e?smoothstep(-c0,c0,p.d):1.0; if(bj>=0.999)l=by(b,x,a1,aC,aB); else if(bj<=0.001)l=bx(b,x,a1,aC,aB); else l=mix(bx(b,x,a1,aC,aB),by(b,x,a1,aC,aB),bj); float fU=mix(B(D,h,b,b).a,B(E,i,b,b).a,bj); l*=min(1.0,fU/max(l.a,1e-4))*cM; } if(M>0.5){ float eq=max(B(D,h,b,b).a,B(E,i,b,b).a); float eX=max(B(a4,h,b,b).a,B(a5,i,b,b).a); b6*=max(eq,smoothstep(0.02,0.5,eX)*0.8); } float ap=max(-z,0.0); float ah=p.q.x*0.0065/Q,dp=atan(p.q.y,p.q.x); float ei=T?0.5 + 0.5*sin(2.0*dp + a*1.4)*cos(dp - a*0.6 + 0.8) :0.5 + 0.5*sin(ah*1.4 + a*1.3)*cos(ah*0.7 - a*0.6 + 0.8); float aY=0.0; if(k>0.0&&p.d<s){ if(p.d>=0.0){float ag=p.d/s;aY=exp(-4.5*ag*ag);} else{float ag=clamp(-p.d/(U*mix(0.55,1.35,ei)),0.0,1.0);aY=pow(1.0 - ag,2.4);} aY*=k*es*b4; } float az=atan(A.y/g.w,A.x/g.z); float b7=0.0,bl=0.0,bb=0.5; if(af>0.0&&M<0.5&&ap<cZ*4.5){ float ej=0.5*sin(az*3.0 + a*0.7)+ 0.3*sin(az*5.0 - a*1.2 + 2.0)+ 0.2*sin(az*9.0 + a*2.3 + 4.0); float cU=max(1.0 + dk*0.55*ej,0.15); float ft=ap/(cZ*cU); float C=1.0 - smoothstep(-s*0.6,s*0.4,p.d); float aq=smoothstep(-o,o,p.d +(N - aE)/p.g); bb=0.5 + 0.5*sin(a*3.2 - az*4.0); b7=exp(-ft*ft)*C*aq*af*(0.72 + 0.28*bb); float e6=1.0 - smoothstep(ck*0.5,ck*0.5 + 0.8,ap); float cB=smoothstep(-o,o,p.d +(N - b9)/p.g); bl=e6*C*cB*af*0.85*mix(0.55,1.0,smoothstep(0.2,1.4,cU)); } float O=(1.0 -(1.0 - aY)*(1.0 - b7))*b6; bl*=b6; if(O + bl<0.0005){ae=eE(vec4(l.rgb + eP*l.a,l.a),b,A,z,p);return;} float eR=0.6 +(T?dp/ar:ah*0.22)+ a*0.12 + p.d*0.0016/Q; vec3 an=j(eR); an.x +=0.10*exp(-pow((p.d - 28.0*Q)/(48.0*Q),2.0))- 0.12*exp(-pow((p.d + 90.0*Q)/(70.0*Q),2.0)); an.yz*=1.2; an=mix(an,vec3(0.985,0.0,0.0),0.65*exp(-pow((p.d + 6.0*Q)/max(24.0*Q,3.0),2.0))); vec3 bA=j(az/ar + a*0.25 + ap*0.0012/Q);bA.yz*=1.1; an=mix(an,bA,b7/(b7 + aY + 1e-4)); float cz=clamp(O,0.0,1.0); vec4 m=vec4(d(an)*cz,cz)+ l*(1.0 - cz); float eW=clamp(bl,0.0,1.0); m=vec4(mix(d(bA),vec3(1.0),0.6 + 0.35*bb)*eW,eW)+ m*(1.0 - eW); ae=eE(vec4(m.rgb + eP*2.0*m.a,m.a),b,A,z,p); }`;
var VS_DOTS = `#version 300 es
layout(location=0)in vec4 bs;uniform vec2 v;uniform float bE;out float aV;out float a6;out float aO; void main(){gl_Position=vec4(bs.x/v.x*2.0 - 1.0,1.0 - bs.y/v.y*2.0,0.0,1.0); aO=ceil((bs.z + 1.0)*bE)+ 2.0;gl_PointSize=aO;a6=bs.z*0.5*bE;aV=bs.w;}`;
var FS_DOTS = `#version 300 es
precision highp float;in float aV;in float a6;in float aO;out vec4 m; void main(){float t=length(gl_PointCoord - 0.5)*aO;float G=clamp(a6 - t + 0.5,0.0,1.0);m=vec4(vec3(G*aV),G*aV);}`;
var FS_DOTS_SQUARE = `#version 300 es
precision highp float;in float aV;in float a6;in float aO;out vec4 m; void main(){vec2 aK=abs(gl_PointCoord - 0.5)*aO;float G=clamp(a6 - max(aK.x,aK.y)+ 0.5,0.0,1.0);m=vec4(vec3(G*aV),G*aV);}`;
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
    gl.uniform1i(this.copy.u("cI"), 0);
    gl.uniform1f(this.copy.u("fh"), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p);
    gl.uniform1i(this.blur.u("cI"), 0);
    gl.uniform1f(this.blur.u("bG"), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blur.u("eA"), 1 / bw, 0);
    this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blur.u("eA"), 0, 1 / bh);
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
    gl.uniform3fv(prog.u("aT[0]"), this.pal);
    gl.uniform1i(prog.u("al"), Math.min(cols.length, 8));
  }
  /** shape: none (round), 'square', or an effect's own fragment shader for the sparks (vA, vR, vPt in, o out). */
  drawDots(f, shape) {
    if (!(f.dotCount > 0)) return;
    const gl = this.gl, d = shape ? (this.dotShapes ||= {})[shape] ||= program(gl, VS_DOTS, shape === "square" ? FS_DOTS_SQUARE : shape) : this.dots;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(d.p);
    gl.uniform2f(d.u("v"), f.w, f.h);
    gl.uniform1f(d.u("bE"), f.dpr);
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
    [["E", old.sharp], ["bp", old.near], ["a5", old.far], ["D", nxt.sharp], ["bo", nxt.near], ["a4", nxt.far]].forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(n), i);
    });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u("v"), f.w, f.h);
    gl.uniform2f(u("S"), W, H);
    v4("i", R.old);
    v4("h", R.new || R.old);
    v4("g", R.shape);
    gl.uniform4f(u("I"), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u("aJ"), f.mode);
    gl.uniform1f(u("eu"), f.fade || 0);
    gl.uniform1f(u("M"), R.boxless ? 1 : 0);
    gl.uniform1i(u("et"), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u("e"), s.launched ? 1 : 0);
      gl.uniform1i(u("T"), s.ring ? 1 : 0);
      gl.uniform2f(u("bW"), s.ox, s.oy);
      const fl = {
        c1: s.tilt,
        dX: s.spine,
        N: s.radius,
        bX: s.squash,
        a: s.time,
        dY: s.swell,
        bR: s.energy,
        ez: s.pull,
        k: s.glow,
        af: s.rim,
        aE: s.clear,
        b9: s.hairClear,
        ca: s.hold,
        Q: c.k,
        c0: c.seam,
        fg: c.amplitude,
        dP: c.lensWidth,
        dK: c.aberration,
        aS: c.blur,
        aD: c.blurNear,
        b8: c.blurAhead,
        bL: c.blurBehind,
        s: c.lead,
        U: c.tail,
        es: c.band,
        cZ: c.rimWidth,
        o: c.rimSoftness,
        dk: c.uneven,
        ck: c.hairWidth
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
const float cK=1.5707963; float cP(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float dy(float ag){return fract(sin(ag*127.1)*43758.5453);} float r(vec2 b,vec2 X,vec4 t){ t.xy=(b.x>0.0)?t.xy:t.zw;t.x=(b.y>0.0)?t.x:t.y; vec2 V=abs(b)- X + t.x;return min(max(V.x,V.y),0.0)+ length(max(V,0.0))- t.x; } float cD(vec2 X,vec4 t){ return 4.0*(X.x + X.y)- 2.0*(t.x + t.y + t.z + t.w)+ cK*(t.x + t.y + t.z + t.w); } float em(vec2 b,vec2 X,vec4 t){ float bf=2.0*X.x - t.w - t.y,cR=2.0*X.y - t.y - t.x,ce=2.0*X.x - t.x - t.z,ba=2.0*X.y - t.z - t.w; float en=bf,eo=en + cK*t.y,fF=eo + cR,fG=fF + cK*t.x,fH=fG + ce,fI=fH + cK*t.z,f7=fI + ba; if(b.x>X.x - t.y&&b.y<-X.y + t.y)return en +(clamp(atan(b.y + X.y - t.y,b.x - X.x + t.y),-cK,0.0)+ cK)*t.y; if(b.x>X.x - t.x&&b.y>X.y - t.x)return fF + clamp(atan(b.y - X.y + t.x,b.x - X.x + t.x),0.0,cK)*t.x; if(b.x<-X.x + t.z&&b.y>X.y - t.z)return fH +(clamp(atan(b.y - X.y + t.z,b.x + X.x - t.z),cK,2.0*cK)- cK)*t.z; if(b.x<-X.x + t.w&&b.y<-X.y + t.w){ float O=atan(b.y + X.y - t.w,b.x + X.x - t.w);if(O>0.0)O -=4.0*cK; return f7 +(clamp(O,-2.0*cK,-cK)+ 2.0*cK)*t.w; } float fY=X.x - abs(b.x),fZ=X.y - abs(b.y); if(fZ<fY)return b.y<0.0?clamp(b.x + X.x - t.w,0.0,bf):fG + clamp(X.x - t.x - b.x,0.0,ce); return b.x>0.0?eo + clamp(b.y + X.y - t.y,0.0,cR):fI + clamp(X.y - t.z - b.y,0.0,ba); } float ak(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float dC(vec3 ag){ vec3 F=floor(ag),p=fract(ag);p=p*p*(3.0 - 2.0*p); return mix(mix(mix(ak(F),ak(F + vec3(1,0,0)),p.x),mix(ak(F + vec3(0,1,0)),ak(F + vec3(1,1,0)),p.x),p.y), mix(mix(ak(F + vec3(0,0,1)),ak(F + vec3(1,0,1)),p.x),mix(ak(F + vec3(0,1,1)),ak(F + vec3(1,1,1)),p.x),p.y),p.z); } float dw(vec3 b){float y=0.0,O=0.5;for(int F=0;F<5;F++){y +=O*dC(b);b=b*2.03 + vec3(13.1,7.7,3.3);O*=0.5;}return y/0.96875;} uniform vec3 aT[8];uniform int al; vec3 j(float bn){ float ag=fract(bn)*float(al);int F=min(int(floor(ag)),al - 1);int av=(F + 1)%al; return mix(aT[F],aT[av],smoothstep(0.0,1.0,fract(ag))); } vec3 d(vec3 A){ float au=A.x + 0.3963377774*A.y + 0.2158037573*A.z,a7=A.x - 0.1055613458*A.y - 0.0638541728*A.z,y=A.x - 0.0894841775*A.y - 1.2914855480*A.z; au=au*au*au;a7=a7*a7*a7;y=y*y*y; vec3 bz=clamp(vec3(4.0767416621*au - 3.3077115913*a7 + 0.2309699292*y,-1.2684380046*au + 2.6097574011*a7 - 0.3413193965*y,-0.0041960863*au - 0.7034186147*a7 + 1.7076147010*y),0.0,1.0); return mix(12.92*bz,1.055*pow(bz,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),bz)); } uniform float dZ,a3,bC,dW,bD,bV; vec4 ea(float z,float y,float fk,float ay,float Z,float cO){ if(Z<=0.001||abs(z - bV)>a3*6.0 + bC*3.0)return vec4(0.0); float fN=6.2831853*y/fk,bh=fk/(6.2831853*dW); vec3 V=vec3(cos(fN)*bh,sin(fN)*bh,ay*bD); float ek=dw(V)- 0.5,fa=dw(V*1.9 + vec3(4.1,1.7,ay*bD*0.7))- 0.5; float eN=z - bV,b0=eN + ek*2.4*bC,cx=eN + fa*2.0*bC; float aW=max(dZ,0.6); float cw=exp(-(b0*b0)/(aW*aW))+ 0.55*exp(-(cx*cx)/(aW*aW*0.5)); float bu=0.6*exp(-(b0*b0)/(a3*a3))+ 0.28*exp(-abs(eN)/(a3*2.2)); vec3 an=j(y/fk + ek*0.4 + ay*0.03);an.yz*=1.15; vec3 a8=d(an); vec3 eY=mix(a8,vec3(1.0),0.72 + 0.28*cO); float c7=clamp(bu*Z,0.0,1.0),ds=clamp(cw*Z*(1.0 + cO),0.0,1.0); vec4 m=vec4(a8*c7,c7); return vec4(eY*ds,ds)+ m*(1.0 - ds); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 eB; uniform float bE,a,dQ; uniform vec4 g,I; out vec4 ae;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,eB.y*bE - gl_FragCoord.y)/bE; vec2 a0=g.zw*0.5,A=b -(g.xy + a0); float z=r(A,a0,I); float fk=cD(a0,I),y=em(A,a0,I); vec4 dv=ea(z,y,fk,a,dQ,0.0); ae=vec4(dv.rgb +(cP(gl_FragCoord.xy)- 0.5)/255.0*dv.a,dv.a); }`;
var ELECTRIC_WAVE = `
uniform float cV,bc,aF,df,u,ad,dL,cW,cj; float ai(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float cf(vec3 ag){ vec3 F=floor(ag),p=fract(ag);p=p*p*(3.0 - 2.0*p); return mix(mix(mix(ai(F),ai(F + vec3(1,0,0)),p.x),mix(ai(F + vec3(0,1,0)),ai(F + vec3(1,1,0)),p.x),p.y), mix(mix(ai(F + vec3(0,0,1)),ai(F + vec3(1,0,1)),p.x),mix(ai(F + vec3(0,1,1)),ai(F + vec3(1,1,1)),p.x),p.y),p.z); } float b2(vec3 b,int fA){ float y=0.0,O=0.5,aN=0.0; for(int F=0;F<5;F++){if(F>=fA)break;y +=O*cf(b);aN +=O;b=b*2.03 + vec3(13.1,7.7,3.3);O*=0.5;} return y/aN; } float w(vec2 V,vec2 b){ if(!e)return 0.0; return(b2(vec3(V/bc,a*aF),3)- 0.5)*2.0*cV; } vec3 aI(float bn,float cO){vec3 an=j(bn);an.yz*=1.15;return mix(d(an),vec3(1.0),cO);} vec4 bk(vec3 bN,float O,vec4 m){O=clamp(O,0.0,1.0);return vec4(bN*O,O)+ m*(1.0 - O);} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); if(c<=0.0)return m; float cN=0.7 + 0.3*cf(vec3(a*19.0,3.7,0.0)); float aW=max(df,0.5); if(e&&k>0.001&&abs(f)<ad*3.0 + u*3.0 + cV){ vec3 ag=vec3(P/(bc*0.55),a*aF*1.6); float ek=b2(ag,4)- 0.5,fa=b2(ag*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float b0=f + ek*2.0*ad,cx=f + 0.7*ad + fa*1.8*ad; float cw=exp(-b0*b0/(aW*aW))+ 0.6*exp(-cx*cx/(aW*aW*0.5)); float bu=0.55*exp(-b0*b0/(u*u))+ 0.22*exp(-abs(f)/(u*2.2)); float Z=dL*k*cN*c; float bn=0.55 +(T?atan(P.y,P.x)/ar:P.x*0.004/Q)+ a*0.1; m=bk(aI(bn,0.0),bu*Z,m); m=bk(aI(bn,0.8),cw*Z,m); } if(cW>0.0&&M<0.5&&af>0.0&&z>-(u*2.5 + ad*2.0 + aW*3.0)){ float C=1.0 - smoothstep(-s*0.6,s*0.4,f); float aq=smoothstep(-o,o,f +(N - aE)/a9); float Z=cW*min(af*cj,1.0)*C*aq*cN*c; if(Z>0.001){ float aN=b2(vec3(A/bc,a*aF),4)- 0.5; float ed=z + aW*2.0 + aN*2.0*ad*0.7; float bn=atan(A.y/g.w,A.x/g.z)/ar + a*0.2; m=bk(aI(bn,0.0),(0.5*exp(-ed*ed/(u*u*0.6))+ 0.2*exp(-abs(z)/(u*2.0)))*Z,m); m=bk(aI(bn,0.75),exp(-ed*ed/(aW*aW*0.8))*Z,m); } } return m; }
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
  gl.uniform2f(u("eB"), vw, vh);
  gl.uniform1f(u("bE"), dpr);
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
    gl.uniform4f(u("g"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("I"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("dQ"), it.level * o.intensity);
    const f = { dZ: o.thickness, a3: o.glow, bC: o.chaos, dW: o.scale, bD: o.crackle, bV: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("aT[0]"), it.pal);
    gl.uniform1i(u("al"), it.palN);
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
    cV: c.jag,
    bc: c.scale,
    aF: c.crackle,
    df: c.boltWidth,
    u: c.boltGlow,
    ad: c.chaos,
    dL: c.bolts,
    cW: c.rimBolts,
    cj: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float R,ey,dS,bg,dR,cX,cY,cm; float cQ(vec2 A){return fract(sin(dot(A,vec2(127.1,311.7)))*43758.5453);} float w(vec2 V,vec2 b){return 0.0;} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); if(c<=0.0)return m; vec2 W=floor(b/R),bi=(W + 0.5)*R,cA=fract(b/R)*R; float as=ey*0.5; float dG=step(as,cA.x)*step(cA.x,R - as)*step(as,cA.y)*step(cA.y,R - as); vec2 a0=g.zw*0.5; float eG=r(bi -(g.xy + a0),a0,I); if(eG>0.0)return m; float dJ=floor(a*dR); float at=cQ(W + vec2(dJ*0.371,dJ*0.137)),aL=cQ(W*1.731 + 3.1); aX aQ=aj(bi); float n=max(s*dS,R*3.0); vec3 dB=d(j(0.5 + W.x*0.021 + W.y*0.013 + a*0.2)); if(e&&k>0.001){ if(aQ.d<n&&aQ.d>-n*1.8){ bool ef=aQ.d +(aL - 0.5)*R*3.0>0.0; vec4 a7=ef?B(E,i,bi,bi):B(D,h,bi,bi); float aW=(1.0 - smoothstep(n*0.25,n,abs(aQ.d)))*smoothstep(0.0,0.3,k); float fb=step(1.0 - bg*(0.35 + 0.65*aW),at)*cX*min(k*1.5,1.0); vec4 aw=mix(a7,vec4(dB,1.0),fb); aw=vec4(aw.rgb*mix(0.55,1.0,dG),aw.a); m=mix(m,aw,aW*c); }else if(aQ.d<=-n*1.8&&aQ.d>-U*1.3){ float f8=1.0 - clamp(-aQ.d/(U*1.3),0.0,1.0); float fb=step(1.0 - bg*0.3*f8,at)*cX*k; m=mix(m,vec4(dB,1.0),fb*dG*c); } } if(cY>0.0&&M<0.5&&af>0.0&&eG>-R*1.2){ float C=1.0 - smoothstep(-s*0.6,s*0.4,aQ.d); float aq=smoothstep(-o,o,aQ.d +(N - aE)/aQ.g); float Z=cY*min(af*cm,1.0)*C*aq; m=mix(m,vec4(dB,1.0),step(at,Z)*dG*c); } return m; }
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
    R: c.cell,
    ey: c.gap,
    dS: c.zone,
    bg: c.density,
    dR: c.rate,
    cX: c.lit,
    cY: c.rimPixels,
    cm: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dU,dT,dj,di,dV; float w(vec2 V,vec2 b){return 0.0;} vec4 cE(vec2 b,vec2 x,float aK){return mix(B(D,h,b,x),B(E,i,b,x),smoothstep(-1.5,1.5,aK));} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float at=dj*0.5,ag=(f + at)/at; if(c<=0.0||!e||k<0.001||abs(ag)>=1.0)return m; vec2 aN=aj(b).n; float y=sqrt(1.0 - ag*ag),dr=ag/max(y,0.3),Z=min(k*1.5,1.0); vec2 cy=aN*(dU*dr*Z),dv=aN*(dT*dr*Z); float b1=f - dot(cy,aN); vec4 t=cE(b,b - cy - dv,b1 - dot(dv,aN)),as=cE(b,b - cy,b1),X=cE(b,b - cy + dv,b1 + dot(dv,aN)); vec4 bv=vec4(t.r,as.g,X.b,max(max(t.a,as.a),X.a)); bv +=m*(1.0 - bv.a); float ah=(T?atan(P.y,P.x)/ar:P.x*0.003/Q)+ a*0.08; vec3 bB=d(j(ah + ag*0.15)); bv.rgb=mix(bv.rgb,bv.rgb*bB,dV*y); float dH=exp(-pow((ag + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(ah*40.0 + a*2.0))+ 0.45*exp(-pow((ag - 0.55)/0.08,2.0)); float eT=pow(1.0 - y,3.0); float f4=clamp((dH + eT*0.8)*di,0.0,1.0)*bv.a; bv=vec4(mix(bv.rgb,mix(bB,vec3(1.0),0.75)*bv.a,f4),bv.a); return mix(m,bv,smoothstep(1.0,0.85,abs(ag))*Z*c); }
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
  uniforms: (c) => ({ dU: c.refraction, dT: c.dispersion, dj: c.thickness, di: c.shine, dV: c.tint })
});

// src/effects/burn.js
var BURN_WAVE = `
uniform float dd,bQ,ci,a2,bP,de; float aH(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float cd(vec2 b){ vec2 F=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(aH(F),aH(F + vec2(1,0)),p.x),mix(aH(F + vec2(0,1)),aH(F + vec2(1,1)),p.x),p.y); } float eI(vec2 b){float y=0.0,O=0.5;for(int F=0;F<4;F++){y +=O*cd(b);b=b*2.07 + vec2(5.3,1.7);O*=0.5;}return y/0.9375;} float w(vec2 V,vec2 b){ if(!e)return 0.0; return(eI(b/bQ + vec2(0.0,a*0.12))- 0.5)*2.0*dd; } vec3 aP(float ay){return vec3(smoothstep(0.0,0.45,ay),smoothstep(0.3,0.8,ay),smoothstep(0.65,1.0,ay));} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); if(c<=0.0||!e||k<0.001)return m; float Z=min(k*1.5,1.0),aN=cd(b/(bQ*0.18)+ a*0.7); if(f>0.0&&f<ci){ float fp=pow(1.0 - f/ci,1.6)*(0.75 + 0.5*aN); m.rgb=mix(m.rgb,m.rgb*vec3(0.55,0.32,0.16),clamp(fp*1.6,0.0,1.0)*Z); m.rgb*=1.0 - smoothstep(0.45,0.95,fp)*0.92*Z; } if(f<0.0)m.rgb*=1.0 - de*0.7*exp(f/(a2*2.5))*(0.6 + 0.4*aN)*Z; float dv=exp(-pow(f/a2,2.0))*(0.7 + 0.6*aN); float ay=clamp(dv,0.0,1.0); vec3 f2=mix(aP(ay),d(j(0.3 + aN*0.4 + a*0.1)),0.3*(1.0 - ay)); float c7=clamp(exp(-abs(f)/(a2*2.2))*0.6*(0.6 + 0.4*aN)*Z,0.0,1.0)*c; m=vec4(aP(0.42)*c7,c7*0.5)+ m*(1.0 - c7*0.5); float O=clamp(smoothstep(0.08,0.6,dv)*Z,0.0,1.0)*c; m=vec4(f2*O,O)+ m*(1.0 - O); if(bP>0.0&&f<a2&&f>-U){ float L=9.0*Q + 4.0; vec2 as=(b + vec2(0.0,a*38.0*Q))/L,W=floor(as),p=fract(as)- 0.5; float at=aH(W),aL=aH(W + 7.3); vec2 bM=(vec2(at,aL)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + at*9.0),0.0); float aK=length(p - bM)*L,t=0.8 + 1.5*aL; float e7=step(1.0 - bP*0.45*(1.0 - clamp(-f/U,0.0,1.0)),at); float cG=0.6 + 0.4*sin(a*12.0 + at*40.0); float cz=clamp(exp(-aK*aK/(t*t))*e7*cG*Z,0.0,1.0)*c; m=vec4(aP(0.45 + 0.3*aL)*cz,cz)+ m*(1.0 - cz); } return m; }
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
  uniforms: (c) => ({ dd: c.roughness, bQ: c.scale, ci: c.char, a2: c.heat, bP: c.embers, de: c.smoke })
});

// src/effects/ink.js
var INK_WAVE = `
uniform float bT,bU,bF,dg,dO,ew; float bm(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bw(vec2 b){ vec2 F=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bm(F),bm(F + vec2(1,0)),p.x),mix(bm(F + vec2(0,1)),bm(F + vec2(1,1)),p.x),p.y); } float eZ(vec2 b){float y=0.0,O=0.5;for(int F=0;F<4;F++){y +=O*bw(b);b=b*2.11 + vec2(3.1,8.7);O*=0.5;}return y/0.9375;} float w(vec2 V,vec2 b){ if(!e)return 0.0; return(eZ(b/bU + a*0.04)- 0.5)*2.0*bT +(bw(b/(bU*0.12))- 0.5)*bT*0.35; } vec4 dA(vec2 b,float aK){return mix(B(D,h,b,b),B(E,i,b,b),step(0.0,aK));} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float n=max(s*dO,24.0*Q); if(c<=0.0||!e||k<0.001||f>n||f<-n*1.6)return m; float Z=min(k*1.5,1.0); vec2 aN=aj(b).n,bM=vec2(bF,bF*0.55); vec4 O=dA(b + bM,f + dot(bM,aN)),X=dA(b - bM,f - dot(bM,aN)); float aZ=mix(0.5,0.25 + 0.3*cP(floor(b*1.2))+ 0.2*bw(b*0.5),dg); vec3 ds=O.a>0.0?O.rgb/O.a:vec3(1.0),fX=X.a>0.0?X.rgb/X.a:vec3(1.0); float eL=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - ds.g)*1.05); float eM=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - fX.r)*1.05); vec3 e0=d(aT[0]),e1=d(aT[1%al]); vec3 el=vec3(0.965,0.945,0.9); vec3 l=el*mix(vec3(1.0),e0,eL*0.95)*mix(vec3(1.0),e1,eM*0.85); float fd=(1.0 - smoothstep(0.0,ew,-f))*step(f,0.0)*smoothstep(0.15,0.55,aZ + 0.25); vec3 e2=d(j((T?atan(P.y,P.x)/ar:P.x*0.002/Q)+ a*0.05)); l*=mix(vec3(1.0),e2,fd*0.9); float dn=max(max(O.a,X.a),m.a); float aW=(1.0 - smoothstep(n*0.35,n,f>0.0?f:-f/1.6))*Z*c; return mix(m,vec4(l*dn,dn),aW); }
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
  uniforms: (c) => ({ bT: c.bleed, bU: c.scale, bF: c.misregister, dg: c.grain, dO: c.zone, ew: c.ink })
});

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aG,bS,dN,dM,ev; float w(vec2 V,vec2 b){return 0.0;} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float n=max(s*dN,aG*3.0); if(c<=0.0||!e||k<0.001||f>n*1.2||f<-n*2.0)return m; vec2 as=bO(bS)*b/aG,W=floor(as)+ 0.5,bi=bO(-bS)*(W*aG); float dt=aj(bi).d; vec4 a7=dt>0.0?B(E,i,bi,bi):B(D,h,bi,bi); if(a7.a<0.01)a7=dt>0.0?B(E,i,b,b):B(D,h,b,b); vec3 l=a7.rgb/max(a7.a,1e-3); float au=dot(l,vec3(0.299,0.587,0.114)); float aW=1.0 - smoothstep(n*0.1,n,dt>0.0?dt:-dt/1.6),Z=min(k*1.5,1.0); bool cC=au>0.5; float t=aG*0.5*dM*sqrt(clamp((cC?1.0 - au:au)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aW); float aK=length((fract(as)- 0.5)*aG),K=v.x/S.x; float G=clamp((t - aK)/K + 0.5,0.0,1.0); vec3 fw=d(j(W.x*0.021 + W.y*0.034 + a*0.15)); vec3 eQ=mix(cC?l*0.2:l,fw,ev*aW*aW),fs=cC?mix(l,vec3(1.0),0.4):l*0.14; vec4 at=vec4(mix(fs,eQ,G)*a7.a,a7.a); return mix(m,at,smoothstep(0.0,0.35,aW)*Z*c); }
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
  uniforms: (c) => ({ aG: c.cell, bS: c.angle, dN: c.zone, dM: c.size, ev: c.ink })
});

// src/effects/metal.js
var METAL_WAVE = `
uniform float bd,ex,cH,dh,cl; float w(vec2 V,vec2 b){ if(!e)return 0.0; float y=T?atan(V.y,V.x)*2.0:V.x/(80.0*Q); return ex*(0.6*sin(y*1.3 + a*2.1)+ 0.4*sin(y*2.9 - a*2.7 + 1.3)); } vec3 e9(vec3 t,float bn){ float f9=-t.y; vec3 fM=mix(vec3(0.62,0.66,0.74),d(j(bn)),0.35); vec3 A=mix(vec3(0.05,0.055,0.07),fM,smoothstep(-0.25,0.35,f9)); A +=vec3(1.0)*exp(-pow((f9 - 0.05)/0.07,2.0))*0.9; A +=vec3(0.9)*exp(-pow((f9 - 0.75)/0.12,2.0))*0.5; return A; } vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float at=bd*0.5,ag=(f + at*0.9)/at; if(c<=0.0||!e||k<0.001||abs(ag)>=1.0)return m; vec2 aN=aj(b).n; float Z=min(k*1.5,1.0),y=sqrt(1.0 - ag*ag); float fJ=T?atan(P.y,P.x)*9.0:P.x*0.07/Q; float fD=0.6*sin(fJ + a*3.0)+ 0.4*sin(fJ*2.3 - a*2.1 + ag*2.0); vec3 ga=normalize(vec3(aN*ag + vec2(-aN.y,aN.x)*fD*cH*0.3,y)); vec3 bh=reflect(vec3(0.0,0.0,-1.0),ga); float ah=(T?atan(P.y,P.x)/ar:P.x*0.002/Q)+ a*0.05; vec3 l=e9(bh,ah); vec2 x=b + bh.xy*bd*0.6; vec4 a7=mix(B(D,h,b,x),B(E,i,b,x),step(0.0,f + dot(bh.xy,aN)*bd*0.6)); l=mix(l,a7.rgb/max(a7.a,1e-3),cl*a7.a*(0.4 + 0.6*y)); vec3 ax=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(ga,ax),0.0),60.0)*dh*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,y)); float O=smoothstep(1.0,0.86,abs(ag))*Z*c; return vec4(clamp(l,0.0,1.0)*O,O)+ m*(1.0 - O); }
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
  uniforms: (c) => ({ bd: c.thickness, ex: c.wobble, cH: c.ripple, dh: c.shine, cl: c.reflect })
});

// src/effects/water.js
var WATER_WAVE = `
uniform float aa,d4,d2,d3,d5; float br(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bK(vec2 b){ vec2 F=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(br(F),br(F + vec2(1,0)),p.x),mix(br(F + vec2(0,1)),br(F + vec2(1,1)),p.x),p.y); } float w(vec2 V,vec2 b){ if(!e)return 0.0; return(bK(b/(aa*2.5)+ a*0.3)- 0.5)*aa*0.5; } vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); if(c<=0.0||!e||k<0.001||f>aa*1.5||f<-U*1.6)return m; vec2 aN=aj(b).n; float Z=min(k*1.5,1.0); float cg=f>0.0?exp(-f/(aa*0.35)):exp(f/(U*0.8)); float c9=ar*f/aa + a*7.0; vec2 dm=b/aa; vec2 cT=vec2(sin(dm.y*1.7 + a*1.6)+ sin(dm.x*1.1 - a*1.2 + dm.y*0.6), cos(dm.x*1.9 - a*1.4)+ cos(dm.y*1.2 + a*1.1 + dm.x*0.7))*0.3; vec2 cy=(aN*cos(c9)+ cT)*d4*cg*Z; vec2 x=b - cy; float b1=f + dot(cy,aN); vec4 y=mix(B(D,h,b,x),B(E,i,b,x),smoothstep(-1.5,1.5,b1)); y +=m*(1.0 - y.a); vec3 bB=d(j(0.4 + f*0.0015/Q + a*0.04)); vec3 bN=mix(y.rgb,y.rgb*bB*1.15,d5*cg); vec2 ec=b/(aa*0.45)+ cT*2.0; float cr=sin(ec.x + sin(ec.y*1.3 + a*1.5))+ sin(ec.y*1.1 + sin(ec.x*0.9 - a*1.7)); float eK=pow(clamp(1.0 - abs(cr)*0.7,0.0,1.0),5.0); bN +=(eK*d2*0.4 + smoothstep(0.8,1.0,sin(c9 + 0.9))*0.22*cg)*cg*y.a*mix(bB,vec3(1.0),0.5); float f0=bK(b/5.0 + vec2(a*2.0,0.0))*0.6 + bK(b/13.0 - a)*0.4; float eS=smoothstep(0.35,0.7,f0 + 0.45 - abs(f + aa*0.15)/max(aa*0.35,1.0))*d3; bN=mix(bN,vec3(0.97,0.99,1.0)*y.a,clamp(eS,0.0,1.0)); return mix(m,vec4(bN,y.a),clamp(cg*3.0,0.0,1.0)*Z*c); }
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
  uniforms: (c) => ({ aa: c.wavelength, d4: c.refraction, d2: c.caustics, d3: c.foam, d5: c.tint })
});

// src/effects/vine.js
var VINE_WAVE = `
uniform float q,d1,cn,co,ao,d0,cb; float ab(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float c3(float ay,float ax){return ax*0.29*pow(max(sin(3.14159*pow(clamp(ay,0.0,1.0),0.72)),0.0),0.62);} float bJ(vec2 aM,float ax){return max(abs(aM.x)- c3(aM.y/ax,ax),max(-aM.y,aM.y - ax));} vec3 d7(float at){return d(j(at));} vec4 c4(vec2 aM,float ax,float at,float bt,float K){ float aK=bJ(aM,ax); float eF=max(abs(aM.x)- max(ax*0.016,K*0.45),max(aM.y - ax*0.1,-aM.y - ax*0.14)); float G=clamp(0.5 - min(aK,eF)/K,0.0,1.0); if(G<=0.0)return vec4(0.0); float ay=clamp(aM.y/ax,0.0,1.0),aW=max(c3(ay,ax),1e-3),cJ=clamp(aM.x/aW,-1.0,1.0); vec3 a8=d7(at),l=a8; l*=0.86 + 0.2*bt*smoothstep(-0.3,0.3,cJ); l*=1.0 - 0.22*cJ*cJ; l*=0.9 + 0.2*ay; float du=smoothstep(14.0,34.0,ax/K); float fC=(1.0 - smoothstep(K*0.4,K*0.4 + ax*0.018,abs(aM.x)))*(1.0 - 0.7*ay); float bn=ay*6.5 - abs(cJ)*1.6,fR=K*6.5/ax; float fi=(1.0 - smoothstep(fR*0.4,fR*1.4,abs(fract(bn + 0.5)- 0.5)))*smoothstep(0.08,0.25,abs(cJ))*(1.0 - smoothstep(0.7,0.95,abs(cJ)))*(1.0 - ay*0.6); vec3 eh=mix(a8,vec3(0.85,0.92,0.55),0.45); l=mix(l,eh,max(fC*0.8,fi*0.35*du)); l*=0.68 + 0.32*smoothstep(0.0,max(K*1.5,ax*0.035),-aK); l +=vec3(0.07,0.08,0.04)*smoothstep(0.55,0.0,length(vec2(cJ + 0.4*bt,(ay - 0.45)*2.2))); if(eF<aK)l=mix(a8,vec3(0.32,0.36,0.16),0.5)*0.8; return vec4(l*G,G); } vec4 cs(vec2 b,vec2 bZ,float ax,float O,float bt,float at,float K){ mat2 bh=bO(O);float fr=max(abs(bt),0.18); vec2 aM=bh*(b - bZ);aM.x/=fr;aM.y +=ax*0.5; vec4 au=c4(aM,ax,at,sign(bt),K); vec2 x=bh*(b - bZ - vec2(0.05,0.09)*ax);x.x/=fr;x.y +=ax*0.5; float dE=clamp(0.5 - bJ(x,ax)/(K + ax*0.07),0.0,1.0)*0.3; return au + vec4(0.0,0.0,0.0,dE)*(1.0 - au.a); } vec4 bq(vec4 m,vec4 au,float Z){au*=Z;return au + m*(1.0 - au.a);} vec4 bI(vec2 b,float f,vec2 aN,float L,float n,float K,float aR){ vec2 as=b/L,X=floor(as - 0.5); vec4 au[4];float eC[4]; for(int av=0;av<4;av++){ vec2 W=X + vec2(float(av&1),float(av>>1))+ aR; float at=ab(W),aL=ab(W + 4.7),b3=ab(W + 9.1); vec2 bZ=(W - aR + 0.5 +(vec2(aL,b3)- 0.5)*0.5)*L; float aQ=f + dot(aN,bZ - b); float eO=aQ>0.0?1.0 - aQ/(n*0.35):1.0 - smoothstep(n*0.15,n*1.5,-aQ); float eV=clamp(1.0 - aQ/(n*0.35),0.0,1.0); eC[av]=b3; au[av]=at<eO*0.9?cs(b,bZ,L*(0.95 + 0.45*b3)*(0.45 + 0.55*eV),at*ar,0.75 + 0.25*aL,aL*0.85,K):vec4(0.0); } for(int F=0;F<3;F++)for(int av=0;av<3 - F;av++)if(eC[av]>eC[av + 1]){float ay=eC[av];eC[av]=eC[av + 1];eC[av + 1]=ay;vec4 cr=au[av];au[av]=au[av + 1];au[av + 1]=cr;} vec4 J=vec4(0.0); for(int av=0;av<4;av++)J=au[av]+ J*(1.0 - au[av].a); return J; } float w(vec2 V,vec2 b){ if(!e)return 0.0; float y=(T?atan(V.y,V.x)*40.0*Q:V.x)/max(q*1.6,1.0); return d0*(abs(sin(y + a*0.6))*0.7 + abs(sin(y*2.3 - a*0.4 + 1.7))*0.3); } vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float aw=S.x/v.x,K=1.0/aw; float c=clamp(0.5 - z*aw,0.0,1.0); if(!e||k<0.001)return m; float Z=min(k*1.5,1.0),n=max(s*d1,q*3.0); if(c>0.0){ vec2 aN=aj(b).n; if(f<n*0.35 + q&&f>-n*1.5 - q){ m=bq(m,bI(b,f,aN,q*0.95,n,K,0.0),Z*c); m=bq(m,bI(b + q*0.41,f,aN,q*0.8,n*0.8,K,17.0),Z*c); } if(cn>0.0&&f<-n*0.2&&f>-U*1.4){ float ay=a,L=q*2.2; vec2 V=b - vec2(0.0,ay*46.0*Q); vec2 W=floor(V/L); float at=ab(W + 31.0),aL=ab(W + 2.3),b3=ab(W + 5.9); float ba=1.0 - clamp(-f/(U*1.4),0.0,1.0); if(at<cn*0.32*ba){ float c9=ay*(1.6 + aL)+ at*ar; vec2 bZ=(W + 0.5)*L + vec2(sin(c9)*L*0.2,ay*46.0*Q); float ax=q*(0.75 + 0.3*b3); m=bq(m,cs(b,bZ,ax,at*ar + sin(c9)*0.9,cos(c9*1.3),mix(aL*0.8,0.98,0.35*b3),K),Z*c); } } } if(co>0.0&&M<0.5&&af>0.0&&z>-ao*6.0 - q*1.6){ float C=1.0 - smoothstep(-s*0.6,s*0.4,f); float aq=smoothstep(-o,o,f +(N - aE)/a9); float b5=co*min(af*cb,1.0)*C*aq*c; if(b5>0.001){ float dD=2.0*(g.z + g.w),y=(atan(A.y/g.w,A.x/g.z)/ar + 0.5)*dD; float fj=ao*(0.85 + 0.3*sin(y/(q*2.7))); float fO=sin(y/(q*1.3))*ao*1.4 + sin(y/(q*0.55)+ 1.3)*ao*0.4; float aK=z + ao*2.5 + fO; float cx=aK + sin(y/(q*0.35))*fj*1.1; vec4 J=vec4(0.0); for(int av=0;av<2;av++){ float b1=av==0?cx:aK,fS=av==0?fj*0.32:fj*0.5; float fq=clamp(fS - abs(b1)*1.0 + 0.5*K,0.0,K)/K; float bn=clamp(b1/max(fS,1e-3),-1.0,1.0); vec3 fL=vec3(0.24,0.33,0.13)*(0.55 + 0.55*sqrt(1.0 - bn*bn))+ vec3(0.05,0.05,0.02)*smoothstep(0.2,-0.6,bn); fL*=0.9 + 0.1*sin(y*1.7 + b1); vec4 db=vec4(fL*fq,fq); J=db + J*(1.0 - db.a); } float dE=clamp(1.0 - abs(aK - fj*0.9)/(fj*1.4 + K),0.0,1.0)*0.25; J=J + vec4(0.0,0.0,0.0,dE)*(1.0 - J.a); float cS=q*1.15,p=y/cS,f3=floor(p); for(int av=0;av<2;av++){ float F=f3 +(av==0?(fract(p)<0.5?-1.0:1.0):0.0); float dz=ab(vec2(F,3.0)); if(dz<0.12)continue; float dF=mod(F,2.0)*2.0 - 1.0; vec2 V=vec2(y -(F + 0.5)*cS,aK); float ax=q*(0.7 + 0.35*ab(vec2(F,1.0))); float O=-0.55*dF - 0.25*(dz - 0.5); vec2 e8=bO(O)*vec2(V.x,-V.y); e8.y -=fj*0.4; vec4 eg=c4(e8,ax,ab(vec2(F,2.0))*0.85,dF,K); vec2 dG=e8 - vec2(0.04,-0.07)*ax; float f5=clamp(0.5 - bJ(dG,ax)/(K + ax*0.07),0.0,1.0)*0.28; eg=eg + vec4(0.0,0.0,0.0,f5)*(1.0 - eg.a); J=J + eg*(1.0 - J.a); } m=bq(m,J,b5); } } return m; }
`;
var VINE_DOTS = `#version 300 es
precision highp float;in float aV;in float a6;in float aO;out vec4 m; void main(){ float O=aV*7.0 + a6*2.0,A=cos(O),y=sin(O),p=max(abs(cos(aV*9.0 + a6)),0.25); vec2 b=mat2(A,y,-y,A)*(gl_PointCoord - 0.5)*aO; float ax=a6*2.6,ay=b.y/ax + 0.5; b.x/=p; float aW=ax*0.29*pow(max(sin(3.14159*pow(clamp(ay,0.0,1.0),0.72)),0.0),0.62); float aK=max(abs(b.x)- aW,max(-ay,ay - 1.0)*ax); float G=clamp(0.5 - aK,0.0,1.0)*aV; vec3 as=mix(vec3(0.24,0.5,0.2),vec3(0.5,0.72,0.28),fract(a6*3.7)); as*=0.8 + 0.3*step(0.0,b.x*sign(cos(aV*9.0 + a6))); as=mix(as,vec3(0.8,0.88,0.55),(1.0 - smoothstep(0.3,0.9,abs(b.x)))*0.5); m=vec4(as*G,G); }`;
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
    q: c.leaf,
    d1: c.zone,
    cn: c.fall,
    co: c.vine,
    ao: c.vineWidth,
    d0: c.bumps,
    cb: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/christmas.js
var XMAS_WAVE = `
uniform float cp,bH,cq,dl,aU,be,c2,bY,d6; float am(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} vec4 ac(vec4 m,vec4 au,float Z){au*=Z;return au + m*(1.0 - au.a);} float w(vec2 V,vec2 b){return 0.0;} vec4 cc(vec2 b,float L,float er,float t,float e4,float K,float aR){ float ay=a; vec2 V=b - vec2(sin(ay*0.7 + aR)*L*0.4,ay*er); vec2 W=floor(V/L); float at=am(W + aR),aL=am(W + aR + 3.1),b3=am(W + aR + 7.7); if(at>e4)return vec4(0.0); vec2 bZ=(W + 0.2 + 0.6*vec2(aL,b3))*L + vec2(sin(ay*(1.0 + aL)+ at*6.28)*L*0.15,0.0); float fE=t*(0.6 + 0.6*b3),aK=length(V - bZ); float O=(1.0 - smoothstep(fE*0.35,fE + K,aK))*(0.75 + 0.25*aL); return vec4(vec3(0.97,0.98,1.0)*O,O); } vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float aw=S.x/v.x,K=1.0/aw; float c=clamp(0.5 - z*aw,0.0,1.0); if(!e||k<0.001)return m; float Z=min(k*1.5,1.0)*c,ay=a; if(c>0.0){ if(bY>0.0&&f>0.0&&f<s*1.2){ float p=exp(-f/max(s*0.35,1.0))*bY; m.rgb=mix(m.rgb,vec3(0.86,0.93,1.0)*m.a + vec3(0.0),p*0.45); vec2 as=floor(b/7.0),eU=b -(as + 0.5)*7.0; float f1=am(as),cG=max(sin(ay*7.0 + am(as + 1.3)*40.0),0.0); float fe=max(1.0 - abs(eU.x)*abs(eU.y)*0.9 - length(eU)*0.28,0.0); m +=vec4(vec3(1.0),1.0)*step(0.93,f1)*cG*fe*p*Z; } if(cq>0.0&&f<0.0&&f>-U*1.5){ float ba=(1.0 - clamp(-f/(U*1.5),0.0,1.0))*smoothstep(0.0,cp*3.0,-f); float c6=dl,e5=min(cq,2.0)*ba; m=ac(m,cc(b,c6*9.0,26.0*Q,c6*0.7,0.55*e5,K,0.0),Z); m=ac(m,cc(b,c6*6.5,40.0*Q,c6,0.5*e5,K,11.0),Z); m=ac(m,cc(b,c6*11.0,62.0*Q,c6*1.5,0.35*e5,K,23.0),Z); } float bh=cp,ag=f + bh*0.4; float dE=(1.0 - smoothstep(bh*0.6,bh*2.2,abs(ag + bh*1.1)))*0.3; m=ac(m,vec4(0.0,0.0,0.0,dE),Z); float G=clamp((bh - abs(ag))*aw + 0.5,0.0,1.0); if(G>0.0){ float bn=clamp(ag/bh,-1.0,1.0),eC=sqrt(1.0 - bn*bn); float y=T?atan(P.y,P.x)*N:P.x; float cr=(y + asin(bn)*bh*1.3)/bH; float dc=K/bH*1.5; float fB=smoothstep(0.5 - dc,0.5 + dc,fract(cr))- smoothstep(1.0 - dc,1.0,fract(cr))+(1.0 - smoothstep(0.0,dc,fract(cr))); float ff=smoothstep(0.18 - dc,0.18,fract(cr))- smoothstep(0.26,0.26 + dc,fract(cr)); vec3 l=mix(vec3(0.97,0.96,0.94),vec3(0.8,0.06,0.12),clamp(fB,0.0,1.0)); l=mix(l,vec3(0.12,0.5,0.22),clamp(ff,0.0,1.0)); l*=0.45 + 0.6*eC; l +=vec3(1.0)*pow(max(1.0 - abs(bn + 0.45)*3.0,0.0),3.0)*0.55; m=ac(m,vec4(l*G,G),Z); } } if(M<0.5&&af>0.0&&c>0.0){ float C=1.0 - smoothstep(-s*0.6,s*0.4,f); float aq=smoothstep(-o,o,f +(N - aE)/a9); float b5=min(af*d6,1.0)*C*aq*c; if(b5>0.001){ if(c2>0.0){ float bf=A.y + g.w*0.5,eH=c2; float at=eH*(0.7 + 0.2*sin(A.x/(eH*1.9))+ 0.12*sin(A.x/(eH*0.7)+ 1.3)); if(bf<eH*3.0){ float cv=clamp((at - bf)*aw + 0.5,0.0,1.0); float db=eH*1.3,e3=floor(A.x/db),fy=A.x -(e3 + 0.5)*db; float ch=eH*(0.4 + 1.4*am(vec2(e3,5.0)))*step(0.35,am(vec2(e3,8.0))); float fT=bf - at*0.85,fP=db*0.16*(1.0 - fT/max(ch,1e-3)); float fu=fT>0.0&&ch>0.0?clamp((fP - abs(fy))*aw + 0.5,0.0,1.0):0.0; vec3 fv=mix(vec3(0.75,0.88,1.0),vec3(1.0),0.5 + 0.5*sin(fy/max(fP,1e-3)*1.5)); m=ac(m,vec4(fv*fu*0.8,fu*0.8),b5); vec3 fc=mix(vec3(0.74,0.83,0.95),vec3(1.0),smoothstep(0.0,at*0.8,at - bf)); float ep=clamp((at + eH*0.35 - bf)*aw,0.0,1.0)*(1.0 - cv)*0.25; m=ac(m,vec4(0.0,0.0,0.0,ep),b5); m=ac(m,vec4(fc*cv,cv),b5); } } if(aU>0.0){ float c5=be*0.24,ap=c5*1.0 + 1.0; float dD=2.0*(g.z + g.w),y=(atan(A.y/g.w,A.x/g.z)/6.28318 + 0.5)*dD; float p=y/be,cA=fract(p),fK=c5*0.9*4.0*cA*(1.0 - cA); float aK=z + ap + fK; if(aK>-c5*4.5){ float d8=clamp((0.7 - abs(aK))*aw + 0.5,0.0,1.0)*0.9; vec4 J=vec4(vec3(0.07,0.2,0.1)*d8,d8); float F=floor(p + 0.5),dn=(p - F)*be; float fl=-(z + ap); float dz=am(vec2(F,2.0)),cG=0.55 + 0.45*sin(ay*(2.0 + 2.0*dz)+ dz*40.0); float cv=mod(F,4.0); vec3 fn=cv<1.0?vec3(1.0,0.16,0.14):cv<2.0?vec3(1.0,0.75,0.2):cv<3.0?vec3(0.2,0.85,0.35):vec3(0.3,0.55,1.0); vec2 eb=vec2(dn,fl - c5*1.05); float fV=length(eb/vec2(c5*0.42,c5*0.7))- 1.0; float dq=clamp(-fV*c5*0.5*aw + 0.5,0.0,1.0); float cF=clamp((c5*0.22 - abs(dn))*aw + 0.5,0.0,1.0)*clamp((c5*0.4 - abs(fl - c5*0.25))*aw + 0.5,0.0,1.0); vec3 eJ=fn*(0.35 + 0.75*cG)+ vec3(1.0)*pow(max(1.0 - length(eb/c5 - vec2(-0.12,-0.2))*2.2,0.0),2.0)*0.8*cG; vec4 fo=vec4(eJ*dq,dq); J=fo + J*(1.0 - fo.a); J=vec4(vec3(0.1,0.25,0.12)*cF,cF)+ J*(1.0 - cF); float bu=exp(-dot(eb,eb)/(c5*c5*2.2))*cG*0.75; m=ac(m,J,b5*aU); m +=vec4(fn*bu,0.0)*b5*min(aU,1.0); } } } } return m; }
`;
var XMAS_DOTS = `#version 300 es
precision highp float;in float aV;in float a6;in float aO;out vec4 m; void main(){ vec2 b=(gl_PointCoord - 0.5)*aO; float O=atan(b.y,b.x)+ aV*2.0 + a6,t=length(b),bh=a6*1.5; float y=mod(O,1.0471976)- 0.5235988; vec2 V=vec2(cos(y),sin(y))*t; float fm=abs(V.y); vec2 X=vec2(V.x - bh*0.55,abs(V.y)); float fW=abs(dot(X,vec2(-0.5,0.866))); float aK=min(fm,(V.x>bh*0.55&&V.x<bh*0.85)?fW:1e3); float G=clamp(0.9 - aK,0.0,1.0)*step(t,bh)+ clamp(bh*0.18 - t + 0.5,0.0,1.0); G=clamp(G,0.0,1.0)*aV; m=vec4(vec3(0.92,0.96,1.0)*G,G); }`;
var PRESET10 = { palette: ["#C8102E", "#F4F1EA", "#1E7B3C", "#E8B84A"], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
var CHRISTMAS = {
  cane: 7,
  // radius of the candy cane on the front
  stripe: 16,
  // width of its stripes
  snow: 1,
  // snowfall behind the front (0 = none)
  flake: 3,
  // size of a snowflake
  lights: 1,
  // the string of lights on the outline (0 = none)
  bulbs: 30,
  // distance between two bulbs
  cap: 11,
  // snow on the top edge, with icicles (0 = none)
  frost: 0.6
  // frost and glints ahead of the front
};
var clamp10 = (x, a, b) => Math.min(Math.max(x, a), b);
var christmas = Object.freeze({
  name: "christmas",
  preset: Object.freeze({ ...PRESET10 }),
  tune(c, o) {
    const k = c.k, s = clamp10(Math.sqrt(k), 0.55, 1.4);
    const v = (key) => o[key] ?? CHRISTMAS[key];
    c.cane = Math.max(v("cane") * s, 2);
    c.stripe = Math.max(v("stripe") * s, 3);
    c.snow = clamp10(v("snow"), 0, 3);
    c.flake = Math.max(v("flake") * s, 1);
    c.lights = Math.max(v("lights"), 0);
    c.bulbs = Math.max(v("bulbs") * s, 10);
    c.cap = Math.max(v("cap") * s, 0);
    c.frost = Math.max(v("frost"), 0);
  },
  shader: Object.freeze({ key: "christmas", chunk: XMAS_WAVE, dots: XMAS_DOTS }),
  uniforms: (c) => ({
    cp: c.cane,
    bH: c.stripe,
    cq: c.snow,
    dl: c.flake,
    aU: c.lights,
    be: c.bulbs,
    c2: c.cap,
    bY: c.frost,
    d6: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  BORDER,
  BURN,
  CHRISTMAS,
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
  christmas,
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
