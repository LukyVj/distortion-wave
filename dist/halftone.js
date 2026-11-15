/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aG,bR,dM,dL,eu; float v(vec2 S,vec2 b){return 0.0;} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float n=max(r*dM,aG*3.0); if(c<=0.0||!e||k<0.001||f>n*1.2||f<-n*2.0)return m; vec2 az=bN(bR)*b/aG,T=floor(az)+ 0.5,bh=bN(-bR)*(T*aG); float ds=ai(bh).d; vec4 a6=ds>0.0?y(B,i,bh,bh):y(A,h,bh,bh); if(a6.a<0.01)a6=ds>0.0?y(B,i,b,b):y(A,h,b,b); vec3 l=a6.rgb/max(a6.a,1e-3); float at=dot(l,vec3(0.299,0.587,0.114)); float aW=1.0 - smoothstep(n*0.1,n,ds>0.0?ds:-ds/1.6),X=min(k*1.5,1.0); bool cC=at>0.5; float s=aG*0.5*dL*sqrt(clamp((cC?1.0 - at:at)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aW); float aV=length((fract(az)- 0.5)*aG),I=u.x/P.x; float E=clamp((s - aV)/I + 0.5,0.0,1.0); vec3 fv=d(j(T.x*0.021 + T.y*0.034 + a*0.15)); vec3 eP=mix(cC?l*0.2:l,fv,eu*aW*aW),fr=cC?mix(l,vec3(1.0),0.4):l*0.14; vec4 as=vec4(mix(fr,eP,E)*a6.a,a6.a); return mix(m,as,smoothstep(0.0,0.35,aW)*X*c); }
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
  uniforms: (c) => ({ aG: c.cell, bR: c.angle, dM: c.zone, dL: c.size, eu: c.ink })
});
export {
  HALFTONE,
  halftone
};
