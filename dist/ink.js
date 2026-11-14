/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/ink.js
var INK_WAVE = `
uniform float bh,bi,a7,cj,cO,dr; float aO(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float aW(vec2 b){ vec2 D=floor(b),k=fract(b);k=k*k*(3.0 - 2.0*k); return mix(mix(aO(D),aO(D + vec2(1,0)),k.x),mix(aO(D + vec2(0,1)),aO(D + vec2(1,1)),k.x),k.y); } float dS(vec2 b){float z=0.0,M=0.5;for(int D=0;D<4;D++){z +=M*aW(b);b=b*2.11 + vec2(3.1,8.7);M*=0.5;}return z/0.9375;} float v(vec2 ac,vec2 b){ if(!e)return 0.0; return(dS(b/bi + a*0.04)- 0.5)*2.0*bh +(aW(b/(bi*0.12))- 0.5)*bh*0.35; } vec4 cD(vec2 b,float cp){return mix(n(r,f,b,b),n(s,g,b,b),step(0.0,cp));} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); float x=max(B*cO,24.0*Q); if(c<=0.0||!e||i<0.001||j>x||j<-x*1.6)return p; float ae=min(i*1.5,1.0); vec2 aB=Z(b).n,bb=vec2(a7,a7*0.55); vec4 M=cD(b + bb,j + dot(bb,aB)),H=cD(b - bb,j - dot(bb,aB)); float au=mix(0.5,0.25 + 0.3*b0(floor(b*1.2))+ 0.2*aW(b*0.5),cj); vec3 ct=M.a>0.0?M.rgb/M.a:vec3(1.0),eq=H.a>0.0?H.rgb/H.a:vec3(1.0); float dH=smoothstep(au - 0.12,au + 0.12,(1.0 - ct.g)*1.05); float dI=smoothstep(au - 0.12,au + 0.12,(1.0 - eq.r)*1.05); vec3 dT=d(aq[0]),dU=d(aq[1%U]); vec3 dg=vec3(0.965,0.945,0.9); vec3 q=dg*mix(vec3(1.0),dT,dH*0.95)*mix(vec3(1.0),dU,dI*0.85); float d1=(1.0 - smoothstep(0.0,dr,-j))*step(j,0.0)*smoothstep(0.15,0.55,au + 0.25); vec3 dV=d(h((K?atan(I.y,I.x)/aF:I.x*0.002/Q)+ a*0.05)); q*=mix(vec3(1.0),dV,d1*0.9); float d6=max(max(M.a,H.a),p.a); float aH=(1.0 - smoothstep(x*0.35,x,j>0.0?j:-j/1.6))*ae*c; return mix(p,vec4(q*d6,d6),aH); }
`;
var PRESET = { palette: ["#FF48B0", "#0078BF", "#FFE800", "#00A95C"], band: 0.25, rimStrength: 0.5, hairWidth: 0 };
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
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var ink = Object.freeze({
  name: "ink",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? INK[key];
    c.bleed = v("bleed") * k * i;
    c.scale = Math.max(v("scale") * k, 16);
    c.misregister = v("misregister") * clamp(k, 0.6, 1.3);
    c.grain = clamp(v("grain"), 0, 1);
    c.zone = v("zone");
    c.ink = Math.max(v("ink") * k, 4);
  },
  shader: Object.freeze({ key: "ink", chunk: INK_WAVE }),
  uniforms: (c) => ({ bh: c.bleed, bi: c.scale, a7: c.misregister, cj: c.grain, cO: c.zone, dr: c.ink })
});
export {
  INK,
  ink
};
