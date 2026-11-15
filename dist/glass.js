/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dr,dq,cU,cT,ds; float v(vec2 Y,vec2 b){return 0.0;} vec4 cm(vec2 b,vec2 C,float bf){return mix(u(x,f,b,C),u(y,g,b,C),smoothstep(-1.5,1.5,bf));} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float aN=cU*0.5,ah=(i + aN)/aN; if(c<=0.0||!e||j<0.001||abs(ah)>=1.0)return p; vec2 aC=ad(b).n; float z=sqrt(1.0 - ah*ah),cZ=ah/max(z,0.3),ai=min(j*1.5,1.0); vec2 ce=aC*(dr*cZ*ai),c3=aC*(dq*cZ*ai); float bM=i - dot(ce,aC); vec4 s=cm(b,b - ce - c3,bM - dot(c3,aC)),aF=cm(b,b - ce,bM),M=cm(b,b - ce + c3,bM + dot(c3,aC)); vec4 bi=vec4(s.r,aF.g,M.b,max(max(s.a,aF.a),M.a)); bi +=p*(1.0 - bi.a); float aa=(J?atan(N.y,N.x)/an:N.x*0.003/L)+ a*0.08; vec3 bo=d(h(aa + ah*0.15)); bi.rgb=mix(bi.rgb,bi.rgb*bo,ds*z); float dd=exp(-pow((ah + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(aa*40.0 + a*2.0))+ 0.45*exp(-pow((ah - 0.55)/0.08,2.0)); float em=pow(1.0 - z,3.0); float fi=clamp((dd + em*0.8)*cT,0.0,1.0)*bi.a; bi=vec4(mix(bi.rgb,mix(bo,vec3(1.0),0.75)*bi.a,fi),bi.a); return mix(p,bi,smoothstep(1.0,0.85,abs(ah))*ai*c); }
`;
var PRESET = { palette: ["#DFF6FF", "#9FDCFF", "#C9B8FF", "#FFFFFF", "#B8FFF0"], band: 0.3, rimStrength: 0.55 };
var GLASS = {
  thickness: 90,
  // width of the slab behind the front
  refraction: 26,
  // how far the slab bends what's under it
  dispersion: 5,
  // RGB split at the slab's slopes
  shine: 1,
  // strength of the highlights (0 = none)
  tint: 0.25
  // palette tint of the glass (0 = clear)
};
var glass = Object.freeze({
  name: "glass",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? GLASS[key];
    c.thickness = Math.max(v("thickness") * k, 14);
    c.refraction = v("refraction") * k * i;
    c.dispersion = v("dispersion") * Math.min(k, 1.2) * i;
    c.shine = v("shine");
    c.tint = v("tint");
  },
  shader: Object.freeze({ key: "glass", chunk: GLASS_WAVE }),
  uniforms: (c) => ({ dr: c.refraction, dq: c.dispersion, cU: c.thickness, cT: c.shine, ds: c.tint })
});
export {
  GLASS,
  glass
};
