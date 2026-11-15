/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

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
  gl.uniform2f(u("d5"), vw, vh);
  gl.uniform1f(u("br"), dpr);
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
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
