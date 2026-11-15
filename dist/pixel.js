/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float O,ex,dR,bf,dQ,cX,cY,cl; float cQ(vec2 D){return fract(sin(dot(D,vec2(127.1,311.7)))*43758.5453);} float v(vec2 S,vec2 b){return 0.0;} vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); if(c<=0.0)return m; vec2 T=floor(b/O),bh=(T + 0.5)*O,cz=fract(b/O)*O; float az=ex*0.5; float dF=step(az,cz.x)*step(cz.x,O - az)*step(az,cz.y)*step(cz.y,O - az); vec2 cB=g.zw*0.5; float eF=Y(bh -(g.xy + cB),cB,an); if(eF>0.0)return m; float dI=floor(a*dQ); float as=cQ(T + vec2(dI*0.371,dI*0.137)),aK=cQ(T*1.731 + 3.1); aX aP=ai(bh); float n=max(r*dR,O*3.0); vec3 dA=d(j(0.5 + T.x*0.021 + T.y*0.013 + a*0.2)); if(e&&k>0.001){ if(aP.d<n&&aP.d>-n*1.8){ bool ee=aP.d +(aK - 0.5)*O*3.0>0.0; vec4 a6=ee?y(B,i,bh,bh):y(A,h,bh,bh); float aW=(1.0 - smoothstep(n*0.25,n,abs(aP.d)))*smoothstep(0.0,0.3,k); float fa=step(1.0 - bf*(0.35 + 0.65*aW),as)*cX*min(k*1.5,1.0); vec4 av=mix(a6,vec4(dA,1.0),fa); av=vec4(av.rgb*mix(0.55,1.0,dF),av.a); m=mix(m,av,aW*c); }else if(aP.d<=-n*1.8&&aP.d>-R*1.3){ float f7=1.0 - clamp(-aP.d/(R*1.3),0.0,1.0); float fa=step(1.0 - bf*0.3*f7,as)*cX*k; m=mix(m,vec4(dA,1.0),fa*dF*c); } } if(cY>0.0&&U<0.5&&ae>0.0&&eF>-O*1.2){ float z=1.0 - smoothstep(-r*0.6,r*0.4,aP.d); float aq=smoothstep(-o,o,aP.d +(K - aE)/aP.g); float X=cY*min(ae*cl,1.0)*z*aq; m=mix(m,vec4(dA,1.0),step(as,X)*dF*c); } return m; }
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
    O: c.cell,
    ex: c.gap,
    dR: c.zone,
    bf: c.density,
    dQ: c.rate,
    cX: c.lit,
    cY: c.rimPixels,
    cl: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
