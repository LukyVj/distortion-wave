/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/ink.js
var INK_WAVE = `
uniform float bT,bU,bF,dg,dO,ew; float bm(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bw(vec2 b){ vec2 F=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bm(F),bm(F + vec2(1,0)),p.x),mix(bm(F + vec2(0,1)),bm(F + vec2(1,1)),p.x),p.y); } float eZ(vec2 b){float y=0.0,O=0.5;for(int F=0;F<4;F++){y +=O*bw(b);b=b*2.11 + vec2(3.1,8.7);O*=0.5;}return y/0.9375;} float w(vec2 V,vec2 b){ if(!e)return 0.0; return(eZ(b/bU + a*0.04)- 0.5)*2.0*bT +(bw(b/(bU*0.12))- 0.5)*bT*0.35; } vec4 dA(vec2 b,float aK){return mix(B(D,h,b,b),B(E,i,b,b),step(0.0,aK));} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float n=max(s*dO,24.0*Q); if(c<=0.0||!e||k<0.001||f>n||f<-n*1.6)return m; float Z=min(k*1.5,1.0); vec2 aN=aj(b).n,bM=vec2(bF,bF*0.55); vec4 O=dA(b + bM,f + dot(bM,aN)),X=dA(b - bM,f - dot(bM,aN)); float aZ=mix(0.5,0.25 + 0.3*cP(floor(b*1.2))+ 0.2*bw(b*0.5),dg); vec3 ds=O.a>0.0?O.rgb/O.a:vec3(1.0),fX=X.a>0.0?X.rgb/X.a:vec3(1.0); float eL=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - ds.g)*1.05); float eM=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - fX.r)*1.05); vec3 e0=d(aT[0]),e1=d(aT[1%al]); vec3 el=vec3(0.965,0.945,0.9); vec3 l=el*mix(vec3(1.0),e0,eL*0.95)*mix(vec3(1.0),e1,eM*0.85); float fd=(1.0 - smoothstep(0.0,ew,-f))*step(f,0.0)*smoothstep(0.15,0.55,aZ + 0.25); vec3 e2=d(j((T?atan(P.y,P.x)/ar:P.x*0.002/Q)+ a*0.05)); l*=mix(vec3(1.0),e2,fd*0.9); float dn=max(max(O.a,X.a),m.a); float aW=(1.0 - smoothstep(n*0.35,n,f>0.0?f:-f/1.6))*Z*c; return mix(m,vec4(l*dn,dn),aW); }
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
  uniforms: (c) => ({ bT: c.bleed, bU: c.scale, bF: c.misregister, dg: c.grain, dO: c.zone, ew: c.ink })
});
export {
  INK,
  ink
};
