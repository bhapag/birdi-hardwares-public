// The showroom behind the hero door: slim lacquered plinths with stone tops, each carrying a piece of hardware
// on a walnut sample board sized to it, so the hardware (not the furniture) is what the eye lands on. Only drawn once the door starts to open, so the opening frames cost nothing.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, invalidate } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from './RBox.jsx'
import { story } from './story.js'
import { timberMaterial, stoneMaterial } from './procedural.js'
import { useProductMaterials, MortiseLock, EuroCylinder, DigitalLock, DoorCloser, ButtHinge, TowerBolt, PullHandle, DoorStopper } from './products.jsx'

const Z = -2.7
const XS = [-0.95, -0.32, 0.32, 0.95]

const H = 0.95 // plinth height: the hardware sits a little below eye level

function Plinth({ s, h = H, w = 0.3, d = 0.3 }) {
  return (
    <group>
      <RoundedBox args={[w, h - 0.03, d]} radius={0.01} smoothness={3} material={s.lacquer} position={[0, (h - 0.03) / 2, 0]} castShadow receiveShadow />
      <RoundedBox args={[w + 0.02, 0.03, d + 0.02]} radius={0.004} smoothness={3} material={s.stone} position={[0, h - 0.015, 0]} receiveShadow />
    </group>
  )
}

// Each board gets its own walnut seed, grain along its long side.
function Stand({ w, h, rot = 0.25, seed = 0, children }) {
  const timber = useMemo(() => timberMaterial({ axis: w > h ? 'x' : 'y', seed: [seed * 1.37, seed * 2.11, seed * 0.73] }), [w, h, seed])
  return (
    <group rotation={[0, rot, 0]}>
      <RoundedBox args={[w, h, 0.03]} radius={0.004} smoothness={3} material={timber} position={[0, h / 2, -0.027]} castShadow receiveShadow />
      <group position={[0, h / 2, -0.012]}>{children}</group>
    </group>
  )
}

export default function Showroom() {
  const ref = useRef()
  const m = useProductMaterials()
  const s = useMemo(() => ({
    lacquer: new THREE.MeshStandardMaterial({ color: '#cdbfa9', roughness: 0.62, metalness: 0 }),
    stone: stoneMaterial('#ece4d6'),
  }), [])
  const { gl, scene, camera } = useThree()
  const ready = useRef(false)
  // Compile the showroom's shaders in the background once the page is idle, so revealing it mid-scroll
  // never stalls the scroll story. Until then (and before the door opens) it is simply not drawn.
  useEffect(() => {
    const go = () => {
      const g = ref.current
      if (!g) return
      // lite: the showroom is lit by its own unshadowed lamps; keeping it out of the door light's shadow map
      // saves redrawing every piece into it on each frame of the door opening
      if (document.documentElement.dataset.quality === 'lite') g.traverse((o) => { o.castShadow = false })
      // Shader variants depend on where the scene is drawn: the full tier draws into the post-processing
      // buffer (an off-screen target), the lite tier straight to the screen. Compile and warm for the same one,
      // or the shaders get built twice (a multi-second freeze on integrated GPUs).
      const offscreen = document.documentElement.dataset.quality === 'full'
      const rt = offscreen ? new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType }) : null
      const prev = gl.getRenderTarget()
      g.visible = true
      gl.setRenderTarget(rt)
      const compiling = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera))
      gl.setRenderTarget(prev)
      g.visible = story.p > 0.48
      // compileAsync only builds shaders; textures, geometry buffers and shadow casters still upload on the
      // first real draw (a freeze mid-scroll). Draw once now to do that: off screen on the full tier, on screen on
      // the lite tier, where the showroom is hidden behind the closed door anyway and the next frame redraws.
      const done = () => {
        const culled = []
        g.visible = true
        g.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o) } }) // upload everything, in view or not
        gl.shadowMap.needsUpdate = true // warm the shadow pass too
        try {
          gl.setRenderTarget(rt)
          gl.render(scene, camera)
        } finally {
          gl.setRenderTarget(prev)
          rt?.dispose()
          culled.forEach((o) => (o.frustumCulled = true))
        }
        ready.current = true
        g.visible = story.p > 0.48
        gl.shadowMap.needsUpdate = true
        invalidate()
      }
      compiling.then(done, done)
    }
    // after the environment map exists (it changes the shaders), then when the page is idle
    let id
    const later = () => { id = 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1500) }
    ;(scene.userData.envReady || Promise.resolve()).then(later)
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id))
  }, [gl, scene, camera])
  useFrame(() => { if (ref.current) ref.current.visible = story.p > 0.48 })
  const at = (i, node) => <group position={[XS[i], 0, Z]}><Plinth s={s} /><group position={[0, H, 0]}>{node}</group></group>
  return (
    <group ref={ref} visible={false}>
      {at(0, <><Stand seed={1} w={0.2} h={0.27} rot={0.35}><MortiseLock m={m} finish="brass" /></Stand><group position={[0.1, 0.009, 0.09]} rotation={[Math.PI / 2, 0, 0.5]}><EuroCylinder m={m} /></group></>)}
      {at(1, <Stand seed={2} w={0.15} h={0.38} rot={0.12}><group scale={0.95}><DigitalLock m={m} /></group></Stand>)}
      {at(2, <Stand seed={3} w={0.3} h={0.15} rot={-0.12}><group position={[-0.03, 0, 0]}><DoorCloser m={m} open={0.4} /></group></Stand>)}
      {at(3, <Stand seed={4} w={0.24} h={0.26} rot={-0.35}><group position={[-0.06, 0.03, 0]}><ButtHinge m={m} finish="brass" angle={2.2} /></group><group position={[0.05, -0.06, 0]}><TowerBolt m={m} length={0.12} /></group></Stand>)}
      <group position={[-1.6, 0, Z + 0.1]}><Plinth s={s} h={0.62} w={0.26} d={0.26} /><group position={[0, 0.62, 0]}><DoorStopper m={m} /></group></group>
      <group position={[1.6, 0, Z + 0.1]}><Plinth s={s} h={0.62} w={0.26} d={0.26} /><group position={[0, 0.62, 0]}><Stand seed={5} w={0.12} h={0.34} rot={-0.3}><PullHandle m={m} finish="brass" length={0.24} /></Stand></group></group>
    </group>
  )
}
