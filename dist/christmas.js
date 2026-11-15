/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/christmas.js
var XMAS_WAVE = `
uniform float co,bG,cp,dk,aT,bd,c2,bX,d5; float al(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} vec4 ab(vec4 m,vec4 at,float X){at*=X;return at + m*(1.0 - at.a);} float v(vec2 S,vec2 b){return 0.0;} vec4 cb(vec2 b,float J,float eq,float s,float e3,float I,float aQ){ float ax=a; vec2 S=b - vec2(sin(ax*0.7 + aQ)*J*0.4,ax*eq); vec2 T=floor(S/J); float as=al(T + aQ),aK=al(T + aQ + 3.1),b2=al(T + aQ + 7.7); if(as>e3)return vec4(0.0); vec2 bY=(T + 0.2 + 0.6*vec2(aK,b2))*J + vec2(sin(ax*(1.0 + aK)+ as*6.28)*J*0.15,0.0); float fD=s*(0.6 + 0.6*b2),aV=length(S - bY); float L=(1.0 - smoothstep(fD*0.35,fD + I,aV))*(0.75 + 0.25*aK); return vec4(vec3(0.97,0.98,1.0)*L,L); } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float av=P.x/u.x,I=1.0/av; float c=clamp(0.5 - x*av,0.0,1.0); if(!e||k<0.001)return m; float X=min(k*1.5,1.0)*c,ax=a; if(c>0.0){ if(bX>0.0&&f>0.0&&f<r*1.2){ float p=exp(-f/max(r*0.35,1.0))*bX; m.rgb=mix(m.rgb,vec3(0.86,0.93,1.0)*m.a + vec3(0.0),p*0.45); vec2 az=floor(b/7.0),eT=b -(az + 0.5)*7.0; float f0=al(az),cG=max(sin(ax*7.0 + al(az + 1.3)*40.0),0.0); float fd=max(1.0 - abs(eT.x)*abs(eT.y)*0.9 - length(eT)*0.28,0.0); m +=vec4(vec3(1.0),1.0)*step(0.93,f0)*cG*fd*p*X; } if(cp>0.0&&f<0.0&&f>-R*1.5){ float a9=(1.0 - clamp(-f/(R*1.5),0.0,1.0))*smoothstep(0.0,co*3.0,-f); float c6=dk,e4=min(cp,2.0)*a9; m=ab(m,cb(b,c6*9.0,26.0*N,c6*0.7,0.55*e4,I,0.0),X); m=ab(m,cb(b,c6*6.5,40.0*N,c6,0.5*e4,I,11.0),X); m=ab(m,cb(b,c6*11.0,62.0*N,c6*1.5,0.35*e4,I,23.0),X); } float bg=co,af=f + bg*0.4; float dD=(1.0 - smoothstep(bg*0.6,bg*2.2,abs(af + bg*1.1)))*0.3; m=ab(m,vec4(0.0,0.0,0.0,dD),X); float E=clamp((bg - abs(af))*av + 0.5,0.0,1.0); if(E>0.0){ float bm=clamp(af/bg,-1.0,1.0),eB=sqrt(1.0 - bm*bm); float w=Q?atan(M.y,M.x)*K:M.x; float cq=(w + asin(bm)*bg*1.3)/bG; float db=I/bG*1.5; float fA=smoothstep(0.5 - db,0.5 + db,fract(cq))- smoothstep(1.0 - db,1.0,fract(cq))+(1.0 - smoothstep(0.0,db,fract(cq))); float fe=smoothstep(0.18 - db,0.18,fract(cq))- smoothstep(0.26,0.26 + db,fract(cq)); vec3 l=mix(vec3(0.97,0.96,0.94),vec3(0.8,0.06,0.12),clamp(fA,0.0,1.0)); l=mix(l,vec3(0.12,0.5,0.22),clamp(fe,0.0,1.0)); l*=0.45 + 0.6*eB; l +=vec3(1.0)*pow(max(1.0 - abs(bm + 0.45)*3.0,0.0),3.0)*0.55; m=ab(m,vec4(l*E,E),X); } } if(U<0.5&&ae>0.0&&c>0.0){ float z=1.0 - smoothstep(-r*0.6,r*0.4,f); float aq=smoothstep(-o,o,f +(K - aE)/a8); float b4=min(ae*d5,1.0)*z*aq*c; if(b4>0.001){ if(c2>0.0){ float be=D.y + g.w*0.5,eG=c2; float as=eG*(0.7 + 0.2*sin(D.x/(eG*1.9))+ 0.12*sin(D.x/(eG*0.7)+ 1.3)); if(be<eG*3.0){ float cu=clamp((as - be)*av + 0.5,0.0,1.0); float da=eG*1.3,e2=floor(D.x/da),fx=D.x -(e2 + 0.5)*da; float cg=eG*(0.4 + 1.4*al(vec2(e2,5.0)))*step(0.35,al(vec2(e2,8.0))); float fS=be - as*0.85,fO=da*0.16*(1.0 - fS/max(cg,1e-3)); float ft=fS>0.0&&cg>0.0?clamp((fO - abs(fx))*av + 0.5,0.0,1.0):0.0; vec3 fu=mix(vec3(0.75,0.88,1.0),vec3(1.0),0.5 + 0.5*sin(fx/max(fO,1e-3)*1.5)); m=ab(m,vec4(fu*ft*0.8,ft*0.8),b4); vec3 fb=mix(vec3(0.74,0.83,0.95),vec3(1.0),smoothstep(0.0,as*0.8,as - be)); float eo=clamp((as + eG*0.35 - be)*av,0.0,1.0)*(1.0 - cu)*0.25; m=ab(m,vec4(0.0,0.0,0.0,eo),b4); m=ab(m,vec4(fb*cu,cu),b4); } } if(aT>0.0){ float c5=bd*0.24,ap=c5*1.0 + 1.0; float dC=2.0*(g.z + g.w),w=(atan(D.y/g.w,D.x/g.z)/6.28318 + 0.5)*dC; float p=w/bd,cz=fract(p),fJ=c5*0.9*4.0*cz*(1.0 - cz); float aV=x + ap + fJ; if(aV>-c5*4.5){ float d7=clamp((0.7 - abs(aV))*av + 0.5,0.0,1.0)*0.9; vec4 G=vec4(vec3(0.07,0.2,0.1)*d7,d7); float C=floor(p + 0.5),dm=(p - C)*bd; float fk=-(x + ap); float dy=al(vec2(C,2.0)),cG=0.55 + 0.45*sin(ax*(2.0 + 2.0*dy)+ dy*40.0); float cu=mod(C,4.0); vec3 fm=cu<1.0?vec3(1.0,0.16,0.14):cu<2.0?vec3(1.0,0.75,0.2):cu<3.0?vec3(0.2,0.85,0.35):vec3(0.3,0.55,1.0); vec2 ea=vec2(dm,fk - c5*1.05); float fU=length(ea/vec2(c5*0.42,c5*0.7))- 1.0; float dp=clamp(-fU*c5*0.5*av + 0.5,0.0,1.0); float cF=clamp((c5*0.22 - abs(dm))*av + 0.5,0.0,1.0)*clamp((c5*0.4 - abs(fk - c5*0.25))*av + 0.5,0.0,1.0); vec3 eI=fm*(0.35 + 0.75*cG)+ vec3(1.0)*pow(max(1.0 - length(ea/c5 - vec2(-0.12,-0.2))*2.2,0.0),2.0)*0.8*cG; vec4 fn=vec4(eI*dp,dp); G=fn + G*(1.0 - fn.a); G=vec4(vec3(0.1,0.25,0.12)*cF,cF)+ G*(1.0 - cF); float bt=exp(-dot(ea,ea)/(c5*c5*2.2))*cG*0.75; m=ab(m,G,b4*aT); m +=vec4(fm*bt,0.0)*b4*min(aT,1.0); } } } } return m; }
`;
var XMAS_DOTS = `#version 300 es
precision highp float;in float aU;in float a5;in float aN;out vec4 m; void main(){ vec2 b=(gl_PointCoord - 0.5)*aN; float L=atan(b.y,b.x)+ aU*2.0 + a5,s=length(b),bg=a5*1.5; float w=mod(L,1.0471976)- 0.5235988; vec2 S=vec2(cos(w),sin(w))*s; float fl=abs(S.y); vec2 V=vec2(S.x - bg*0.55,abs(S.y)); float fV=abs(dot(V,vec2(-0.5,0.866))); float aV=min(fl,(S.x>bg*0.55&&S.x<bg*0.85)?fV:1e3); float E=clamp(0.9 - aV,0.0,1.0)*step(s,bg)+ clamp(bg*0.18 - s + 0.5,0.0,1.0); E=clamp(E,0.0,1.0)*aU; m=vec4(vec3(0.92,0.96,1.0)*E,E); }`;
var PRESET = { palette: ["#C8102E", "#F4F1EA", "#1E7B3C", "#E8B84A"], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
var CHRISTMAS = {
  cane: 7,
  // radius of the candy cane on the front
  stripe: 16,
  // width of its stripes
  snow: 1,
  // snowfall behind the front (0 = none)
  flake: 3,
  // size of a snowflake
  lights: 1,
  // the string of lights on the outline (0 = none)
  bulbs: 30,
  // distance between two bulbs
  cap: 11,
  // snow on the top edge, with icicles (0 = none)
  frost: 0.6
  // frost and glints ahead of the front
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var christmas = Object.freeze({
  name: "christmas",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, s = clamp(Math.sqrt(k), 0.55, 1.4);
    const v = (key) => o[key] ?? CHRISTMAS[key];
    c.cane = Math.max(v("cane") * s, 2);
    c.stripe = Math.max(v("stripe") * s, 3);
    c.snow = clamp(v("snow"), 0, 3);
    c.flake = Math.max(v("flake") * s, 1);
    c.lights = Math.max(v("lights"), 0);
    c.bulbs = Math.max(v("bulbs") * s, 10);
    c.cap = Math.max(v("cap") * s, 0);
    c.frost = Math.max(v("frost"), 0);
  },
  shader: Object.freeze({ key: "christmas", chunk: XMAS_WAVE, dots: XMAS_DOTS }),
  uniforms: (c) => ({
    co: c.cane,
    bG: c.stripe,
    cp: c.snow,
    dk: c.flake,
    aT: c.lights,
    bd: c.bulbs,
    c2: c.cap,
    bX: c.frost,
    d5: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  CHRISTMAS,
  christmas
};
