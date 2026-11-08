// Original concept hardware geometry (not a Birdi stock item, not a manufacturer model).
// Units: metres. Profiles are authored in millimetres.
import * as THREE from 'three'

const MM = 0.001
const H = Math.PI / 2

const arc = (cx, cy, r, a0, a1, n = 8) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })

// Drop duplicate points, then split sharp corners so lathe normals stay crisp there.
function prepare(points) {
  const out = []
  for (const p of points) {
    const q = out[out.length - 1]
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4) out.push(p)
  }
  const res = [out[0]]
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1], b = out[i], c = out[i + 1]
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]]
    const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2)
    const cos = (d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2)
    if (cos < 0.8) {
      const e = 0.02
      res.push([b[0] - (d1[0] / l1) * e, b[1] - (d1[1] / l1) * e], [b[0] + (d2[0] / l2) * e, b[1] + (d2[1] / l2) * e])
    } else res.push(b)
  }
  res.push(out[out.length - 1])
  return res
}

// Built geometry is shared: the door and the showroom use the same rose, collar, key rose, lever and keyway, and
// building them (tangents especially) is the costliest CPU step of the scene on a phone. Never dispose these.
const built = new Map()
const once = (key, make) => built.get(key) || built.set(key, make()).get(key)

// Lathe about +Z; profile is [radius, height] in mm. UVs: u around, v along the profile.
export function latheZ(points, segments = 128) {
  return once(`lathe ${segments} ${points.join(';')}`, () => buildLathe(points, segments))
}
function buildLathe(points, segments) {
  const g = new THREE.LatheGeometry(prepare(points).map(([r, h]) => new THREE.Vector2(r * MM, h * MM)), segments)
  g.rotateX(Math.PI / 2)
  g.computeTangents()
  return g
}

// Rose: stepped base disc and a domed cap with a fine shadow groove between them.
export const roseProfile = [
  [0, 0], [25.8, 0], ...arc(25.8, 1.0, 1.0, -H, 0, 6),
  [26.8, 2.2], ...arc(25.8, 2.2, 1.0, 0, H, 6),
  [21.6, 3.2], [21.0, 3.2], [21.0, 3.8], [20.4, 3.8], [20.4, 5.6], ...arc(17.6, 5.6, 2.8, 0, H, 8),
  [9, 8.4], [0, 8.5],
]

export const collarProfile = [
  [0, 7.9], [11.4, 7.9], [11.4, 10.6], ...arc(10.2, 10.6, 1.2, 0, H, 6),
  [10.2, 11.8], [9.4, 11.8], [0, 11.8],
]

// Smaller rose used behind the key cylinder.
export const keyRoseProfile = [
  [0, 0], [17.0, 0], ...arc(17.0, 0.9, 0.9, -H, 0, 6),
  [17.9, 2.0], ...arc(17.0, 2.0, 0.9, 0, H, 6),
  [13.6, 2.9], [13.2, 2.9], [13.2, 4.2], ...arc(11.4, 4.2, 1.8, 0, H, 8),
  [0, 6.0],
]

/**
 * Lever arm: soft-squared section lofted along a return path.
 * Round neck leaves the rose, the grip flattens and tapers, the tip is a filleted end.
 * UVs: u along the arm, v around it, so a brushed texture runs along the length.
 */
