import * as THREE from 'three'
import { clamp01 } from './story.js'

// Camera keyframes in world metres. Handle (door closed) sits near (-0.34, 1.02, -0.01).
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const KEYS = [
  { at: 0.0, pos: V(-0.8, 1.09, 0.55), tgt: V(-0.37, 0.99, -0.01), fov: 27 },
  { at: 0.22, pos: V(-0.46, 1.45, 0.42), tgt: V(-0.34, 1.0, -0.02), fov: 27 },
  { at: 0.44, pos: V(-0.33, 1.03, 0.56), tgt: V(-0.33, 1.0, -0.02), fov: 27 },
  { at: 0.62, pos: V(-0.6, 1.16, 0.98), tgt: V(-0.34, 1.0, -0.14), fov: 28 },
  { at: 0.82, pos: V(-0.18, 1.3, 1.5), tgt: V(-0.05, 1.08, -0.9), fov: 34 },
  { at: 0.92, pos: V(-0.2, 1.38, -0.6), tgt: V(-0.08, 1.02, -2.7), fov: 44 }, // through the doorway: the whole showroom
  { at: 1.0, pos: V(-0.06, 1.38, -1.05), tgt: V(-0.04, 1.03, -2.72), fov: 40 }, // step in: the hardware on the centre plinths
]

const cr = (a, b, c, d, t, out) => {
  const t2 = t * t, t3 = t2 * t
  const f = (k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3)
  return out.set(f('x'), f('y'), f('z'))
}

export function cameraAt(p, pos, tgt) {
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++
  const k0 = KEYS[i], k1 = KEYS[i + 1]
  const lin = clamp01((p - k0.at) / (k1.at - k0.at))
  const t = lin + (lin * lin * (3 - 2 * lin) - lin) * 0.65
  const A = KEYS[Math.max(0, i - 1)], D = KEYS[Math.min(KEYS.length - 1, i + 2)]
  cr(A.pos, k0.pos, k1.pos, D.pos, t, pos)
  cr(A.tgt, k0.tgt, k1.tgt, D.tgt, t, tgt)
  return k0.fov + (k1.fov - k0.fov) * t
}

// Where the object sits in frame (fractions of the viewport) and a dolly factor for portrait screens.
export function composition(w, h, p) {
  const aspect = w / h
  const rel = clamp01((p - 0.8) / 0.2)
  const e = rel * rel * (3 - 2 * rel)
  // Portrait: outside the room the camera pulls back to fit the door; inside, pulling back would put the door
  // leaf in front of the lens, so it widens the lens instead.
  const narrow = 1 - Math.min(aspect, 1)
  return aspect > 1.15
    ? { shiftX: 0.2 * (1 - e) + 0.12 * e, shiftY: 0, dolly: 1, fovMul: 1 } // keep the hardware clear of the copy on the left
    : { shiftX: 0.2 * e, shiftY: 0.1 * (1 - e), dolly: 1 + narrow * 1.15 * (1 - e), fovMul: 1 + narrow * 0.75 * e }
}
