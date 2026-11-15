/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/burn.js
var BURN_WAVE = `
uniform float cO,bD,b1,aQ,bC,cP; float ax(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bX(vec2 b){ vec2 B=floor(b),o=fract(b);o=o*o*(3.0 - 2.0*o); return mix(mix(ax(B),ax(B + vec2(1,0)),o.x),mix(ax(B + vec2(0,1)),ax(B + vec2(1,1)),o.x),o.y); } float ec(vec2 b){float z=0.0,H=0.5;for(int B=0;B<4;B++){z +=H*bX(b);b=b*2.07 + vec2(5.3,1.7);H*=0.5;}return z/0.9375;} float v(vec2 Y,vec2 b){ if(!e)return 0.0; return(ec(b/bD + vec2(0.0,a*0.12))- 0.5)*2.0*cO; } vec3 aD(float aP){return vec3(smoothstep(0.0,0.45,aP),smoothstep(0.3,0.8,aP),smoothstep(0.65,1.0,aP));} vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); if(c<=0.0||!e||j<0.001)return p; float ai=min(j*1.5,1.0),aC=bX(b/(bD*0.18)+ a*0.7); if(i>0.0&&i<b1){ float eK=pow(1.0 - i/b1,1.6)*(0.75 + 0.5*aC); p.rgb=mix(p.rgb,p.rgb*vec3(0.55,0.32,0.16),clamp(eK*1.6,0.0,1.0)*ai); p.rgb*=1.0 - smoothstep(0.45,0.95,eK)*0.92*ai; } if(i<0.0)p.rgb*=1.0 - cP*0.7*exp(i/(aQ*2.5))*(0.6 + 0.4*aC)*ai; float c3=exp(-pow(i/aQ,2.0))*(0.7 + 0.6*aC); float aP=clamp(c3,0.0,1.0); vec3 fg=mix(aD(aP),d(h(0.3 + aC*0.4 + a*0.1)),0.3*(1.0 - aP)); float cK=clamp(exp(-abs(i)/(aQ*2.2))*0.6*(0.6 + 0.4*aC)*ai,0.0,1.0)*c; p=vec4(aD(0.42)*cK,cK*0.5)+ p*(1.0 - cK*0.5); float H=clamp(smoothstep(0.08,0.6,c3)*ai,0.0,1.0)*c; p=vec4(fg*H,H)+ p*(1.0 - H); if(bC>0.0&&i<aQ&&i>-R){ float ag=9.0*L + 4.0; vec2 aF=(b + vec2(0.0,a*38.0*L))/ag,Z=floor(aF),o=fract(aF)- 0.5; float aN=ax(Z),a3=ax(Z + 7.3); vec2 bz=(vec2(aN,a3)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + aN*9.0),0.0); float bf=length(o - bz)*ag,s=0.8 + 1.5*a3; float ew=step(1.0 - bC*0.45*(1.0 - clamp(-i/R,0.0,1.0)),aN); float fn=0.6 + 0.4*sin(a*12.0 + aN*40.0); float cf=clamp(exp(-bf*bf/(s*s))*ew*fn*ai,0.0,1.0)*c; p=vec4(aD(0.45 + 0.3*a3)*cf,cf)+ p*(1.0 - cf); } return p; }
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
  uniforms: (c) => ({ cO: c.roughness, bD: c.scale, b1: c.char, aQ: c.heat, bC: c.embers, cP: c.smoke })
});
export {
  BURN,
  burn
};
