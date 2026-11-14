/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/metal.js
var METAL_WAVE = `
uniform float aE,ds,bS,ck,bE; float v(vec2 ac,vec2 b){ if(!e)return 0.0; float z=K?atan(ac.y,ac.x)*2.0:ac.x/(80.0*Q); return ds*(0.6*sin(z*1.3 + a*2.1)+ 0.4*sin(z*2.9 - a*2.7 + 1.3)); } vec3 dY(vec3 m,float cf){ float eB=-m.y; vec3 el=mix(vec3(0.62,0.66,0.74),d(h(cf)),0.35); vec3 E=mix(vec3(0.05,0.055,0.07),el,smoothstep(-0.25,0.35,eB)); E +=vec3(1.0)*exp(-pow((eB - 0.05)/0.07,2.0))*0.9; E +=vec3(0.9)*exp(-pow((eB - 0.75)/0.12,2.0))*0.5; return E; } vec4 y(vec4 p,vec2 b,vec2 E,float w,float j,vec2 I,float bp){ float c=clamp(0.5 - w*(G.x/t.x),0.0,1.0); float bI=aE*0.5,V=(j + bI*0.9)/bI; if(c<=0.0||!e||i<0.001||abs(V)>=1.0)return p; vec2 aB=Z(b).n; float ae=min(i*1.5,1.0),z=sqrt(1.0 - V*V); float ek=K?atan(I.y,I.x)*9.0:I.x*0.07/Q; float ef=0.6*sin(ek + a*3.0)+ 0.4*sin(ek*2.3 - a*2.1 + V*2.0); vec3 eC=normalize(vec3(aB*V + vec2(-aB.y,aB.x)*ef*bS*0.3,z)); vec3 dy=reflect(vec3(0.0,0.0,-1.0),eC); float R=(K?atan(I.y,I.x)/aF:I.x*0.002/Q)+ a*0.05; vec3 q=dY(dy,R); vec2 A=b + dy.xy*aE*0.6; vec4 aA=mix(n(r,f,b,A),n(s,g,b,A),step(0.0,j + dot(dy.xy,aB)*aE*0.6)); q=mix(q,aA.rgb/max(aA.a,1e-3),bE*aA.a*(0.4 + 0.6*z)); vec3 eD=normalize(vec3(-0.35,-0.6,0.72)); q +=pow(max(dot(eC,eD),0.0),60.0)*ck*1.4; q*=mix(0.35,1.0,smoothstep(0.0,0.45,z)); float M=smoothstep(1.0,0.86,abs(V))*ae*c; return vec4(clamp(q,0.0,1.0)*M,M)+ p*(1.0 - M); }
`;
var PRESET = { palette: ["#C9D6FF", "#F2F6FF", "#FFE3C2", "#B9F3FF", "#E3C9FF"], band: 0.25, rimStrength: 0.55 };
var METAL = {
  thickness: 46,
  // width of the metal bead
  wobble: 14,
  // slow liquid wobble of the front
  ripple: 0.6,
  // small ripples on the surface (0 = smooth)
  shine: 1,
  // strength of the specular highlight
  reflect: 0.35
  // how much of the content the metal mirrors (0 to 1)
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var metal = Object.freeze({
  name: "metal",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? METAL[key];
    c.thickness = Math.max(v("thickness") * k, 10);
    c.wobble = v("wobble") * k * i;
    c.ripple = Math.max(v("ripple"), 0);
    c.shine = Math.max(v("shine"), 0);
    c.reflect = clamp(v("reflect"), 0, 1);
  },
  shader: Object.freeze({ key: "metal", chunk: METAL_WAVE }),
  uniforms: (c) => ({ aE: c.thickness, ds: c.wobble, bS: c.ripple, ck: c.shine, bE: c.reflect })
});
export {
  METAL,
  metal
};
