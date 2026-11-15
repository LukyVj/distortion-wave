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
out vec2 cs; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));cs=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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
precision highp float;in vec2 cs;uniform sampler2D cI;uniform float fg;out vec4 m; void main(){m=textureLod(cI,cs,fg);}`;
var FS_BLUR = `#version 300 es
precision highp float;in vec2 cs;uniform sampler2D cI;uniform vec2 ez;uniform float bF;out vec4 m; void main(){ float bg=min(ceil(bF*3.0),32.0);vec4 G=vec4(0.0);float fP=0.0; for(int C=-32;C<=32;C++){float ed=float(C);if(abs(ed)>bg)continue; float aW=exp(-0.5*ed*ed/(bF*bF));G +=textureLod(cI,cs + ez*ed,0.0)*aW;fP +=aW;} m=G/fP; }`;
var FS_MAIN = `#version 300 es
precision highp float;precision highp int; uniform vec2 u,P; uniform sampler2D B,bo,a4,A,bn,a3; uniform vec4 i,h,g,an; uniform int aJ; uniform bool es; uniform float et,U; uniform bool e,Q; uniform vec2 bV; uniform float c1,dW,K,bW,a,dX,bQ,ey,k,ae,aE,b8,b9,N,c0; uniform float ff,dO,dJ,aR,aD,b7,bK; uniform float r,R,er,cZ,o,dj,cj; uniform vec3 aS[8];uniform int ak; out vec4 ad; const float ar=6.28318530718;
#ifdef FX
float v(vec2 S,vec2 b); vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8);
#endif
mat2 bN(float L){float D=cos(L),w=sin(L);return mat2(D,w,-w,D);} float cP(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float dx(float af){return fract(sin(af*127.1)*43758.5453);} float ct(float af){float C=floor(af),p=fract(af);return mix(dx(C),dx(C + 1.0),p*p*(3.0 - 2.0*p))*2.0 - 1.0;} float Y(vec2 b,vec2 V,vec4 s){ s.xy=(b.x>0.0)?s.xy:s.zw;s.x=(b.y>0.0)?s.x:s.y; vec2 S=abs(b)- V + s.x;return min(max(S.x,S.y),0.0)+ length(max(S,0.0))- s.x; } struct aX{float d;vec2 n;vec2 q;float g;}; aX ai(vec2 b){ vec2 S=bN(-c1)*(b - bV);float fy=S.x*bW; vec2 cq=vec2(max(abs(fy)- dW,0.0),S.y);float cg=max(length(cq),1e-3); vec2 dw=vec2(cq.x*sign(S.x)*bW,cq.y)/cg;float az=max(length(dw),1e-3); float d8; if(Q){float L=atan(S.y,S.x);d8=0.5*sin(3.0*L + a*1.3)+ 0.3*sin(5.0*L - a*0.9 + 2.1)+ 0.2*sin(2.0*L + a*2.0);} else{float w=fy*0.005/N;d8=0.7*ct(w + a*0.8)+ 0.3*ct(w*2.3 - a*1.1 + 5.0);} aX p;p.d=(cg - K)/az + dX*d8;p.n=bN(c1)*(dw/az);p.q=S;p.g=az;
#ifdef FX
p.d +=v(S,b);
#endif
return p; } vec4 y(sampler2D w,vec4 aA,vec2 b,vec2 H){ vec2 S=(b - aA.xy)/aA.zw; if(S.x<0.0||S.y<0.0||S.x>1.0||S.y>1.0)return vec4(0.0); return textureLod(w,clamp((H - aA.xy)/aA.zw,0.0,1.0),0.0); } vec4 W(sampler2D f5,sampler2D em,sampler2D en,vec4 aA,vec2 b,vec2 H,float aC,float aB){ vec4 D=y(f5,aA,b,H); if(aC>0.0)D=mix(D,y(em,aA,b,H),aC); if(aB>0.0)D=mix(D,y(en,aA,b,H),aB); return D; } vec4 bx(vec2 b,vec2 H,vec2 a0,float aC,float aB){ if(dot(a0,a0)<0.01)return W(B,bo,a4,i,b,H,aC,aB); vec4 s=W(B,bo,a4,i,b,H + a0,aC,aB),az=W(B,bo,a4,i,b,H,aC,aB),V=W(B,bo,a4,i,b,H - a0,aC,aB); return vec4(s.r,az.g,V.b,max(max(s.a,az.a),V.a)); } vec4 bw(vec2 b,vec2 H,vec2 a0,float aC,float aB){ if(dot(a0,a0)<0.01)return W(A,bn,a3,h,b,H,aC,aB); vec4 s=W(A,bn,a3,h,b,H + a0,aC,aB),az=W(A,bn,a3,h,b,H,aC,aB),V=W(A,bn,a3,h,b,H - a0,aC,aB); return vec4(s.r,az.g,V.b,max(max(s.a,az.a),V.a)); } vec3 j(float bm){ float af=fract(bm)*float(ak);int C=min(int(floor(af)),ak - 1);int au=(C + 1)%ak; return mix(aS[C],aS[au],smoothstep(0.0,1.0,fract(af))); } vec3 d(vec3 D){ float at=D.x + 0.3963377774*D.y + 0.2158037573*D.z,a6=D.x - 0.1055613458*D.y - 0.0638541728*D.z,w=D.x - 0.0894841775*D.y - 1.2914855480*D.z; at=at*at*at;a6=a6*a6*a6;w=w*w*w; vec3 by=clamp(vec3(4.0767416621*at - 3.3077115913*a6 + 0.2309699292*w,-1.2684380046*at + 2.6097574011*a6 - 0.3413193965*w,-0.0041960863*at - 0.7034186147*a6 + 1.7076147010*w),0.0,1.0); return mix(12.92*by,1.055*pow(by,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),by)); } 
/*@FX*/
 vec4 eD(vec4 m,vec2 b,vec2 D,float x,aX p){
#ifdef FX
m=F(m,b,D,x,p.d,p.q,p.g);
#endif
return m; } void main(){ vec2 b=vec2(gl_FragCoord.x,P.y - gl_FragCoord.y)*(u.x/P.x); float eO=(cP(gl_FragCoord.xy)- 0.5)/255.0; vec2 D=b -(g.xy + g.zw*0.5); float x=Y(D,g.zw*0.5,an); float b5=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float cM=es?b5:1.0; if(aJ==0||aJ==2||aJ==3){ vec4 L=y(B,i,b,b),V=y(A,h,b,b); vec4 cq=(aJ==0?L:aJ==2?V:mix(L,V,et))*cM; ad=vec4(cq.rgb + eO*cq.a,cq.a);return; } aX p=ai(b); vec2 s=b - bV;float c9=max(length(s),1.0); float b3=b9>0.0?smoothstep(b9*0.9,b9*1.8,c9):1.0; vec4 l=vec4(0.0); if(aJ==1){ float X=p.d/(dO*(p.d>0.0?0.8:1.6)); vec2 cL=p.n*(bQ*ff*exp(-X*X)*b3); vec2 dH=(s/c9)*(ey*(c9/(c9 + 60.0*N))*exp(-c9/(700.0*N))*b3); vec2 H=b - cL + dH; vec2 a0=(cL*0.5 - dH*exp(-c9/(240.0*N)))*dJ; float fw=p.d/(p.d>0.0?b7:bK); float eC=bQ*aR*exp(-fw*fw)*b3; float aC=smoothstep(0.0,aD,eC); float aB=aR>aD?smoothstep(aD,aR,eC):0.0; float bi=e?smoothstep(-c0,c0,p.d):1.0; if(bi>=0.999)l=bx(b,H,a0,aC,aB); else if(bi<=0.001)l=bw(b,H,a0,aC,aB); else l=mix(bw(b,H,a0,aC,aB),bx(b,H,a0,aC,aB),bi); float fT=mix(y(A,h,b,b).a,y(B,i,b,b).a,bi); l*=min(1.0,fT/max(l.a,1e-4))*cM; } if(U>0.5){ float ep=max(y(A,h,b,b).a,y(B,i,b,b).a); float eW=max(y(a3,h,b,b).a,y(a4,i,b,b).a); b5*=max(ep,smoothstep(0.02,0.5,eW)*0.8); } float ap=max(-x,0.0); float ag=p.q.x*0.0065/N,dn=atan(p.q.y,p.q.x); float eh=Q?0.5 + 0.5*sin(2.0*dn + a*1.4)*cos(dn - a*0.6 + 0.8) :0.5 + 0.5*sin(ag*1.4 + a*1.3)*cos(ag*0.7 - a*0.6 + 0.8); float aY=0.0; if(k>0.0&&p.d<r){ if(p.d>=0.0){float af=p.d/r;aY=exp(-4.5*af*af);} else{float af=clamp(-p.d/(R*mix(0.55,1.35,eh)),0.0,1.0);aY=pow(1.0 - af,2.4);} aY*=k*er*b3; } float ay=atan(D.y/g.w,D.x/g.z); float b6=0.0,bk=0.0,ba=0.5; if(ae>0.0&&U<0.5&&ap<cZ*4.5){ float ei=0.5*sin(ay*3.0 + a*0.7)+ 0.3*sin(ay*5.0 - a*1.2 + 2.0)+ 0.2*sin(ay*9.0 + a*2.3 + 4.0); float cU=max(1.0 + dj*0.55*ei,0.15); float fs=ap/(cZ*cU); float z=1.0 - smoothstep(-r*0.6,r*0.4,p.d); float aq=smoothstep(-o,o,p.d +(K - aE)/p.g); ba=0.5 + 0.5*sin(a*3.2 - ay*4.0); b6=exp(-fs*fs)*z*aq*ae*(0.72 + 0.28*ba); float e5=1.0 - smoothstep(cj*0.5,cj*0.5 + 0.8,ap); float cA=smoothstep(-o,o,p.d +(K - b8)/p.g); bk=e5*z*cA*ae*0.85*mix(0.55,1.0,smoothstep(0.2,1.4,cU)); } float L=(1.0 -(1.0 - aY)*(1.0 - b6))*b5; bk*=b5; if(L + bk<0.0005){ad=eD(vec4(l.rgb + eO*l.a,l.a),b,D,x,p);return;} float eQ=0.6 +(Q?dn/ar:ag*0.22)+ a*0.12 + p.d*0.0016/N; vec3 am=j(eQ); am.x +=0.10*exp(-pow((p.d - 28.0*N)/(48.0*N),2.0))- 0.12*exp(-pow((p.d + 90.0*N)/(70.0*N),2.0)); am.yz*=1.2; am=mix(am,vec3(0.985,0.0,0.0),0.65*exp(-pow((p.d + 6.0*N)/max(24.0*N,3.0),2.0))); vec3 bz=j(ay/ar + a*0.25 + ap*0.0012/N);bz.yz*=1.1; am=mix(am,bz,b6/(b6 + aY + 1e-4)); float cy=clamp(L,0.0,1.0); vec4 m=vec4(d(am)*cy,cy)+ l*(1.0 - cy); float eV=clamp(bk,0.0,1.0); m=vec4(mix(d(bz),vec3(1.0),0.6 + 0.35*ba)*eV,eV)+ m*(1.0 - eV); ad=eD(vec4(m.rgb + eO*2.0*m.a,m.a),b,D,x,p); }`;
var VS_DOTS = `#version 300 es
layout(location=0)in vec4 br;uniform vec2 u;uniform float bD;out float aU;out float a5;out float aN; void main(){gl_Position=vec4(br.x/u.x*2.0 - 1.0,1.0 - br.y/u.y*2.0,0.0,1.0); aN=ceil((br.z + 1.0)*bD)+ 2.0;gl_PointSize=aN;a5=br.z*0.5*bD;aU=br.w;}`;
var FS_DOTS = `#version 300 es
precision highp float;in float aU;in float a5;in float aN;out vec4 m; void main(){float s=length(gl_PointCoord - 0.5)*aN;float E=clamp(a5 - s + 0.5,0.0,1.0);m=vec4(vec3(E*aU),E*aU);}`;
var FS_DOTS_SQUARE = `#version 300 es
precision highp float;in float aU;in float a5;in float aN;out vec4 m; void main(){vec2 aV=abs(gl_PointCoord - 0.5)*aN;float E=clamp(a5 - max(aV.x,aV.y)+ 0.5,0.0,1.0);m=vec4(vec3(E*aU),E*aU);}`;
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
    gl.uniform1f(this.copy.u("fg"), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p);
    gl.uniform1i(this.blur.u("cI"), 0);
    gl.uniform1f(this.blur.u("bF"), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blur.u("ez"), 1 / bw, 0);
    this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blur.u("ez"), 0, 1 / bh);
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
    gl.uniform3fv(prog.u("aS[0]"), this.pal);
    gl.uniform1i(prog.u("ak"), Math.min(cols.length, 8));
  }
  /** shape: none (round), 'square', or an effect's own fragment shader for the sparks (vA, vR, vPt in, o out). */
  drawDots(f, shape) {
    if (!(f.dotCount > 0)) return;
    const gl = this.gl, d = shape ? (this.dotShapes ||= {})[shape] ||= program(gl, VS_DOTS, shape === "square" ? FS_DOTS_SQUARE : shape) : this.dots;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(d.p);
    gl.uniform2f(d.u("u"), f.w, f.h);
    gl.uniform1f(d.u("bD"), f.dpr);
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
    [["B", old.sharp], ["bo", old.near], ["a4", old.far], ["A", nxt.sharp], ["bn", nxt.near], ["a3", nxt.far]].forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(n), i);
    });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u("u"), f.w, f.h);
    gl.uniform2f(u("P"), W, H);
    v4("i", R.old);
    v4("h", R.new || R.old);
    v4("g", R.shape);
    gl.uniform4f(u("an"), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u("aJ"), f.mode);
    gl.uniform1f(u("et"), f.fade || 0);
    gl.uniform1f(u("U"), R.boxless ? 1 : 0);
    gl.uniform1i(u("es"), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u("e"), s.launched ? 1 : 0);
      gl.uniform1i(u("Q"), s.ring ? 1 : 0);
      gl.uniform2f(u("bV"), s.ox, s.oy);
      const fl = {
        c1: s.tilt,
        dW: s.spine,
        K: s.radius,
        bW: s.squash,
        a: s.time,
        dX: s.swell,
        bQ: s.energy,
        ey: s.pull,
        k: s.glow,
        ae: s.rim,
        aE: s.clear,
        b8: s.hairClear,
        b9: s.hold,
        N: c.k,
        c0: c.seam,
        ff: c.amplitude,
        dO: c.lensWidth,
        dJ: c.aberration,
        aR: c.blur,
        aD: c.blurNear,
        b7: c.blurAhead,
        bK: c.blurBehind,
        r: c.lead,
        R: c.tail,
        er: c.band,
        cZ: c.rimWidth,
        o: c.rimSoftness,
        dj: c.uneven,
        cj: c.hairWidth
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
const float cK=1.5707963; float cP(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float dx(float af){return fract(sin(af*127.1)*43758.5453);} float Y(vec2 b,vec2 V,vec4 s){ s.xy=(b.x>0.0)?s.xy:s.zw;s.x=(b.y>0.0)?s.x:s.y; vec2 S=abs(b)- V + s.x;return min(max(S.x,S.y),0.0)+ length(max(S,0.0))- s.x; } float cD(vec2 V,vec4 s){ return 4.0*(V.x + V.y)- 2.0*(s.x + s.y + s.z + s.w)+ cK*(s.x + s.y + s.z + s.w); } float el(vec2 b,vec2 V,vec4 s){ float be=2.0*V.x - s.w - s.y,cR=2.0*V.y - s.y - s.x,cd=2.0*V.x - s.x - s.z,a9=2.0*V.y - s.z - s.w; float em=be,en=em + cK*s.y,fE=en + cR,fF=fE + cK*s.x,fG=fF + cd,fH=fG + cK*s.z,f6=fH + a9; if(b.x>V.x - s.y&&b.y<-V.y + s.y)return em +(clamp(atan(b.y + V.y - s.y,b.x - V.x + s.y),-cK,0.0)+ cK)*s.y; if(b.x>V.x - s.x&&b.y>V.y - s.x)return fE + clamp(atan(b.y - V.y + s.x,b.x - V.x + s.x),0.0,cK)*s.x; if(b.x<-V.x + s.z&&b.y>V.y - s.z)return fG +(clamp(atan(b.y - V.y + s.z,b.x + V.x - s.z),cK,2.0*cK)- cK)*s.z; if(b.x<-V.x + s.w&&b.y<-V.y + s.w){ float L=atan(b.y + V.y - s.w,b.x + V.x - s.w);if(L>0.0)L -=4.0*cK; return f6 +(clamp(L,-2.0*cK,-cK)+ 2.0*cK)*s.w; } float fX=V.x - abs(b.x),fY=V.y - abs(b.y); if(fY<fX)return b.y<0.0?clamp(b.x + V.x - s.w,0.0,be):fF + clamp(V.x - s.x - b.x,0.0,cd); return b.x>0.0?en + clamp(b.y + V.y - s.y,0.0,cR):fH + clamp(V.y - s.z - b.y,0.0,a9); } float aj(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float dB(vec3 af){ vec3 C=floor(af),p=fract(af);p=p*p*(3.0 - 2.0*p); return mix(mix(mix(aj(C),aj(C + vec3(1,0,0)),p.x),mix(aj(C + vec3(0,1,0)),aj(C + vec3(1,1,0)),p.x),p.y), mix(mix(aj(C + vec3(0,0,1)),aj(C + vec3(1,0,1)),p.x),mix(aj(C + vec3(0,1,1)),aj(C + vec3(1,1,1)),p.x),p.y),p.z); } float dv(vec3 b){float w=0.0,L=0.5;for(int C=0;C<5;C++){w +=L*dB(b);b=b*2.03 + vec3(13.1,7.7,3.3);L*=0.5;}return w/0.96875;} uniform vec3 aS[8];uniform int ak; vec3 j(float bm){ float af=fract(bm)*float(ak);int C=min(int(floor(af)),ak - 1);int au=(C + 1)%ak; return mix(aS[C],aS[au],smoothstep(0.0,1.0,fract(af))); } vec3 d(vec3 D){ float at=D.x + 0.3963377774*D.y + 0.2158037573*D.z,a6=D.x - 0.1055613458*D.y - 0.0638541728*D.z,w=D.x - 0.0894841775*D.y - 1.2914855480*D.z; at=at*at*at;a6=a6*a6*a6;w=w*w*w; vec3 by=clamp(vec3(4.0767416621*at - 3.3077115913*a6 + 0.2309699292*w,-1.2684380046*at + 2.6097574011*a6 - 0.3413193965*w,-0.0041960863*at - 0.7034186147*a6 + 1.7076147010*w),0.0,1.0); return mix(12.92*by,1.055*pow(by,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),by)); } uniform float dY,a2,bB,dV,bC,bU; vec4 d9(float x,float w,float fj,float ax,float X,float cO){ if(X<=0.001||abs(x - bU)>a2*6.0 + bB*3.0)return vec4(0.0); float fM=6.2831853*w/fj,bg=fj/(6.2831853*dV); vec3 S=vec3(cos(fM)*bg,sin(fM)*bg,ax*bC); float ej=dv(S)- 0.5,e9=dv(S*1.9 + vec3(4.1,1.7,ax*bC*0.7))- 0.5; float eM=x - bU,bZ=eM + ej*2.4*bB,cw=eM + e9*2.0*bB; float aW=max(dY,0.6); float cv=exp(-(bZ*bZ)/(aW*aW))+ 0.55*exp(-(cw*cw)/(aW*aW*0.5)); float bt=0.6*exp(-(bZ*bZ)/(a2*a2))+ 0.28*exp(-abs(eM)/(a2*2.2)); vec3 am=j(w/fj + ej*0.4 + ax*0.03);am.yz*=1.15; vec3 a7=d(am); vec3 eX=mix(a7,vec3(1.0),0.72 + 0.28*cO); float c7=clamp(bt*X,0.0,1.0),dr=clamp(cv*X*(1.0 + cO),0.0,1.0); vec4 m=vec4(a7*c7,c7); return vec4(eX*dr,dr)+ m*(1.0 - dr); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 eA; uniform float bD,a,dP; uniform vec4 g,an; out vec4 ad;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,eA.y*bD - gl_FragCoord.y)/bD; vec2 cB=g.zw*0.5,D=b -(g.xy + cB); float x=Y(D,cB,an); float fj=cD(cB,an),w=el(D,cB,an); vec4 du=d9(x,w,fj,a,dP,0.0); ad=vec4(du.rgb +(cP(gl_FragCoord.xy)- 0.5)/255.0*du.a,du.a); }`;
var ELECTRIC_WAVE = `
uniform float cV,bb,aF,de,t,ac,dK,cW,ci; float ah(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float ce(vec3 af){ vec3 C=floor(af),p=fract(af);p=p*p*(3.0 - 2.0*p); return mix(mix(mix(ah(C),ah(C + vec3(1,0,0)),p.x),mix(ah(C + vec3(0,1,0)),ah(C + vec3(1,1,0)),p.x),p.y), mix(mix(ah(C + vec3(0,0,1)),ah(C + vec3(1,0,1)),p.x),mix(ah(C + vec3(0,1,1)),ah(C + vec3(1,1,1)),p.x),p.y),p.z); } float b1(vec3 b,int fz){ float w=0.0,L=0.5,aM=0.0; for(int C=0;C<5;C++){if(C>=fz)break;w +=L*ce(b);aM +=L;b=b*2.03 + vec3(13.1,7.7,3.3);L*=0.5;} return w/aM; } float v(vec2 S,vec2 b){ if(!e)return 0.0; return(b1(vec3(S/bb,a*aF),3)- 0.5)*2.0*cV; } vec3 aI(float bm,float cO){vec3 am=j(bm);am.yz*=1.15;return mix(d(am),vec3(1.0),cO);} vec4 bj(vec3 bM,float L,vec4 m){L=clamp(L,0.0,1.0);return vec4(bM*L,L)+ m*(1.0 - L);} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0)return m; float cN=0.7 + 0.3*ce(vec3(a*19.0,3.7,0.0)); float aW=max(de,0.5); if(e&&k>0.001&&abs(f)<ac*3.0 + t*3.0 + cV){ vec3 af=vec3(M/(bb*0.55),a*aF*1.6); float ej=b1(af,4)- 0.5,e9=b1(af*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float bZ=f + ej*2.0*ac,cw=f + 0.7*ac + e9*1.8*ac; float cv=exp(-bZ*bZ/(aW*aW))+ 0.6*exp(-cw*cw/(aW*aW*0.5)); float bt=0.55*exp(-bZ*bZ/(t*t))+ 0.22*exp(-abs(f)/(t*2.2)); float X=dK*k*cN*c; float bm=0.55 +(Q?atan(M.y,M.x)/ar:M.x*0.004/N)+ a*0.1; m=bj(aI(bm,0.0),bt*X,m); m=bj(aI(bm,0.8),cv*X,m); } if(cW>0.0&&U<0.5&&ae>0.0&&x>-(t*2.5 + ac*2.0 + aW*3.0)){ float z=1.0 - smoothstep(-r*0.6,r*0.4,f); float aq=smoothstep(-o,o,f +(K - aE)/a8); float X=cW*min(ae*ci,1.0)*z*aq*cN*c; if(X>0.001){ float aM=b1(vec3(D/bb,a*aF),4)- 0.5; float ec=x + aW*2.0 + aM*2.0*ac*0.7; float bm=atan(D.y/g.w,D.x/g.z)/ar + a*0.2; m=bj(aI(bm,0.0),(0.5*exp(-ec*ec/(t*t*0.6))+ 0.2*exp(-abs(x)/(t*2.0)))*X,m); m=bj(aI(bm,0.75),exp(-ec*ec/(aW*aW*0.8))*X,m); } } return m; }
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
  gl.uniform2f(u("eA"), vw, vh);
  gl.uniform1f(u("bD"), dpr);
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
    gl.uniform4f(u("an"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("dP"), it.level * o.intensity);
    const f = { dY: o.thickness, a2: o.glow, bB: o.chaos, dV: o.scale, bC: o.crackle, bU: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("aS[0]"), it.pal);
    gl.uniform1i(u("ak"), it.palN);
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
    bb: c.scale,
    aF: c.crackle,
    de: c.boltWidth,
    t: c.boltGlow,
    ac: c.chaos,
    dK: c.bolts,
    cW: c.rimBolts,
    ci: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float O,ex,dR,bf,dQ,cX,cY,cl; float cQ(vec2 D){return fract(sin(dot(D,vec2(127.1,311.7)))*43758.5453);} float v(vec2 S,vec2 b){return 0.0;} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0)return m; vec2 T=floor(b/O),bh=(T + 0.5)*O,cz=fract(b/O)*O; float az=ex*0.5; float dF=step(az,cz.x)*step(cz.x,O - az)*step(az,cz.y)*step(cz.y,O - az); vec2 cB=g.zw*0.5; float eF=Y(bh -(g.xy + cB),cB,an); if(eF>0.0)return m; float dI=floor(a*dQ); float as=cQ(T + vec2(dI*0.371,dI*0.137)),aK=cQ(T*1.731 + 3.1); aX aP=ai(bh); float n=max(r*dR,O*3.0); vec3 dA=d(j(0.5 + T.x*0.021 + T.y*0.013 + a*0.2)); if(e&&k>0.001){ if(aP.d<n&&aP.d>-n*1.8){ bool ee=aP.d +(aK - 0.5)*O*3.0>0.0; vec4 a6=ee?y(B,i,bh,bh):y(A,h,bh,bh); float aW=(1.0 - smoothstep(n*0.25,n,abs(aP.d)))*smoothstep(0.0,0.3,k); float fa=step(1.0 - bf*(0.35 + 0.65*aW),as)*cX*min(k*1.5,1.0); vec4 av=mix(a6,vec4(dA,1.0),fa); av=vec4(av.rgb*mix(0.55,1.0,dF),av.a); m=mix(m,av,aW*c); }else if(aP.d<=-n*1.8&&aP.d>-R*1.3){ float f7=1.0 - clamp(-aP.d/(R*1.3),0.0,1.0); float fa=step(1.0 - bf*0.3*f7,as)*cX*k; m=mix(m,vec4(dA,1.0),fa*dF*c); } } if(cY>0.0&&U<0.5&&ae>0.0&&eF>-O*1.2){ float z=1.0 - smoothstep(-r*0.6,r*0.4,aP.d); float aq=smoothstep(-o,o,aP.d +(K - aE)/aP.g); float X=cY*min(ae*cl,1.0)*z*aq; m=mix(m,vec4(dA,1.0),step(as,X)*dF*c); } return m; }
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
    O: c.cell,
    ex: c.gap,
    dR: c.zone,
    bf: c.density,
    dQ: c.rate,
    cX: c.lit,
    cY: c.rimPixels,
    cl: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dT,dS,di,dh,dU; float v(vec2 S,vec2 b){return 0.0;} vec4 cE(vec2 b,vec2 H,float aV){return mix(y(A,h,b,H),y(B,i,b,H),smoothstep(-1.5,1.5,aV));} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float as=di*0.5,af=(f + as)/as; if(c<=0.0||!e||k<0.001||abs(af)>=1.0)return m; vec2 aM=ai(b).n; float w=sqrt(1.0 - af*af),dq=af/max(w,0.3),X=min(k*1.5,1.0); vec2 cx=aM*(dT*dq*X),du=aM*(dS*dq*X); float b0=f - dot(cx,aM); vec4 s=cE(b,b - cx - du,b0 - dot(du,aM)),az=cE(b,b - cx,b0),V=cE(b,b - cx + du,b0 + dot(du,aM)); vec4 bu=vec4(s.r,az.g,V.b,max(max(s.a,az.a),V.a)); bu +=m*(1.0 - bu.a); float ag=(Q?atan(M.y,M.x)/ar:M.x*0.003/N)+ a*0.08; vec3 bA=d(j(ag + af*0.15)); bu.rgb=mix(bu.rgb,bu.rgb*bA,dU*w); float dG=exp(-pow((af + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(ag*40.0 + a*2.0))+ 0.45*exp(-pow((af - 0.55)/0.08,2.0)); float eS=pow(1.0 - w,3.0); float f3=clamp((dG + eS*0.8)*dh,0.0,1.0)*bu.a; bu=vec4(mix(bu.rgb,mix(bA,vec3(1.0),0.75)*bu.a,f3),bu.a); return mix(m,bu,smoothstep(1.0,0.85,abs(af))*X*c); }
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
  uniforms: (c) => ({ dT: c.refraction, dS: c.dispersion, di: c.thickness, dh: c.shine, dU: c.tint })
});

// src/effects/burn.js
var BURN_WAVE = `
uniform float dc,bP,ch,a1,bO,dd; float aH(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float cc(vec2 b){ vec2 C=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(aH(C),aH(C + vec2(1,0)),p.x),mix(aH(C + vec2(0,1)),aH(C + vec2(1,1)),p.x),p.y); } float eH(vec2 b){float w=0.0,L=0.5;for(int C=0;C<4;C++){w +=L*cc(b);b=b*2.07 + vec2(5.3,1.7);L*=0.5;}return w/0.9375;} float v(vec2 S,vec2 b){ if(!e)return 0.0; return(eH(b/bP + vec2(0.0,a*0.12))- 0.5)*2.0*dc; } vec3 aO(float ax){return vec3(smoothstep(0.0,0.45,ax),smoothstep(0.3,0.8,ax),smoothstep(0.65,1.0,ax));} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0||!e||k<0.001)return m; float X=min(k*1.5,1.0),aM=cc(b/(bP*0.18)+ a*0.7); if(f>0.0&&f<ch){ float fo=pow(1.0 - f/ch,1.6)*(0.75 + 0.5*aM); m.rgb=mix(m.rgb,m.rgb*vec3(0.55,0.32,0.16),clamp(fo*1.6,0.0,1.0)*X); m.rgb*=1.0 - smoothstep(0.45,0.95,fo)*0.92*X; } if(f<0.0)m.rgb*=1.0 - dd*0.7*exp(f/(a1*2.5))*(0.6 + 0.4*aM)*X; float du=exp(-pow(f/a1,2.0))*(0.7 + 0.6*aM); float ax=clamp(du,0.0,1.0); vec3 f1=mix(aO(ax),d(j(0.3 + aM*0.4 + a*0.1)),0.3*(1.0 - ax)); float c7=clamp(exp(-abs(f)/(a1*2.2))*0.6*(0.6 + 0.4*aM)*X,0.0,1.0)*c; m=vec4(aO(0.42)*c7,c7*0.5)+ m*(1.0 - c7*0.5); float L=clamp(smoothstep(0.08,0.6,du)*X,0.0,1.0)*c; m=vec4(f1*L,L)+ m*(1.0 - L); if(bO>0.0&&f<a1&&f>-R){ float J=9.0*N + 4.0; vec2 az=(b + vec2(0.0,a*38.0*N))/J,T=floor(az),p=fract(az)- 0.5; float as=aH(T),aK=aH(T + 7.3); vec2 bL=(vec2(as,aK)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + as*9.0),0.0); float aV=length(p - bL)*J,s=0.8 + 1.5*aK; float e6=step(1.0 - bO*0.45*(1.0 - clamp(-f/R,0.0,1.0)),as); float cG=0.6 + 0.4*sin(a*12.0 + as*40.0); float cy=clamp(exp(-aV*aV/(s*s))*e6*cG*X,0.0,1.0)*c; m=vec4(aO(0.45 + 0.3*aK)*cy,cy)+ m*(1.0 - cy); } return m; }
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
  uniforms: (c) => ({ dc: c.roughness, bP: c.scale, ch: c.char, a1: c.heat, bO: c.embers, dd: c.smoke })
});

