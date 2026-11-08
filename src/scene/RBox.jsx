// Rounded box with built, cached geometry. drei's RoundedBox recomputes creased normals for every instance with
// string-keyed vertex lookups, which was the largest CPU cost of building the scene on a phone (about 0.6 s with a
// 4x slower CPU). three's RoundedBoxGeometry has smooth normals by construction; identical sizes share one geometry.
// The materials here are procedural in object space or untextured, so the different UV layout does not show.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const cache = new Map()

export function RoundedBox({ args: [w = 1, h = 1, d = 1] = [], radius = 0.05, smoothness = 4, children, ...props }) {
  const key = `${w} ${h} ${d} ${radius} ${smoothness}`
  let g = cache.get(key)
  if (!g) cache.set(key, (g = new RoundedBoxGeometry(w, h, d, smoothness, radius)))
  // shared geometry: never disposed with one mesh
  return <mesh geometry={g} dispose={null} {...props}>{children}</mesh>
}
