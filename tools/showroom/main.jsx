// Dev-only render studio. Renders category stills and the two films from the code-modelled hardware,
// deterministically: the page exposes window.__setT(t) and window.__drawn, and render.mjs captures frames.
// URL: ?mode=still&shot=hinges | ?mode=fg | ?mode=bg[&portrait=1]
import '@fontsource-variable/jost'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { flutedPanelGeometry, latchTongueGeometry } from '../../src/scene/hardware.js'
import { timberMaterial, plasterMaterial, stoneMaterial } from '../../src/scene/procedural.js'
import { useProductMaterials, LeverOnRose, MortiseLock, EuroCylinder, DigitalLock, DoorCloser, ButtHinge, TowerBolt, PullHandle, DoorStopper, StrikePlate, SpareParts } from '../../src/scene/products.jsx'

const q = new URLSearchParams(location.search)
const MODE = q.get('mode') || 'still'
const SHOT = q.get('shot') || 'hinges'
const PORTRAIT = q.get('portrait') === '1'

// ---------- timing helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a, b, k) => a + (b - a) * k
const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k))
/** keys: [{t, pos, look, fov}] sorted; eased segment interpolation */
function camAt(keys, t) {
  if (t <= keys[0].t) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1]
    if (t <= b.t) { const k = ease((t - a.t) / (b.t - a.t)); return { pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus ?? 0.6, b.focus ?? 0.6, k) } }
  }
  return keys[keys.length - 1]
}

// ---------- shared studio pieces ----------
function useStudioMats() {
  return useMemo(() => ({ timber: timberMaterial(), plaster: plasterMaterial('#e3dccd'), warm: plasterMaterial('#d9ccb4'), stone: stoneMaterial('#ece4d6'), trim: plasterMaterial('#e8e1d3'), lacquer: new THREE.MeshStandardMaterial({ color: '#cdbfa9', roughness: 0.62, metalness: 0 }) }), [])
}

function cookieTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const g = c.getContext('2d'); g.fillStyle = '#3a352f'; g.fillRect(0, 0, 512, 512); g.filter = 'blur(12px)'; g.fillStyle = '#fff'
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(16 + i * 236, 16 + j * 160, 220, 140)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function Environment({ intensity = 0.3, bg = '#eee7da' }) {
  const { scene, gl } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = new RoomEnvironment()
    const box = (w, h, x, y, z, k, color = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m) }
    box(0.5, 5, -5, 2, 2, 9); box(0.5, 5, 5, 2, 1, 5, 0xdfe8f2); box(6, 4, -3, 4.5, 4, 5, 0xfff4e4)
    const tex = pm.fromScene(env, 0.035).texture
    scene.environment = tex; scene.environmentIntensity = intensity; scene.background = new THREE.Color(bg)
    invalidate()
    return () => { tex.dispose(); pm.dispose() }
  }, [gl, scene, intensity, bg])
  return null
}

function KeySpot({ position, target, intensity = 50, angle = 0.42, cookie = true, color = '#fff6ea' }) {
  const map = useMemo(() => (cookie ? cookieTexture() : null), [cookie])
  const tgt = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => { tgt.position.set(...target); tgt.updateMatrixWorld() }, [tgt, target])
  return (
    <>
      <primitive object={tgt} />
      <spotLight target={tgt} position={position} angle={angle} penumbra={0.85} intensity={intensity} decay={2} color={color} map={map} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} shadow-radius={5} shadow-camera-near={0.3} shadow-camera-far={12} />
    </>
  )
}

function CameraRig({ pos, look, fov }) {
  const { camera } = useThree()
  useLayoutEffect(() => { camera.position.set(...pos); camera.fov = fov; camera.lookAt(...look); camera.updateProjectionMatrix() }, [camera, pos, look, fov])
  return null
}

// Marks a frame as drawn after the composer has rendered (priority 2 runs after the composer's 1).
function FrameSignal({ token }) {
  useFrame(() => { window.__drawn = token }, 2)
  return null
}

