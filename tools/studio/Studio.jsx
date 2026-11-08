// Development-only studio: renders the concept objects used in the product glimpse into still images.
// Not part of the shipped site; the page that mounts this is removed after rendering (see README).
import { useEffect, useMemo } from 'react'
import { Canvas, useThree, invalidate } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { EffectComposer, N8AO, DepthOfField, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { latheZ, roseProfile, collarProfile, keyRoseProfile, leverGeometry, keywayGeometries, flutedPanelGeometry } from '../../src/scene/hardware.js'
import { metalMaterial, darkMaterial } from '../../src/scene/materials.js'
import { timberMaterial, plasterMaterial } from '../../src/scene/procedural.js'

const ITEMS = {
  lock: { cam: [-0.56, 0.3, 1.3], look: [0.0, 0.02, 0], fov: 22 },
  digital: { cam: [-0.56, 0.3, 1.3], look: [0.0, 0.02, 0], fov: 22 },
  closer: { cam: [-0.52, 0.28, 1.2], look: [-0.02, -0.01, 0.04], fov: 22 },
  hinge: { cam: [-0.4, 0.2, 0.82], look: [0.05, 0.0, 0.02], fov: 22 },
}

const M = (hex, rough = 0.35, metal = 1) => new THREE.MeshStandardMaterial({ color: hex, metalness: metal, roughness: rough })

function Board({ mats, w = 0.26, h = 0.54, panel = true }) {
  const flutes = useMemo(() => flutedPanelGeometry({ width: w * 0.62, height: h * 0.78, pitch: 0.018, depth: 0.0065 }), [w, h])
  return (
    <group>
      <RoundedBox args={[w, h, 0.036]} radius={0.004} smoothness={4} material={mats.timber} castShadow receiveShadow />
      {panel && <mesh geometry={flutes} material={mats.timber} position={[0.02, 0, 0.018]} castShadow receiveShadow />}
    </group>
  )
}

function Lever({ mats, finish = 'brass', pos = [0, 0, 0.018], withKey = false }) {
  const geo = useMemo(() => ({ rose: latheZ(roseProfile), collar: latheZ(collarProfile), lever: leverGeometry(), keyRose: latheZ(keyRoseProfile, 96), keyway: keywayGeometries() }), [])
  const m = mats[finish]
  return (
    <group position={pos}>
      <mesh geometry={geo.rose} material={m} castShadow receiveShadow />
      <mesh geometry={geo.collar} material={m} castShadow receiveShadow />
      <mesh geometry={geo.lever} material={m} castShadow receiveShadow />
      {withKey && (
        <group position={[0, -0.108, 0]}>
          <mesh geometry={geo.keyRose} material={m} castShadow receiveShadow />
          {geo.keyway.map((g, i) => <mesh key={i} geometry={g} material={mats.dark} position={[0, 0, 0.0061]} />)}
        </group>
      )}
    </group>
  )
}

function LockSet({ mats }) {
  return (<group><Board mats={mats} /><Lever mats={mats} pos={[-0.075, 0.07, 0.018]} withKey /></group>)
}

function Digital({ mats }) {
  const keys = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push([(c - 1) * 0.0225, 0.12 - r * 0.0235])
  return (
    <group>
      <Board mats={mats} />
      <group position={[-0.075, 0.02, 0.018]}>
        <RoundedBox args={[0.074, 0.31, 0.022]} radius={0.007} smoothness={5} position={[0, 0, 0.011]} material={mats.bronzePlate} castShadow receiveShadow />
        {keys.map(([x, y], n) => (
          <mesh key={n} position={[x, y, 0.0225]} rotation={[Math.PI / 2, 0, 0]} material={mats.nickel} castShadow><cylinderGeometry args={[0.0085, 0.0088, 0.0035, 36]} />
          </mesh>
        ))}
        {keys.map(([x, y], n) => (
          <mesh key={`d${n}`} position={[x, y, 0.0243]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}><cylinderGeometry args={[0.0017, 0.0017, 0.0004, 16]} /></mesh>
        ))}
        <mesh position={[0, -0.0, 0.0225]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark} scale={[1, 1, 1.5]}><cylinderGeometry args={[0.012, 0.012, 0.002, 40]} /></mesh>
        <group position={[0, -0.1, 0.022]}><Lever mats={mats} finish="nickel" pos={[0, 0, 0]} /></group>
      </group>
    </group>
  )
}

function Closer({ mats }) {
  const arm = (a, b, w = 0.011) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const len = va.distanceTo(vb)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), vb.clone().sub(va).normalize())
    return { len, mid, q, w }
  }
  const forearm = arm([0.075, 0.0, 0.05], [0.165, 0.0, 0.098])
  const upper = arm([0.165, 0.0, 0.098], [0.255, 0.0, 0.052])
  return (
    <group>
      <RoundedBox args={[0.5, 0.15, 0.044]} radius={0.004} smoothness={4} material={mats.timber} position={[-0.0, 0, 0]} castShadow receiveShadow />
      <RoundedBox args={[0.22, 0.04, 0.05]} radius={0.004} smoothness={4} material={mats.plasterTrim} position={[0.35, 0, 0.0]} castShadow receiveShadow />
      <group position={[0, 0, 0.022]}>
        <RoundedBox args={[0.2, 0.058, 0.046]} radius={0.014} smoothness={6} position={[-0.03, 0.005, 0.023]} material={mats.nickel} castShadow receiveShadow />
        <mesh position={[0.075, 0.005, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={mats.nickel} castShadow><cylinderGeometry args={[0.02, 0.02, 0.058, 40]} /></mesh>
        {[-0.1, -0.06].map((x) => (
          <mesh key={x} position={[x, 0.036, 0.023]} rotation={[0, 0, 0]} material={mats.dark}><cylinderGeometry args={[0.0045, 0.0045, 0.004, 6]} /></mesh>
        ))}
        {[forearm, upper].map((a, i) => (
          <mesh key={i} position={a.mid} quaternion={a.q} material={mats.nickel} castShadow receiveShadow><boxGeometry args={[a.len, a.w, 0.008]} /></mesh>
        ))}
        <mesh position={[0.165, 0, 0.098]} material={mats.nickel} castShadow><cylinderGeometry args={[0.009, 0.009, 0.014, 30]} /></mesh>
        <mesh position={[0.255, 0, 0.052]} rotation={[Math.PI / 2, 0, 0]} material={mats.nickel} castShadow><cylinderGeometry args={[0.012, 0.012, 0.012, 30]} /></mesh>
      </group>
    </group>
  )
}

function Hinge({ mats }) {
  const leaf = (side) => (
    <group rotation={[0, 0, 0]}>
      <RoundedBox args={[0.032, 0.1, 0.0035]} radius={0.0012} smoothness={3} position={[side * 0.0185, 0, 0]} material={mats.nickel} castShadow receiveShadow />
      {[-0.034, 0.034].map((y) => (
        <mesh key={y} position={[side * 0.026, y, 0.0022]} rotation={[Math.PI / 2, 0, 0]} material={mats.nickel} castShadow><cylinderGeometry args={[0.0042, 0.0016, 0.0016, 24]} /></mesh>
      ))}
    </group>
  )
  return (
    <group rotation={[0, 0, 0]}>
      <RoundedBox args={[0.36, 0.34, 0.044]} radius={0.004} smoothness={4} material={mats.timber} position={[0.0, 0, -0.0235]} castShadow receiveShadow />
      <group position={[-0.02, 0.0, 0.0]}>
        <group>{leaf(-1)}</group>
        <group rotation={[0, -1.15, 0]}>{leaf(1)}</group>
        {[-0.034, 0, 0.034].map((y, i) => (
          <mesh key={i} position={[0, y, 0.0]} material={mats.nickel} castShadow receiveShadow><cylinderGeometry args={[0.0068, 0.0068, 0.032, 36]} /></mesh>
        ))}
        {/* barrel bolt */}
        <group position={[0.14, 0.0, 0.0016]} rotation={[0, 0, Math.PI / 2]}>
          <RoundedBox args={[0.036, 0.13, 0.003]} radius={0.001} smoothness={3} material={mats.nickel} castShadow receiveShadow />
          <mesh position={[0, 0.0, 0.007]} material={mats.nickel} castShadow><cylinderGeometry args={[0.0042, 0.0042, 0.12, 24]} /></mesh>
          <mesh position={[0.0, 0.0, 0.0045]} rotation={[0, 0, 0]} material={mats.nickel} castShadow><boxGeometry args={[0.014, 0.022, 0.006]} /></mesh>
          <mesh position={[0.0, 0.034, 0.014]} material={mats.nickel} castShadow><sphereGeometry args={[0.0075, 24, 18]} /></mesh>
        </group>
      </group>
    </group>
  )
}

function Studio({ item }) {
  const { scene, gl, camera } = useThree()
  const cfg = ITEMS[item]
  const mats = useMemo(() => ({
    brass: metalMaterial('brass'), nickel: metalMaterial('nickel'), bronze: metalMaterial('bronze'),
    bronzePlate: new THREE.MeshPhysicalMaterial({ color: '#4a3d33', metalness: 0.9, roughness: 0.38, clearcoat: 0.2 }),
    dark: darkMaterial(), timber: timberMaterial(), plasterTrim: plasterMaterial('#e3dccd'),
  }), [])
  const backdrop = useMemo(() => plasterMaterial('#e3dccd'), [])
  const cookie = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d'); g.fillStyle = '#4a4540'; g.fillRect(0, 0, 512, 512); g.filter = 'blur(12px)'; g.fillStyle = '#fff'
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(16 + i * 236, 16 + j * 160, 220, 140)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...cfg.look); return o }, [cfg])
  const focus = useMemo(() => new THREE.Vector3(...cfg.look), [cfg])

  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = new RoomEnvironment()
    const box = (w, h, x, y, z, k, color = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m) }
    box(0.5, 5, -5, 2, 2, 9); box(0.5, 5, 5, 2, 1, 5, 0xdfe8f2); box(6, 4, -3, 4.5, 4, 5, 0xfff4e4)
    const tex = pm.fromScene(env, 0.035).texture
    scene.environment = tex; scene.environmentIntensity = 0.32
    scene.background = new THREE.Color('#eee7da')
    camera.position.set(...cfg.cam); camera.fov = cfg.fov; camera.lookAt(...cfg.look); camera.updateProjectionMatrix()
    document.documentElement.dataset.studio = 'ready'
    invalidate()
  }, [gl, scene, camera, cfg])

  const Model = { lock: LockSet, digital: Digital, closer: Closer, hinge: Hinge }[item]
  return (
    <>
      <primitive object={target} />
      <spotLight target={target} position={[-1.6, 2.1, 1.9]} angle={0.4} penumbra={0.85} intensity={50} decay={2} color="#fff9f0" map={cookie} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} shadow-radius={5} shadow-camera-near={0.5} shadow-camera-far={8} />
      <mesh material={backdrop} position={[0, 0, -0.34]} receiveShadow><planeGeometry args={[6, 6]} /></mesh>
      <group position={item === 'closer' ? [-0.04, 0.0, 0] : [0, 0, 0]}><Model mats={mats} /></group>
      <EffectComposer multisampling={8}>
        <N8AO aoRadius={0.05} distanceFalloff={1} intensity={2.6} quality="high" color="#2a1a10" />
        <DepthOfField target={focus} worldFocusRange={0.5} bokehScale={1.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </>
  )
}

export default function StudioPage() {
  const item = typeof location === 'undefined' ? 'lock' : new URLSearchParams(location.search).get('item') || 'lock'
  return (
    <div style={{ width: '600px', height: '750px', position: 'fixed', inset: 0 }}>
      <Canvas shadows="percentage" dpr={2} frameloop="demand" gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ near: 0.02, far: 20 }}>
        <Studio item={item} />
      </Canvas>
    </div>
  )
}
