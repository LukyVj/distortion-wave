/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float I,dM,da,aR,c9,cq,cr,bW; float cj(vec2 D){return fract(sin(dot(D,vec2(127.1,311.7)))*43758.5453);} float v(vec2 W,vec2 b){return 0.0;} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0)return m; vec2 au=floor(b/I),aT=(au + 0.5)*I,dv=fract(b/I)*I; float aD=dM*0.5; float ep=step(aD,dv.x)*step(dv.x,I - aD)*step(aD,dv.y)*step(dv.y,I - aD); vec2 b7=k.zw*0.5; float dW=P(aT -(k.xy + b7),b7,af); if(dW>0.0)return m; float c1=floor(a*c9); float bj=cj(au + vec2(c1*0.371,c1*0.137)),bB=cj(au*1.731 + 3.1); aB fc=ah(aT); float o=max(w*da,I*3.0); vec3 cV=d(h(0.5 + au.x*0.021 + au.y*0.013 + a*0.2)); if(e&&j>0.001){ if(fc.d<o&&fc.d>-o*1.8){ bool dw=fc.d +(bB - 0.5)*I*3.0>0.0; vec4 aM=dw?u(y,g,aT,aT):u(x,f,aT,aT); float aA=(1.0 - smoothstep(o*0.25,o,abs(fc.d)))*smoothstep(0.0,0.3,j); float em=step(1.0 - aR*(0.35 + 0.65*aA),bj)*cq*min(j*1.5,1.0); vec4 dC=mix(aM,vec4(cV,1.0),em); dC=vec4(dC.rgb*mix(0.55,1.0,ep),dC.a); m=mix(m,dC,aA*c); }else if(fc.d<=-o*1.8&&fc.d>-Q*1.3){ float e3=1.0 - clamp(-fc.d/(Q*1.3),0.0,1.0); float em=step(1.0 - aR*0.3*e3,bj)*cq*j; m=mix(m,vec4(cV,1.0),em*ep*c); } } if(cr>0.0&&V<0.5&&ai>0.0&&dW>-I*1.2){ float F=1.0 - smoothstep(-w*0.6,w*0.4,fc.d); float ax=smoothstep(-s,s,fc.d +(T - aH)/fc.g); float ad=cr*min(ai*bW,1.0)*F*ax; m=mix(m,vec4(cV,1.0),step(bj,ad)*ep*c); } return m; }
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
    I: c.cell,
    dM: c.gap,
    da: c.zone,
    aR: c.density,
    c9: c.rate,
    cq: c.lit,
    cr: c.rimPixels,
    bW: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
