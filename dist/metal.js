/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/metal.js
var METAL_WAVE = `
uniform float aQ,dL,cb,cD,bV; float v(vec2 W,vec2 b){ if(!e)return 0.0; float A=K?atan(W.y,W.x)*2.0:W.x/(80.0*O); return dL*(0.6*sin(A*1.3 + a*2.1)+ 0.4*sin(A*2.9 - a*2.7 + 1.3)); } vec3 ek(vec3 n,float cy){ float e5=-n.y; vec3 eN=mix(vec3(0.62,0.66,0.74),d(h(cy)),0.35); vec3 D=mix(vec3(0.05,0.055,0.07),eN,smoothstep(-0.25,0.35,e5)); D +=vec3(1.0)*exp(-pow((e5 - 0.05)/0.07,2.0))*0.9; D +=vec3(0.9)*exp(-pow((e5 - 0.75)/0.12,2.0))*0.5; return D; } vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float bj=aQ*0.5,ac=(i + bj*0.9)/bj; if(c<=0.0||!e||j<0.001||abs(ac)>=1.0)return m; vec2 aN=ah(b).n; float ad=min(j*1.5,1.0),A=sqrt(1.0 - ac*ac); float eM=K?atan(N.y,N.x)*9.0:N.x*0.07/O; float eH=0.6*sin(eM + a*3.0)+ 0.4*sin(eM*2.3 - a*2.1 + ac*2.0); vec3 e6=normalize(vec3(aN*ac + vec2(-aN.y,aN.x)*eH*cb*0.3,A)); vec3 dR=reflect(vec3(0.0,0.0,-1.0),e6); float X=(K?atan(N.y,N.x)/av:N.x*0.002/O)+ a*0.05; vec3 p=ek(dR,X); vec2 H=b + dR.xy*aQ*0.6; vec4 aM=mix(u(x,f,b,H),u(y,g,b,H),step(0.0,i + dot(dR.xy,aN)*aQ*0.6)); p=mix(p,aM.rgb/max(aM.a,1e-3),bV*aM.a*(0.4 + 0.6*A)); vec3 e7=normalize(vec3(-0.35,-0.6,0.72)); p +=pow(max(dot(e6,e7),0.0),60.0)*cD*1.4; p*=mix(0.35,1.0,smoothstep(0.0,0.45,A)); float L=smoothstep(1.0,0.86,abs(ac))*ad*c; return vec4(clamp(p,0.0,1.0)*L,L)+ m*(1.0 - L); }
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
  uniforms: (c) => ({ aQ: c.thickness, dL: c.wobble, cb: c.ripple, cD: c.shine, bV: c.reflect })
});
export {
  METAL,
  metal
};
