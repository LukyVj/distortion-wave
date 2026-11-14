/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/glass.js
var GLASS_WAVE = `
uniform float cU,cT,cm,cl,cV; float v(vec2 ac,vec2 b){return 0.0;} vec4 bR(vec2 b,vec2 A,float cp){return mix(n(r,f,b,A),n(s,g,b,A),smoothstep(-1.5,1.5,cp));} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); float bI=cm*0.5,V=(j + bI)/bI; if(c<=0.0||!e||i<0.001||abs(V)>=1.0)return p; vec2 aB=Z(b).n; float z=sqrt(1.0 - V*V),cs=V/max(z,0.3),ae=min(i*1.5,1.0); vec2 bK=aB*(cU*cs*ae),cy=aB*(cT*cs*ae); float cx=j - dot(bK,aB); vec4 m=bR(b,b - bK - cy,cx - dot(cy,aB)),aM=bR(b,b - bK,cx),H=bR(b,b - bK + cy,cx + dot(cy,aB)); vec4 aV=vec4(m.r,aM.g,H.b,max(max(m.a,aM.a),H.a)); aV +=p*(1.0 - aV.a); float R=(K?atan(I.y,I.x)/aF:I.x*0.003/Q)+ a*0.08; vec3 a2=d(h(R + V*0.15)); aV.rgb=mix(aV.rgb,aV.rgb*a2,cV*z); float cH=exp(-pow((V + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(R*40.0 + a*2.0))+ 0.45*exp(-pow((V - 0.55)/0.08,2.0)); float dO=pow(1.0 - z,3.0); float ew=clamp((cH + dO*0.8)*cl,0.0,1.0)*aV.a; aV=vec4(mix(aV.rgb,mix(a2,vec3(1.0),0.75)*aV.a,ew),aV.a); return mix(p,aV,smoothstep(1.0,0.85,abs(V))*ae*c); }
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
  uniforms: (c) => ({ cU: c.refraction, cT: c.dispersion, cm: c.thickness, cl: c.shine, cV: c.tint })
});
export {
  GLASS,
  glass
};
