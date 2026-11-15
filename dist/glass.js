/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/glass.js
var GLASS_WAVE = `
uniform float dc,db,cF,cE,dd; float v(vec2 W,vec2 b){return 0.0;} vec4 ca(vec2 b,vec2 H,float aU){return mix(u(x,f,b,H),u(y,g,b,H),smoothstep(-1.5,1.5,aU));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float bj=cF*0.5,ac=(i + bj)/bj; if(c<=0.0||!e||j<0.001||abs(ac)>=1.0)return m; vec2 aN=ah(b).n; float A=sqrt(1.0 - ac*ac),cK=ac/max(A,0.3),ad=min(j*1.5,1.0); vec2 b3=aN*(dc*cK*ad),cQ=aN*(db*cK*ad); float cO=i - dot(b3,aN); vec4 n=ca(b,b - b3 - cQ,cO - dot(cQ,aN)),aD=ca(b,b - b3,cO),J=ca(b,b - b3 + cQ,cO + dot(cQ,aN)); vec4 a5=vec4(n.r,aD.g,J.b,max(max(n.a,aD.a),J.a)); a5 +=m*(1.0 - a5.a); float X=(K?atan(N.y,N.x)/av:N.x*0.003/O)+ a*0.08; vec3 bc=d(h(X + ac*0.15)); a5.rgb=mix(a5.rgb,a5.rgb*bc,dd*A); float cZ=exp(-pow((ac + 0.42)/0.11,2.0))*(0.75 + 0.25*sin(X*40.0 + a*2.0))+ 0.45*exp(-pow((ac - 0.55)/0.08,2.0)); float d7=pow(1.0 - A,3.0); float eZ=clamp((cZ + d7*0.8)*cE,0.0,1.0)*a5.a; a5=vec4(mix(a5.rgb,mix(bc,vec3(1.0),0.75)*a5.a,eZ),a5.a); return mix(m,a5,smoothstep(1.0,0.85,abs(ac))*ad*c); }
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
  uniforms: (c) => ({ dc: c.refraction, db: c.dispersion, cF: c.thickness, cE: c.shine, dd: c.tint })
});
export {
  GLASS,
  glass
};
