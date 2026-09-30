// Render estilo PS1: 320x240, vértices que tiemblan, texturas afines, color de 15 bits con dithering.
import * as THREE from 'three';
import { W, HH } from '../config.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(37, 4 / 3, 0.5, 160);
export let renderer = null;

// Uniforms compartidos por todos los materiales
export const U = {
  uRes: { value: new THREE.Vector2(W, HH) }, uSnap: { value: 1 }, uDither: { value: 1 },
  uLightDir: { value: new THREE.Vector3(0.3, 1, 0.6).normalize() },
  uAmb: { value: new THREE.Color(0x5a6480) }, uLCol: { value: new THREE.Color(0xd0d6e8) },
  uFogCol: { value: new THREE.Color(0x04060b) }, uFogNear: { value: 40 }, uFogFar: { value: 80 },
};

const VS = `
uniform vec2 uRes; uniform float uSnap; uniform vec3 uLightDir; uniform vec3 uAmb; uniform vec3 uLCol;
uniform float uFogNear; uniform float uFogFar; uniform float uUnlit;
varying vec3 vUvw; varying vec3 vLight; varying float vFog; varying vec3 vIC;
#ifdef XRAY
varying vec2 vWxz;
#endif
void main(){
  // instancias (multitudes, flores, copos): cada una con su matriz y su color
#ifdef USE_INSTANCING
  vec4 lp=instanceMatrix*vec4(position,1.0); vec3 ln=mat3(instanceMatrix)*normal;
#else
  vec4 lp=vec4(position,1.0); vec3 ln=normal;
#endif
#ifdef USE_INSTANCING_COLOR
  vIC=instanceColor;
#else
  vIC=vec3(1.0);
#endif
#ifdef XRAY
  vWxz=(modelMatrix*lp).xz;
#endif
  vec4 mv=modelViewMatrix*lp;
  vec4 p=projectionMatrix*mv;
  // snap de vértices a la grilla de píxeles (el "temblor" de la PS1)
  if(uSnap>0.5 && p.w>0.0){ vec2 g=uRes*0.5; vec2 ndc=p.xy/p.w; ndc=floor(ndc*g+0.5)/g; p.xy=ndc*p.w; }
  // normal y luz en espacio de cámara: normalMatrix corrige las escalas no parejas (dunas aplastadas, montoncitos de nieve)
  vec3 n=normalize(normalMatrix*ln);
  vec3 l=normalize((viewMatrix*vec4(uLightDir,0.0)).xyz);
  float d=max(dot(n,l),0.0);
  vLight = uUnlit>0.5 ? vec3(1.0) : uAmb + uLCol*d;   // luz por vértice (Gouraud)
  vUvw=vec3(uv*p.w, p.w);                              // mapeo afín, sin corrección de perspectiva
  vFog=clamp((length(mv.xyz)-uFogNear)/(uFogFar-uFogNear),0.0,1.0);
  gl_Position=p;
}`;

const FS = `
uniform sampler2D uMap; uniform vec3 uColor; uniform vec3 uEmissive; uniform vec3 uFogCol; uniform float uDither; uniform vec2 uOff;
varying vec3 vUvw; varying vec3 vLight; varying float vFog; varying vec3 vIC;
float b2(vec2 p){return mod(2.0*p.x+3.0*p.y,4.0);}
float bayer(vec2 f){vec2 p=mod(floor(f),4.0);return (4.0*b2(mod(p,2.0))+b2(floor(p/2.0)))/16.0;}
#ifdef XRAY
// "rayos X": agujeros tramados (como la transparencia de la PS1) donde hay alguien tapado abajo
uniform vec3 uHoles[4]; uniform float uGhost; varying vec2 vWxz;
#endif
void main(){
#ifdef XRAY
  if(bayer(gl_FragCoord.xy)<uGhost) discard;          // todo el piso medio transparente
  for(int i=0;i<4;i++){ if(uHoles[i].z>0.0){ float d=distance(vWxz,uHoles[i].xy)/uHoles[i].z; float k=clamp((1.0-d)*3.0,0.0,0.8); if(bayer(gl_FragCoord.xy)<k) discard; } }
#endif
  vec2 uv=vUvw.xy/vUvw.z + uOff;
  vec3 t=texture2D(uMap,uv).rgb;
  vec3 c=t*uColor*vIC*vLight + uEmissive;
  c=mix(c,uFogCol,vFog);
  if(uDither>0.5){ c=floor(c*31.0+bayer(gl_FragCoord.xy))/31.0; }  // 15 bits + dither
  gl_FragColor=vec4(c,1.0);
}`;

let whiteTex = null;
export function setWhiteTexture(t) { whiteTex = t; }

// Material PS1. Opciones: map, color, emissive, unlit, side
export function mat(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, {
      uMap: { value: o.map || whiteTex },
      uColor: { value: new THREE.Color(o.color !== undefined ? o.color : 0xffffff) },
      uEmissive: { value: new THREE.Color(o.emissive !== undefined ? o.emissive : 0x000000) },
      uUnlit: { value: o.unlit ? 1 : 0 },
      uOff: { value: new THREE.Vector2(0, 0) },
    }, o.xray ? { uHoles: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uGhost: { value: 0 } } : {}),
    defines: o.xray ? { XRAY: 1 } : {},
    vertexShader: VS, fragmentShader: FS, side: o.side || THREE.FrontSide,
  });
}

export function scaleUV(g, sx, sy) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * (sy === undefined ? sx : sy));
  return g;
}
export function add(geo, m, x = 0, y = 0, z = 0, parent = scene) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  parent.add(me);
  return me;
}
export const rotT = (s) => Math.atan2(-s.tz, s.tx);          // alinea el eje X local con un lado
export const faceIn = (nx, nz) => Math.atan2(-nx, -nz);      // +Z local mira al centro

export function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x04060b, 1);
  return renderer;
}
