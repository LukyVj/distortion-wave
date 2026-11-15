/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dU,dT,dj,di,dV; float w(vec2 V,vec2 b){return 0.0;} vec4 cE(vec2 b,vec2 x,float aK){return mix(B(D,h,b,x),B(E,i,b,x),smoothstep(-1.5,1.5,aK));} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float at=dj*0.5,ag=(f + at)/at; if(c<=0.0||!e||k<0.001||abs(ag)>=1.0)return m; vec2 aN=aj(b).n; float y=sqrt(1.0 - ag*ag),dr=ag/max(y,0.3),Z=min(k*1.5,1.0); vec2 cy=aN*(dU*dr*Z),dv=aN*(dT*dr*Z); float b1=f - dot(cy,aN); vec4 t=cE(b,b - cy - dv,b1 - dot(dv,aN)),as=cE(b,b - cy,b1),X=cE(b,b - cy + dv,b1 + dot(dv,aN)); vec4 bv=vec4(t.r,as.g,X.b,max(max(t.a,as.a),X.a)); bv +=m*(1.0 - bv.a); float ah=(T?atan(P.y,P.x)/ar:P.x*0.003/Q)+ a*0.08; vec3 bB=d(j(ah + ag*0.15)); bv.rgb=mix(bv.rgb,bv.rgb*bB,dV*y); float dH=exp(-pow((ag + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(ah*40.0 + a*2.0))+ 0.45*exp(-pow((ag - 0.55)/0.08,2.0)); float eT=pow(1.0 - y,3.0); float f4=clamp((dH + eT*0.8)*di,0.0,1.0)*bv.a; bv=vec4(mix(bv.rgb,mix(bB,vec3(1.0),0.75)*bv.a,f4),bv.a); return mix(m,bv,smoothstep(1.0,0.85,abs(ag))*Z*c); }
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
  uniforms: (c) => ({ dU: c.refraction, dT: c.dispersion, dj: c.thickness, di: c.shine, dV: c.tint })
});
export {
  GLASS,
  glass
};
