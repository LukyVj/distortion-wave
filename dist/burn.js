/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/burn.js
var BURN_WAVE = `
uniform float cg,be,bB,aw,bd,ch; float al(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float bx(vec2 b){ vec2 D=floor(b),k=fract(b);k=k*k*(3.0 - 2.0*k); return mix(mix(al(D),al(D + vec2(1,0)),k.x),mix(al(D + vec2(0,1)),al(D + vec2(1,1)),k.x),k.y); } float dF(vec2 b){float z=0.0,M=0.5;for(int D=0;D<4;D++){z +=M*bx(b);b=b*2.07 + vec2(5.3,1.7);M*=0.5;}return z/0.9375;} float v(vec2 ac,vec2 b){ if(!e)return 0.0; return(dF(b/be + vec2(0.0,a*0.12))- 0.5)*2.0*cg; } vec3 ao(float c6){return vec3(smoothstep(0.0,0.45,c6),smoothstep(0.3,0.8,c6),smoothstep(0.65,1.0,c6));} vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); if(c<=0.0||!e||i<0.001)return p; float ae=min(i*1.5,1.0),aB=bx(b/(be*0.18)+ a*0.7); if(j>0.0&&j<bB){ float d7=pow(1.0 - j/bB,1.6)*(0.75 + 0.5*aB); p.rgb=mix(p.rgb,p.rgb*vec3(0.55,0.32,0.16),clamp(d7*1.6,0.0,1.0)*ae); p.rgb*=1.0 - smoothstep(0.45,0.95,d7)*0.92*ae; } if(j<0.0)p.rgb*=1.0 - ch*0.7*exp(j/(aw*2.5))*(0.6 + 0.4*aB)*ae; float cy=exp(-pow(j/aw,2.0))*(0.7 + 0.6*aB); float c6=clamp(cy,0.0,1.0); vec3 eu=mix(ao(c6),d(h(0.3 + aB*0.4 + a*0.1)),0.3*(1.0 - c6)); float cd=clamp(exp(-abs(j)/(aw*2.2))*0.6*(0.6 + 0.4*aB)*ae,0.0,1.0)*c; p=vec4(ao(0.42)*cd,cd*0.5)+ p*(1.0 - cd*0.5); float M=clamp(smoothstep(0.08,0.6,cy)*ae,0.0,1.0)*c; p=vec4(eu*M,M)+ p*(1.0 - M); if(bd>0.0&&j<aw&&j>-ab){ float cu=9.0*Q + 4.0; vec2 aM=(b + vec2(0.0,a*38.0*Q))/cu,aJ=floor(aM),k=fract(aM)- 0.5; float bI=al(aJ),cC=al(aJ + 7.3); vec2 bb=(vec2(bI,cC)- 0.5)*0.7 + vec2(0.12*sin(a*3.0 + bI*9.0),0.0); float cp=length(k - bb)*cu,m=0.8 + 1.5*cC; float dX=step(1.0 - bd*0.45*(1.0 - clamp(-j/ab,0.0,1.0)),bI); float eA=0.6 + 0.4*sin(a*12.0 + bI*40.0); float bL=clamp(exp(-cp*cp/(m*m))*dX*eA*ae,0.0,1.0)*c; p=vec4(ao(0.45 + 0.3*cC)*bL,bL)+ p*(1.0 - bL); } return p; }
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
  uniforms: (c) => ({ cg: c.roughness, be: c.scale, bB: c.char, aw: c.heat, bd: c.embers, ch: c.smoke })
});
export {
  BURN,
  burn
};