// src/effects/ink.js
var INK_WAVE = `
uniform float bS,bT,bE,df,dN,ev; float bl(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bv(vec2 b){ vec2 C=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bl(C),bl(C + vec2(1,0)),p.x),mix(bl(C + vec2(0,1)),bl(C + vec2(1,1)),p.x),p.y); } float eY(vec2 b){float w=0.0,L=0.5;for(int C=0;C<4;C++){w +=L*bv(b);b=b*2.11 + vec2(3.1,8.7);L*=0.5;}return w/0.9375;} float v(vec2 S,vec2 b){ if(!e)return 0.0; return(eY(b/bT + a*0.04)- 0.5)*2.0*bS +(bv(b/(bT*0.12))- 0.5)*bS*0.35; } vec4 dz(vec2 b,float aV){return mix(y(A,h,b,b),y(B,i,b,b),step(0.0,aV));} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float n=max(r*dN,24.0*N); if(c<=0.0||!e||k<0.001||f>n||f<-n*1.6)return m; float X=min(k*1.5,1.0); vec2 aM=ai(b).n,bL=vec2(bE,bE*0.55); vec4 L=dz(b + bL,f + dot(bL,aM)),V=dz(b - bL,f - dot(bL,aM)); float aZ=mix(0.5,0.25 + 0.3*cP(floor(b*1.2))+ 0.2*bv(b*0.5),df); vec3 dr=L.a>0.0?L.rgb/L.a:vec3(1.0),fW=V.a>0.0?V.rgb/V.a:vec3(1.0); float eK=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - dr.g)*1.05); float eL=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - fW.r)*1.05); vec3 eZ=d(aS[0]),e0=d(aS[1%ak]); vec3 ek=vec3(0.965,0.945,0.9); vec3 l=ek*mix(vec3(1.0),eZ,eK*0.95)*mix(vec3(1.0),e0,eL*0.85); float fc=(1.0 - smoothstep(0.0,ev,-f))*step(f,0.0)*smoothstep(0.15,0.55,aZ + 0.25); vec3 e1=d(j((Q?atan(M.y,M.x)/ar:M.x*0.002/N)+ a*0.05)); l*=mix(vec3(1.0),e1,fc*0.9); float dm=max(max(L.a,V.a),m.a); float aW=(1.0 - smoothstep(n*0.35,n,f>0.0?f:-f/1.6))*X*c; return mix(m,vec4(l*dm,dm),aW); }
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
  uniforms: (c) => ({ bS: c.bleed, bT: c.scale, bE: c.misregister, df: c.grain, dN: c.zone, ev: c.ink })
});

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aG,bR,dM,dL,eu; float v(vec2 S,vec2 b){return 0.0;} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float n=max(r*dM,aG*3.0); if(c<=0.0||!e||k<0.001||f>n*1.2||f<-n*2.0)return m; vec2 az=bN(bR)*b/aG,T=floor(az)+ 0.5,bh=bN(-bR)*(T*aG); float ds=ai(bh).d; vec4 a6=ds>0.0?y(B,i,bh,bh):y(A,h,bh,bh); if(a6.a<0.01)a6=ds>0.0?y(B,i,b,b):y(A,h,b,b); vec3 l=a6.rgb/max(a6.a,1e-3); float at=dot(l,vec3(0.299,0.587,0.114)); float aW=1.0 - smoothstep(n*0.1,n,ds>0.0?ds:-ds/1.6),X=min(k*1.5,1.0); bool cC=at>0.5; float s=aG*0.5*dL*sqrt(clamp((cC?1.0 - at:at)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aW); float aV=length((fract(az)- 0.5)*aG),I=u.x/P.x; float E=clamp((s - aV)/I + 0.5,0.0,1.0); vec3 fv=d(j(T.x*0.021 + T.y*0.034 + a*0.15)); vec3 eP=mix(cC?l*0.2:l,fv,eu*aW*aW),fr=cC?mix(l,vec3(1.0),0.4):l*0.14; vec4 as=vec4(mix(fr,eP,E)*a6.a,a6.a); return mix(m,as,smoothstep(0.0,0.35,aW)*X*c); }
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
  uniforms: (c) => ({ aG: c.cell, bR: c.angle, dM: c.zone, dL: c.size, eu: c.ink })
});

// src/effects/metal.js
var METAL_WAVE = `
uniform float bc,ew,cH,dg,ck; float v(vec2 S,vec2 b){ if(!e)return 0.0; float w=Q?atan(S.y,S.x)*2.0:S.x/(80.0*N); return ew*(0.6*sin(w*1.3 + a*2.1)+ 0.4*sin(w*2.9 - a*2.7 + 1.3)); } vec3 e8(vec3 s,float bm){ float f8=-s.y; vec3 fL=mix(vec3(0.62,0.66,0.74),d(j(bm)),0.35); vec3 D=mix(vec3(0.05,0.055,0.07),fL,smoothstep(-0.25,0.35,f8)); D +=vec3(1.0)*exp(-pow((f8 - 0.05)/0.07,2.0))*0.9; D +=vec3(0.9)*exp(-pow((f8 - 0.75)/0.12,2.0))*0.5; return D; } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float as=bc*0.5,af=(f + as*0.9)/as; if(c<=0.0||!e||k<0.001||abs(af)>=1.0)return m; vec2 aM=ai(b).n; float X=min(k*1.5,1.0),w=sqrt(1.0 - af*af); float fI=Q?atan(M.y,M.x)*9.0:M.x*0.07/N; float fC=0.6*sin(fI + a*3.0)+ 0.4*sin(fI*2.3 - a*2.1 + af*2.0); vec3 f9=normalize(vec3(aM*af + vec2(-aM.y,aM.x)*fC*cH*0.3,w)); vec3 bg=reflect(vec3(0.0,0.0,-1.0),f9); float ag=(Q?atan(M.y,M.x)/ar:M.x*0.002/N)+ a*0.05; vec3 l=e8(bg,ag); vec2 H=b + bg.xy*bc*0.6; vec4 a6=mix(y(A,h,b,H),y(B,i,b,H),step(0.0,f + dot(bg.xy,aM)*bc*0.6)); l=mix(l,a6.rgb/max(a6.a,1e-3),ck*a6.a*(0.4 + 0.6*w)); vec3 aw=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(f9,aw),0.0),60.0)*dg*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,w)); float L=smoothstep(1.0,0.86,abs(af))*X*c; return vec4(clamp(l,0.0,1.0)*L,L)+ m*(1.0 - L); }
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
  uniforms: (c) => ({ bc: c.thickness, ew: c.wobble, cH: c.ripple, dg: c.shine, ck: c.reflect })
});

