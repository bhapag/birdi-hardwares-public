import * as THREE from 'three'
import { FINISHES } from './story.js'

// Fine streaks that vary across the texture's v axis, so brushing runs along u.
// On the lever u runs along its length; on the rose it runs around, so the brushing is concentric.
function brushedRoughnessMap() {
  const w = 8, h = 512
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const row = new Float32Array(h)
  for (let j = 0; j < h; j++) row[j] = rnd()
  for (let j = 0; j < h; j++) {
    const lo = (row[(j + 1) % h] + row[(j + h - 1) % h]) / 2
    const g = 178 + Math.round((row[j] * 0.7 + lo * 0.3) * 77) // 0.70..1.0 multiplier on roughness
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = g
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 2)
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

export function metalMaterial(key = 'brass') {
  const f = FINISHES[key]
  return new THREE.MeshPhysicalMaterial({
    color: f.color,
    metalness: 1,
    roughness: f.rough,
    roughnessMap: brushedRoughnessMap(),
    anisotropy: 0.45,
    envMapIntensity: 1.15,
  })
}

// Fixed hardware (latch plate, tongue): always a plain satin nickel.
export const fixedMetal = () => new THREE.MeshStandardMaterial({ color: '#8c877f', metalness: 1, roughness: 0.5 })
export const darkMaterial = () => new THREE.MeshStandardMaterial({ color: '#0d0b09', metalness: 0.1, roughness: 0.75, side: THREE.DoubleSide })
