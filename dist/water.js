/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/water.js
var WATER_WAVE = `
uniform float R,dm,dk,dl,dn; float a2(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bi(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(a2(E),a2(E + vec2(1,0)),q.x),mix(a2(E + vec2(0,1)),a2(E + vec2(1,1)),q.x),q.y); } float v(vec2 W,vec2 b){ if(!e)return 0.0; return(bi(b/(R*2.5)+ a*0.3)- 0.5)*R*0.5; } vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0||!e||j<0.001||i>R*1.5||i<-Q*1.6)return m; vec2 aN=ah(b).n; float ad=min(j*1.5,1.0); float bR=i>0.0?exp(-i/(R*0.35)):exp(i/(Q*0.8)); float eF=av*i/R + a*7.0; vec2 cH=b/R; vec2 cl=vec2(sin(cH.y*1.7 + a*1.6)+ sin(cH.x*1.1 - a*1.2 + cH.y*0.6), cos(cH.x*1.9 - a*1.4)+ cos(cH.y*1.2 + a*1.1 + cH.x*0.7))*0.3; vec2 b3=(aN*cos(eF)+ cl)*dm*bR*ad; vec2 H=b - b3; float cO=i + dot(b3,aN); vec4 A=mix(u(x,f,b,H),u(y,g,b,H),smoothstep(-1.5,1.5,cO)); A +=m*(1.0 - A.a); vec3 bc=d(h(0.4 + i*0.0015/O + a*0.04)); vec3 bo=mix(A.rgb,A.rgb*bc*1.15,dn*bR); vec2 ds=b/(R*0.45)+ cl*2.0; float dQ=sin(ds.x + sin(ds.y*1.3 + a*1.5))+ sin(ds.y*1.1 + sin(ds.x*0.9 - a*1.7)); float dZ=pow(clamp(1.0 - abs(dQ)*0.7,0.0,1.0),5.0); bo +=(dZ*dk*0.4 + smoothstep(0.8,1.0,sin(eF + 0.9))*0.22*bR)*bR*A.a*mix(bc,vec3(1.0),0.5); float eV=bi(b/5.0 + vec2(a*2.0,0.0))*0.6 + bi(b/13.0 - a)*0.4; float d6=smoothstep(0.35,0.7,eV + 0.45 - abs(i + R*0.15)/max(R*0.35,1.0))*dl; bo=mix(bo,vec3(0.97,0.99,1.0)*A.a,clamp(d6,0.0,1.0)); return mix(m,vec4(bo,A.a),clamp(bR*3.0,0.0,1.0)*ad*c); }
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
  uniforms: (c) => ({ R: c.wavelength, dm: c.refraction, dk: c.caustics, dl: c.foam, dn: c.tint })
});
export {
  WATER,
  water
};
