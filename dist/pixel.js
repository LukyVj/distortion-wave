/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float l,cl,bY,ak,bX,bv,bw,a6; float bq(vec2 s){return fract(sin(dot(s,vec2(127.1,311.7)))*43758.5453);} float ah(vec2 ag,vec2 b){return 0.0;} vec4 au(vec4 A,vec2 b,vec2 s,float H,float a2,vec2 bB,float cA){ float n=clamp(0.5 - H*(aF.x/K.x),0.0,1.0); if(n<=0.0)return A; vec2 bL=floor(b/l),bA=(bL + 0.5)*l,b8=fract(b/l)*l; float ba=cl*0.5; float cI=step(ba,b8.x)*step(b8.x,l - ba)*step(ba,b8.y)*step(b8.y,l - ba); vec2 bd=f.zw*0.5; float cu=o(bA -(f.xy + bd),bd,F); if(cu>0.0)return A; float bR=floor(a*bX); float c6=bq(bL + vec2(bR*0.371,bR*0.137)),c7=bq(bL*1.731 + 3.1); X fc=bo(bA); float aH=max(p*bY,l*3.0); vec3 bO=g(k(0.5 + bL.x*0.021 + bL.y*0.013 + a*0.2)); if(x&&w>0.001){ if(fc.d<aH&&fc.d>-aH*1.8){ bool b9=fc.d +(c7 - 0.5)*l*3.0>0.0; vec4 a3=b9?E(z,e,bA,bA):E(y,d,bA,bA); float aY=(1.0 - smoothstep(aH*0.25,aH,abs(fc.d)))*smoothstep(0.0,0.3,w); float cH=step(1.0 - ak*(0.35 + 0.65*aY),c6)*bv*min(w*1.5,1.0); vec4 ce=mix(a3,vec4(bO,1.0),cH); ce=vec4(ce.rgb*mix(0.55,1.0,cI),ce.a); A=mix(A,ce,aY*n); }else if(fc.d<=-aH*1.8&&fc.d>-aX*1.3){ float dc=1.0 - clamp(-fc.d/(aX*1.3),0.0,1.0); float cH=step(1.0 - ak*0.3*dc,c6)*bv*w; A=mix(A,vec4(bO,1.0),cH*cI*n); } } if(bw>0.0&&I<0.5&&W>0.0&&cu>-l*1.2){ float q=1.0 - smoothstep(-p*0.6,p*0.4,fc.d); float av=smoothstep(-i,i,fc.d +(G - aB)/fc.g); float be=bw*min(W*a6,1.0)*q*av; A=mix(A,vec4(bO,1.0),step(c6,be)*cI*n); } return A; }
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
    l: c.cell,
    cl: c.gap,
    bY: c.zone,
    ak: c.density,
    bX: c.rate,
    bv: c.lit,
    bw: c.rimPixels,
    a6: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
