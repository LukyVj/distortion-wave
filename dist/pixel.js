/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/pixel.js
var PIXEL_WAVE = `
uniform float G,d2,dp,a0,dn,cD,cE,b5; float cw(vec2 E){return fract(sin(dot(E,vec2(127.1,311.7)))*43758.5453);} float v(vec2 Y,vec2 b){return 0.0;} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0)return p; vec2 Z=floor(b/G),a2=(Z + 0.5)*G,dK=fract(b/G)*G; float aF=d2*0.5; float dc=step(aF,dK.x)*step(dK.x,G - aF)*step(aF,dK.y)*step(dK.y,G - aF); vec2 ci=m.zw*0.5; float ea=Q(a2 -(m.xy + ci),ci,ak); if(ea>0.0)return p; float df=floor(a*dn); float aN=cw(Z + vec2(df*0.371,df*0.137)),a3=cw(Z*1.731 + 3.1); aK aE=ad(a2); float k=max(w*dp,G*3.0); vec3 c8=d(h(0.5 + Z.x*0.021 + Z.y*0.013 + a*0.2)); if(e&&j>0.001){ if(aE.d<k&&aE.d>-k*1.8){ bool dL=aE.d +(a3 - 0.5)*G*3.0>0.0; vec4 aV=dL?u(y,g,a2,a2):u(x,f,a2,a2); float aJ=(1.0 - smoothstep(k*0.25,k,abs(aE.d)))*smoothstep(0.0,0.3,j); float eA=step(1.0 - a0*(0.35 + 0.65*aJ),aN)*cD*min(j*1.5,1.0); vec4 cl=mix(aV,vec4(c8,1.0),eA); cl=vec4(cl.rgb*mix(0.55,1.0,dc),cl.a); p=mix(p,cl,aJ*c); }else if(aE.d<=-k*1.8&&aE.d>-R*1.3){ float fm=1.0 - clamp(-aE.d/(R*1.3),0.0,1.0); float eA=step(1.0 - a0*0.3*fm,aN)*cD*j; p=mix(p,vec4(c8,1.0),eA*dc*c); } } if(cE>0.0&&X<0.5&&am>0.0&&ea>-G*1.2){ float F=1.0 - smoothstep(-w*0.6,w*0.4,aE.d); float aG=smoothstep(-r,r,aE.d +(V - aR)/aE.g); float ai=cE*min(am*b5,1.0)*F*aG; p=mix(p,vec4(c8,1.0),step(aN,ai)*dc*c); } return p; }
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
    G: c.cell,
    d2: c.gap,
    dp: c.zone,
    a0: c.density,
    dn: c.rate,
    cD: c.lit,
    cE: c.rimPixels,
    b5: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  PIXEL,
  pixel
};
