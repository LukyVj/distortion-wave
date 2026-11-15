/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float aw,bF,dj,di,dZ; float v(vec2 Y,vec2 b){return 0.0;} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float k=max(w*dj,aw*3.0); if(c<=0.0||!e||j<0.001||i>k*1.2||i<-k*2.0)return p; vec2 aF=bB(bF)*b/aw,Z=floor(aF)+ 0.5,a2=bB(-bF)*(Z*aw); float c1=ad(a2).d; vec4 aV=c1>0.0?u(y,g,a2,a2):u(x,f,a2,a2); if(aV.a<0.01)aV=c1>0.0?u(y,g,b,b):u(x,f,b,b); vec3 l=aV.rgb/max(aV.a,1e-3); float az=dot(l,vec3(0.299,0.587,0.114)); float aJ=1.0 - smoothstep(k*0.1,k,c1>0.0?c1:-c1/1.6),ai=min(j*1.5,1.0); bool cj=az>0.5; float s=aw*0.5*di*sqrt(clamp((cj?1.0 - az:az)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aJ); float bf=length((fract(aF)- 0.5)*aw),P=t.x/I.x; float ab=clamp((s - bf)/P + 0.5,0.0,1.0); vec3 eQ=d(h(Z.x*0.021 + Z.y*0.034 + a*0.15)); vec3 ej=mix(cj?l*0.2:l,eQ,dZ*aJ*aJ),eN=cj?mix(l,vec3(1.0),0.4):l*0.14; vec4 aN=vec4(mix(eN,ej,ab)*aV.a,aV.a); return mix(p,aN,smoothstep(0.0,0.35,aJ)*ai*c); }
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
  uniforms: (c) => ({ aw: c.cell, bF: c.angle, dj: c.zone, di: c.size, dZ: c.ink })
});
export {
  HALFTONE,
  halftone
};
