/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

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
  gl.uniform2f(u("eB"), vw, vh);
  gl.uniform1f(u("bE"), dpr);
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
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
