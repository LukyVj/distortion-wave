/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float ap,bt,c5,c4,dJ; float v(vec2 W,vec2 b){return 0.0;} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float o=max(w*c5,ap*3.0); if(c<=0.0||!e||j<0.001||i>o*1.2||i<-o*2.0)return m; vec2 aD=bp(bt)*b/ap,au=floor(aD)+ 0.5,aT=bp(-bt)*(au*ap); float cN=ah(aT).d; vec4 aM=cN>0.0?u(y,g,aT,aT):u(x,f,aT,aT); if(aM.a<0.01)aM=cN>0.0?u(y,g,b,b):u(x,f,b,b); vec3 p=aM.rgb/max(aM.a,1e-3); float a7=dot(p,vec3(0.299,0.587,0.114)); float aA=1.0 - smoothstep(o*0.1,o,cN>0.0?cN:-cN/1.6),ad=min(j*1.5,1.0); bool b8=a7>0.5; float n=ap*0.5*c4*sqrt(clamp((b8?1.0 - a7:a7)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aA); float aU=length((fract(aD)- 0.5)*ap),dq=l.x/B.x; float Y=clamp((n - aU)/dq + 0.5,0.0,1.0); vec3 ey=d(h(au.x*0.021 + au.y*0.034 + a*0.15)); vec3 d4=mix(b8?p*0.2:p,ey,dJ*aA*aA),ew=b8?mix(p,vec3(1.0),0.4):p*0.14; vec4 bj=vec4(mix(ew,d4,Y)*aM.a,aM.a); return mix(m,bj,smoothstep(0.0,0.35,aA)*ad*c); }
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
  uniforms: (c) => ({ ap: c.cell, bt: c.angle, c5: c.zone, c4: c.size, dJ: c.ink })
});
export {
  HALFTONE,
  halftone
};
