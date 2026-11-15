/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

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

// src/core.js
var TAU = Math.PI * 2;
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
  const fit = (side, a, b) => a + b > 0 ? side / (a + b) : Infinity;
  const f = Math.min(1, fit(w, r.tl, r.tr), fit(w, r.bl, r.br), fit(h, r.tl, r.bl), fit(h, r.tr, r.br));
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
  let alive = false;
  for (const it of items) {
    const o = it.o, goal = it.on ? 1 : 0, rate = dt / (goal > it.level ? o.fadeIn : o.fadeOut);
    it.level = goal > it.level ? Math.min(goal, it.level + rate) : Math.max(goal, it.level - rate);
    if (it.level > 0 || goal > 0) alive = true;
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
  if (alive) raf = requestAnimationFrame(frame);
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
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
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
    c.boltWidth = Math.max(v("boltWidth") * clamp(k, 0.6, 1.3), 0.6);
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
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
