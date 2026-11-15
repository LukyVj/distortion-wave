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
out vec2 b0; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));b0=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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
precision highp float;in vec2 b0;uniform sampler2D cc;uniform float es;out vec4 m; void main(){m=textureLod(cc,b0,es);}`;
var FS_BLUR = `#version 300 es
precision highp float;in vec2 b0;uniform sampler2D cc;uniform vec2 dO;uniform float bh;out vec4 m; void main(){ float dR=min(ceil(bh*3.0),32.0);vec4 dS=vec4(0.0);float eQ=0.0; for(int E=-32;E<=32;E++){float du=float(E);if(abs(du)>dR)continue; float aA=exp(-0.5*du*du/(bh*bh));dS +=textureLod(cc,b0 + dO*du,0.0)*aA;eQ +=aA;} m=dS/eQ; }`;
var FS_MAIN = `#version 300 es
precision highp float;precision highp int; uniform vec2 l,B; uniform sampler2D y,a1,aK,x,a0,aJ; uniform vec4 g,f,k,af; uniform int as; uniform bool dH; uniform float dI,V; uniform bool e,K; uniform vec2 bx; uniform float cu,df,T,by,a,dg,bs,dN,j,ai,aH,bJ,bK,O,ct; uniform float er,c7,c2,ay,an,bI,bl; uniform float w,Q,dG,cs,s,cG,bU; uniform vec3 az[8];uniform int ab; out vec4 U; const float av=6.28318530718;
#ifdef FX
float v(vec2 W,vec2 b); vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4);
#endif
mat2 bp(float L){float D=cos(L),A=sin(L);return mat2(D,A,-A,D);} float ci(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float cT(float ac){return fract(sin(ac*127.1)*43758.5453);} float b1(float ac){float E=floor(ac),q=fract(ac);return mix(cT(E),cT(E + 1.0),q*q*(3.0 - 2.0*q))*2.0 - 1.0;} float P(vec2 b,vec2 J,vec4 n){ n.xy=(b.x>0.0)?n.xy:n.zw;n.x=(b.y>0.0)?n.x:n.y; vec2 W=abs(b)- J + n.x;return min(max(W.x,W.y),0.0)+ length(max(W,0.0))- n.x; } struct aB{float d;vec2 n;vec2 q;float g;}; aB ah(vec2 b){ vec2 W=bp(-cu)*(b - bx);float eC=W.x*by; vec2 dQ=vec2(max(abs(eC)- df,0.0),W.y);float dV=max(length(dQ),1e-3); vec2 cS=vec2(dQ.x*sign(W.x)*by,dQ.y)/dV;float aD=max(length(cS),1e-3); float dp; if(K){float L=atan(W.y,W.x);dp=0.5*sin(3.0*L + a*1.3)+ 0.3*sin(5.0*L - a*0.9 + 2.1)+ 0.2*sin(2.0*L + a*2.0);} else{float A=eC*0.005/O;dp=0.7*b1(A + a*0.8)+ 0.3*b1(A*2.3 - a*1.1 + 5.0);} aB q;q.d=(dV - T)/aD + dg*dp;q.n=bp(cu)*(cS/aD);q.q=W;q.g=aD;
#ifdef FX
q.d +=v(W,b);
#endif
return q; } vec4 u(sampler2D A,vec4 ak,vec2 b,vec2 H){ vec2 W=(b - ak.xy)/ak.zw; if(W.x<0.0||W.y<0.0||W.x>1.0||W.y>1.0)return vec4(0.0); return textureLod(A,clamp((H - ak.xy)/ak.zw,0.0,1.0),0.0); } vec4 M(sampler2D e0,sampler2D dD,sampler2D dE,vec4 ak,vec2 b,vec2 H,float am,float al){ vec4 D=u(e0,ak,b,H); if(am>0.0)D=mix(D,u(dD,ak,b,H),am); if(al>0.0)D=mix(D,u(dE,ak,b,H),al); return D; } vec4 a9(vec2 b,vec2 H,vec2 aF,float am,float al){ if(dot(aF,aF)<0.01)return M(y,a1,aK,g,b,H,am,al); vec4 n=M(y,a1,aK,g,b,H + aF,am,al),aD=M(y,a1,aK,g,b,H,am,al),J=M(y,a1,aK,g,b,H - aF,am,al); return vec4(n.r,aD.g,J.b,max(max(n.a,aD.a),J.a)); } vec4 a8(vec2 b,vec2 H,vec2 aF,float am,float al){ if(dot(aF,aF)<0.01)return M(x,a0,aJ,f,b,H,am,al); vec4 n=M(x,a0,aJ,f,b,H + aF,am,al),aD=M(x,a0,aJ,f,b,H,am,al),J=M(x,a0,aJ,f,b,H - aF,am,al); return vec4(n.r,aD.g,J.b,max(max(n.a,aD.a),J.a)); } vec3 h(float cy){ float ac=fract(cy)*float(ab);int E=min(int(floor(ac)),ab - 1);int eX=(E + 1)%ab; return mix(az[E],az[eX],smoothstep(0.0,1.0,fract(ac))); } vec3 d(vec3 D){ float a7=D.x + 0.3963377774*D.y + 0.2158037573*D.z,aM=D.x - 0.1055613458*D.y - 0.0638541728*D.z,A=D.x - 0.0894841775*D.y - 1.2914855480*D.z; a7=a7*a7*a7;aM=aM*aM*aM;A=A*A*A; vec3 ba=clamp(vec3(4.0767416621*a7 - 3.3077115913*aM + 0.2309699292*A,-1.2684380046*a7 + 2.6097574011*aM - 0.3413193965*A,-0.0041960863*a7 - 0.7034186147*aM + 1.7076147010*A),0.0,1.0); return mix(12.92*ba,1.055*pow(ba,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),ba)); } 
/*@FX*/
 vec4 dU(vec4 m,vec2 b,vec2 D,float z,aB q){
#ifdef FX
m=C(m,b,D,z,q.d,q.q,q.g);
#endif
return m; } void main(){ vec2 b=vec2(gl_FragCoord.x,B.y - gl_FragCoord.y)*(l.x/B.x); float d3=(ci(gl_FragCoord.xy)- 0.5)/255.0; vec2 D=b -(k.xy + k.zw*0.5); float z=P(D,k.zw*0.5,af); float bE=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float cf=dH?bE:1.0; if(as==0||as==2||as==3){ vec4 L=u(y,g,b,b),J=u(x,f,b,b); vec4 dQ=(as==0?L:as==2?J:mix(L,J,dI))*cf; U=vec4(dQ.rgb + d3*dQ.a,dQ.a);return; } aB q=ah(b); vec2 n=b - bx;float cx=max(length(n),1.0); float bC=bK>0.0?smoothstep(bK*0.9,bK*1.8,cx):1.0; vec4 p=vec4(0.0); if(as==1){ float ad=q.d/(c7*(q.d>0.0?0.8:1.6)); vec2 ce=q.n*(bs*er*exp(-ad*ad)*bC); vec2 c0=(n/cx)*(dN*(cx/(cx + 60.0*O))*exp(-cx/(700.0*O))*bC); vec2 H=b - ce + c0; vec2 aF=(ce*0.5 - c0*exp(-cx/(240.0*O)))*c2; float ez=q.d/(q.d>0.0?bI:bl); float dT=bs*ay*exp(-ez*ez)*bC; float am=smoothstep(0.0,an,dT); float al=ay>an?smoothstep(an,ay,dT):0.0; float aV=e?smoothstep(-ct,ct,q.d):1.0; if(aV>=0.999)p=a9(b,H,aF,am,al); else if(aV<=0.001)p=a8(b,H,aF,am,al); else p=mix(a8(b,H,aF,am,al),a9(b,H,aF,am,al),aV); float eR=mix(u(x,f,b,b).a,u(y,g,b,b).a,aV); p*=min(1.0,eR/max(p.a,1e-4))*cf; } if(V>0.5){ float dF=max(u(x,f,b,b).a,u(y,g,b,b).a); float ea=max(u(aJ,f,b,b).a,u(aK,g,b,b).a); bE*=max(dF,smoothstep(0.02,0.5,ea)*0.8); } float aZ=max(-z,0.0); float X=q.q.x*0.0065/O,cI=atan(q.q.y,q.q.x); float dx=K?0.5 + 0.5*sin(2.0*cI + a*1.4)*cos(cI - a*0.6 + 0.8) :0.5 + 0.5*sin(X*1.4 + a*1.3)*cos(X*0.7 - a*0.6 + 0.8); float aC=0.0; if(j>0.0&&q.d<w){ if(q.d>=0.0){float ac=q.d/w;aC=exp(-4.5*ac*ac);} else{float ac=clamp(-q.d/(Q*mix(0.55,1.35,dx)),0.0,1.0);aC=pow(1.0 - ac,2.4);} aC*=j*dG*bC; } float aj=atan(D.y/k.w,D.x/k.z); float bF=0.0,aX=0.0,aO=0.5; if(ai>0.0&&V<0.5&&aZ<cs*4.5){ float dy=0.5*sin(aj*3.0 + a*0.7)+ 0.3*sin(aj*5.0 - a*1.2 + 2.0)+ 0.2*sin(aj*9.0 + a*2.3 + 4.0); float cn=max(1.0 + cG*0.55*dy,0.15); float ex=aZ/(cs*cn); float F=1.0 - smoothstep(-w*0.6,w*0.4,q.d); float ax=smoothstep(-s,s,q.d +(T - aH)/q.g); aO=0.5 + 0.5*sin(a*3.2 - aj*4.0); bF=exp(-ex*ex)*F*ax*ai*(0.72 + 0.28*aO); float ei=1.0 - smoothstep(bU*0.5,bU*0.5 + 0.8,aZ); float b6=smoothstep(-s,s,q.d +(T - bJ)/q.g); aX=ei*F*b6*ai*0.85*mix(0.55,1.0,smoothstep(0.2,1.4,cn)); } float L=(1.0 -(1.0 - aC)*(1.0 - bF))*bE; aX*=bE; if(L + aX<0.0005){U=dU(vec4(p.rgb + d3*p.a,p.a),b,D,z,q);return;} float d5=0.6 +(K?cI/av:X*0.22)+ a*0.12 + q.d*0.0016/O; vec3 ae=h(d5); ae.x +=0.10*exp(-pow((q.d - 28.0*O)/(48.0*O),2.0))- 0.12*exp(-pow((q.d + 90.0*O)/(70.0*O),2.0)); ae.yz*=1.2; ae=mix(ae,vec3(0.985,0.0,0.0),0.65*exp(-pow((q.d + 6.0*O)/max(24.0*O,3.0),2.0))); vec3 bb=h(aj/av + a*0.25 + aZ*0.0012/O);bb.yz*=1.1; ae=mix(ae,bb,bF/(bF + aC + 1e-4)); float b4=clamp(L,0.0,1.0); vec4 m=vec4(d(ae)*b4,b4)+ p*(1.0 - b4); float d9=clamp(aX,0.0,1.0); m=vec4(mix(d(bb),vec3(1.0),0.6 + 0.35*aO)*d9,d9)+ m*(1.0 - d9); U=dU(vec4(m.rgb + d3*2.0*m.a,m.a),b,D,z,q); }`;
var VS_DOTS = `#version 300 es
layout(location=0)in vec4 a3;uniform vec2 l;uniform float bf;out float bm;out float bN;out float aS; void main(){gl_Position=vec4(a3.x/l.x*2.0 - 1.0,1.0 - a3.y/l.y*2.0,0.0,1.0); aS=ceil((a3.z + 1.0)*bf)+ 2.0;gl_PointSize=aS;bN=a3.z*0.5*bf;bm=a3.w;}`;
var FS_DOTS = `#version 300 es
precision highp float;in float bm;in float bN;in float aS;out vec4 m; void main(){float n=length(gl_PointCoord - 0.5)*aS;float Y=clamp(bN - n + 0.5,0.0,1.0);m=vec4(vec3(Y*bm),Y*bm);}`;
var FS_DOTS_SQUARE = `#version 300 es
precision highp float;in float bm;in float bN;in float aS;out vec4 m; void main(){vec2 aU=abs(gl_PointCoord - 0.5)*aS;float Y=clamp(bN - max(aU.x,aU.y)+ 0.5,0.0,1.0);m=vec4(vec3(Y*bm),Y*bm);}`;
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
    gl.uniform1i(this.copy.u("cc"), 0);
    gl.uniform1f(this.copy.u("es"), Math.log2(scale));
    this.pass(this.copy, A.fb, bw, bh);
    gl.useProgram(this.blur.p);
    gl.uniform1i(this.blur.u("cc"), 0);
    gl.uniform1f(this.blur.u("bh"), Math.max(sigma / scale, 0.01));
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blur.u("dO"), 1 / bw, 0);
    this.pass(this.blur, B.fb, bw, bh);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blur.u("dO"), 0, 1 / bh);
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
    gl.uniform3fv(prog.u("az[0]"), this.pal);
    gl.uniform1i(prog.u("ab"), Math.min(cols.length, 8));
  }
  /** shape: none (round), 'square', or an effect's own fragment shader for the sparks (vA, vR, vPt in, o out). */
  drawDots(f, shape) {
    if (!(f.dotCount > 0)) return;
    const gl = this.gl, d = shape ? (this.dotShapes ||= {})[shape] ||= program(gl, VS_DOTS, shape === "square" ? FS_DOTS_SQUARE : shape) : this.dots;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(d.p);
    gl.uniform2f(d.u("l"), f.w, f.h);
    gl.uniform1f(d.u("bf"), f.dpr);
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
    [["y", old.sharp], ["a1", old.near], ["aK", old.far], ["x", nxt.sharp], ["a0", nxt.near], ["aJ", nxt.far]].forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u(n), i);
    });
    const R = f.rects, v4 = (n, r) => gl.uniform4f(u(n), r.x, r.y, r.w, r.h);
    gl.uniform2f(u("l"), f.w, f.h);
    gl.uniform2f(u("B"), W, H);
    v4("g", R.old);
    v4("f", R.new || R.old);
    v4("k", R.shape);
    gl.uniform4f(u("af"), R.radii.br, R.radii.tr, R.radii.bl, R.radii.tl);
    gl.uniform1i(u("as"), f.mode);
    gl.uniform1f(u("dI"), f.fade || 0);
    gl.uniform1f(u("V"), R.boxless ? 1 : 0);
    gl.uniform1i(u("dH"), R.clipped ? 1 : 0);
    const s = f.s, c = f.cfg;
    if (s) {
      gl.uniform1i(u("e"), s.launched ? 1 : 0);
      gl.uniform1i(u("K"), s.ring ? 1 : 0);
      gl.uniform2f(u("bx"), s.ox, s.oy);
      const fl = {
        cu: s.tilt,
        df: s.spine,
        T: s.radius,
        by: s.squash,
        a: s.time,
        dg: s.swell,
        bs: s.energy,
        dN: s.pull,
        j: s.glow,
        ai: s.rim,
        aH: s.clear,
        bJ: s.hairClear,
        bK: s.hold,
        O: c.k,
        ct: c.seam,
        er: c.amplitude,
        c7: c.lensWidth,
        c2: c.aberration,
        ay: c.blur,
        an: c.blurNear,
        bI: c.blurAhead,
        bl: c.blurBehind,
        w: c.lead,
        Q: c.tail,
        dG: c.band,
        cs: c.rimWidth,
        s: c.rimSoftness,
        cG: c.uneven,
        bU: c.hairWidth
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
const float cd=1.5707963; float ci(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float cT(float ac){return fract(sin(ac*127.1)*43758.5453);} float P(vec2 b,vec2 J,vec4 n){ n.xy=(b.x>0.0)?n.xy:n.zw;n.x=(b.y>0.0)?n.x:n.y; vec2 W=abs(b)- J + n.x;return min(max(W.x,W.y),0.0)+ length(max(W,0.0))- n.x; } float b9(vec2 J,vec4 n){ return 4.0*(J.x + J.y)- 2.0*(n.x + n.y + n.z + n.w)+ cd*(n.x + n.y + n.z + n.w); } float dB(vec2 b,vec2 J,vec4 n){ float dX=2.0*J.x - n.w - n.y,ck=2.0*J.y - n.y - n.x,bP=2.0*J.x - n.x - n.z,bD=2.0*J.y - n.z - n.w; float dD=dX,dE=dD + cd*n.y,eI=dE + ck,eJ=eI + cd*n.x,eK=eJ + bP,eL=eK + cd*n.z,e1=eL + bD; if(b.x>J.x - n.y&&b.y<-J.y + n.y)return dD +(clamp(atan(b.y + J.y - n.y,b.x - J.x + n.y),-cd,0.0)+ cd)*n.y; if(b.x>J.x - n.x&&b.y>J.y - n.x)return eI + clamp(atan(b.y - J.y + n.x,b.x - J.x + n.x),0.0,cd)*n.x; if(b.x<-J.x + n.z&&b.y>J.y - n.z)return eK +(clamp(atan(b.y - J.y + n.z,b.x + J.x - n.z),cd,2.0*cd)- cd)*n.z; if(b.x<-J.x + n.w&&b.y<-J.y + n.w){ float L=atan(b.y + J.y - n.w,b.x + J.x - n.w);if(L>0.0)L -=4.0*cd; return e1 +(clamp(L,-2.0*cd,-cd)+ 2.0*cd)*n.w; } float eT=J.x - abs(b.x),eU=J.y - abs(b.y); if(eU<eT)return b.y<0.0?clamp(b.x + J.x - n.w,0.0,dX):eJ + clamp(J.x - n.x - b.x,0.0,bP); return b.x>0.0?dE + clamp(b.y + J.y - n.y,0.0,ck):eL + clamp(J.y - n.z - b.y,0.0,bD); } float aa(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float cW(vec3 ac){ vec3 E=floor(ac),q=fract(ac);q=q*q*(3.0 - 2.0*q); return mix(mix(mix(aa(E),aa(E + vec3(1,0,0)),q.x),mix(aa(E + vec3(0,1,0)),aa(E + vec3(1,1,0)),q.x),q.y), mix(mix(aa(E + vec3(0,0,1)),aa(E + vec3(1,0,1)),q.x),mix(aa(E + vec3(0,1,1)),aa(E + vec3(1,1,1)),q.x),q.y),q.z); } float cR(vec3 b){float A=0.0,L=0.5;for(int E=0;E<5;E++){A +=L*cW(b);b=b*2.03 + vec3(13.1,7.7,3.3);L*=0.5;}return A/0.96875;} uniform vec3 az[8];uniform int ab; vec3 h(float cy){ float ac=fract(cy)*float(ab);int E=min(int(floor(ac)),ab - 1);int eX=(E + 1)%ab; return mix(az[E],az[eX],smoothstep(0.0,1.0,fract(ac))); } vec3 d(vec3 D){ float a7=D.x + 0.3963377774*D.y + 0.2158037573*D.z,aM=D.x - 0.1055613458*D.y - 0.0638541728*D.z,A=D.x - 0.0894841775*D.y - 1.2914855480*D.z; a7=a7*a7*a7;aM=aM*aM*aM;A=A*A*A; vec3 ba=clamp(vec3(4.0767416621*a7 - 3.3077115913*aM + 0.2309699292*A,-1.2684380046*a7 + 2.6097574011*aM - 0.3413193965*A,-0.0041960863*a7 - 0.7034186147*aM + 1.7076147010*A),0.0,1.0); return mix(12.92*ba,1.055*pow(ba,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),ba)); } uniform float dh,aI,bd,de,be,bw; vec4 dr(float z,float A,float et,float cm,float ad,float ch){ if(ad<=0.001||abs(z - bw)>aI*6.0 + bd*3.0)return vec4(0.0); float eO=6.2831853*A/et,dR=et/(6.2831853*de); vec3 W=vec3(cos(eO)*dR,sin(eO)*dR,cm*be); float dz=cR(W)- 0.5,el=cR(W*1.9 + vec3(4.1,1.7,cm*be*0.7))- 0.5; float d2=z - bw,bz=d2 + dz*2.4*bd,cM=d2 + el*2.0*bd; float aA=max(dh,0.6); float b2=exp(-(bz*bz)/(aA*aA))+ 0.55*exp(-(cM*cM)/(aA*aA*0.5)); float b5=0.6*exp(-(bz*bz)/(aI*aI))+ 0.28*exp(-abs(d2)/(aI*2.2)); vec3 ae=h(A/et + dz*0.4 + cm*0.03);ae.yz*=1.15; vec3 cJ=d(ae); vec3 eb=mix(cJ,vec3(1.0),0.72 + 0.28*ch); float cw=clamp(b5*ad,0.0,1.0),cL=clamp(b2*ad*(1.0 + ch),0.0,1.0); vec4 m=vec4(cJ*cw,cw); return vec4(eb*cL,cL)+ m*(1.0 - cL); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 dP; uniform float bf,a,c8; uniform vec4 k,af; out vec4 U;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,dP.y*bf - gl_FragCoord.y)/bf; vec2 b7=k.zw*0.5,D=b -(k.xy + b7); float z=P(D,b7,af); float et=b9(b7,af),A=dB(D,b7,af); vec4 cQ=dr(z,A,et,a,c8,0.0); U=vec4(cQ.rgb +(ci(gl_FragCoord.xy)- 0.5)/255.0*cQ.a,cQ.a); }`;
var ELECTRIC_WAVE = `
uniform float co,aP,ao,cB,r,S,c3,cp,bT; float Z(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float bQ(vec3 ac){ vec3 E=floor(ac),q=fract(ac);q=q*q*(3.0 - 2.0*q); return mix(mix(mix(Z(E),Z(E + vec3(1,0,0)),q.x),mix(Z(E + vec3(0,1,0)),Z(E + vec3(1,1,0)),q.x),q.y), mix(mix(Z(E + vec3(0,0,1)),Z(E + vec3(1,0,1)),q.x),mix(Z(E + vec3(0,1,1)),Z(E + vec3(1,1,1)),q.x),q.y),q.z); } float bA(vec3 b,int eD){ float A=0.0,L=0.5,aN=0.0; for(int E=0;E<5;E++){if(E>=eD)break;A +=L*bQ(b);aN +=L;b=b*2.03 + vec3(13.1,7.7,3.3);L*=0.5;} return A/aN; } float v(vec2 W,vec2 b){ if(!e)return 0.0; return(bA(vec3(W/aP,a*ao),3)- 0.5)*2.0*co; } vec3 ar(float cy,float ch){vec3 ae=h(cy);ae.yz*=1.15;return mix(d(ae),vec3(1.0),ch);} vec4 aW(vec3 bo,float L,vec4 m){L=clamp(L,0.0,1.0);return vec4(bo*L,L)+ m*(1.0 - L);} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0)return m; float cg=0.7 + 0.3*bQ(vec3(a*19.0,3.7,0.0)); float aA=max(cB,0.5); if(e&&j>0.001&&abs(i)<S*3.0 + r*3.0 + co){ vec3 ac=vec3(N/(aP*0.55),a*ao*1.6); float dz=bA(ac,4)- 0.5,el=bA(ac*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float bz=i + dz*2.0*S,cM=i + 0.7*S + el*1.8*S; float b2=exp(-bz*bz/(aA*aA))+ 0.6*exp(-cM*cM/(aA*aA*0.5)); float b5=0.55*exp(-bz*bz/(r*r))+ 0.22*exp(-abs(i)/(r*2.2)); float ad=c3*j*cg*c; float cy=0.55 +(K?atan(N.y,N.x)/av:N.x*0.004/O)+ a*0.1; m=aW(ar(cy,0.0),b5*ad,m); m=aW(ar(cy,0.8),b2*ad,m); } if(cp>0.0&&V<0.5&&ai>0.0&&z>-(r*2.5 + S*2.0 + aA*3.0)){ float F=1.0 - smoothstep(-w*0.6,w*0.4,i); float ax=smoothstep(-s,s,i +(T - aH)/a4); float ad=cp*min(ai*bT,1.0)*F*ax*cg*c; if(ad>0.001){ float aN=bA(vec3(D/aP,a*ao),4)- 0.5; float dt=z + aA*2.0 + aN*2.0*S*0.7; float cy=atan(D.y/k.w,D.x/k.z)/av + a*0.2; m=aW(ar(cy,0.0),(0.5*exp(-dt*dt/(r*r*0.6))+ 0.2*exp(-abs(z)/(r*2.0)))*ad,m); m=aW(ar(cy,0.75),exp(-dt*dt/(aA*aA*0.8))*ad,m); } } return m; }
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
  gl.uniform2f(u("dP"), vw, vh);
  gl.uniform1f(u("bf"), dpr);
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
    gl.uniform4f(u("k"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("af"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("c8"), it.level * o.intensity);
    const f = { dh: o.thickness, aI: o.glow, bd: o.chaos, de: o.scale, be: o.crackle, bw: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("az[0]"), it.pal);
    gl.uniform1i(u("ab"), it.palN);
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
    co: c.jag,
    aP: c.scale,
    ao: c.crackle,
    cB: c.boltWidth,
    r: c.boltGlow,
    S: c.chaos,
    c3: c.bolts,
    cp: c.rimBolts,
    bT: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float I,dM,da,aR,c9,cq,cr,bW; float cj(vec2 D){return fract(sin(dot(D,vec2(127.1,311.7)))*43758.5453);} float v(vec2 W,vec2 b){return 0.0;} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0)return m; vec2 au=floor(b/I),aT=(au + 0.5)*I,dv=fract(b/I)*I; float aD=dM*0.5; float ep=step(aD,dv.x)*step(dv.x,I - aD)*step(aD,dv.y)*step(dv.y,I - aD); vec2 b7=k.zw*0.5; float dW=P(aT -(k.xy + b7),b7,af); if(dW>0.0)return m; float c1=floor(a*c9); float bj=cj(au + vec2(c1*0.371,c1*0.137)),bB=cj(au*1.731 + 3.1); aB fc=ah(aT); float o=max(w*da,I*3.0); vec3 cV=d(h(0.5 + au.x*0.021 + au.y*0.013 + a*0.2)); if(e&&j>0.001){ if(fc.d<o&&fc.d>-o*1.8){ bool dw=fc.d +(bB - 0.5)*I*3.0>0.0; vec4 aM=dw?u(y,g,aT,aT):u(x,f,aT,aT); float aA=(1.0 - smoothstep(o*0.25,o,abs(fc.d)))*smoothstep(0.0,0.3,j); float em=step(1.0 - aR*(0.35 + 0.65*aA),bj)*cq*min(j*1.5,1.0); vec4 dC=mix(aM,vec4(cV,1.0),em); dC=vec4(dC.rgb*mix(0.55,1.0,ep),dC.a); m=mix(m,dC,aA*c); }else if(fc.d<=-o*1.8&&fc.d>-Q*1.3){ float e3=1.0 - clamp(-fc.d/(Q*1.3),0.0,1.0); float em=step(1.0 - aR*0.3*e3,bj)*cq*j; m=mix(m,vec4(cV,1.0),em*ep*c); } } if(cr>0.0&&V<0.5&&ai>0.0&&dW>-I*1.2){ float F=1.0 - smoothstep(-w*0.6,w*0.4,fc.d); float ax=smoothstep(-s,s,fc.d +(T - aH)/fc.g); float ad=cr*min(ai*bW,1.0)*F*ax; m=mix(m,vec4(cV,1.0),step(bj,ad)*ep*c); } return m; }
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
    I: c.cell,
    dM: c.gap,
    da: c.zone,
    aR: c.density,
    c9: c.rate,
    cq: c.lit,
    cr: c.rimPixels,
    bW: 1 / Math.max(c.rimStrength, 0.05)
  })
});

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dc,db,cF,cE,dd; float v(vec2 W,vec2 b){return 0.0;} vec4 ca(vec2 b,vec2 H,float aU){return mix(u(x,f,b,H),u(y,g,b,H),smoothstep(-1.5,1.5,aU));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float bj=cF*0.5,ac=(i + bj)/bj; if(c<=0.0||!e||j<0.001||abs(ac)>=1.0)return m; vec2 aN=ah(b).n; float A=sqrt(1.0 - ac*ac),cK=ac/max(A,0.3),ad=min(j*1.5,1.0); vec2 b3=aN*(dc*cK*ad),cQ=aN*(db*cK*ad); float cO=i - dot(b3,aN); vec4 n=ca(b,b - b3 - cQ,cO - dot(cQ,aN)),aD=ca(b,b - b3,cO),J=ca(b,b - b3 + cQ,cO + dot(cQ,aN)); vec4 a5=vec4(n.r,aD.g,J.b,max(max(n.a,aD.a),J.a)); a5 +=m*(1.0 - a5.a); float X=(K?atan(N.y,N.x)/av:N.x*0.003/O)+ a*0.08; vec3 bc=d(h(X + ac*0.15)); a5.rgb=mix(a5.rgb,a5.rgb*bc,dd*A); float cZ=exp(-pow((ac + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(X*40.0 + a*2.0))+ 0.45*exp(-pow((ac - 0.55)/0.08,2.0)); float d7=pow(1.0 - A,3.0); float eZ=clamp((cZ + d7*0.8)*cE,0.0,1.0)*a5.a; a5=vec4(mix(a5.rgb,mix(bc,vec3(1.0),0.75)*a5.a,eZ),a5.a); return mix(m,a5,smoothstep(1.0,0.85,abs(ac))*ad*c); }
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
  uniforms: (c) => ({ dc: c.refraction, db: c.dispersion, cF: c.thickness, cE: c.shine, dd: c.tint })
});

// src/effects/burn.js
var BURN_WAVE = `
uniform float cz,br,bS,aG,bq,cA; float aq(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bO(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(aq(E),aq(E + vec2(1,0)),q.x),mix(aq(E + vec2(0,1)),aq(E + vec2(1,1)),q.x),q.y); } float dY(vec2 b){float A=0.0,L=0.5;for(int E=0;E<4;E++){A +=L*bO(b);b=b*2.07 + vec2(5.3,1.7);L*=0.5;}return A/0.9375;} float v(vec2 W,vec2 b){ if(!e)return 0.0; return(dY(b/br + vec2(0.0,a*0.12))- 0.5)*2.0*cz; } vec3 aw(float cm){return vec3(smoothstep(0.0,0.45,cm),smoothstep(0.3,0.8,cm),smoothstep(0.65,1.0,cm));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0||!e||j<0.001)return m; float ad=min(j*1.5,1.0),aN=bO(b/(br*0.18)+ a*0.7); if(i>0.0&&i<bS){ float ev=pow(1.0 - i/bS,1.6)*(0.75 + 0.5*aN); m.rgb=mix(m.rgb,m.rgb*vec3(0.55,0.32,0.16),clamp(ev*1.6,0.0,1.0)*ad); m.rgb*=1.0 - smoothstep(0.45,0.95,ev)*0.92*ad; } if(i<0.0)m.rgb*=1.0 - cA*0.7*exp(i/(aG*2.5))*(0.6 + 0.4*aN)*ad; float cQ=exp(-pow(i/aG,2.0))*(0.7 + 0.6*aN); float cm=clamp(cQ,0.0,1.0); vec3 eW=mix(aw(cm),d(h(0.3 + aN*0.4 + a*0.1)),0.3*(1.0 - cm)); float cw=clamp(exp(-abs(i)/(aG*2.2))*0.6*(0.6 + 0.4*aN)*ad,0.0,1.0)*c; m=vec4(aw(0.42)*cw,cw*0.5)+ m*(1.0 - cw*0.5); float L=clamp(smoothstep(0.08,0.6,cQ)*ad,0.0,1.0)*c; m=vec4(eW*L,L)+ m*(1.0 - L); if(bq>0.0&&i<aG&&i>-Q){ float ag=9.0*O + 4.0; vec2 aD=(b + vec2(0.0,a*38.0*O))/ag,au=floor(aD),q=fract(aD)- 0.5; float bj=aq(au),bB=aq(au + 7.3); vec2 bn=(vec2(bj,bB)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + bj*9.0),0.0); float aU=length(q - bn)*ag,n=0.8 + 1.5*bB; float ej=step(1.0 - bq*0.45*(1.0 - clamp(-i/Q,0.0,1.0)),bj); float e4=0.6 + 0.4*sin(a*12.0 + bj*40.0); float b4=clamp(exp(-aU*aU/(n*n))*ej*e4*ad,0.0,1.0)*c; m=vec4(aw(0.45 + 0.3*bB)*b4,b4)+ m*(1.0 - b4); } return m; }
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
  uniforms: (c) => ({ cz: c.roughness, br: c.scale, bS: c.char, aG: c.heat, bq: c.embers, cA: c.smoke })
});