function Board({ s, w = 0.26, h = 0.54, flutes = true, ...p }) {
  const geo = useMemo(() => flutedPanelGeometry({ width: w * 0.62, height: h * 0.78, pitch: 0.018, depth: 0.0065 }), [w, h])
  return (
    <group {...p}>
      <RoundedBox args={[w, h, 0.036]} radius={0.004} smoothness={4} material={s.timber} castShadow receiveShadow />
      {flutes && <mesh geometry={geo} material={s.timber} position={[0.02, 0, 0.018]} castShadow receiveShadow />}
    </group>
  )
}

function Plinth({ s, w = 0.42, h = 0.9, d = 0.36, ...p }) {
  return (
    <group {...p}>
      <RoundedBox args={[w, h - 0.03, d]} radius={0.01} smoothness={3} material={s.lacquer} position={[0, (h - 0.03) / 2, 0]} castShadow receiveShadow />
      <RoundedBox args={[w + 0.02, 0.03, d + 0.02]} radius={0.004} smoothness={3} material={s.stone} position={[0, h - 0.015, 0]} castShadow receiveShadow />
    </group>
  )
}

// No depth of field: it softened the hardware in the films (focus, range and bokeh kept for the call sites).
function Effects({ aa = true }) {
  return (
    <EffectComposer multisampling={aa ? 8 : 0}>
      <N8AO aoRadius={0.06} distanceFalloff={1} intensity={2.4} quality="high" color="#2a1a10" />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}

// ---------- category stills (4:5) ----------
const STILLS = {
  hinges: { cam: [-0.36, 0.2, 0.86], look: [0.03, 0.0, 0.0], fov: 24 },
  handles: { cam: [-0.5, 0.26, 1.18], look: [0.0, 0.02, 0.0], fov: 22 },
  bolts: { cam: [-0.42, 0.24, 0.96], look: [0.02, 0.0, 0.0], fov: 24 },
  spares: { cam: [-0.14, 0.36, 0.34], look: [0.0, 0.0, 0.0], fov: 30 },
  'main-door': { cam: [-0.62, 0.3, 1.4], look: [0.0, 0.02, 0.0], fov: 22 },
  interior: { cam: [-0.5, 0.26, 1.2], look: [0.0, 0.02, 0.0], fov: 22 },
  renovation: { cam: [-0.34, 0.5, 0.66], look: [0.0, 0.0, 0.0], fov: 26 },
  trade: { cam: [-0.34, 0.2, 0.92], look: [0.02, 0.0, 0.0], fov: 26 },
}

function StillContent({ shot, m, s }) {
  switch (shot) {
    case 'hinges': return (
      <group>
        <RoundedBox args={[0.42, 0.36, 0.044]} radius={0.004} smoothness={4} material={s.timber} position={[0.02, 0, -0.024]} castShadow receiveShadow />
        <group position={[-0.06, 0.06, 0.0]}><ButtHinge m={m} finish="brass" angle={1.6} /></group>
        <group position={[0.09, -0.05, 0.0]} rotation={[0, 0, 0.0]}><ButtHinge m={m} finish="nickel" angle={2.6} /></group>
      </group>)
    case 'handles': return (
      <group>
        <Board s={s} />
        <group position={[-0.075, 0.07, 0.018]}><LeverOnRose m={m} finish="brass" keyRose /></group>
        <group position={[0.09, 0.0, 0.018]}><PullHandle m={m} finish="bronze" length={0.26} /></group>
      </group>)
    case 'bolts': return (
      <group>
        <RoundedBox args={[0.42, 0.36, 0.044]} radius={0.004} smoothness={4} material={s.timber} position={[0.02, 0, -0.024]} castShadow receiveShadow />
        <group position={[-0.02, 0.07, 0.0]}><TowerBolt m={m} finish="nickel" shot={0.7} /></group>
        <group position={[0.02, -0.06, 0.0]} rotation={[0, 0, 0]}><TowerBolt m={m} finish="brass" shot={0.15} length={0.12} /></group>
      </group>)
    case 'spares': return (
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={s.timber} position={[0, 0, -0.02]} receiveShadow><boxGeometry args={[0.6, 0.5, 0.04]} /></mesh>
        <group position={[-0.085, 0.03, 0.0012]} rotation={[0, 0, 0.15]}><StrikePlate m={m} finish="brass" /></group>
        <group position={[0.035, 0.06, 0.0095]} rotation={[Math.PI / 2, 0, 0.35]}><EuroCylinder m={m} finish="nickel" /></group>
        <group position={[0.02, -0.06, 0.005]}><SpareParts m={m} finish="nickel" /></group>
      </group>)
    case 'main-door': return (
      <group>
        <Board s={s} w={0.3} h={0.6} />
        <group position={[-0.08, 0.04, 0.018]}><DigitalLock m={m} finish="gunmetal" /></group>
        <group position={[0.07, -0.02, 0.018]} scale={0.9}><PullHandle m={m} finish="brass" length={0.3} /></group>
      </group>)
    case 'interior': return (
      <group>
        <Board s={s} flutes={false} />
        <group position={[-0.075, 0.03, 0.018]}><LeverOnRose m={m} finish="nickel" keyRose={false} /></group>
        <group position={[0.11, 0.17, -0.002]}><ButtHinge m={m} finish="nickel" angle={Math.PI} height={0.08} /></group>
      </group>)
    case 'renovation': return (
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={s.timber} position={[0, 0, -0.02]} receiveShadow><boxGeometry args={[0.6, 0.5, 0.04]} /></mesh>
        <group position={[-0.08, 0.02, 0.008]}><MortiseLock m={m} finish="brass" /></group>
        <group position={[0.11, 0.06, 0.0012]}><StrikePlate m={m} finish="brass" /></group>
        <group position={[0.1, -0.1, 0.004]}><SpareParts m={m} finish="nickel" /></group>
      </group>)
    case 'trade': return (
      <group>
        <RoundedBox args={[0.46, 0.38, 0.044]} radius={0.004} smoothness={4} material={s.timber} position={[0.02, 0, -0.024]} castShadow receiveShadow />
        <group position={[-0.03, 0.11, 0.0]} scale={0.85}><DoorCloser m={m} finish="nickel" open={0.15} /></group>
        <group position={[-0.12, -0.04, 0.0]} scale={0.8}><LeverOnRose m={m} finish="nickel" /></group>
        <group position={[0.1, -0.07, 0.0]}><ButtHinge m={m} finish="nickel" angle={Math.PI} /></group>
      </group>)
    default: return null
  }
}

function Still({ shot }) {
  const m = useProductMaterials()
  const s = useStudioMats()
  const cfg = STILLS[shot]
  const focus = useMemo(() => new THREE.Vector3(...cfg.look), [cfg])
  useEffect(() => { const id = setTimeout(() => { document.documentElement.dataset.ready = '1'; invalidate() }, 300); return () => clearTimeout(id) }, [])
  return (
    <>
      <Environment intensity={0.32} />
      <CameraRig pos={cfg.cam} look={cfg.look} fov={cfg.fov} />
      <KeySpot position={[-1.6, 2.1, 1.9]} target={cfg.look} intensity={50} />
      <mesh material={s.plaster} position={[0, 0, -0.34]} receiveShadow><planeGeometry args={[6, 6]} /></mesh>
      <StillContent shot={shot} m={m} s={s} />
      <Effects focus={focus} range={0.5} bokeh={1.2} />
    </>
  )
}

// ---------- foreground film (about 26.5 s) ----------
export const FG_DURATION = 26.5
const DOOR = { w: 0.9, h: 2.04, t: 0.044 }
const GALLERY_Z = -4.3
const STATIONS = [-0.9, -0.3, 0.3, 0.9] // x of each plinth, gallery space
const FG_KEYS = [
  { t: 0, pos: [-0.27, 1.07, 0.17], look: [-0.33, 1.025, 0.03], fov: 26, focus: 0.16 },
  { t: 4.6, pos: [-0.44, 1.05, 0.15], look: [-0.385, 1.02, 0.03], fov: 24, focus: 0.13 },
  { t: 5.4, pos: [-0.66, 1.1, 0.3], look: [-0.45, 1.02, 0.0], fov: 30, focus: 0.36 },
  { t: 7.0, pos: [-0.7, 1.12, 0.36], look: [-0.43, 1.02, -0.02], fov: 30, focus: 0.4 },
  { t: 9.0, pos: [-0.5, 1.22, 0.85], look: [-0.15, 1.05, -0.6], fov: 34, focus: 1.2 },
  { t: 11.4, pos: [-0.1, 1.3, -1.6], look: [STATIONS[0], 1.06, GALLERY_Z], fov: 34, focus: 2.7 },
  { t: 12.6, pos: [STATIONS[0] - 0.22, 1.16, GALLERY_Z + 0.78], look: [STATIONS[0], 1.06, GALLERY_Z], fov: 28, focus: 0.8 },
  { t: 14.6, pos: [STATIONS[1] - 0.22, 1.16, GALLERY_Z + 0.78], look: [STATIONS[1], 1.06, GALLERY_Z], fov: 28, focus: 0.8 },
  { t: 16.6, pos: [STATIONS[2] - 0.22, 1.16, GALLERY_Z + 0.78], look: [STATIONS[2], 1.06, GALLERY_Z], fov: 28, focus: 0.8 },
  { t: 18.6, pos: [STATIONS[3] - 0.22, 1.16, GALLERY_Z + 0.78], look: [STATIONS[3], 1.06, GALLERY_Z], fov: 28, focus: 0.8 },
  { t: 22.4, pos: [0.0, 1.42, GALLERY_Z + 2.5], look: [0.0, 1.05, GALLERY_Z], fov: 36, focus: 2.5 },
  { t: 26.5, pos: [0.0, 1.4, GALLERY_Z + 2.3], look: [0.0, 1.05, GALLERY_Z], fov: 36, focus: 2.3 },
]
const FG_TITLES = [
  { a: 0.8, b: 4.4, text: 'Details that define an entrance.', pos: 'low-left', light: true },
  { a: 5.9, b: 9.6, text: 'Press, and the latch draws back.', pos: 'low-left' },
  { a: 12.2, b: 14.2, text: 'Mechanical locks', small: true },
  { a: 14.2, b: 16.2, text: 'Digital locks', small: true },
  { a: 16.2, b: 18.2, text: 'Door closers', small: true },
  { a: 18.2, b: 20.6, text: 'Hinges and bolts', small: true },
]

function DoorSet({ t, m, s }) {
  const press = ss(5.7, 6.2, t) - ss(7.0, 7.6, t)
  const latch = press
  const open = ss(6.6, 10.2, t)
  const tongue = useMemo(() => latchTongueGeometry(), [])
  const flutes = useMemo(() => flutedPanelGeometry({ width: 0.66, height: 1.8 }), [])
  const pivotX = DOOR.w / 2
  const wall = 4.2
  return (
    <group>
      {/* wall with the door opening */}
      <mesh material={s.plaster} position={[-(pivotX + 0.008 + wall / 2), 1.7, -0.06]} castShadow receiveShadow><boxGeometry args={[wall, 3.4, 0.12]} /></mesh>
      <mesh material={s.plaster} position={[pivotX + 0.008 + wall / 2, 1.7, -0.06]} castShadow receiveShadow><boxGeometry args={[wall, 3.4, 0.12]} /></mesh>
      <mesh material={s.plaster} position={[0, (2.06 + 3.4) / 2, -0.06]} castShadow receiveShadow><boxGeometry args={[DOOR.w + 0.016, 3.4 - 2.06, 0.12]} /></mesh>
      {/* strike side jamb plate */}
      <mesh material={m.nickel} position={[-pivotX - 0.006, 1.02, -0.03]}><boxGeometry args={[0.003, 0.09, 0.024]} /></mesh>
      <group position={[pivotX, 0, -0.03]} rotation={[0, -1.15 * open, 0]}>
        <RoundedBox args={[DOOR.w, DOOR.h, DOOR.t]} radius={0.003} smoothness={4} position={[-pivotX, 0.01 + DOOR.h / 2, 0]} material={s.timber} castShadow receiveShadow />
        <mesh geometry={flutes} material={s.timber} position={[-pivotX, 0.01 + DOOR.h / 2, DOOR.t / 2]} castShadow receiveShadow />
        <mesh material={m.nickel} position={[-DOOR.w + 0.0014, 1.02, 0]}><boxGeometry args={[0.0032, 0.2, 0.024]} /></mesh>
        <mesh geometry={tongue} material={m.nickel} position={[-DOOR.w + 0.0125 * latch, 1.02, 0]} />
        <group position={[-DOOR.w + 0.058, 1.02, DOOR.t / 2]}><LeverOnRose m={m} finish="brass" press={press} /></group>
        {[0.25, 1.0, 1.75].map((y) => <group key={y} position={[0.002, y, 0.0]} rotation={[0, Math.PI / 2, 0]}><ButtHinge m={m} finish="brass" angle={Math.PI - 1.15 * open} height={0.1} /></group>)}
      </group>
    </group>
  )
}

function Gallery({ t, m, s }) {
  const settle = (k) => 0.05 * (1 - ss(11.0 + k * 0.4, 12.4 + k * 0.4, t)) // pieces lower onto their plinths as we arrive
  const station = (i, node) => (
    <group position={[STATIONS[i], 0, GALLERY_Z]}>
      <Plinth s={s} />
      <group position={[0, 0.9 + settle(i), 0]}>{node}</group>
    </group>
  )
  // a walnut board standing on the plinth top, product mounted on its face
  const Stand = ({ w, h, children, flutes = false, rot = 0.28 }) => (
    <group rotation={[0, rot, 0]}>
      <Board s={s} w={w} h={h} flutes={flutes} position={[0, h / 2, -0.03]} />
      <group position={[0, h / 2, -0.012]}>{children}</group>
    </group>
  )
  return (
    <group>
      <mesh material={s.warm} position={[0, 1.7, GALLERY_Z - 0.9]} receiveShadow><planeGeometry args={[9, 3.4]} /></mesh>
      <mesh material={s.warm} position={[0, 3.4, GALLERY_Z + 1.2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4.4]} /></mesh>
      {station(0, (
        <group>
          <Stand w={0.22} h={0.3} rot={0.4}><group position={[0.0, 0.0, 0.0]} scale={1.05}><MortiseLock m={m} finish="brass" bolt={ss(12.6, 13.6, t)} /></group></Stand>
          <group position={[0.11, 0.009, 0.1]} rotation={[0, -0.7, 0]}><group rotation={[0, 0, 0]}><EuroCylinder m={m} finish="nickel" keyTurn={0.6 * ss(12.8, 13.8, t)} /></group></group>
        </group>
      ))}
      {station(1, <Stand w={0.2} h={0.44} flutes><group scale={0.95} position={[-0.02, 0.0, 0]}><DigitalLock m={m} lit={ss(14.4, 14.9, t)} /></group></Stand>)}
      {station(2, <Stand w={0.34} h={0.18}><group position={[-0.03, 0.0, 0.0]}><DoorCloser m={m} open={0.25 + 0.5 * ss(16.4, 17.8, t)} /></group></Stand>)}
      {station(3, (
        <Stand w={0.28} h={0.3}>
          <group position={[-0.07, 0.03, 0.0]}><ButtHinge m={m} finish="brass" angle={1.6 + 0.8 * ss(18.4, 19.6, t)} /></group>
          <group position={[0.05, -0.06, 0.0]}><TowerBolt m={m} finish="nickel" shot={ss(18.8, 19.8, t)} length={0.12} /></group>
        </Stand>
      ))}
      <group position={[-1.5, 0, GALLERY_Z + 0.1]}><Plinth s={s} w={0.3} h={0.62} d={0.3} /><group position={[0, 0.62, 0]}><DoorStopper m={m} /></group></group>
      <group position={[1.5, 0, GALLERY_Z + 0.1]}><Plinth s={s} w={0.3} h={0.62} d={0.3} /><group position={[0, 0.62, 0]}><Board s={s} w={0.14} h={0.36} flutes={false} position={[0, 0.18, -0.02]} /><group position={[0, 0.18, -0.002]}><PullHandle m={m} finish="brass" length={0.24} /></group></group></group>
    </group>
  )
}

function FgFilm({ t }) {
  const m = useProductMaterials()
  const s = useStudioMats()
  const c = camAt(FG_KEYS, t)
  const focus = useMemo(() => new THREE.Vector3(), [])
  focus.set(...c.look)
  return (
    <>
      <Environment intensity={0.3} />
      <CameraRig pos={c.pos} look={c.look} fov={c.fov} />
      <KeySpot position={[-1.9, 2.5, 2.1]} target={[-0.3, 1.1, 0]} intensity={56} />
      <pointLight position={[0.2, 2.6, -1.6]} intensity={9} color="#ffe6c4" decay={2} distance={9} />
      {STATIONS.map((x) => <spotLight key={x} position={[x + 0.3, 3.0, GALLERY_Z + 1.3]} angle={0.34} penumbra={0.8} intensity={24} decay={2} color="#fff1dc" castShadow={false} target-position={[x, 1.0, GALLERY_Z]} />)}
      <GalleryTargets />
      <mesh material={s.stone} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 14]} /></mesh>
      <mesh material={s.warm} position={[0, 3.4, -2.3]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[14, 4.6]} /></mesh>
      <DoorSet t={t} m={m} s={s} />
      <Gallery t={t} m={m} s={s} />
      <Effects focus={focus} range={0.45 + c.focus * 0.25} bokeh={1.4} />
    </>
  )
}
// spotLight `target-position` needs the target in the scene graph to update its matrix
function GalleryTargets() {
  const { scene } = useThree()
  useEffect(() => { scene.traverse((o) => { if (o.isSpotLight && o.target && !o.target.parent) scene.add(o.target) }) }, [scene])
  return null
}

