/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/halftone.js
var HALFTONE_WAVE = `
uniform float ak,bg,cN,cM,dq; float v(vec2 ac,vec2 b){return 0.0;} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); float x=max(B*cN,ak*3.0); if(c<=0.0||!e||i<0.001||j>x*1.2||j<-x*2.0)return p; vec2 aM=b3(bg)*b/ak,aJ=floor(aM)+ 0.5,aI=b3(-bg)*(aJ*ak); float cw=Z(aI).d; vec4 aA=cw>0.0?n(s,g,aI,aI):n(r,f,aI,aI); if(aA.a<0.01)aA=cw>0.0?n(s,g,b,b):n(r,f,b,b); vec3 q=aA.rgb/max(aA.a,1e-3); float br=dot(q,vec3(0.299,0.587,0.114)); float aH=1.0 - smoothstep(x*0.1,x,cw>0.0?cw:-cw/1.6),ae=min(i*1.5,1.0); bool bP=br>0.5; float m=ak*0.5*cM*sqrt(clamp((bP?1.0 - br:br)*0.9 + 0.1,0.0,1.0))*(0.55 + 0.75*aH); float cp=length((fract(aM)- 0.5)*ak),ep=t.x/G.x; float aU=clamp((m - cp)/ep + 0.5,0.0,1.0); vec3 ea=d(h(aJ.x*0.021 + aJ.y*0.034 + a*0.15)); vec3 dL=mix(bP?q*0.2:q,ea,dq*aH*aH),d8=bP?mix(q,vec3(1.0),0.4):q*0.14; vec4 bI=vec4(mix(d8,dL,aU)*aA.a,aA.a); return mix(p,bI,smoothstep(0.0,0.35,aH)*ae*c); }
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
  uniforms: (c) => ({ ak: c.cell, bg: c.angle, cN: c.zone, cM: c.size, dq: c.ink })
});
export {
  HALFTONE,
  halftone
};