// src/effects/ink.js
var INK_WAVE = `
uniform float bu,bv,bg,cC,c6,dK; float aY(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float a6(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(aY(E),aY(E + vec2(1,0)),q.x),mix(aY(E + vec2(0,1)),aY(E + vec2(1,1)),q.x),q.y); } float ec(vec2 b){float A=0.0,L=0.5;for(int E=0;E<4;E++){A +=L*a6(b);b=b*2.11 + vec2(3.1,8.7);L*=0.5;}return A/0.9375;} float v(vec2 W,vec2 b){ if(!e)return 0.0; return(ec(b/bv + a*0.04)- 0.5)*2.0*bu +(a6(b/(bv*0.12))- 0.5)*bu*0.35; } vec4 cU(vec2 b,float aU){return mix(u(x,f,b,b),u(y,g,b,b),step(0.0,aU));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float o=max(w*c6,24.0*O); if(c<=0.0||!e||j<0.001||i>o||i<-o*1.6)return m; float ad=min(j*1.5,1.0); vec2 aN=ah(b).n,bn=vec2(bg,bg*0.55); vec4 L=cU(b + bn,i + dot(bn,aN)),J=cU(b - bn,i - dot(bn,aN)); float aE=mix(0.5,0.25 + 0.3*ci(floor(b*1.2))+ 0.2*a6(b*0.5),cC); vec3 cL=L.a>0.0?L.rgb/L.a:vec3(1.0),eS=J.a>0.0?J.rgb/J.a:vec3(1.0); float d0=smoothstep(aE - 0.12,aE + 0.12,(1.0 - cL.g)*1.05); float d1=smoothstep(aE - 0.12,aE + 0.12,(1.0 - eS.r)*1.05); vec3 ed=d(az[0]),ee=d(az[1%ab]); vec3 dA=vec3(0.965,0.945,0.9); vec3 p=dA*mix(vec3(1.0),ed,d0*0.95)*mix(vec3(1.0),ee,d1*0.85); float en=(1.0 - smoothstep(0.0,dK,-i))*step(i,0.0)*smoothstep(0.15,0.55,aE + 0.25); vec3 ef=d(h((K?atan(N.y,N.x)/av:N.x*0.002/O)+ a*0.05)); p*=mix(vec3(1.0),ef,en*0.9); float eu=max(max(L.a,J.a),m.a); float aA=(1.0 - smoothstep(o*0.35,o,i>0.0?i:-i/1.6))*ad*c; return mix(m,vec4(p*eu,eu),aA); }
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
  uniforms: (c) => ({ bu: c.bleed, bv: c.scale, bg: c.misregister, cC: c.grain, c6: c.zone, dK: c.ink })
});

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float ap,bt,c5,c4,dJ; float v(vec2 W,vec2 b){return 0.0;} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float o=max(w*c5,ap*3.0); if(c<=0.0||!e||j<0.001||i>o*1.2||i<-o*2.0)return m; vec2 aD=bp(bt)*b/ap,au=floor(aD)+ 0.5,aT=bp(-bt)*(au*ap); float cN=ah(aT).d; vec4 aM=cN>0.0?u(y,g,aT,aT):u(x,f,aT,aT); if(aM.a<0.01)aM=cN>0.0?u(y,g,b,b):u(x,f,b,b); vec3 p=aM.rgb/max(aM.a,1e-3); float a7=dot(p,vec3(0.299,0.587,0.114)); float aA=1.0 - smoothstep(o*0.1,o,cN>0.0?cN:-cN/1.6),ad=min(j*1.5,1.0); bool b8=a7>0.5; float n=ap*0.5*c4*sqrt(clamp((b8?1.0 - a7:a7)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aA); float aU=length((fract(aD)- 0.5)*ap),dq=l.x/B.x; float Y=clamp((n - aU)/dq + 0.5,0.0,1.0); vec3 ey=d(h(au.x*0.021 + au.y*0.034 + a*0.15)); vec3 d4=mix(b8?p*0.2:p,ey,dJ*aA*aA),ew=b8?mix(p,vec3(1.0),0.4):p*0.14; vec4 bj=vec4(mix(ew,d4,Y)*aM.a,aM.a); return mix(m,bj,smoothstep(0.0,0.35,aA)*ad*c); }
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
  uniforms: (c) => ({ ap: c.cell, bt: c.angle, c5: c.zone, c4: c.size, dJ: c.ink })
});

// src/effects/metal.js
var METAL_WAVE = `
uniform float aQ,dL,cb,cD,bV; float v(vec2 W,vec2 b){ if(!e)return 0.0; float A=K?atan(W.y,W.x)*2.0:W.x/(80.0*O); return dL*(0.6*sin(A*1.3 + a*2.1)+ 0.4*sin(A*2.9 - a*2.7 + 1.3)); } vec3 ek(vec3 n,float cy){ float e5=-n.y; vec3 eN=mix(vec3(0.62,0.66,0.74),d(h(cy)),0.35); vec3 D=mix(vec3(0.05,0.055,0.07),eN,smoothstep(-0.25,0.35,e5)); D +=vec3(1.0)*exp(-pow((e5 - 0.05)/0.07,2.0))*0.9; D +=vec3(0.9)*exp(-pow((e5 - 0.75)/0.12,2.0))*0.5; return D; } vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float bj=aQ*0.5,ac=(i + bj*0.9)/bj; if(c<=0.0||!e||j<0.001||abs(ac)>=1.0)return m; vec2 aN=ah(b).n; float ad=min(j*1.5,1.0),A=sqrt(1.0 - ac*ac); float eM=K?atan(N.y,N.x)*9.0:N.x*0.07/O; float eH=0.6*sin(eM + a*3.0)+ 0.4*sin(eM*2.3 - a*2.1 + ac*2.0); vec3 e6=normalize(vec3(aN*ac + vec2(-aN.y,aN.x)*eH*cb*0.3,A)); vec3 dR=reflect(vec3(0.0,0.0,-1.0),e6); float X=(K?atan(N.y,N.x)/av:N.x*0.002/O)+ a*0.05; vec3 p=ek(dR,X); vec2 H=b + dR.xy*aQ*0.6; vec4 aM=mix(u(x,f,b,H),u(y,g,b,H),step(0.0,i + dot(dR.xy,aN)*aQ*0.6)); p=mix(p,aM.rgb/max(aM.a,1e-3),bV*aM.a*(0.4 + 0.6*A)); vec3 e7=normalize(vec3(-0.35,-0.6,0.72)); p +=pow(max(dot(e6,e7),0.0),60.0)*cD*1.4; p*=mix(0.35,1.0,smoothstep(0.0,0.45,A)); float L=smoothstep(1.0,0.86,abs(ac))*ad*c; return vec4(clamp(p,0.0,1.0)*L,L)+ m*(1.0 - L); }
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
  uniforms: (c) => ({ aQ: c.thickness, dL: c.wobble, cb: c.ripple, cD: c.shine, bV: c.reflect })
});