// ---------- background loop (10 s, seamless) ----------
export const BG_DURATION = 10
const TAU = Math.PI * 2
const FLOATERS = [
  { C: LeverOnRose, p: { finish: 'brass', keyRose: false }, at: [0.42, 1.62, -0.5], rot: [0.2, -0.5, 0.1], ph: 0.0, scale: 2.6 },
  { C: ButtHinge, p: { finish: 'brass', angle: 2.3 }, at: [1.12, 1.98, -1.05], rot: [0.1, 0.7, 0.2], ph: 0.21, scale: 2.8 },
  { C: EuroCylinder, p: { finish: 'nickel' }, at: [1.02, 1.12, -0.55], rot: [0.3, -0.9, 0.5], ph: 0.43, scale: 2.6 },
  { C: TowerBolt, p: { finish: 'nickel', shot: 0.5, length: 0.12 }, at: [0.5, 0.92, -1.25], rot: [0.2, 0.4, -0.4], ph: 0.62, scale: 2.6 },
  { C: MortiseLock, p: { finish: 'brass' }, at: [1.62, 1.55, -1.5], rot: [0.1, -0.6, 0.15], ph: 0.84, scale: 2.2 },
  { C: PullHandle, p: { finish: 'bronze', length: 0.22 }, at: [0.18, 2.1, -1.7], rot: [0.0, 0.5, 0.25], ph: 0.33, scale: 2.0 },
]

