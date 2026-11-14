/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float C,dt,cS,aG,cR,b8,b9,bF; float b1(vec2 E){return fract(sin(dot(E,vec2(127.1,311.7)))*43758.5453);} float v(vec2 ac,vec2 b){return 0.0;} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); if(c<=0.0)return p; vec2 aJ=floor(b/C),aI=(aJ + 0.5)*C,db=fract(b/C)*C; float aM=dt*0.5; float d2=step(aM,db.x)*step(db.x,C - aM)*step(aM,db.y)*step(db.y,C - aM); vec2 bO=o.zw*0.5; float dD=J(aI -(o.xy + bO),bO,X); if(dD>0.0)return p; float cJ=floor(a*cR); float bI=b1(aJ + vec2(cJ*0.371,cJ*0.137)),cC=b1(aJ*1.731 + 3.1); as fc=Z(aI); float x=max(B*cS,C*3.0); vec3 cF=d(h(0.5 + aJ.x*0.021 + aJ.y*0.013 + a*0.2)); if(e&&i>0.001){ if(fc.d<x&&fc.d>-x*1.8){ bool dc=fc.d +(cC - 0.5)*C*3.0>0.0; vec4 aA=dc?n(s,g,aI,aI):n(r,f,aI,aI); float aH=(1.0 - smoothstep(x*0.25,x,abs(fc.d)))*smoothstep(0.0,0.3,i); float d0=step(1.0 - aG*(0.35 + 0.65*aH),bI)*b8*min(i*1.5,1.0); vec4 di=mix(aA,vec4(cF,1.0),d0); di=vec4(di.rgb*mix(0.55,1.0,d2),di.a); p=mix(p,di,aH*c); }else if(fc.d<=-x*1.8&&fc.d>-ab*1.3){ float ez=1.0 - clamp(-fc.d/(ab*1.3),0.0,1.0); float d0=step(1.0 - aG*0.3*ez,bI)*b8*i; p=mix(p,vec4(cF,1.0),d0*d2*c); } } if(b9>0.0&&aa<0.5&&ar>0.0&&dD>-C*1.2){ float N=1.0 - smoothstep(-B*0.6,B*0.4,fc.d); float aX=smoothstep(-u,u,fc.d +(Y - a4)/fc.g); float ae=b9*min(ar*bF,1.0)*N*aX; p=mix(p,vec4(cF,1.0),step(bI,ae)*d2*c); } return p; }
`;
var PRESET = { palette: "pixel", band: 0.35, rimStrength: 0.4, hairWidth: 0 };
var PIXEL = {
  cell: 6,
  // px: size of a pixel
  gap: 1,
  // px: gap between pixels (0 = a plain mosaic)
  zone: 1,
  // width of the pixel zone around the front, × the band's lead
  density: 0.45,
  // share of lit pixels at the front (0 to 1)
  rate: 14,
  // flicker, changes per second
  lit: 1,
  // strength of the lit pixels (0 = only the mosaic)
  rimPixels: 1
  // strength of the pixels on the outline (0 = none)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var pixel = Object.freeze({
  name: "pixel",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const v = (key) => o[key] ?? PIXEL[key];
    c.cell = Math.max(v("cell") * clamp(Math.sqrt(c.k), 0.7, 1.3), 2);
    c.gap = clamp(v("gap"), 0, c.cell * 0.6);
    c.zone = v("zone");
    c.density = clamp(v("density"), 0, 1);
    c.rate = v("rate");
    c.lit = v("lit");
    c.rimPixels = v("rimPixels");
  },
  shader: Object.freeze({ key: "pixel", chunk: PIXEL_WAVE, dots: "square" }),
  uniforms: (c) => ({
    C: c.cell,
    dt: c.gap,
    cS: c.zone,
    aG: c.density,
    cR: c.rate,
    b8: c.lit,
    b9: c.rimPixels,
    bF: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
