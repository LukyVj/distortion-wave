/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/metal.js
var METAL_WAVE = `
uniform float bd,ex,cH,dh,cl; float w(vec2 V,vec2 b){ if(!e)return 0.0; float y=T?atan(V.y,V.x)*2.0:V.x/(80.0*Q); return ex*(0.6*sin(y*1.3 + a*2.1)+ 0.4*sin(y*2.9 - a*2.7 + 1.3)); } vec3 e9(vec3 t,float bn){ float f9=-t.y; vec3 fM=mix(vec3(0.62,0.66,0.74),d(j(bn)),0.35); vec3 A=mix(vec3(0.05,0.055,0.07),fM,smoothstep(-0.25,0.35,f9)); A +=vec3(1.0)*exp(-pow((f9 - 0.05)/0.07,2.0))*0.9; A +=vec3(0.9)*exp(-pow((f9 - 0.75)/0.12,2.0))*0.5; return A; } vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float at=bd*0.5,ag=(f + at*0.9)/at; if(c<=0.0||!e||k<0.001||abs(ag)>=1.0)return m; vec2 aN=aj(b).n; float Z=min(k*1.5,1.0),y=sqrt(1.0 - ag*ag); float fJ=T?atan(P.y,P.x)*9.0:P.x*0.07/Q; float fD=0.6*sin(fJ + a*3.0)+ 0.4*sin(fJ*2.3 - a*2.1 + ag*2.0); vec3 ga=normalize(vec3(aN*ag + vec2(-aN.y,aN.x)*fD*cH*0.3,y)); vec3 bh=reflect(vec3(0.0,0.0,-1.0),ga); float ah=(T?atan(P.y,P.x)/ar:P.x*0.002/Q)+ a*0.05; vec3 l=e9(bh,ah); vec2 x=b + bh.xy*bd*0.6; vec4 a7=mix(B(D,h,b,x),B(E,i,b,x),step(0.0,f + dot(bh.xy,aN)*bd*0.6)); l=mix(l,a7.rgb/max(a7.a,1e-3),cl*a7.a*(0.4 + 0.6*y)); vec3 ax=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(ga,ax),0.0),60.0)*dh*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,y)); float O=smoothstep(1.0,0.86,abs(ag))*Z*c; return vec4(clamp(l,0.0,1.0)*O,O)+ m*(1.0 - O); }
`;
var PRESET = { palette: ["#C9D6FF", "#F2F6FF", "#FFE3C2", "#B9F3FF", "#E3C9FF"], band: 0.25, rimStrength: 0.55 };
var METAL = {
  thickness: 46,
  // width of the metal bead
  wobble: 14,
  // slow liquid wobble of the front
  ripple: 0.6,
  // small ripples on the surface (0 = smooth)
  shine: 1,
  // strength of the specular highlight
  reflect: 0.35
  // how much of the content the metal mirrors (0 to 1)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var metal = Object.freeze({
  name: "metal",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? METAL[key];
    c.thickness = Math.max(v("thickness") * k, 10);
    c.wobble = v("wobble") * k * i;
    c.ripple = Math.max(v("ripple"), 0);
    c.shine = Math.max(v("shine"), 0);
    c.reflect = clamp(v("reflect"), 0, 1);
  },
  shader: Object.freeze({ key: "metal", chunk: METAL_WAVE }),
  uniforms: (c) => ({ bd: c.thickness, ex: c.wobble, cH: c.ripple, dh: c.shine, cl: c.reflect })
});
export {
  METAL,
  metal
};
