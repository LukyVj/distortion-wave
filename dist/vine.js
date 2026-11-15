/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/vine.js
var VINE_WAVE = `
uniform float t,dj,bX,bY,G,di,bL; float at(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float cv(vec2 b,float n,float aU){ b=abs(b);float J=sqrt(n*n - aU*aU); return(b.y - J)*aU>b.x*J?length(b - vec2(0.0,J)):length(b + vec2(aU,0.0))- n; } float v(vec2 W,vec2 b){ if(!e)return 0.0; float A=(K?atan(W.y,W.x)*40.0*O:W.x)/max(t*1.6,1.0); return di*(abs(sin(A + a*0.6))*0.7 + abs(sin(A*2.3 - a*0.4 + 1.7))*0.3); } vec3 bZ(float bj){return mix(d(h(bj)),vec3(0.11,0.3,0.12),0.15);} vec4 bM(vec2 b,vec2 bG,float ag,float eg,float eo){ vec2 aD=(b + bG)/ag,au=floor(aD); float bj=at(au),bB=at(au + 4.7),d8=at(au + 9.1); if(bj>eg)return vec4(0.0); vec2 bk=(fract(aD)- 0.5 -(vec2(bB,d8)- 0.5)*0.5)*ag; float L=bj*av + eo*(bB - 0.5)*2.0; bk=bp(L)*bk; float eq=ag*(0.7 + 0.35*d8); float aU=cv(bk,eq*0.5,eq*0.32); float dq=l.x/B.x; float Y=clamp(0.5 - aU/dq,0.0,1.0); if(Y<=0.0)return vec4(0.0); float eG=1.0 - smoothstep(0.0,dq*1.2,abs(bk.x))*1.0; vec3 p=bZ(bB*0.8 + d8*0.2)*(0.8 + 0.35*clamp(bk.x/eq + 0.5,0.0,1.0)); p=mix(p,p*1.45,eG*0.6); return vec4(p*Y,Y); } vec4 aL(vec4 m,vec4 a7,float ad){a7*=ad;return a7 + m*(1.0 - a7.a);} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(!e||j<0.001)return m; float ad=min(j*1.5,1.0)*c,o=max(w*dj,t*3.0); if(c>0.0){ if(i<o*0.35&&i>-o*1.6){ float cP=i>0.0?1.0 - i/(o*0.35):1.0 - smoothstep(o*0.2,o*1.6,-i); m=aL(m,bM(b,vec2(0.0),t,cP*0.95,0.0),ad); m=aL(m,bM(b,vec2(t*0.5,t*0.37),t*0.8,cP*0.8,0.0),ad); } if(bX>0.0&&i<-o*0.3&&i>-Q*1.4){ float cm=a,ag=t*1.9; vec2 bG=vec2(sin(cm*1.3 + b.y*0.02)*ag*0.35,-cm*42.0*O); float bD=1.0 - clamp(-i/(Q*1.4),0.0,1.0); m=aL(m,bM(b,bG,ag,bX*0.28*bD,cm*2.0),ad); } } if(bY>0.0&&V<0.5&&ai>0.0&&z>-G*8.0 - t){ float F=1.0 - smoothstep(-w*0.6,w*0.4,i); float ax=smoothstep(-s,s,i +(T - aH)/a4); float eh=bY*min(ai*bL,1.0)*F*ax*clamp(0.5 - z*(B.x/l.x)+ G*8.0,0.0,1.0); if(eh>0.001){ float eE=2.0*(k.z + k.w),A=(atan(D.y/k.w,D.x/k.z)/av + 0.5)*eE; float eP=sin(A/(t*1.3))*G*1.6 + sin(A/(t*0.55)+ 1.3)*G*0.5; float aU=z + G*2.5 + eP; float cY=clamp(G*0.5 - abs(aU)+ 0.5,0.0,1.0); vec3 e2=vec3(0.2,0.36,0.14)*(0.8 + 0.4*smoothstep(-G,G,aU)); m=aL(m,vec4(e2*cY,cY),eh); float bH=t*1.1,E=floor(A/bH),cX=mod(E,2.0)*2.0 - 1.0; vec2 bk=vec2(fract(A/bH)- 0.5,0.0)*bH; bk.y=aU + cX*t*0.32; bk=bp(cX*0.9)*bk; float eB=t*(0.5 + 0.25*at(vec2(E,1.0))); float eY=cv(bk.yx,eB*0.5,eB*0.32); float eA=clamp(0.5 - eY*(B.x/l.x),0.0,1.0)*step(0.25,at(vec2(E,3.0))); m=aL(m,vec4(bZ(at(vec2(E,2.0)))*eA,eA),eh); } } return m; }
`;
var VINE_DOTS = `#version 300 es
precision highp float;in float bm;in float bN;in float aS;out vec4 m; void main(){ float L=bm*7.0 + bN*2.0,D=cos(L),A=sin(L); vec2 b=mat2(D,A,-A,D)*(gl_PointCoord - 0.5)*aS; float n=bN*1.4,aA=n*0.62,J=sqrt(n*n - aA*aA); vec2 W=abs(b); float aU=(W.y - J)*aA>W.x*J?length(W - vec2(0.0,J)):length(W + vec2(aA,0.0))- n; float Y=clamp(0.5 - aU,0.0,1.0)*bm; vec3 aD=mix(vec3(0.33,0.7,0.25),vec3(0.62,0.86,0.3),fract(bN*3.7)); m=vec4(aD*Y,Y); }`;
var PRESET = { palette: ["#3FA34D", "#7BC950", "#2E7D32", "#A5D86E", "#1B5E20"], band: 0.3, rimStrength: 0.5, hairWidth: 0, particleSize: 5 };
var VINE = {
  leaf: 26,
  // size of a leaf
  zone: 0.8,
  // width of the foliage around the front, × the band's lead
  bumps: 14,
  // leafy bumps of the front
  fall: 1,
  // falling leaves behind the front (0 = none)
  vine: 1,
  // strength of the vine on the outline (0 = none)
  vineWidth: 2.5
  // thickness of its stem
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var vine = Object.freeze({
  name: "vine",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? VINE[key];
    c.leaf = Math.max(v("leaf") * clamp(Math.sqrt(k), 0.55, 1.4), 6);
    c.zone = v("zone");
    c.bumps = v("bumps") * k * i;
    c.fall = clamp(v("fall"), 0, 3);
    c.vine = Math.max(v("vine"), 0);
    c.vineWidth = Math.max(v("vineWidth") * clamp(k, 0.6, 1.4), 1);
  },
  shader: Object.freeze({ key: "vine", chunk: VINE_WAVE, dots: VINE_DOTS }),
  uniforms: (c) => ({
    t: c.leaf,
    dj: c.zone,
    bX: c.fall,
    bY: c.vine,
    G: c.vineWidth,
    di: c.bumps,
    bL: 1 / Math.max(c.rimStrength, 0.05)
  })
});
export {
  VINE,
  vine
};
