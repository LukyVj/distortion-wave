/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */

// src/effects/ink.js
var INK_WAVE = `
uniform float bu,bv,bg,cC,c6,dK; float aY(vec2 b){return fract(sin(dot(b,vec2(127.1,311.7)))*43758.5453);} float a6(vec2 b){ vec2 E=floor(b),q=fract(b);q=q*q*(3.0 - 2.0*q); return mix(mix(aY(E),aY(E + vec2(1,0)),q.x),mix(aY(E + vec2(0,1)),aY(E + vec2(1,1)),q.x),q.y); } float ec(vec2 b){float A=0.0,L=0.5;for(int E=0;E<4;E++){A +=L*a6(b);b=b*2.11 + vec2(3.1,8.7);L*=0.5;}return A/0.9375;} float v(vec2 W,vec2 b){ if(!e)return 0.0; return(ec(b/bv + a*0.04)- 0.5)*2.0*bu +(a6(b/(bv*0.12))- 0.5)*bu*0.35; } vec4 cU(vec2 b,float aU){return mix(u(x,f,b,b),u(y,g,b,b),step(0.0,aU));} vec4 C(vec4 m,vec2 b,vec2 D,float z,float i,vec2 N,float a4){ float c=clamp(0.5 - z*(B.x/l.x),0.0,1.0); float o=max(w*c6,24.0*O); if(c<=0.0||!e||j<0.001||i>o||i<-o*1.6)return m; float ad=min(j*1.5,1.0); vec2 aN=ah(b).n,bn=vec2(bg,bg*0.55); vec4 L=cU(b + bn,i + dot(bn,aN)),J=cU(b - bn,i - dot(bn,aN)); float aE=mix(0.5,0.25 + 0.3*ci(floor(b*1.2))+ 0.2*a6(b*0.5),cC); vec3 cL=L.a>0.0?L.rgb/L.a:vec3(1.0),eS=J.a>0.0?J.rgb/J.a:vec3(1.0); float d0=smoothstep(aE - 0.12,aE + 0.12,(1.0 - cL.g)*1.05); float d1=smoothstep(aE - 0.12,aE + 0.12,(1.0 - eS.r)*1.05); vec3 ed=d(az[0]),ee=d(az[1%ab]); vec3 dA=vec3(0.965,0.945,0.9); vec3 p=dA*mix(vec3(1.0),ed,d0*0.95)*mix(vec3(1.0),ee,d1*0.85); float en=(1.0 - smoothstep(0.0,dK,-i))*step(i,0.0)*smoothstep(0.15,0.55,aE + 0.25); vec3 ef=d(h((K?atan(N.y,N.x)/av:N.x*0.002/O)+ a*0.05)); p*=mix(vec3(1.0),ef,en*0.9); float eu=max(max(L.a,J.a),m.a); float aA=(1.0 - smoothstep(o*0.35,o,i>0.0?i:-i/1.6))*ad*c; return mix(m,vec4(p*eu,eu),aA); }
`;
var PRESET = { palette: ["#FF48B0", "#0078BF", "#FFE800", "#00A95C"], band: 0.25, rimStrength: 0.5, hairWidth: 0 };
var INK = {
  bleed: 30,
  // how far the ink spreads ahead and behind the front
  scale: 110,
  // one noise cell of the bleed (smaller = more feathered)
  misregister: 3,
  // offset between the two inks
  grain: 1,
  // paper grain in the print (0 = flat)
  zone: 1.2,
  // width of the printed zone around the front, × the band's lead
  ink: 36
  // width of the wet ink behind the front
};
var clamp = (x, a, b) => Math.min(Math.max(x, a), b);
var ink = Object.freeze({
  name: "ink",
  preset: Object.freeze({ ...PRESET }),
  tune(c, o) {
    const k = c.k, i = Math.max(0, o.intensity ?? 1);
    const v = (key) => o[key] ?? INK[key];
    c.bleed = v("bleed") * k * i;
    c.scale = Math.max(v("scale") * k, 16);
    c.misregister = v("misregister") * clamp(k, 0.6, 1.3);
    c.grain = clamp(v("grain"), 0, 1);
    c.zone = v("zone");
    c.ink = Math.max(v("ink") * k, 4);
  },
  shader: Object.freeze({ key: "ink", chunk: INK_WAVE }),
  uniforms: (c) => ({ bu: c.bleed, bv: c.scale, bg: c.misregister, cC: c.grain, c6: c.zone, dK: c.ink })
});
export {
  INK,
  ink
};