// src/effects/water.js
var WATER_WAVE = `
uniform float Z,d3,d1,d2,d4; float bq(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bJ(vec2 b){ vec2 C=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bq(C),bq(C + vec2(1,0)),p.x),mix(bq(C + vec2(0,1)),bq(C + vec2(1,1)),p.x),p.y); } float v(vec2 S,vec2 b){ if(!e)return 0.0; return(bJ(b/(Z*2.5)+ a*0.3)- 0.5)*Z*0.5; } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0||!e||k<0.001||f>Z*1.5||f<-R*1.6)return m; vec2 aM=ai(b).n; float X=min(k*1.5,1.0); float cf=f>0.0?exp(-f/(Z*0.35)):exp(f/(R*0.8)); float c8=ar*f/Z + a*7.0; vec2 dl=b/Z; vec2 cT=vec2(sin(dl.y*1.7 + a*1.6)+ sin(dl.x*1.1 - a*1.2 + dl.y*0.6), cos(dl.x*1.9 - a*1.4)+ cos(dl.y*1.2 + a*1.1 + dl.x*0.7))*0.3; vec2 cx=(aM*cos(c8)+ cT)*d3*cf*X; vec2 H=b - cx; float b0=f + dot(cx,aM); vec4 w=mix(y(A,h,b,H),y(B,i,b,H),smoothstep(-1.5,1.5,b0)); w +=m*(1.0 - w.a); vec3 bA=d(j(0.4 + f*0.0015/N + a*0.04)); vec3 bM=mix(w.rgb,w.rgb*bA*1.15,d4*cf); vec2 eb=b/(Z*0.45)+ cT*2.0; float cq=sin(eb.x + sin(eb.y*1.3 + a*1.5))+ sin(eb.y*1.1 + sin(eb.x*0.9 - a*1.7)); float eJ=pow(clamp(1.0 - abs(cq)*0.7,0.0,1.0),5.0); bM +=(eJ*d1*0.4 + smoothstep(0.8,1.0,sin(c8 + 0.9))*0.22*cf)*cf*w.a*mix(bA,vec3(1.0),0.5); float fZ=bJ(b/5.0 + vec2(a*2.0,0.0))*0.6 + bJ(b/13.0 - a)*0.4; float eR=smoothstep(0.35,0.7,fZ + 0.45 - abs(f + Z*0.15)/max(Z*0.35,1.0))*d2; bM=mix(bM,vec3(0.97,0.99,1.0)*w.a,clamp(eR,0.0,1.0)); return mix(m,vec4(bM,w.a),clamp(cf*3.0,0.0,1.0)*X*c); }
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
  uniforms: (c) => ({ Z: c.wavelength, d3: c.refraction, d1: c.caustics, d2: c.foam, d4: c.tint })
});

// src/effects/vine.js
var VINE_WAVE = `
uniform float q,d0,cm,cn,ao,dZ,ca; float aa(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float c3(float ax,float aw){return aw*0.29*pow(max(sin(3.14159*pow(clamp(ax,0.0,1.0),0.72)),0.0),0.62);} float bI(vec2 aL,float aw){return max(abs(aL.x)- c3(aL.y/aw,aw),max(-aL.y,aL.y - aw));} vec3 d6(float as){return d(j(as));} vec4 c4(vec2 aL,float aw,float as,float bs,float I){ float aV=bI(aL,aw); float eE=max(abs(aL.x)- max(aw*0.016,I*0.45),max(aL.y - aw*0.1,-aL.y - aw*0.14)); float E=clamp(0.5 - min(aV,eE)/I,0.0,1.0); if(E<=0.0)return vec4(0.0); float ax=clamp(aL.y/aw,0.0,1.0),aW=max(c3(ax,aw),1e-3),cJ=clamp(aL.x/aW,-1.0,1.0); vec3 a7=d6(as),l=a7; l*=0.86 + 0.2*bs*smoothstep(-0.3,0.3,cJ); l*=1.0 - 0.22*cJ*cJ; l*=0.9 + 0.2*ax; float dt=smoothstep(14.0,34.0,aw/I); float fB=(1.0 - smoothstep(I*0.4,I*0.4 + aw*0.018,abs(aL.x)))*(1.0 - 0.7*ax); float bm=ax*6.5 - abs(cJ)*1.6,fQ=I*6.5/aw; float fh=(1.0 - smoothstep(fQ*0.4,fQ*1.4,abs(fract(bm + 0.5)- 0.5)))*smoothstep(0.08,0.25,abs(cJ))*(1.0 - smoothstep(0.7,0.95,abs(cJ)))*(1.0 - ax*0.6); vec3 eg=mix(a7,vec3(0.85,0.92,0.55),0.45); l=mix(l,eg,max(fB*0.8,fh*0.35*dt)); l*=0.68 + 0.32*smoothstep(0.0,max(I*1.5,aw*0.035),-aV); l +=vec3(0.07,0.08,0.04)*smoothstep(0.55,0.0,length(vec2(cJ + 0.4*bs,(ax - 0.45)*2.2))); if(eE<aV)l=mix(a7,vec3(0.32,0.36,0.16),0.5)*0.8; return vec4(l*E,E); } vec4 cr(vec2 b,vec2 bY,float aw,float L,float bs,float as,float I){ mat2 bg=bN(L);float fq=max(abs(bs),0.18); vec2 aL=bg*(b - bY);aL.x/=fq;aL.y +=aw*0.5; vec4 at=c4(aL,aw,as,sign(bs),I); vec2 H=bg*(b - bY - vec2(0.05,0.09)*aw);H.x/=fq;H.y +=aw*0.5; float dD=clamp(0.5 - bI(H,aw)/(I + aw*0.07),0.0,1.0)*0.3; return at + vec4(0.0,0.0,0.0,dD)*(1.0 - at.a); } vec4 bp(vec4 m,vec4 at,float X){at*=X;return at + m*(1.0 - at.a);} vec4 bH(vec2 b,float f,vec2 aM,float J,float n,float I,float aQ){ vec2 az=b/J,V=floor(az - 0.5); vec4 at[4];float eB[4]; for(int au=0;au<4;au++){ vec2 T=V + vec2(float(au&1),float(au>>1))+ aQ; float as=aa(T),aK=aa(T + 4.7),b2=aa(T + 9.1); vec2 bY=(T - aQ + 0.5 +(vec2(aK,b2)- 0.5)*0.5)*J; float aP=f + dot(aM,bY - b); float eN=aP>0.0?1.0 - aP/(n*0.35):1.0 - smoothstep(n*0.15,n*1.5,-aP); float eU=clamp(1.0 - aP/(n*0.35),0.0,1.0); eB[au]=b2; at[au]=as<eN*0.9?cr(b,bY,J*(0.95 + 0.45*b2)*(0.45 + 0.55*eU),as*ar,0.75 + 0.25*aK,aK*0.85,I):vec4(0.0); } for(int C=0;C<3;C++)for(int au=0;au<3 - C;au++)if(eB[au]>eB[au + 1]){float ax=eB[au];eB[au]=eB[au + 1];eB[au + 1]=ax;vec4 cq=at[au];at[au]=at[au + 1];at[au + 1]=cq;} vec4 G=vec4(0.0); for(int au=0;au<4;au++)G=at[au]+ G*(1.0 - at[au].a); return G; } float v(vec2 S,vec2 b){ if(!e)return 0.0; float w=(Q?atan(S.y,S.x)*40.0*N:S.x)/max(q*1.6,1.0); return dZ*(abs(sin(w + a*0.6))*0.7 + abs(sin(w*2.3 - a*0.4 + 1.7))*0.3); } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float av=P.x/u.x,I=1.0/av; float c=clamp(0.5 - x*av,0.0,1.0); if(!e||k<0.001)return m; float X=min(k*1.5,1.0),n=max(r*d0,q*3.0); if(c>0.0){ vec2 aM=ai(b).n; if(f<n*0.35 + q&&f>-n*1.5 - q){ m=bp(m,bH(b,f,aM,q*0.95,n,I,0.0),X*c); m=bp(m,bH(b + q*0.41,f,aM,q*0.8,n*0.8,I,17.0),X*c); } if(cm>0.0&&f<-n*0.2&&f>-R*1.4){ float ax=a,J=q*2.2; vec2 S=b - vec2(0.0,ax*46.0*N); vec2 T=floor(S/J); float as=aa(T + 31.0),aK=aa(T + 2.3),b2=aa(T + 5.9); float a9=1.0 - clamp(-f/(R*1.4),0.0,1.0); if(as<cm*0.32*a9){ float c8=ax*(1.6 + aK)+ as*ar; vec2 bY=(T + 0.5)*J + vec2(sin(c8)*J*0.2,ax*46.0*N); float aw=q*(0.75 + 0.3*b2); m=bp(m,cr(b,bY,aw,as*ar + sin(c8)*0.9,cos(c8*1.3),mix(aK*0.8,0.98,0.35*b2),I),X*c); } } } if(cn>0.0&&U<0.5&&ae>0.0&&x>-ao*6.0 - q*1.6){ float z=1.0 - smoothstep(-r*0.6,r*0.4,f); float aq=smoothstep(-o,o,f +(K - aE)/a8); float b4=cn*min(ae*ca,1.0)*z*aq*c; if(b4>0.001){ float dC=2.0*(g.z + g.w),w=(atan(D.y/g.w,D.x/g.z)/ar + 0.5)*dC; float fi=ao*(0.85 + 0.3*sin(w/(q*2.7))); float fN=sin(w/(q*1.3))*ao*1.4 + sin(w/(q*0.55)+ 1.3)*ao*0.4; float aV=x + ao*2.5 + fN; float cw=aV + sin(w/(q*0.35))*fi*1.1; vec4 G=vec4(0.0); for(int au=0;au<2;au++){ float b0=au==0?cw:aV,fR=au==0?fi*0.32:fi*0.5; float fp=clamp(fR - abs(b0)*1.0 + 0.5*I,0.0,I)/I; float bm=clamp(b0/max(fR,1e-3),-1.0,1.0); vec3 fK=vec3(0.24,0.33,0.13)*(0.55 + 0.55*sqrt(1.0 - bm*bm))+ vec3(0.05,0.05,0.02)*smoothstep(0.2,-0.6,bm); fK*=0.9 + 0.1*sin(w*1.7 + b0); vec4 da=vec4(fK*fp,fp); G=da + G*(1.0 - da.a); } float dD=clamp(1.0 - abs(aV - fi*0.9)/(fi*1.4 + I),0.0,1.0)*0.25; G=G + vec4(0.0,0.0,0.0,dD)*(1.0 - G.a); float cS=q*1.15,p=w/cS,f2=floor(p); for(int au=0;au<2;au++){ float C=f2 +(au==0?(fract(p)<0.5?-1.0:1.0):0.0); float dy=aa(vec2(C,3.0)); if(dy<0.12)continue; float dE=mod(C,2.0)*2.0 - 1.0; vec2 S=vec2(w -(C + 0.5)*cS,aV); float aw=q*(0.7 + 0.35*aa(vec2(C,1.0))); float L=-0.55*dE - 0.25*(dy - 0.5); vec2 e7=bN(L)*vec2(S.x,-S.y); e7.y -=fi*0.4; vec4 ef=c4(e7,aw,aa(vec2(C,2.0))*0.85,dE,I); vec2 dF=e7 - vec2(0.04,-0.07)*aw; float f4=clamp(0.5 - bI(dF,aw)/(I + aw*0.07),0.0,1.0)*0.28; ef=ef + vec4(0.0,0.0,0.0,f4)*(1.0 - ef.a); G=G + ef*(1.0 - G.a); } m=bp(m,G,b4); } } return m; }
`;
var VINE_DOTS = `#version 300 es
precision highp float;in float aU;in float a5;in float aN;out vec4 m; void main(){ float L=aU*7.0 + a5*2.0,D=cos(L),w=sin(L),p=max(abs(cos(aU*9.0 + a5)),0.25); vec2 b=mat2(D,w,-w,D)*(gl_PointCoord - 0.5)*aN; float aw=a5*2.6,ax=b.y/aw + 0.5; b.x/=p; float aW=aw*0.29*pow(max(sin(3.14159*pow(clamp(ax,0.0,1.0),0.72)),0.0),0.62); float aV=max(abs(b.x)- aW,max(-ax,ax - 1.0)*aw); float E=clamp(0.5 - aV,0.0,1.0)*aU; vec3 az=mix(vec3(0.24,0.5,0.2),vec3(0.5,0.72,0.28),fract(a5*3.7)); az*=0.8 + 0.3*step(0.0,b.x*sign(cos(aU*9.0 + a5))); az=mix(az,vec3(0.8,0.88,0.55),(1.0 - smoothstep(0.3,0.9,abs(b.x)))*0.5); m=vec4(az*E,E); }`;
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
    d0: c.zone,
    cm: c.fall,
    cn: c.vine,
    ao: c.vineWidth,
    dZ: c.bumps,
    ca: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/christmas.js
var XMAS_WAVE = `
uniform float co,bG,cp,dk,aT,bd,c2,bX,d5; float al(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} vec4 ab(vec4 m,vec4 at,float X){at*=X;return at + m*(1.0 - at.a);} float v(vec2 S,vec2 b){return 0.0;} vec4 cb(vec2 b,float J,float eq,float s,float e3,float I,float aQ){ float ax=a; vec2 S=b - vec2(sin(ax*0.7 + aQ)*J*0.4,ax*eq); vec2 T=floor(S/J); float as=al(T + aQ),aK=al(T + aQ + 3.1),b2=al(T + aQ + 7.7); if(as>e3)return vec4(0.0); vec2 bY=(T + 0.2 + 0.6*vec2(aK,b2))*J + vec2(sin(ax*(1.0 + aK)+ as*6.28)*J*0.15,0.0); float fD=s*(0.6 + 0.6*b2),aV=length(S - bY); float L=(1.0 - smoothstep(fD*0.35,fD + I,aV))*(0.75 + 0.25*aK); return vec4(vec3(0.97,0.98,1.0)*L,L); } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float av=P.x/u.x,I=1.0/av; float c=clamp(0.5 - x*av,0.0,1.0); if(!e||k<0.001)return m; float X=min(k*1.5,1.0)*c,ax=a; if(c>0.0){ if(bX>0.0&&f>0.0&&f<r*1.2){ float p=exp(-f/max(r*0.35,1.0))*bX; m.rgb=mix(m.rgb,vec3(0.86,0.93,1.0)*m.a + vec3(0.0),p*0.45); vec2 az=floor(b/7.0),eT=b -(az + 0.5)*7.0; float f0=al(az),cG=max(sin(ax*7.0 + al(az + 1.3)*40.0),0.0); float fd=max(1.0 - abs(eT.x)*abs(eT.y)*0.9 - length(eT)*0.28,0.0); m +=vec4(vec3(1.0),1.0)*step(0.93,f0)*cG*fd*p*X; } if(cp>0.0&&f<0.0&&f>-R*1.5){ float a9=(1.0 - clamp(-f/(R*1.5),0.0,1.0))*smoothstep(0.0,co*3.0,-f); float c6=dk,e4=min(cp,2.0)*a9; m=ab(m,cb(b,c6*9.0,26.0*N,c6*0.7,0.55*e4,I,0.0),X); m=ab(m,cb(b,c6*6.5,40.0*N,c6,0.5*e4,I,11.0),X); m=ab(m,cb(b,c6*11.0,62.0*N,c6*1.5,0.35*e4,I,23.0),X); } float bg=co,af=f + bg*0.4; float dD=(1.0 - smoothstep(bg*0.6,bg*2.2,abs(af + bg*1.1)))*0.3; m=ab(m,vec4(0.0,0.0,0.0,dD),X); float E=clamp((bg - abs(af))*av + 0.5,0.0,1.0); if(E>0.0){ float bm=clamp(af/bg,-1.0,1.0),eB=sqrt(1.0 - bm*bm); float w=Q?atan(M.y,M.x)*K:M.x; float cq=(w + asin(bm)*bg*1.3)/bG; float db=I/bG*1.5; float fA=smoothstep(0.5 - db,0.5 + db,fract(cq))- smoothstep(1.0 - db,1.0,fract(cq))+(1.0 - smoothstep(0.0,db,fract(cq))); float fe=smoothstep(0.18 - db,0.18,fract(cq))- smoothstep(0.26,0.26 + db,fract(cq)); vec3 l=mix(vec3(0.97,0.96,0.94),vec3(0.8,0.06,0.12),clamp(fA,0.0,1.0)); l=mix(l,vec3(0.12,0.5,0.22),clamp(fe,0.0,1.0)); l*=0.45 + 0.6*eB; l +=vec3(1.0)*pow(max(1.0 - abs(bm + 0.45)*3.0,0.0),3.0)*0.55; m=ab(m,vec4(l*E,E),X); } } if(U<0.5&&ae>0.0&&c>0.0){ float z=1.0 - smoothstep(-r*0.6,r*0.4,f); float aq=smoothstep(-o,o,f +(K - aE)/a8); float b4=min(ae*d5,1.0)*z*aq*c; if(b4>0.001){ if(c2>0.0){ float be=D.y + g.w*0.5,eG=c2; float as=eG*(0.7 + 0.2*sin(D.x/(eG*1.9))+ 0.12*sin(D.x/(eG*0.7)+ 1.3)); if(be<eG*3.0){ float cu=clamp((as - be)*av + 0.5,0.0,1.0); float da=eG*1.3,e2=floor(D.x/da),fx=D.x -(e2 + 0.5)*da; float cg=eG*(0.4 + 1.4*al(vec2(e2,5.0)))*step(0.35,al(vec2(e2,8.0))); float fS=be - as*0.85,fO=da*0.16*(1.0 - fS/max(cg,1e-3)); float ft=fS>0.0&&cg>0.0?clamp((fO - abs(fx))*av + 0.5,0.0,1.0):0.0; vec3 fu=mix(vec3(0.75,0.88,1.0),vec3(1.0),0.5 + 0.5*sin(fx/max(fO,1e-3)*1.5)); m=ab(m,vec4(fu*ft*0.8,ft*0.8),b4); vec3 fb=mix(vec3(0.74,0.83,0.95),vec3(1.0),smoothstep(0.0,as*0.8,as - be)); float eo=clamp((as + eG*0.35 - be)*av,0.0,1.0)*(1.0 - cu)*0.25; m=ab(m,vec4(0.0,0.0,0.0,eo),b4); m=ab(m,vec4(fb*cu,cu),b4); } } if(aT>0.0){ float c5=bd*0.24,ap=c5*1.0 + 1.0; float dC=2.0*(g.z + g.w),w=(atan(D.y/g.w,D.x/g.z)/6.28318 + 0.5)*dC; float p=w/bd,cz=fract(p),fJ=c5*0.9*4.0*cz*(1.0 - cz); float aV=x + ap + fJ; if(aV>-c5*4.5){ float d7=clamp((0.7 - abs(aV))*av + 0.5,0.0,1.0)*0.9; vec4 G=vec4(vec3(0.07,0.2,0.1)*d7,d7); float C=floor(p + 0.5),dm=(p - C)*bd; float fk=-(x + ap); float dy=al(vec2(C,2.0)),cG=0.55 + 0.45*sin(ax*(2.0 + 2.0*dy)+ dy*40.0); float cu=mod(C,4.0); vec3 fm=cu<1.0?vec3(1.0,0.16,0.14):cu<2.0?vec3(1.0,0.75,0.2):cu<3.0?vec3(0.2,0.85,0.35):vec3(0.3,0.55,1.0); vec2 ea=vec2(dm,fk - c5*1.05); float fU=length(ea/vec2(c5*0.42,c5*0.7))- 1.0; float dp=clamp(-fU*c5*0.5*av + 0.5,0.0,1.0); float cF=clamp((c5*0.22 - abs(dm))*av + 0.5,0.0,1.0)*clamp((c5*0.4 - abs(fk - c5*0.25))*av + 0.5,0.0,1.0); vec3 eI=fm*(0.35 + 0.75*cG)+ vec3(1.0)*pow(max(1.0 - length(ea/c5 - vec2(-0.12,-0.2))*2.2,0.0),2.0)*0.8*cG; vec4 fn=vec4(eI*dp,dp); G=fn + G*(1.0 - fn.a); G=vec4(vec3(0.1,0.25,0.12)*cF,cF)+ G*(1.0 - cF); float bt=exp(-dot(ea,ea)/(c5*c5*2.2))*cG*0.75; m=ab(m,G,b4*aT); m +=vec4(fm*bt,0.0)*b4*min(aT,1.0); } } } } return m; }
`;
var XMAS_DOTS = `#version 300 es
precision highp float;in float aU;in float a5;in float aN;out vec4 m; void main(){ vec2 b=(gl_PointCoord - 0.5)*aN; float L=atan(b.y,b.x)+ aU*2.0 + a5,s=length(b),bg=a5*1.5; float w=mod(L,1.0471976)- 0.5235988; vec2 S=vec2(cos(w),sin(w))*s; float fl=abs(S.y); vec2 V=vec2(S.x - bg*0.55,abs(S.y)); float fV=abs(dot(V,vec2(-0.5,0.866))); float aV=min(fl,(S.x>bg*0.55&&S.x<bg*0.85)?fV:1e3); float E=clamp(0.9 - aV,0.0,1.0)*step(s,bg)+ clamp(bg*0.18 - s + 0.5,0.0,1.0); E=clamp(E,0.0,1.0)*aU; m=vec4(vec3(0.92,0.96,1.0)*E,E); }`;
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
    co: c.cane,
    bG: c.stripe,
    cp: c.snow,
    dk: c.flake,
    aT: c.lights,
    bd: c.bulbs,
    c2: c.cap,
    bX: c.frost,
    d5: 1 / Math.max(c.rimStrength, 0.05)
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
