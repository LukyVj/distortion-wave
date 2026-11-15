/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dT,dS,di,dh,dU; float v(vec2 S,vec2 b){return 0.0;} vec4 cE(vec2 b,vec2 H,float aV){return mix(y(A,h,b,H),y(B,i,b,H),smoothstep(-1.5,1.5,aV));} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float as=di*0.5,af=(f + as)/as; if(c<=0.0||!e||k<0.001||abs(af)>=1.0)return m; vec2 aM=ai(b).n; float w=sqrt(1.0 - af*af),dq=af/max(w,0.3),X=min(k*1.5,1.0); vec2 cx=aM*(dT*dq*X),du=aM*(dS*dq*X); float b0=f - dot(cx,aM); vec4 s=cE(b,b - cx - du,b0 - dot(du,aM)),az=cE(b,b - cx,b0),V=cE(b,b - cx + du,b0 + dot(du,aM)); vec4 bu=vec4(s.r,az.g,V.b,max(max(s.a,az.a),V.a)); bu +=m*(1.0 - bu.a); float ag=(Q?atan(M.y,M.x)/ar:M.x*0.003/N)+ a*0.08; vec3 bA=d(j(ag + af*0.15)); bu.rgb=mix(bu.rgb,bu.rgb*bA,dU*w); float dG=exp(-pow((af + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(ag*40.0 + a*2.0))+ 0.45*exp(-pow((af - 0.55)/0.08,2.0)); float eS=pow(1.0 - w,3.0); float f3=clamp((dG + eS*0.8)*dh,0.0,1.0)*bu.a; bu=vec4(mix(bu.rgb,mix(bA,vec3(1.0),0.75)*bu.a,f3),bu.a); return mix(m,bu,smoothstep(1.0,0.85,abs(af))*X*c); }
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
  uniforms: (c) => ({ dT: c.refraction, dS: c.dispersion, di: c.thickness, dh: c.shine, dU: c.tint })
});
export {
  GLASS,
  glass
};