// src/effects/water.js
var WATER_WAVE = `
uniform float R,dm,dk,dl,dn; float a2(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bi(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(a2(E),a2(E + vec2(1,0)),q.x),mix(a2(E + vec2(0,1)),a2(E + vec2(1,1)),q.x),q.y); } float v(vec2 W,vec2 b){ if(!e)return 0.0; return(bi(b/(R*2.5)+ a*0.3)- 0.5)*R*0.5; } vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0||!e||j<0.001||i>R*1.5||i<-Q*1.6)return m; vec2 aN=ah(b).n; float ad=min(j*1.5,1.0); float bR=i>0.0?exp(-i/(R*0.35)):exp(i/(Q*0.8)); float eF=av*i/R + a*7.0; vec2 cH=b/R; vec2 cl=vec2(sin(cH.y*1.7 + a*1.6)+ sin(cH.x*1.1 - a*1.2 + cH.y*0.6), cos(cH.x*1.9 - a*1.4)+ cos(cH.y*1.2 + a*1.1 + cH.x*0.7))*0.3; vec2 b3=(aN*cos(eF)+ cl)*dm*bR*ad; vec2 H=b - b3; float cO=i + dot(b3,aN); vec4 A=mix(u(x,f,b,H),u(y,g,b,H),smoothstep(-1.5,1.5,cO)); A +=m*(1.0 - A.a); vec3 bc=d(h(0.4 + i*0.0015/O + a*0.04)); vec3 bo=mix(A.rgb,A.rgb*bc*1.15,dn*bR); vec2 ds=b/(R*0.45)+ cl*2.0; float dQ=sin(ds.x + sin(ds.y*1.3 + a*1.5))+ sin(ds.y*1.1 + sin(ds.x*0.9 - a*1.7)); float dZ=pow(clamp(1.0 - abs(dQ)*0.7,0.0,1.0),5.0); bo +=(dZ*dk*0.4 + smoothstep(0.8,1.0,sin(eF + 0.9))*0.22*bR)*bR*A.a*mix(bc,vec3(1.0),0.5); float eV=bi(b/5.0 + vec2(a*2.0,0.0))*0.6 + bi(b/13.0 - a)*0.4; float d6=smoothstep(0.35,0.7,eV + 0.45 - abs(i + R*0.15)/max(R*0.35,1.0))*dl; bo=mix(bo,vec3(0.97,0.99,1.0)*A.a,clamp(d6,0.0,1.0)); return mix(m,vec4(bo,A.a),clamp(bR*3.0,0.0,1.0)*ad*c); }
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
  uniforms: (c) => ({ R: c.wavelength, dm: c.refraction, dk: c.caustics, dl: c.foam, dn: c.tint })
});

// src/effects/vine.js
var VINE_WAVE = `
uniform float t,dj,bX,bY,G,di,bL; float at(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float cv(vec2 b,float n,float aU){ b=abs(b);float J=sqrt(n*n - aU*aU); return(b.y - J)*aU>b.x*J?length(b - vec2(0.0,J)):length(b + vec2(aU,0.0))- n; } float v(vec2 W,vec2 b){ if(!e)return 0.0; float A=(K?atan(W.y,W.x)*40.0*O:W.x)/max(t*1.6,1.0); return di*(abs(sin(A + a*0.6))*0.7 + abs(sin(A*2.3 - a*0.4 + 1.7))*0.3); } vec3 bZ(float bj){return mix(d(h(bj)),vec3(0.11,0.3,0.12),0.15);} vec4 bM(vec2 b,vec2 bG,float ag,float eg,float eo){ vec2 aD=(b + bG)/ag,au=floor(aD); float bj=at(au),bB=at(au + 4.7),d8=at(au + 9.1); if(bj>eg)return vec4(0.0); vec2 bk=(fract(aD)- 0.5 -(vec2(bB,d8)- 0.5)*0.5)*ag; float L=bj*av + eo*(bB - 0.5)*2.0; bk=bp(L)*bk; float eq=ag*(0.7 + 0.35*d8); float aU=cv(bk,eq*0.5,eq*0.32); float dq=l.x/B.x; float Y=clamp(0.5 - aU/dq,0.0,1.0); if(Y<=0.0)return vec4(0.0); float eG=1.0 - smoothstep(0.0,dq*1.2,abs(bk.x))*1.0; vec3 p=bZ(bB*0.8 + d8*0.2)*(0.8 + 0.35*clamp(bk.x/eq + 0.5,0.0,1.0)); p=mix(p,p*1.45,eG*0.6); return vec4(p*Y,Y); } vec4 aL(vec4 m,vec4 a7,float ad){a7*=ad;return a7 + m*(1.0 - a7.a);} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(!e||j<0.001)return m; float ad=min(j*1.5,1.0)*c,o=max(w*dj,t*3.0); if(c>0.0){ if(i<o*0.35&&i>-o*1.6){ float cP=i>0.0?1.0 - i/(o*0.35):1.0 - smoothstep(o*0.2,o*1.6,-i); m=aL(m,bM(b,vec2(0.0),t,cP*0.95,0.0),ad); m=aL(m,bM(b,vec2(t*0.5,t*0.37),t*0.8,cP*0.8,0.0),ad); } if(bX>0.0&&i<-o*0.3&&i>-Q*1.4){ float cm=a,ag=t*1.9; vec2 bG=vec2(sin(cm*1.3 + b.y*0.02)*ag*0.35,-cm*42.0*O); float bD=1.0 - clamp(-i/(Q*1.4),0.0,1.0); m=aL(m,bM(b,bG,ag,bX*0.28*bD,cm*2.0),ad); } } if(bY>0.0&&V<0.5&&ai>0.0&&z>-G*8.0 - t){ float F=1.0 - smoothstep(-w*0.6,w*0.4,i); float ax=smoothstep(-s,s,i +(T - aH)/a4); float eh=bY*min(ai*bL,1.0)*F*ax*clamp(0.5 - z*(B.x/l.x)+ G*8.0,0.0,1.0); if(eh>0.001){ float eE=2.0*(k.z + k.w),A=(atan(D.y/k.w,D.x/k.z)/av + 0.5)*eE; float eP=sin(A/(t*1.3))*G*1.6 + sin(A/(t*0.55)+ 1.3)*G*0.5; float aU=z + G*2.5 + eP; float cY=clamp(G*0.5 - abs(aU)+ 0.5,0.0,1.0); vec3 e2=vec3(0.2,0.36,0.14)*(0.8 + 0.4*smoothstep(-G,G,aU)); m=aL(m,vec4(e2*cY,cY),eh); float bH=t*1.1,E=floor(A/bH),cX=mod(E,2.0)*2.0 - 1.0; vec2 bk=vec2(fract(A/bH)- 0.5,0.0)*bH; bk.y=aU + cX*t*0.32; bk=bp(cX*0.9)*bk; float eB=t*(0.5 + 0.25*at(vec2(E,1.0))); float eY=cv(bk.yx,eB*0.5,eB*0.32); float eA=clamp(0.5 - eY*(B.x/l.x),0.0,1.0)*step(0.25,at(vec2(E,3.0))); m=aL(m,vec4(bZ(at(vec2(E,2.0)))*eA,eA),eh); } } return m; }
`;
var VINE_DOTS = `#version 300 es
precision highp float;in float bm;in float bN;in float aS;out vec4 m; void main(){ float L=bm*7.0 + bN*2.0,D=cos(L),A=sin(L); vec2 b=mat2(D,A,-A,D)*(gl_PointCoord - 0.5)*aS; float n=bN*1.4,aA=n*0.62,J=sqrt(n*n - aA*aA); vec2 W=abs(b); float aU=(W.y - J)*aA>W.x*J?length(W - vec2(0.0,J)):length(W + vec2(aA,0.0))- n; float Y=clamp(0.5 - aU,0.0,1.0)*bm; vec3 aD=mix(vec3(0.33,0.7,0.25),vec3(0.62,0.86,0.3),fract(bN*3.7)); m=vec4(aD*Y,Y); }`;
var PRESET9 = { palette: ["#3FA34D", "#7BC950", "#2E7D32", "#A5D86E", "#1B5E20"], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
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
    t: c.leaf,
    dj: c.zone,
    bX: c.fall,
    bY: c.vine,
    G: c.vineWidth,
    di: c.bumps,
    bL: 1 / Math.max(c.rimStrength, 0.05)
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