function BgFilm({ t }) {
  const m = useProductMaterials()
  const s = useStudioMats()
  const ph = (t % BG_DURATION) / BG_DURATION // 0..1, the loop phase: everything below is periodic in it
  const focus = useMemo(() => new THREE.Vector3(0.8, 1.5, -0.8), [])
  const sway = Math.sin(ph * TAU)
  const cam = PORTRAIT
    ? { pos: [0.75 + 0.02 * sway, 1.5, 2.3], look: [0.9, 1.45, -1.0], fov: 52 }
    : { pos: [-0.15 + 0.03 * sway, 1.45, 2.25], look: [0.55, 1.42, -1.0], fov: 40 }
  return (
    <>
      <Environment intensity={0.3} bg="#e9e0cf" />
      <CameraRig pos={cam.pos} look={cam.look} fov={cam.fov} />
      <KeySpot position={[-2.0, 3.2, 2.2]} target={[0.5, 1.3, -2.0]} intensity={62 + 5 * sway} angle={0.55} />
      <pointLight position={[1.0, 1.9, -3.4]} intensity={18} color="#ffdcae" decay={2} distance={7} />
      <pointLight position={[1.2, 2.4, 0.6]} intensity={2.5} color="#fff2df" decay={2} distance={5} />
      <mesh material={s.stone} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 14]} /></mesh>
      {/* back wall with a doorway, warm light beyond */}
      <mesh material={s.warm} position={[-1.6, 1.7, -2.3]} receiveShadow castShadow><boxGeometry args={[3.6, 3.4, 0.14]} /></mesh>
      <mesh material={s.warm} position={[3.05, 1.7, -2.3]} receiveShadow castShadow><boxGeometry args={[3.3, 3.4, 0.14]} /></mesh>
      <mesh material={s.warm} position={[0.85, 2.77, -2.3]} receiveShadow castShadow><boxGeometry args={[1.1, 1.26, 0.14]} /></mesh>
      <mesh material={s.plaster} position={[0, 1.7, -4.4]} receiveShadow><planeGeometry args={[10, 3.4]} /></mesh>
      <group position={[1.38, 0, -2.36]} rotation={[0, -1.05, 0]}>
        <RoundedBox args={[0.9, 2.04, 0.044]} radius={0.003} smoothness={4} position={[-0.45, 1.03, 0]} material={s.timber} castShadow receiveShadow />
      </group>
      {FLOATERS.map(({ C, p, at, rot, ph: off, scale }, i) => {
        const a = (ph + off) * TAU
        return (
          <group key={i} position={[at[0] + 0.02 * Math.cos(a), at[1] + 0.07 * Math.sin(a), at[2]]} rotation={[rot[0] + 0.18 * Math.sin(a), rot[1] + 0.35 * Math.sin(a + 1), rot[2] + 0.1 * Math.cos(a)]} scale={scale}>
            <C m={m} {...p} />
          </group>
        )
      })}
      <Effects focus={focus} range={0.9} bokeh={2.6} />
    </>
  )
}

