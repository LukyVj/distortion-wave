// focus.js — keep keyboard focus on the equivalent control when an update replaces it
// Part of distortion-wave · MIT © Lucas Bonomi

// Keyboard focus
// The wave never touches focus (the target only goes opacity:0, so it stays focusable and
// in the accessibility tree). But if update() REPLACES the focused node (innerHTML, re-render),
// the browser drops focus to <body>. We then move it to the equivalent control:
// same id → same data-focus-key/name → same place in the tree → same rank among
// focusable elements → the target itself.
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
export function captureFocus(root) {
  const el = document.activeElement;
  if (!el || el === document.body || !root.contains(el)) return null;
  const path = [];
  for (let n = el; n && n !== root; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
  const sel = 'selectionStart' in el ? (() => { try { return [el.selectionStart, el.selectionEnd]; } catch { return null; } })() : null;
  return { el, id: el.id, key: el.getAttribute('data-focus-key') || el.getAttribute('name'), tag: el.localName, path,
    order: [...root.querySelectorAll(FOCUSABLE)].indexOf(el), sel };
}
export function restoreFocus(info, root) {
  if (!info || info.el.isConnected) return;                              // node kept: focus never moved
  const now = document.activeElement;
  if (now && now !== document.body && now !== document.documentElement) return;   // the app moved focus itself: leave it
  let c = null;
  if (info.id) c = root.querySelector('#' + CSS.escape(info.id));
  if (!c && info.key) c = root.querySelector(`[data-focus-key="${CSS.escape(info.key)}"],[name="${CSS.escape(info.key)}"]`);
  if (!c) { let n = root; for (const i of info.path) n = n?.children[i]; if (n && n !== root && n.localName === info.tag && n.matches(FOCUSABLE)) c = n; }
  if (!c && info.order >= 0) { const f = root.querySelectorAll(FOCUSABLE); c = f[Math.min(info.order, f.length - 1)] || null; }
  if (!c && root.matches(FOCUSABLE)) c = root;
  if (!c) return;
  c.focus({ preventScroll: true });
  if (info.sel && typeof c.setSelectionRange === 'function') try { c.setSelectionRange(info.sel[0], info.sel[1]); } catch {}
}

