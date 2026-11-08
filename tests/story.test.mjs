// Scroll state must be a pure function of progress so reverse scrolling restores every earlier state.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { leverAt, doorAt } from '../src/scene/story.js'
import { cameraAt } from '../src/scene/camera.js'

const steps = Array.from({ length: 201 }, (_, i) => i / 200)

test('lever presses, holds, then releases', () => {
  assert.equal(leverAt(0), 0)
  assert.equal(leverAt(0.5), 1)
  assert.equal(leverAt(0.7), 1)
  assert.ok(leverAt(0.9) > 0 && leverAt(0.9) < 1)
  assert.equal(leverAt(1), 0)
})

test('door only opens after the lever is down, and never closes again', () => {
  assert.equal(doorAt(0.5), 0)
  let prev = 0
  for (const p of steps) { const d = doorAt(p); assert.ok(d >= prev - 1e-12); prev = d }
  assert.equal(doorAt(1), 1)
})

test('camera is deterministic and has no jumps', () => {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3()
  let last = null
  for (const p of steps) {
    const fov1 = cameraAt(p, a, t1)
    const fov2 = cameraAt(p, b, t2)
    assert.ok(a.equals(b) && t1.equals(t2) && fov1 === fov2, `deterministic at ${p}`)
    if (last) assert.ok(a.distanceTo(last) < 0.2, `no camera jump near ${p}`)
    last = a.clone()
  }
})

test('going forward then back lands on the same pose', () => {
  const direct = new THREE.Vector3(), viaTrip = new THREE.Vector3(), tmp = new THREE.Vector3()
  cameraAt(0.37, direct, tmp)
  for (const p of [0.9, 1, 0.2, 0.37]) cameraAt(p, viaTrip, tmp)
  assert.ok(direct.equals(viaTrip))
})
