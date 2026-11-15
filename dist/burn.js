/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/burn.js
var BURN_WAVE = `
uniform float cz,br,bS,aG,bq,cA; float aq(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bO(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(aq(E),aq(E + vec2(1,0)),q.x),mix(aq(E + vec2(0,1)),aq(E + vec2(1,1)),q.x),q.y); } float dY(vec2 b){float A=0.0,L=0.5;for(int E=0;E<4;E++){A +=L*bO(b);b=b*2.07 + vec2(5.3,1.7);L*=0.5;}return A/0.9375;} float v(vec2 W,vec2 b){ if(!e)return 0.0; return(dY(b/br + vec2(0.0,a*0.12))- 0.5)*2.0*cz; } vec3 aw(float cm){return vec3(smoothstep(0.0,0.45,cm),smoothstep(0.3,0.8,cm),smoothstep(0.65,1.0,cm));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); if(c<=0.0||!e||j<0.001)return m; float ad=min(j*1.5,1.0),aN=bO(b/(br*0.18)+ a*0.7); if(i>0.0&&i<bS){ float ev=pow(1.0 - i/bS,1.6)*(0.75 + 0.5*aN); m.rgb=mix(m.rgb,m.rgb*vec3(0.55,0.32,0.16),clamp(ev*1.6,0.0,1.0)*ad); m.rgb*=1.0 - smoothstep(0.45,0.95,ev)*0.92*ad; } if(i<0.0)m.rgb*=1.0 - cA*0.7*exp(i/(aG*2.5))*(0.6 + 0.4*aN)*ad; float cQ=exp(-pow(i/aG,2.0))*(0.7 + 0.6*aN); float cm=clamp(cQ,0.0,1.0); vec3 eW=mix(aw(cm),d(h(0.3 + aN*0.4 + a*0.1)),0.3*(1.0 - cm)); float cw=clamp(exp(-abs(i)/(aG*2.2))*0.6*(0.6 + 0.4*aN)*ad,0.0,1.0)*c; m=vec4(aw(0.42)*cw,cw*0.5)+ m*(1.0 - cw*0.5); float L=clamp(smoothstep(0.08,0.6,cQ)*ad,0.0,1.0)*c; m=vec4(eW*L,L)+ m*(1.0 - L); if(bq>0.0&&i<aG&&i>-Q){ float ag=9.0*O + 4.0; vec2 aD=(b + vec2(0.0,a*38.0*O))/ag,au=floor(aD),q=fract(aD)- 0.5; float bj=aq(au),bB=aq(au + 7.3); vec2 bn=(vec2(bj,bB)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + bj*9.0),0.0); float aU=length(q - bn)*ag,n=0.8 + 1.5*bB; float ej=step(1.0 - bq*0.45*(1.0 - clamp(-i/Q,0.0,1.0)),bj); float e4=0.6 + 0.4*sin(a*12.0 + bj*40.0); float b4=clamp(exp(-aU*aU/(n*n))*ej*e4*ad,0.0,1.0)*c; m=vec4(aw(0.45 + 0.3*bB)*b4,b4)+ m*(1.0 - b4); } return m; }
`;
var PRESET = { palette: "ember", band: 0.3, rimStrength: 0.6, hairWidth: 0 };
var BURN = {
  roughness: 32,
  // how ragged the burning edge is
  scale: 100,
  // one noise cell of the edge (smaller = more ragged)
  char: 70,
  // scorched zone ahead of the edge
  heat: 11,
  // width of the glowing edge
  embers: 1,
  // embers behind the edge (0 = none)
  smoke: 0.5
  // smoke behind the edge (0 = none)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var burn = Object.freeze({
  name: "burn",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? BURN[key];
    c.roughness = v("roughness") * k * i;
    c.scale = Math.max(v("scale") * k, 16);
    c.char = Math.max(v("char") * k, 6);
    c.heat = Math.max(v("heat") * clamp(k, 0.5, 1.4), 2);
    c.embers = clamp(v("embers"), 0, 3);
    c.smoke = clamp(v("smoke"), 0, 1);
  },
  shader: Object.freeze({ key: "burn", chunk: BURN_WAVE }),
  uniforms: (c) => ({ cz: c.roughness, br: c.scale, bS: c.char, aG: c.heat, bq: c.embers, cA: c.smoke })
});
export {
  BURN,
  burn
};
