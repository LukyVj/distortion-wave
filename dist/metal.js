/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/metal.js
var METAL_WAVE = `
uniform float bc,ew,cH,dg,ck; float v(vec2 S,vec2 b){ if(!e)return 0.0; float w=Q?atan(S.y,S.x)*2.0:S.x/(80.0*N); return ew*(0.6*sin(w*1.3 + a*2.1)+ 0.4*sin(w*2.9 - a*2.7 + 1.3)); } vec3 e8(vec3 s,float bm){ float f8=-s.y; vec3 fL=mix(vec3(0.62,0.66,0.74),d(j(bm)),0.35); vec3 D=mix(vec3(0.05,0.055,0.07),fL,smoothstep(-0.25,0.35,f8)); D +=vec3(1.0)*exp(-pow((f8 - 0.05)/0.07,2.0))*0.9; D +=vec3(0.9)*exp(-pow((f8 - 0.75)/0.12,2.0))*0.5; return D; } vec4 F(vec4 m,vec2 b,vec2 D,float x,float f,vec2 M,float a8){ float c=clamp(0.5 - x*(P.x/u.x),0.0,1.0); float as=bc*0.5,af=(f + as*0.9)/as; if(c<=0.0||!e||k<0.001||abs(af)>=1.0)return m; vec2 aM=ai(b).n; float X=min(k*1.5,1.0),w=sqrt(1.0 - af*af); float fI=Q?atan(M.y,M.x)*9.0:M.x*0.07/N; float fC=0.6*sin(fI + a*3.0)+ 0.4*sin(fI*2.3 - a*2.1 + af*2.0); vec3 f9=normalize(vec3(aM*af + vec2(-aM.y,aM.x)*fC*cH*0.3,w)); vec3 bg=reflect(vec3(0.0,0.0,-1.0),f9); float ag=(Q?atan(M.y,M.x)/ar:M.x*0.002/N)+ a*0.05; vec3 l=e8(bg,ag); vec2 H=b + bg.xy*bc*0.6; vec4 a6=mix(y(A,h,b,H),y(B,i,b,H),step(0.0,f + dot(bg.xy,aM)*bc*0.6)); l=mix(l,a6.rgb/max(a6.a,1e-3),ck*a6.a*(0.4 + 0.6*w)); vec3 aw=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(f9,aw),0.0),60.0)*dg*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,w)); float L=smoothstep(1.0,0.86,abs(af))*X*c; return vec4(clamp(l,0.0,1.0)*L,L)+ m*(1.0 - L); }
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
  uniforms: (c) => ({ bc: c.thickness, ew: c.wobble, cH: c.ripple, dg: c.shine, ck: c.reflect })
});
export {
  METAL,
  metal
};