// ---------- titles (composited over the 3D in the film frames) ----------
function Titles({ t }) {
  const logoOpacity = ss(22.8, 23.8, t)
  const style = (pos, small) => ({
    position: 'absolute', left: '7%', bottom: small ? '9%' : '11%', color: '#2a211b', fontFamily: 'Jost Variable, Jost, sans-serif',
    fontWeight: small ? 400 : 300, fontSize: small ? '1.5vw' : '2.7vw', maxWidth: small ? 'none' : '30%', lineHeight: 1.12, letterSpacing: small ? '0.18em' : '-0.01em', textTransform: small ? 'uppercase' : 'none',
    textShadow: '0 0 24px rgba(238,231,218,0.9)',
  })
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {FG_TITLES.map((x) => {
        const o = ss(x.a, x.a + 0.5, t) * (1 - ss(x.b - 0.5, x.b, t))
        return o > 0.001 ? <div key={x.text} style={{ ...style(x.pos, x.small), ...(x.light ? { color: '#f3ecdf', textShadow: '0 2px 18px rgba(20,12,6,0.85)' } : {}), opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>{x.text}</div> : null
      })}
      {logoOpacity > 0.001 && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(238,231,218,${0.86 * logoOpacity})`, display: 'grid', placeItems: 'center', opacity: logoOpacity }}>
          <div style={{ textAlign: 'center', fontFamily: 'Jost Variable, Jost, sans-serif', color: '#2a211b' }}>
            <img src="/logo/birdi-hardwares-logo.png" alt="" style={{ width: '42vw', height: 'auto', display: 'block', margin: '0 auto' }} />
            <div style={{ marginTop: '2.4vw', fontSize: '1.8vw', letterSpacing: '0.04em' }}>Lakkar Bazar, Ludhiana</div>
            <div style={{ marginTop: '0.8vw', fontSize: '1.5vw', color: '#5a4e44' }}>Visit the shop or request a quotation</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- app ----------
function App() {
  const [t, setT] = useState(Number(q.get('t') || 0))
  const [token, setToken] = useState(0)
  useEffect(() => {
    window.__setT = (v) => { setT(v); setToken((k) => k + 1) }
    document.documentElement.dataset.ready = '1'
  }, [])
  useEffect(() => { invalidate() }, [t, token])
  const film = MODE === 'fg' || MODE === 'bg'
  return (
    <>
      <Canvas shadows="percentage" dpr={film ? 1 : 2} frameloop="demand" gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ near: 0.02, far: 40 }} style={{ position: 'absolute', inset: 0 }}>
        {MODE === 'still' && <Still shot={SHOT} />}
        {MODE === 'fg' && <FgFilm t={t} />}
        {MODE === 'bg' && <BgFilm t={t} />}
        <FrameSignal token={token} />
      </Canvas>
      {MODE === 'fg' && <Titles t={t} />}
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