export const leverGeometry = () => once('lever', buildLever)
function buildLever() {
  const pts = []
  for (let i = 0; i <= 8; i++) pts.push([0, 9 + 3 * i])
  for (const [x, z] of arc(16, 33, 16, Math.PI, H, 14).slice(1)) pts.push([x, z])
  for (let i = 1; i <= 9; i++) pts.push([16 + 11 * i, 49 - 0.1 * i])
  pts.push([128, 47.5], [138, 44])
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x * MM, 0, z * MM)), false, 'centripetal')
  const N = 220, M = 64
  const path = curve.getSpacedPoints(N)
  const len = curve.getLength() / MM
  const Y = new THREE.Vector3(0, 1, 0)
  const pos = new Float32Array((N + 1) * M * 3)
  const uv = new Float32Array((N + 1) * M * 2)
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const T = new THREE.Vector3(), Nrm = new THREE.Vector3()
  const cap = 5
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * len
    curve.getTangentAt(i / N, T)
    Nrm.crossVectors(Y, T).normalize()
    const flat = smooth(24, 56, s)
    const taper = smooth(70, len, s)
    let hn = 9.2 - 2.6 * flat - 0.8 * taper
    let hy = 9.2 + 1.3 * flat - 2.2 * taper
    const expo = 2 + 1.5 * flat + 0.3 * taper
    if (s > len - cap) { const k = Math.sqrt(Math.max(0.0004, 1 - ((s - (len - cap)) / cap) ** 2)); hn *= k; hy *= k }
    for (let j = 0; j < M; j++) {
      const th = (j / M) * Math.PI * 2
      const c = Math.cos(th), sn = Math.sin(th)
      const cx = Math.sign(c) * Math.abs(c) ** (2 / expo), cy = Math.sign(sn) * Math.abs(sn) ** (2 / expo)
      const k = (i * M + j) * 3
      pos[k] = path[i].x + Nrm.x * hn * MM * cx
      pos[k + 1] = path[i].y + hy * MM * cy
      pos[k + 2] = path[i].z + Nrm.z * hn * MM * cx
      uv[(i * M + j) * 2] = s / len
      uv[(i * M + j) * 2 + 1] = j / M
    }
  }
  const idx = []
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = (i + 1) * M + j, c = i * M + ((j + 1) % M), d = (i + 1) * M + ((j + 1) % M)
    idx.push(a, c, b, c, d, b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeTangents()
  return g
}

// Latch tongue seen on the door edge (protrudes toward -x), thickness along y.
export function latchTongueGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, -8).lineTo(-9.5, -8).lineTo(-14, -1.5).lineTo(-14, 8).lineTo(0, 8).closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 20, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2, curveSegments: 4 })
  g.scale(MM, MM, MM)
  g.translate(0, 0, -10 * MM)
  g.rotateX(H)
  return g
}

// Euro-profile keyway: round bore plus slot, built as two flat shapes.
export const keywayGeometries = () => once('keyway', buildKeyway)
function buildKeyway() {
  const c = new THREE.ShapeGeometry(new THREE.Shape().absarc(0, 3.2, 5.4, 0, Math.PI * 2, false), 32)
  const slot = new THREE.Shape().moveTo(-2.3, 3).lineTo(-2.3, -8.5).lineTo(2.3, -8.5).lineTo(2.3, 3).closePath()
  c.scale(MM, MM, MM)
  const s = new THREE.ShapeGeometry(slot)
  s.scale(MM, MM, MM)
  return [c, s]
}

/**
 * Reeded (fluted) door panel: convex half-round ribs running the full height.
 * Each rib is its own strip so the valleys stay crisp. Lies in the XY plane, ribs rise toward +z.
 */
export function flutedPanelGeometry({ width, height, pitch = 0.024, depth = 0.0085, seg = 16 }) {
  const n = Math.round(width / pitch)
  const p = width / n
  const pos = [], nor = [], uv = [], idx = []
  for (let r = 0; r < n; r++) {
    const x0 = -width / 2 + r * p
    const base = pos.length / 3
    for (let s = 0; s <= seg; s++) {
      const t = s / seg
      const u = Math.max(-0.985, Math.min(0.985, t * 2 - 1))
      const x = x0 + t * p
      const z = depth * Math.sqrt(Math.max(0, 1 - u * u))
      const dzdx = (-depth * u) / Math.sqrt(1 - u * u) / (p / 2)
      const inv = 1 / Math.hypot(dzdx, 1)
      for (const y of [-height / 2, height / 2]) {
        pos.push(x, y, z)
        nor.push(-dzdx * inv, 0, inv)
        uv.push(t, y > 0 ? 1 : 0)
      }
    }
    for (let s = 0; s < seg; s++) { const a = base + s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
