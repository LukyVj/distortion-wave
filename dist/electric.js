/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/shaders.js
var COMMON = `
const float bV=1.5707963; float b0(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float cB(float V){return fract(sin(V*127.1)*43758.5453);} float J(vec2 b,vec2 H,vec4 m){ m.xy=(b.x>0.0)?m.xy:m.zw;m.x=(b.y>0.0)?m.x:m.y; vec2 ac=abs(b)- H + m.x;return min(max(ac.x,ac.y),0.0)+ length(max(ac,0.0))- m.x; } float bQ(vec2 H,vec4 m){ return 4.0*(H.x + H.y)- 2.0*(m.x + m.y + m.z + m.w)+ bV*(m.x + m.y + m.z + m.w); } float dh(vec2 b,vec2 H,vec4 m){ float dE=2.0*H.x - m.w - m.y,b2=2.0*H.y - m.y - m.x,by=2.0*H.x - m.x - m.z,cE=2.0*H.y - m.z - m.w; float dj=dE,dk=dj + bV*m.y,eg=dk + b2,eh=eg + bV*m.x,ei=eh + by,ej=ei + bV*m.z,ey=ej + cE; if(b.x>H.x - m.y&&b.y<-H.y + m.y)return dj +(clamp(atan(b.y + H.y - m.y,b.x - H.x + m.y),-bV,0.0)+ bV)*m.y; if(b.x>H.x - m.x&&b.y>H.y - m.x)return eg + clamp(atan(b.y - H.y + m.x,b.x - H.x + m.x),0.0,bV)*m.x; if(b.x<-H.x + m.z&&b.y>H.y - m.z)return ei +(clamp(atan(b.y - H.y + m.z,b.x + H.x - m.z),bV,2.0*bV)- bV)*m.z; if(b.x<-H.x + m.w&&b.y<-H.y + m.w){ float M=atan(b.y + H.y - m.w,b.x + H.x - m.w);if(M>0.0)M -=4.0*bV; return ey +(clamp(M,-2.0*bV,-bV)+ 2.0*bV)*m.w; } float er=H.x - abs(b.x),es=H.y - abs(b.y); if(es<er)return b.y<0.0?clamp(b.x + H.x - m.w,0.0,dE):eh + clamp(H.x - m.x - b.x,0.0,by); return b.x>0.0?dk + clamp(b.y + H.y - m.y,0.0,b2):ej + clamp(H.y - m.z - b.y,0.0,cE); } float T(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float cG(vec3 V){ vec3 D=floor(V),k=fract(V);k=k*k*(3.0 - 2.0*k); return mix(mix(mix(T(D),T(D + vec3(1,0,0)),k.x),mix(T(D + vec3(0,1,0)),T(D + vec3(1,1,0)),k.x),k.y), mix(mix(T(D + vec3(0,0,1)),T(D + vec3(1,0,1)),k.x),mix(T(D + vec3(0,1,1)),T(D + vec3(1,1,1)),k.x),k.y),k.z); } float cz(vec3 b){float z=0.0,M=0.5;for(int D=0;D<5;D++){z +=M*cG(b);b=b*2.03 + vec3(13.1,7.7,3.3);M*=0.5;}return z/0.96875;} uniform vec3 aq[8];uniform int U; vec3 h(float cf){ float V=fract(cf)*float(U);int D=min(int(floor(V)),U - 1);int ev=(D + 1)%U; return mix(aq[D],aq[ev],smoothstep(0.0,1.0,fract(V))); } vec3 d(vec3 E){ float br=E.x + 0.3963377774*E.y + 0.2158037573*E.z,aA=E.x - 0.1055613458*E.y - 0.0638541728*E.z,z=E.x - 0.0894841775*E.y - 1.2914855480*E.z; br=br*br*br;aA=aA*aA*aA;z=z*z*z; vec3 a0=clamp(vec3(4.0767416621*br - 3.3077115913*aA + 0.2309699292*z,-1.2684380046*br + 2.6097574011*aA - 0.3413193965*z,-0.0041960863*br - 0.7034186147*aA + 1.7076147010*z),0.0,1.0); return mix(12.92*a0,1.055*pow(a0,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),a0)); } uniform float cZ,ax,a3,cW,a5,bj; vec4 c7(float w,float z,float d5,float c6,float ae,float bZ){ if(ae<=0.001||abs(w - bj)>ax*6.0 + a3*3.0)return vec4(0.0); float em=6.2831853*z/d5,dy=d5/(6.2831853*cW); vec3 ac=vec3(cos(em)*dy,sin(em)*dy,c6*a5); float df=cz(ac)- 0.5,dZ=cz(ac*1.9 + vec3(4.1,1.7,c6*a5*0.7))- 0.5; float dJ=w - bj,bn=dJ + df*2.4*a3,cv=dJ + dZ*2.0*a3; float aH=max(cZ,0.6); float bJ=exp(-(bn*bn)/(aH*aH))+ 0.55*exp(-(cv*cv)/(aH*aH*0.5)); float bM=0.6*exp(-(bn*bn)/(ax*ax))+ 0.28*exp(-abs(dJ)/(ax*2.2)); vec3 W=h(z/d5 + df*0.4 + c6*0.03);W.yz*=1.15; vec3 cr=d(W); vec3 dR=mix(cr,vec3(1.0),0.72 + 0.28*bZ); float cd=clamp(bM*ae,0.0,1.0),ct=clamp(bJ*ae*(1.0 + bZ),0.0,1.0); vec4 p=vec4(cr*cd,cd); return vec4(dR*ct,ct)+ p*(1.0 - ct); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 dw; uniform float a6,a,cQ; uniform vec4 o,X; out vec4 P;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,dw.y*a6 - gl_FragCoord.y)/a6; vec2 bO=o.zw*0.5,E=b -(o.xy + bO); float w=J(E,bO,X); float d5=bQ(bO,X),z=dh(E,bO,X); vec4 cy=c7(w,z,d5,a,cQ,0.0); P=vec4(cy.rgb +(b0(gl_FragCoord.xy)- 0.5)/255.0*cy.a,cy.a); }`;
var ELECTRIC_WAVE = `
uniform float b6,aD,aj,ci,l,O,cL,b7,bC; float S(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float bz(vec3 V){ vec3 D=floor(V),k=fract(V);k=k*k*(3.0 - 2.0*k); return mix(mix(mix(S(D),S(D + vec3(1,0,0)),k.x),mix(S(D + vec3(0,1,0)),S(D + vec3(1,1,0)),k.x),k.y), mix(mix(S(D + vec3(0,0,1)),S(D + vec3(1,0,1)),k.x),mix(S(D + vec3(0,1,1)),S(D + vec3(1,1,1)),k.x),k.y),k.z); } float bo(vec3 b,int ed){ float z=0.0,M=0.5,aB=0.0; for(int D=0;D<5;D++){if(D>=ed)break;z +=M*bz(b);aB +=M;b=b*2.03 + vec3(13.1,7.7,3.3);M*=0.5;} return z/aB; } float v(vec2 ac,vec2 b){ if(!e)return 0.0; return(bo(vec3(ac/aD,a*aj),3)- 0.5)*2.0*b6; } vec3 am(float cf,float bZ){vec3 W=h(cf);W.yz*=1.15;return mix(d(W),vec3(1.0),bZ);} vec4 aL(vec3 bc,float M,vec4 p){M=clamp(M,0.0,1.0);return vec4(bc*M,M)+ p*(1.0 - M);} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); if(c<=0.0)return p; float bY=0.7 + 0.3*bz(vec3(a*19.0,3.7,0.0)); float aH=max(ci,0.5); if(e&&i>0.001&&abs(j)<O*3.0 + l*3.0 + b6){ vec3 V=vec3(I/(aD*0.55),a*aj*1.6); float df=bo(V,4)- 0.5,dZ=bo(V*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float bn=j + df*2.0*O,cv=j + 0.7*O + dZ*1.8*O; float bJ=exp(-bn*bn/(aH*aH))+ 0.6*exp(-cv*cv/(aH*aH*0.5)); float bM=0.55*exp(-bn*bn/(l*l))+ 0.22*exp(-abs(j)/(l*2.2)); float ae=cL*i*bY*c; float cf=0.55 +(K?atan(I.y,I.x)/aF:I.x*0.004/Q)+ a*0.1; p=aL(am(cf,0.0),bM*ae,p); p=aL(am(cf,0.8),bJ*ae,p); } if(b7>0.0&&aa<0.5&&ar>0.0&&w>-(l*2.5 + O*2.0 + aH*3.0)){ float N=1.0 - smoothstep(-B*0.6,B*0.4,j); float aX=smoothstep(-u,u,j +(Y - a4)/bp); float ae=b7*min(ar*bC,1.0)*N*aX*bY*c; if(ae>0.001){ float aB=bo(vec3(E/aD,a*aj),4)- 0.5; float c9=w + aH*2.0 + aB*2.0*O*0.7; float cf=atan(E.y/o.w,E.x/o.z)/aF + a*0.2; p=aL(am(cf,0.0),(0.5*exp(-c9*c9/(l*l*0.6))+ 0.2*exp(-abs(w)/(l*2.0)))*ae,p); p=aL(am(cf,0.75),exp(-c9*c9/(aH*aH*0.8))*ae,p); } } return p; }
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
out vec2 bG; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));bG=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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
  gl.uniform2f(u("dw"), vw, vh);
  gl.uniform1f(u("a6"), dpr);
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
    gl.uniform4f(u("o"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("X"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("cQ"), it.level * o.intensity);
    const f = { cZ: o.thickness, ax: o.glow, a3: o.chaos, cW: o.scale, a5: o.crackle, bj: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("aq[0]"), it.pal);
    gl.uniform1i(u("U"), it.palN);
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
    b6: c.jag,
    aD: c.scale,
    aj: c.crackle,
    ci: c.boltWidth,
    l: c.boltGlow,
    O: c.chaos,
    cL: c.bolts,
    b7: c.rimBolts,
    bC: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
