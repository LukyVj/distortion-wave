/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/metal.js
var METAL_WAVE = `
uniform float aZ,d1,cn,cS,b4; float v(vec2 Y,vec2 b){ if(!e)return 0.0; float z=J?atan(Y.y,Y.x)*2.0:Y.x/(80.0*L); return d1*(0.6*sin(z*1.3 + a*2.1)+ 0.4*sin(z*2.9 - a*2.7 + 1.3)); } vec3 ey(vec3 s,float bS){ float fo=-s.y; vec3 e4=mix(vec3(0.62,0.66,0.74),d(h(bS)),0.35); vec3 E=mix(vec3(0.05,0.055,0.07),e4,smoothstep(-0.25,0.35,fo)); E +=vec3(1.0)*exp(-pow((fo - 0.05)/0.07,2.0))*0.9; E +=vec3(0.9)*exp(-pow((fo - 0.75)/0.12,2.0))*0.5; return E; } vec4 D(vec4 p,vec2 b,vec2 E,float A,float i,vec2 N,float bh){ float c=clamp(0.5 - A*(I.x/t.x),0.0,1.0); float aN=aZ*0.5,ah=(i + aN*0.9)/aN; if(c<=0.0||!e||j<0.001||abs(ah)>=1.0)return p; vec2 aC=ad(b).n; float ai=min(j*1.5,1.0),z=sqrt(1.0 - ah*ah); float e2=J?atan(N.y,N.x)*9.0:N.x*0.07/L; float eX=0.6*sin(e2 + a*3.0)+ 0.4*sin(e2*2.3 - a*2.1 + ah*2.0); vec3 fp=normalize(vec3(aC*ah + vec2(-aC.y,aC.x)*eX*cn*0.3,z)); vec3 cX=reflect(vec3(0.0,0.0,-1.0),fp); float aa=(J?atan(N.y,N.x)/an:N.x*0.002/L)+ a*0.05; vec3 l=ey(cX,aa); vec2 C=b + cX.xy*aZ*0.6; vec4 aV=mix(u(x,f,b,C),u(y,g,b,C),step(0.0,i + dot(cX.xy,aC)*aZ*0.6)); l=mix(l,aV.rgb/max(aV.a,1e-3),b4*aV.a*(0.4 + 0.6*z)); vec3 ap=normalize(vec3(-0.35,-0.6,0.72)); l +=pow(max(dot(fp,ap),0.0),60.0)*cS*1.4; l*=mix(0.35,1.0,smoothstep(0.0,0.45,z)); float H=smoothstep(1.0,0.86,abs(ah))*ai*c; return vec4(clamp(l,0.0,1.0)*H,H)+ p*(1.0 - H); }
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
  uniforms: (c) => ({ aZ: c.thickness, d1: c.wobble, cn: c.ripple, cS: c.shine, b4: c.reflect })
});
export {
  METAL,
  metal
};
