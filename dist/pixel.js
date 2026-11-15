/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float R,ey,dS,bg,dR,cX,cY,cm; float cQ(vec2 A){return fract(sin(dot(A,vec2(127.1,311.7)))*43758.5453);} float w(vec2 V,vec2 b){return 0.0;} vec4 H(vec4 m,vec2 b,vec2 A,float z,float f,vec2 P,float a9){ float c=clamp(0.5 - z*(S.x/v.x),0.0,1.0); if(c<=0.0)return m; vec2 W=floor(b/R),bi=(W + 0.5)*R,cA=fract(b/R)*R; float as=ey*0.5; float dG=step(as,cA.x)*step(cA.x,R - as)*step(as,cA.y)*step(cA.y,R - as); vec2 a0=g.zw*0.5; float eG=r(bi -(g.xy + a0),a0,I); if(eG>0.0)return m; float dJ=floor(a*dR); float at=cQ(W + vec2(dJ*0.371,dJ*0.137)),aL=cQ(W*1.731 + 3.1); aX aQ=aj(bi); float n=max(s*dS,R*3.0); vec3 dB=d(j(0.5 + W.x*0.021 + W.y*0.013 + a*0.2)); if(e&&k>0.001){ if(aQ.d<n&&aQ.d>-n*1.8){ bool ef=aQ.d +(aL - 0.5)*R*3.0>0.0; vec4 a7=ef?B(E,i,bi,bi):B(D,h,bi,bi); float aW=(1.0 - smoothstep(n*0.25,n,abs(aQ.d)))*smoothstep(0.0,0.3,k); float fb=step(1.0 - bg*(0.35 + 0.65*aW),at)*cX*min(k*1.5,1.0); vec4 aw=mix(a7,vec4(dB,1.0),fb); aw=vec4(aw.rgb*mix(0.55,1.0,dG),aw.a); m=mix(m,aw,aW*c); }else if(aQ.d<=-n*1.8&&aQ.d>-U*1.3){ float f8=1.0 - clamp(-aQ.d/(U*1.3),0.0,1.0); float fb=step(1.0 - bg*0.3*f8,at)*cX*k; m=mix(m,vec4(dB,1.0),fb*dG*c); } } if(cY>0.0&&M<0.5&&af>0.0&&eG>-R*1.2){ float C=1.0 - smoothstep(-s*0.6,s*0.4,aQ.d); float aq=smoothstep(-o,o,aQ.d +(N - aE)/aQ.g); float Z=cY*min(af*cm,1.0)*C*aq; m=mix(m,vec4(dB,1.0),step(at,Z)*dG*c); } return m; }
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
    R: c.cell,
    ey: c.gap,
    dS: c.zone,
    bg: c.density,
    dR: c.rate,
    cX: c.lit,
    cY: c.rimPixels,
    cm: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
