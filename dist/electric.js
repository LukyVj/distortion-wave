/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/shaders.js
var COMMON = `
const float bj=1.5707963; float bM(vec2 b){return fract(52.9829189*fract(dot(b,vec2(0.06711056,0.00583715))));} float bK(float al){return fract(sin(al*127.1)*43758.5453);} float o(vec2 b,vec2 B,vec4 h){ h.xy=(b.x>0.0)?h.xy:h.zw;h.x=(b.y>0.0)?h.x:h.y; vec2 ag=abs(b)- B + h.x;return min(max(ag.x,ag.y),0.0)+ length(max(ag,0.0))- h.x; } float bg(vec2 B,vec4 h){ return 4.0*(B.x + B.y)- 2.0*(h.x + h.y + h.z + h.w)+ bj*(h.x + h.y + h.z + h.w); } float cd(vec2 b,vec2 B,vec4 h){ float cv=2.0*B.x - h.w - h.y,br=2.0*B.y - h.y - h.x,aZ=2.0*B.x - h.x - h.z,bN=2.0*B.y - h.z - h.w; float cf=cv,cg=cf + bj*h.y,cU=cg + br,cV=cU + bj*h.x,cW=cV + aZ,cX=cW + bj*h.z,da=cX + bN; if(b.x>B.x - h.y&&b.y<-B.y + h.y)return cf +(clamp(atan(b.y + B.y - h.y,b.x - B.x + h.y),-bj,0.0)+ bj)*h.y; if(b.x>B.x - h.x&&b.y>B.y - h.x)return cU + clamp(atan(b.y - B.y + h.x,b.x - B.x + h.x),0.0,bj)*h.x; if(b.x<-B.x + h.z&&b.y>B.y - h.z)return cW +(clamp(atan(b.y - B.y + h.z,b.x + B.x - h.z),bj,2.0*bj)- bj)*h.z; if(b.x<-B.x + h.w&&b.y<-B.y + h.w){ float Y=atan(b.y + B.y - h.w,b.x + B.x - h.w);if(Y>0.0)Y -=4.0*bj; return da +(clamp(Y,-2.0*bj,-bj)+ 2.0*bj)*h.w; } float c3=B.x - abs(b.x),c4=B.y - abs(b.y); if(c4<c3)return b.y<0.0?clamp(b.x + B.x - h.w,0.0,cv):cV + clamp(B.x - h.x - b.x,0.0,aZ); return b.x>0.0?cg + clamp(b.y + B.y - h.y,0.0,br):cX + clamp(B.y - h.z - b.y,0.0,bN); } float v(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float bP(vec3 al){ vec3 L=floor(al),j=fract(al);j=j*j*(3.0 - 2.0*j); return mix(mix(mix(v(L),v(L + vec3(1,0,0)),j.x),mix(v(L + vec3(0,1,0)),v(L + vec3(1,1,0)),j.x),j.y), mix(mix(v(L + vec3(0,0,1)),v(L + vec3(1,0,1)),j.x),mix(v(L + vec3(0,1,1)),v(L + vec3(1,1,1)),j.x),j.y),j.z); } float bI(vec3 b){float T=0.0,Y=0.5;for(int L=0;L<5;L++){T +=Y*bP(b);b=b*2.03 + vec3(13.1,7.7,3.3);Y*=0.5;}return T/0.96875;} uniform vec3 aE[8];uniform int J; vec3 k(float bS){ float al=fract(bS)*float(J);int L=min(int(floor(al)),J - 1);int c8=(L + 1)%J; return mix(aE[L],aE[c8],smoothstep(0.0,1.0,fract(al))); } vec3 g(vec3 s){ float bf=s.x + 0.3963377774*s.y + 0.2158037573*s.z,a3=s.x - 0.1055613458*s.y - 0.0638541728*s.z,T=s.x - 0.0894841775*s.y - 1.2914855480*s.z; bf=bf*bf*bf;a3=a3*a3*a3;T=T*T*T; vec3 ay=clamp(vec3(4.0767416621*bf - 3.3077115913*a3 + 0.2309699292*T,-1.2684380046*bf + 2.6097574011*a3 - 0.3413193965*T,-0.0041960863*bf - 0.7034186147*a3 + 1.7076147010*T),0.0,1.0); return mix(12.92*ay,1.055*pow(ay,vec3(1.0/2.4))- 0.055,step(vec3(0.0031308),ay)); } uniform float b2,ac,aA,bZ,aC,aK; vec4 b5(float H,float T,float cM,float db,float be,float bp){ if(be<=0.001||abs(H - aK)>ac*6.0 + aA*3.0)return vec4(0.0); float cY=6.2831853*T/cM,c0=cM/(6.2831853*bZ); vec3 ag=vec3(cos(cY)*c0,sin(cY)*c0,db*aC); float cc=bI(ag)- 0.5,cG=bI(ag*1.9 + vec3(4.1,1.7,db*aC*0.7))- 0.5; float cx=H - aK,aP=cx + cc*2.4*aA,bH=cx + cG*2.0*aA; float aY=max(b2,0.6); float a9=exp(-(aP*aP)/(aY*aY))+ 0.55*exp(-(bH*bH)/(aY*aY*0.5)); float bb=0.6*exp(-(aP*aP)/(ac*ac))+ 0.28*exp(-abs(cx)/(ac*2.2)); vec3 C=k(T/cM + cc*0.4 + db*0.03);C.yz*=1.15; vec3 bG=g(C); vec3 cE=mix(bG,vec3(1.0),0.72 + 0.28*bp); float cN=clamp(bb*be,0.0,1.0),cw=clamp(a9*be*(1.0 + bp),0.0,1.0); vec4 A=vec4(bG*cN,cN); return vec4(cE*cw,cw)+ A*(1.0 - cw); }
`;
var FS_BORDER = `#version 300 es
precision highp float;precision highp int; uniform vec2 co; uniform float aD,a,bW; uniform vec4 f,F; out vec4 t;
${COMMON}
void main(){ vec2 b=vec2(gl_FragCoord.x,co.y*aD - gl_FragCoord.y)/aD; vec2 bd=f.zw*0.5,s=b -(f.xy + bd); float H=o(s,bd,F); float cM=bg(bd,F),T=cd(s,bd,F); vec4 c5=b5(H,T,cM,a,bW,0.0); t=vec4(c5.rgb +(bM(gl_FragCoord.xy)- 0.5)/255.0*c5.a,c5.a); }`;
var ELECTRIC_WAVE = `
uniform float bt,aj,R,bD,c,r,bU,bu,a4; float u(vec3 b){b=fract(b*0.3183099 + vec3(0.1,0.2,0.3));b*=17.0;return fract(b.x*b.y*b.z*(b.x + b.y + b.z));} float a1(vec3 al){ vec3 L=floor(al),j=fract(al);j=j*j*(3.0 - 2.0*j); return mix(mix(mix(u(L),u(L + vec3(1,0,0)),j.x),mix(u(L + vec3(0,1,0)),u(L + vec3(1,1,0)),j.x),j.y), mix(mix(u(L + vec3(0,0,1)),u(L + vec3(1,0,1)),j.x),mix(u(L + vec3(0,1,1)),u(L + vec3(1,1,1)),j.x),j.y),j.z); } float aQ(vec3 b,int cS){ float T=0.0,Y=0.5,cR=0.0; for(int L=0;L<5;L++){if(L>=cS)break;T +=Y*a1(b);cR +=Y;b=b*2.03 + vec3(13.1,7.7,3.3);Y*=0.5;} return T/cR; } float ah(vec2 ag,vec2 b){ if(!x)return 0.0; return(aQ(vec3(ag/aj,a*R),3)- 0.5)*2.0*bt; } vec3 S(float bS,float bp){vec3 C=k(bS);C.yz*=1.15;return mix(g(C),vec3(1.0),bp);} vec4 an(vec3 cT,float Y,vec4 A){Y=clamp(Y,0.0,1.0);return vec4(cT*Y,Y)+ A*(1.0 - Y);} vec4 au(vec4 A,vec2 b,vec2 s,float H,float a2,vec2 bB,float cA){ float n=clamp(0.5 - H*(aF.x/K.x),0.0,1.0); if(n<=0.0)return A; float bn=0.7 + 0.3*a1(vec3(a*19.0,3.7,0.0)); float aY=max(bD,0.5); if(x&&w>0.001&&abs(a2)<r*3.0 + c*3.0 + bt){ vec3 al=vec3(bB/(aj*0.55),a*R*1.6); float cc=aQ(al,4)- 0.5,cG=aQ(al*1.7 + vec3(7.3,2.1,0.0),4)- 0.5; float aP=a2 + cc*2.0*r,bH=a2 + 0.7*r + cG*1.8*r; float a9=exp(-aP*aP/(aY*aY))+ 0.6*exp(-bH*bH/(aY*aY*0.5)); float bb=0.55*exp(-aP*aP/(c*c))+ 0.22*exp(-abs(a2)/(c*2.2)); float be=bU*w*bn*n; float bS=0.55 +(as?atan(bB.y,bB.x)/bk:bB.x*0.004/ad)+ a*0.1; A=an(S(bS,0.0),bb*be,A); A=an(S(bS,0.8),a9*be,A); } if(bu>0.0&&I<0.5&&W>0.0&&H>-(c*2.5 + r*2.0 + aY*3.0)){ float q=1.0 - smoothstep(-p*0.6,p*0.4,a2); float av=smoothstep(-i,i,a2 +(G - aB)/cA); float be=bu*min(W*a4,1.0)*q*av*bn*n; if(be>0.001){ float cR=aQ(vec3(s/aj,a*R),4)- 0.5; float b6=H + aY*2.0 + cR*2.0*r*0.7; float bS=atan(s.y/f.w,s.x/f.z)/bk + a*0.2; A=an(S(bS,0.0),(0.5*exp(-b6*b6/(c*c*0.6))+ 0.2*exp(-abs(H)/(c*2.0)))*be,A); A=an(S(bS,0.75),exp(-b6*b6/(aY*aY*0.8))*be,A); } } return A; }
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
out vec2 a7; void main(){vec2 b=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));a7=b;gl_Position=vec4(b*2.0 - 1.0,0.0,1.0);}`;
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
  gl.uniform2f(u("co"), vw, vh);
  gl.uniform1f(u("aD"), dpr);
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
    gl.uniform4f(u("f"), b.left, b.top, b.width, b.height);
    gl.uniform4f(u("F"), it.radii.br, it.radii.tr, it.radii.bl, it.radii.tl);
    gl.uniform1f(u("a"), it.time);
    gl.uniform1f(u("bW"), it.level * o.intensity);
    const f = { b2: o.thickness, ac: o.glow, aA: o.chaos, bZ: o.scale, aC: o.crackle, aK: o.offset };
    for (const k in f) gl.uniform1f(u(k), f[k]);
    gl.uniform3fv(u("aE[0]"), it.pal);
    gl.uniform1i(u("J"), it.palN);
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
    bt: c.jag,
    aj: c.scale,
    R: c.crackle,
    bD: c.boltWidth,
    c: c.boltGlow,
    r: c.chaos,
    bU: c.bolts,
    bu: c.rimBolts,
    a4: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  BORDER,
  ELECTRIC,
  electric,
  electricBorder
};
