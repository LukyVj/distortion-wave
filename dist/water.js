/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/water.js
var WATER_WAVE = `
uniform float L,c2,c0,c1,c3; float aS(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float a9(vec2 b){ vec2 D=floor(b),k=fract(b);k=k*k*(3.0 - 2.0*k); return mix(mix(aS(D),aS(D + vec2(1,0)),k.x),mix(aS(D + vec2(0,1)),aS(D + vec2(1,1)),k.x),k.y); } float v(vec2 ac,vec2 b){ if(!e)return 0.0; return(a9(b/(L*2.5)+ a*0.3)- 0.5)*L*0.5; } vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); if(c<=0.0||!e||i<0.001||j>L*1.5||j<-ab*1.6)return p; vec2 aB=Z(b).n; float ae=min(i*1.5,1.0); float bA=j>0.0?exp(-j/(L*0.35)):exp(j/(ab*0.8)); float ee=aF*j/L + a*7.0; vec2 co=b/L; vec2 b4=vec2(sin(co.y*1.7 + a*1.6)+ sin(co.x*1.1 - a*1.2 + co.y*0.6), cos(co.x*1.9 - a*1.4)+ cos(co.y*1.2 + a*1.1 + co.x*0.7))*0.3; vec2 bK=(aB*cos(ee)+ b4)*c2*bA*ae; vec2 A=b - bK; float cx=j + dot(bK,aB); vec4 z=mix(n(r,f,b,A),n(s,g,b,A),smoothstep(-1.5,1.5,cx)); z +=p*(1.0 - z.a); vec3 a2=d(h(0.4 + j*0.0015/Q + a*0.04)); vec3 bc=mix(z.rgb,z.rgb*a2*1.15,c3*bA); vec2 c8=b/(L*0.45)+ b4*2.0; float dx=sin(c8.x + sin(c8.y*1.3 + a*1.5))+ sin(c8.y*1.1 + sin(c8.x*0.9 - a*1.7)); float dG=pow(clamp(1.0 - abs(dx)*0.7,0.0,1.0),5.0); bc +=(dG*c0*0.4 + smoothstep(0.8,1.0,sin(ee + 0.9))*0.22*bA)*bA*z.a*mix(a2,vec3(1.0),0.5); float et=a9(b/5.0 + vec2(a*2.0,0.0))*0.6 + a9(b/13.0 - a)*0.4; float dN=smoothstep(0.35,0.7,et + 0.45 - abs(j + L*0.15)/max(L*0.35,1.0))*c1; bc=mix(bc,vec3(0.97,0.99,1.0)*z.a,clamp(dN,0.0,1.0)); return mix(p,vec4(bc,z.a),clamp(bA*3.0,0.0,1.0)*ae*c); }
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
  uniforms: (c) => ({ L: c.wavelength, c2: c.refraction, c0: c.caustics, c1: c.foam, c3: c.tint })
});
export {
  WATER,
  water
};
