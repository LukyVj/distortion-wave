/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/ink.js
var INK_WAVE = `
uniform float bS,bT,bE,df,dN,ev; float bl(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bv(vec2 b){ vec2 C=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bl(C),bl(C + vec2(1,0)),p.x),mix(bl(C + vec2(0,1)),bl(C + vec2(1,1)),p.x),p.y); } float eY(vec2 b){float w=0.0,L=0.5;for(int C=0;C<4;C++){w +=L*bv(b);b=b*2.11 + vec2(3.1,8.7);L*=0.5;}return w/0.9375;} float v(vec2 S,vec2 b){ if(!e)return 0.0; return(eY(b/bT + a*0.04)- 0.5)*2.0*bS +(bv(b/(bT*0.12))- 0.5)*bS*0.35; } vec4 dz(vec2 b,float aV){return mix(y(A,h,b,b),y(B,i,b,b),step(0.0,aV));} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float n=max(r*dN,24.0*N); if(c<=0.0||!e||k<0.001||f>n||f<-n*1.6)return m; float X=min(k*1.5,1.0); vec2 aM=ai(b).n,bL=vec2(bE,bE*0.55); vec4 L=dz(b + bL,f + dot(bL,aM)),V=dz(b - bL,f - dot(bL,aM)); float aZ=mix(0.5,0.25 + 0.3*cP(floor(b*1.2))+ 0.2*bv(b*0.5),df); vec3 dr=L.a>0.0?L.rgb/L.a:vec3(1.0),fW=V.a>0.0?V.rgb/V.a:vec3(1.0); float eK=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - dr.g)*1.05); float eL=smoothstep(aZ - 0.12,aZ + 0.12,(1.0 - fW.r)*1.05); vec3 eZ=d(aS[0]),e0=d(aS[1%ak]); vec3 ek=vec3(0.965,0.945,0.9); vec3 l=ek*mix(vec3(1.0),eZ,eK*0.95)*mix(vec3(1.0),e0,eL*0.85); float fc=(1.0 - smoothstep(0.0,ev,-f))*step(f,0.0)*smoothstep(0.15,0.55,aZ + 0.25); vec3 e1=d(j((Q?atan(M.y,M.x)/ar:M.x*0.002/N)+ a*0.05)); l*=mix(vec3(1.0),e1,fc*0.9); float dm=max(max(L.a,V.a),m.a); float aW=(1.0 - smoothstep(n*0.35,n,f>0.0?f:-f/1.6))*X*c; return mix(m,vec4(l*dm,dm),aW); }
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
  uniforms: (c) => ({ bS: c.bleed, bT: c.scale, bE: c.misregister, df: c.grain, dN: c.zone, ev: c.ink })
});
export {
  INK,
  ink
};
