// GPU-procedural surfaces: crisp at any zoom, no texture downloads or main-thread canvas work.
import * as THREE from 'three'
import { quality } from './tier.js'

const GLSL = /* glsl */ `
varying vec3 vProcPos;
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0., a = .5; for (int i = 0; i < FBM_OCTAVES; i++){ v += a * vnoise(p); p *= 2.03; a *= .5; } return v; }

// Walnut, flat-sawn. Growth lines run along the board (TIMBER_ALONG) with irregular spacing and a slow meander,
// low contrast like finished veneer; board-scale tone drift and a per-piece seed so neighbouring pieces differ.
// Pores and fine streaks fade out once they get smaller than a pixel, so the grain does not shimmer at distance.
uniform vec3 uSeed;
vec3 timber(vec3 p, out float rough){
  vec3 q = p + uSeed;
  float along = TIMBER_ALONG, across = TIMBER_ACROSS, depth = TIMBER_DEPTH;
  float bend = fbm(vec3(across * 2.4, along * .22, uSeed.y)) - .5;
  float r = across + bend * .16 + depth * .5 + .04 * sin(along * 1.7 + uSeed.z);
  float spacing = fbm(vec3(across * 7., along * .5, uSeed.x * 3.));
  float ring = fract(r * 21. + spacing * 2.2);
  float line = smoothstep(.6, .88, ring) * (1. - smoothstep(.9, 1., ring));
  float broad = fbm(vec3(across * 1.1, along * .16, uSeed.z + 4.));
  float streak = fbm(vec3(across * 38., along * .9, uSeed.x));
  float px = length(fwidth(q));
  float fine = 1. - smoothstep(.0005, .0025, px);
  float pores = vnoise(vec3(across * 700., along * 9., depth * 700.));
  float tone = clamp(.55 + .5 * (broad - .5) + .22 * (streak - .5) - .24 * line, 0., 1.);
  vec3 dark = vec3(.040, .021, .012), mid = vec3(.082, .046, .026), light = vec3(.135, .082, .048);
  vec3 c = tone < .5 ? mix(dark, mid, tone * 2.) : mix(mid, light, (tone - .5) * 2.);
  c *= 1. - fine * .16 * smoothstep(.55, .85, pores);
  rough = .36 + .08 * line + .06 * fine * (pores - .5);
  return c;
}

// Ivory limewash: broad cloudy movement, trowel marks and fine grain. p in world metres.
vec3 plaster(vec3 p, out float rough){
  float m = fbm(p * .9);
  float tr = fbm(vec3(p.x * 2.2, p.y * .55, p.z * 2.2) + 4.);
  float s = fbm(p * 24.);
  float g = vnoise(p * 560.);
  float v = .90 + .13 * (m - .5) * 2. + .06 * (tr - .5) * 2. + .035 * s + .03 * g;
  rough = .86 + .08 * s;
  return vec3(v);
}

// Pale travertine floor with slab joints and soft strata.
vec3 stone(vec3 p, out float rough){
  vec2 uv = p.xz / vec2(1.2, .6);
  vec2 f = abs(fract(uv + .5) - .5) * vec2(1.2, .6);
  float joint = 1. - smoothstep(.0008, .0026, min(f.x, f.y));
  float strata = fbm(vec3(p.x * .6, p.y * 40., p.z * 3.2));
  float cloud = fbm(p * 1.6);
  float s = fbm(p * 38.);
  float v = .86 + .1 * (cloud - .5) * 2. + .06 * (strata - .5) * 2. + .04 * s;
  rough = .42 + .2 * s;
  return vec3(v) * (1. - .42 * joint);
}
`

export function procedural(material, fn, space = 'object', { axis = 'y', seed = [0, 0, 0] } = {}) {
  // grain along the piece's long axis: y for upright boards (door, stands), x for horizontal ones
  const along = axis === 'x' ? 'q.x' : 'q.y', across = axis === 'x' ? 'q.y' : 'q.x'
  const uSeed = { value: new THREE.Vector3(...seed) }
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uSeed = uSeed
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vProcPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vProcPos = ${space === 'world' ? '(modelMatrix * vec4(transformed, 1.0)).xyz' : 'transformed'};`)
    sh.fragmentShader = sh.fragmentShader
      // lite tier: 3 noise octaves instead of 5, the finest grain is barely visible at its resolution anyway.
      // ponytail: tools/showroom renders films through this too; render them on a discrete GPU to keep 5.
      .replace('#include <common>', `#include <common>
#define FBM_OCTAVES ${quality() === 'full' ? 5 : 3}
#define TIMBER_ALONG ${along}
#define TIMBER_ACROSS ${across}
#define TIMBER_DEPTH q.z
${GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float procR; diffuseColor.rgb *= ${fn}(vProcPos, procR);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(procR, 0., 1.);')
  }
  material.customProgramCacheKey = () => fn + space + axis
  return material
}

// opts: { axis: 'x' | 'y', seed: [x, y, z] } — give each separate piece its own seed
export const timberMaterial = (opts) => procedural(new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.32 }), 'timber', 'object', opts)
export const plasterMaterial = (color = '#ece4d4') => procedural(new THREE.MeshStandardMaterial({ color, metalness: 0 }), 'plaster', 'world')
export const stoneMaterial = (color = '#e8decb') => procedural(new THREE.MeshStandardMaterial({ color, metalness: 0 }), 'stone', 'world')
