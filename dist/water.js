/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/water.js
var WATER_WAVE = `
uniform float Z,d3,d1,d2,d4; float bq(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bJ(vec2 b){ vec2 C=floor(b),p=fract(b);p=p*p*(3.0 - 2.0*p); return mix(mix(bq(C),bq(C + vec2(1,0)),p.x),mix(bq(C + vec2(0,1)),bq(C + vec2(1,1)),p.x),p.y); } float v(vec2 S,vec2 b){ if(!e)return 0.0; return(bJ(b/(Z*2.5)+ a*0.3)- 0.5)*Z*0.5; } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0||!e||k<0.001||f>Z*1.5||f<-R*1.6)return m; vec2 aM=ai(b).n; float X=min(k*1.5,1.0); float cf=f>0.0?exp(-f/(Z*0.35)):exp(f/(R*0.8)); float c8=ar*f/Z + a*7.0; vec2 dl=b/Z; vec2 cT=vec2(sin(dl.y*1.7 + a*1.6)+ sin(dl.x*1.1 - a*1.2 + dl.y*0.6), cos(dl.x*1.9 - a*1.4)+ cos(dl.y*1.2 + a*1.1 + dl.x*0.7))*0.3; vec2 cx=(aM*cos(c8)+ cT)*d3*cf*X; vec2 H=b - cx; float b0=f + dot(cx,aM); vec4 w=mix(y(A,h,b,H),y(B,i,b,H),smoothstep(-1.5,1.5,b0)); w +=m*(1.0 - w.a); vec3 bA=d(j(0.4 + f*0.0015/N + a*0.04)); vec3 bM=mix(w.rgb,w.rgb*bA*1.15,d4*cf); vec2 eb=b/(Z*0.45)+ cT*2.0; float cq=sin(eb.x + sin(eb.y*1.3 + a*1.5))+ sin(eb.y*1.1 + sin(eb.x*0.9 - a*1.7)); float eJ=pow(clamp(1.0 - abs(cq)*0.7,0.0,1.0),5.0); bM +=(eJ*d1*0.4 + smoothstep(0.8,1.0,sin(c8 + 0.9))*0.22*cf)*cf*w.a*mix(bA,vec3(1.0),0.5); float fZ=bJ(b/5.0 + vec2(a*2.0,0.0))*0.6 + bJ(b/13.0 - a)*0.4; float eR=smoothstep(0.35,0.7,fZ + 0.45 - abs(f + Z*0.15)/max(Z*0.35,1.0))*d2; bM=mix(bM,vec3(0.97,0.99,1.0)*w.a,clamp(eR,0.0,1.0)); return mix(m,vec4(bM,w.a),clamp(cf*3.0,0.0,1.0)*X*c); }
`;
var PRESET = { palette: "ocean", band: 0.4, rimStrength: 0.6 };
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
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var water = Object.freeze({
  name: "water",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? WATER[key];
    c.wavelength = Math.max(v("wavelength") * k, 10);
    c.refraction = v("refraction") * k * i;
    c.caustics = Math.max(v("caustics"), 0);
    c.foam = clamp(v("foam"), 0, 2);
    c.tint = clamp(v("tint"), 0, 1);
  },
  shader: Object.freeze({ key: "water", chunk: WATER_WAVE }),
  uniforms: (c) => ({ Z: c.wavelength, d3: c.refraction, d1: c.caustics, d2: c.foam, d4: c.tint })
});
export {
  WATER,
  water
};
