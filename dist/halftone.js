/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aG,bS,dN,dM,ev; float w(vec2 V,vec2 b){return 0.0;} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); float n=max(s*dN,aG*3.0); if(c<=0.0||!e||k<0.001||f>n*1.2||f<-n*2.0)return m; vec2 as=bO(bS)*b/aG,W=floor(as)+ 0.5,bi=bO(-bS)*(W*aG); float dt=aj(bi).d; vec4 a7=dt>0.0?B(E,i,bi,bi):B(D,h,bi,bi); if(a7.a<0.01)a7=dt>0.0?B(E,i,b,b):B(D,h,b,b); vec3 l=a7.rgb/max(a7.a,1e-3); float au=dot(l,vec3(0.299,0.587,0.114)); float aW=1.0 - smoothstep(n*0.1,n,dt>0.0?dt:-dt/1.6),Z=min(k*1.5,1.0); bool cC=au>0.5; float t=aG*0.5*dM*sqrt(clamp((cC?1.0 - au:au)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aW); float aK=length((fract(as)- 0.5)*aG),K=v.x/S.x; float G=clamp((t - aK)/K + 0.5,0.0,1.0); vec3 fw=d(j(W.x*0.021 + W.y*0.034 + a*0.15)); vec3 eQ=mix(cC?l*0.2:l,fw,ev*aW*aW),fs=cC?mix(l,vec3(1.0),0.4):l*0.14; vec4 at=vec4(mix(fs,eQ,G)*a7.a,a7.a); return mix(m,at,smoothstep(0.0,0.35,aW)*Z*c); }
`;
var PRESET = { palette: ["#00AEEF", "#EC008C", "#FFF200", "#FF6A3D"], band: 0.3, rimStrength: 0.55 };
var HALFTONE = {
  cell: 7,
  // px: one cell of the screen
  angle: 45,
  // degrees: angle of the screen
  zone: 1.1,
  // width of the screen around the front, × the band's lead
  size: 1.2,
  // largest dot, × the cell (above 1 the dots merge)
  ink: 0.7
  // palette ink at the front (0 = the content's own colours)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var halftone = Object.freeze({
  name: "halftone",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const v = (key) => o[key] ?? HALFTONE[key];
    c.cell = Math.max(v("cell") * clamp(Math.sqrt(c.k), 0.7, 1.3), 3);
    c.angle = v("angle") * Math.PI / 180;
    c.zone = v("zone");
    c.size = clamp(v("size"), 0.2, 2);
    c.ink = clamp(v("ink"), 0, 1);
  },
  shader: Object.freeze({ key: "halftone", chunk: HALFTONE_WAVE }),
  uniforms: (c) => ({ aG: c.cell, bS: c.angle, dN: c.zone, dM: c.size, ev: c.ink })
});
export {
  HALFTONE,
  halftone
};
