import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { RoundedBox } from './RBox.jsx'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { story, FINISHES, LEVER_MAX, DOOR_MAX, leverAt, doorAt, press } from './story.js'
import { cameraAt, composition } from './camera.js'
import { latheZ, roseProfile, collarProfile, keyRoseProfile, leverGeometry, latchTongueGeometry, keywayGeometries, flutedPanelGeometry } from './hardware.js'
import { metalMaterial, fixedMetal, darkMaterial } from './materials.js'
import { timberMaterial, plasterMaterial, stoneMaterial } from './procedural.js'
import Showroom from './Showroom.jsx'
import { quality, isSmall } from './tier.js'

// Post-processing is only used on the full tier, so phones and integrated GPUs never download it.
const Effects = lazy(() => import('./Effects.jsx'))

const GAP = 0.008
const DOOR = { w: 0.92, h: 2.04, t: 0.044, bottom: 0.01, front: -0.008 } // front face sits 8 mm behind the wall face
DOOR.cz = DOOR.front - DOOR.t / 2
DOOR.cy = DOOR.bottom + DOOR.h / 2
const PIVOT_X = DOOR.w / 2 // hinge edge
const LOCK_X = -DOOR.w // lock edge, door-local
const WALL_T = 0.12
const HANDLE = { x: LOCK_X + 0.058, y: 1.02, z: DOOR.t / 2 } // door-local rose centre
const OPEN_W = DOOR.w / 2 + GAP


// Soft window light, projected from the key spot: four panes with a dark mullion cross, edges feathered.
function windowCookie() {
  const s = 512
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  g.fillStyle = '#2d2924'
  g.fillRect(0, 0, s, s)
  g.filter = 'blur(10px)'
  g.fillStyle = '#ffffff'
  const m = 14, bar = 20, w = (s - 2 * m - bar) / 2, h = (s - 2 * m - 2 * bar) / 3
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(m + i * (w + bar), m + j * (h + bar), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Room({ parts }) {
  const mats = useMemo(() => ({
    metal: metalMaterial(story.finish),
    fixed: fixedMetal(),
    dark: darkMaterial(),
    timber: timberMaterial(),
    plaster: plasterMaterial('#e3dccd'),
    room: plasterMaterial('#9a8670'), // deeper than the ivory facade, so lit hardware reads against it
    stone: stoneMaterial(),
  }), [])
  const geo = useMemo(() => ({
    rose: latheZ(roseProfile), collar: latheZ(collarProfile), keyRose: latheZ(keyRoseProfile, 96),
    lever: leverGeometry(), tongue: latchTongueGeometry(), keyway: keywayGeometries(),
    flutes: flutedPanelGeometry({ width: 0.69, height: 1.8 }),
  }), [])
  parts.current.mats = mats
  // The lever swings away from the cursor once pressed, so the pointer-up often misses it. Release on the
  // window instead, otherwise the lever stays down until the cursor leaves it.
  const onDown = (e) => {
    e.stopPropagation()
    press(true)
    const release = () => { window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); press(false) }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  }
  const over = () => { document.body.style.cursor = 'pointer' }
  const out = () => { document.body.style.cursor = ''; press(false) }
  const wallW = 4.2

  return (
    <>
      {/* wall with a shadow-gap opening around the door */}
      <mesh material={mats.plaster} position={[-(OPEN_W + wallW / 2), 1.7, -WALL_T / 2]} receiveShadow castShadow><boxGeometry args={[wallW, 3.4, WALL_T]} /></mesh>
      <mesh material={mats.plaster} position={[OPEN_W + wallW / 2, 1.7, -WALL_T / 2]} receiveShadow castShadow><boxGeometry args={[wallW, 3.4, WALL_T]} /></mesh>
      <mesh material={mats.plaster} position={[0, (DOOR.bottom + DOOR.h + GAP + 3.4) / 2, -WALL_T / 2]} receiveShadow castShadow>
        <boxGeometry args={[OPEN_W * 2, 3.4 - (DOOR.bottom + DOOR.h + GAP), WALL_T]} />
      </mesh>

      {/* floor, and the room beyond the door */}
      <mesh material={mats.stone} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 14]} /></mesh>
      <mesh material={mats.room} position={[0, 1.7, -4.5]} receiveShadow><planeGeometry args={[14, 3.4]} /></mesh>
      <mesh material={mats.room} position={[0, 3.4, -2.3]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[14, 4.4]} /></mesh>
      <mesh material={mats.room} position={[-2.2, 1.7, -2.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[4.4, 3.4]} /></mesh>
      <mesh material={mats.room} position={[2.2, 1.7, -2.3]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[4.4, 3.4]} /></mesh>

      {/* door leaf, pivoting at the hinge edge */}
      <group ref={(g) => (parts.current.door = g)} position={[PIVOT_X, 0, DOOR.cz]}>
        <RoundedBox args={[DOOR.w, DOOR.h, DOOR.t]} radius={0.003} smoothness={4} position={[-PIVOT_X, DOOR.cy, 0]} material={mats.timber} castShadow receiveShadow />
        <mesh geometry={geo.flutes} material={mats.timber} position={[-PIVOT_X, DOOR.cy, DOOR.t / 2]} castShadow receiveShadow />
        {/* latch faceplate and tongue on the lock edge */}
        <mesh material={mats.fixed} position={[LOCK_X + 0.0014, HANDLE.y, 0]}><boxGeometry args={[0.0032, 0.17, 0.024]} /></mesh>
        <mesh ref={(m) => (parts.current.tongue = m)} geometry={geo.tongue} material={mats.fixed} position={[LOCK_X, HANDLE.y, 0]} />

        {/* handle on rose */}
        <group position={[HANDLE.x, HANDLE.y, HANDLE.z]} onPointerDown={onDown} onPointerOver={over} onPointerOut={out}>
          <mesh geometry={geo.rose} material={mats.metal} castShadow receiveShadow />
          <mesh geometry={geo.collar} material={mats.metal} castShadow receiveShadow />
          <group ref={(g) => (parts.current.lever = g)}>
            <mesh geometry={geo.lever} material={mats.metal} castShadow receiveShadow />
          </group>
        </group>
        {/* key cylinder rose */}
        <group position={[HANDLE.x, HANDLE.y - 0.108, HANDLE.z]}>
          <mesh geometry={geo.keyRose} material={mats.metal} castShadow receiveShadow />
          {geo.keyway.map((g, i) => <mesh key={i} geometry={g} material={mats.dark} position={[0, 0, 0.0061]} />)}
        </group>
      </group>
    </>
  )
}

function ShowroomSpot({ tier }) {
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0.95, -2.75); return o }, [])
  return (
    <>
      <primitive object={target} />
      <spotLight target={target} position={[0.3, 3.1, -1.2]} angle={0.62} penumbra={0.75} intensity={34} decay={2} color="#fff3e2"
        castShadow={tier === 'full'} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.01} shadow-radius={4} shadow-camera-near={0.8} shadow-camera-far={5} />
    </>
  )
}

function Lights({ parts, tier }) {
  const { scene, gl } = useThree()
  const cookie = useMemo(windowCookie, [])
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.3, 1.15, 0); return o }, [])
  const wallTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-1.0, 1.3, 0); return o }, [])
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const env = new RoomEnvironment()
    // two extra soft boxes so brushed metal has long, controlled highlights to pick up
    const box = (w, h, x, y, z, k, color = 0xffffff) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }))
      m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m)
    }
    box(0.5, 5, -5, 2, 2, 9)
    box(0.5, 5, 5, 2, 1, 5, 0xdfe8f2)
    box(6, 4, -3, 4.5, 4, 5, 0xfff4e4)
    // fromScene would compile its filter shaders synchronously (about half a second with the page frozen):
    // build them in parallel first. Uses PMREMGenerator internals, pinned with three 0.186.
    let tex = null, gone = false
    pm._setSize(256)
    pm._allocateTargets().dispose() // creates the GGX and blur materials and the ping-pong target
    const flat = new THREE.OrthographicCamera(), cube = new THREE.PerspectiveCamera(90, 1, 0.1, 100)
    const prev = gl.getRenderTarget()
    gl.setRenderTarget(pm._pingPongRenderTarget)
    const quad = (m) => new THREE.Mesh(pm._lodMeshes[0].geometry, m) // same attributes as PMREM's own meshes, or the shader variant differs
    const compiled = Promise.all([gl.compileAsync(quad(pm._ggxMaterial), flat), gl.compileAsync(quad(pm._blurMaterial), flat), gl.compileAsync(env, cube)])
    gl.setRenderTarget(prev)
    // the scene's own shaders depend on the environment map, so their compile waits for this
    scene.userData.envReady = compiled.catch(() => {}).then(() => {
      if (gone) return
      tex = pm.fromScene(env, 0.035).texture
      scene.environment = tex
      scene.environmentIntensity = 0.27
      invalidate()
    })
    return () => { gone = true; tex?.dispose(); pm.dispose(); scene.environment = null }
  }, [gl, scene])
  return (
    <>
      <primitive object={target} />
      <spotLight ref={(l) => (parts.current.key = l)} target={target} position={[-1.9, 2.5, 2.1]} angle={0.42} penumbra={0.85} intensity={56} decay={2} color="#fff9f0" map={cookie} castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} shadow-normalBias={0.012} shadow-radius={5} shadow-camera-near={0.5} shadow-camera-far={9} />
      <primitive object={wallTarget} />
      <spotLight ref={(l) => (parts.current.wall = l)} target={wallTarget} position={[1.9, 2.4, 2.4]} angle={0.2} penumbra={0.9} intensity={20} decay={2} color="#fff6ea" map={cookie} castShadow={tier === 'full'}
        shadow-mapSize={[512, 512]} shadow-bias={-0.0004} shadow-radius={6} shadow-camera-near={0.5} shadow-camera-far={9} />
      <pointLight position={[0.2, 1.8, -2.2]} intensity={4} color="#ffeed8" decay={2} distance={9} />
    </>
  )
}

function Rig({ parts, quality: tier }) {
  const { camera, size, scene, gl } = useThree()
  const shadowKey = useRef('')
  const cur = useRef({ color: new THREE.Color(FINISHES[story.finish].color), goal: new THREE.Color(), rough: FINISHES[story.finish].rough })
  const pos = useMemo(() => new THREE.Vector3(), [])
  const tgt = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame(() => {
    const p = story.p
    const { door, lever, tongue, mats, key } = parts.current
    if (!door || !mats) return

    const pt = story.ptr
    const tx = story.reduced ? 0 : pt.tx, ty = story.reduced ? 0 : pt.ty
    pt.x += (tx - pt.x) * 0.12
    pt.y += (ty - pt.y) * 0.12
    const moving = Math.abs(tx - pt.x) > 0.0008 || Math.abs(ty - pt.y) > 0.0008

    const fov = cameraAt(p, pos, tgt)
    const comp = composition(size.width, size.height, p)
    pos.sub(tgt).multiplyScalar(comp.dolly).add(tgt)
    dir.subVectors(tgt, pos).normalize()
    right.crossVectors(dir, up).normalize()
    const dist = pos.distanceTo(tgt)
    pos.addScaledVector(right, pt.x * 0.014 * dist).addScaledVector(up, pt.y * 0.008 * dist)
    camera.position.copy(pos)
    camera.fov = fov * comp.fovMul
    camera.lookAt(tgt)
    camera.setViewOffset(size.width, size.height, -comp.shiftX * size.width, -comp.shiftY * size.height, size.width, size.height)
    camera.updateProjectionMatrix()

    door.rotation.y = -DOOR_MAX * doorAt(p)
    const l = Math.max(leverAt(p), story.manual)
    lever.rotation.z = -LEVER_MAX * l
    tongue.position.x = LOCK_X + 0.0125 * l

    // the window light drifts as the camera moves, so highlights travel across the flutes and the lever
    // lite: the window light stays put, so shadows only need redrawing when the door or lever moves
    const drift = tier === 'full' ? p : 0
    if (key) { key.position.x = -1.9 + drift * 1.1; key.position.y = 2.5 - drift * 0.4 }
    const sk = `${door.rotation.y} ${l} ${drift} ${p > 0.48}`
    if (sk !== shadowKey.current) { shadowKey.current = sk; gl.shadowMap.needsUpdate = true }
    scene.environmentRotation.y = p * 0.5

    const f = FINISHES[story.finish]
    const c = cur.current
    const goal = c.goal.set(f.color)
    c.color.lerp(goal, 0.2)
    c.rough += (f.rough - c.rough) * 0.2
    mats.metal.color.copy(c.color)
    mats.metal.roughness = c.rough
    const settling = Math.abs(c.color.r - goal.r) + Math.abs(c.color.g - goal.g) + Math.abs(c.color.b - goal.b) > 0.004 || Math.abs(c.rough - f.rough) > 0.002
    if (moving || settling) invalidate()
  })
  return null
}

// Marks the scene ready only after the first frame has really been drawn, so the CSS fade-in is not
// consumed by the one-off shader compile.
// The canvas starts paused. Drawing the first frame straight away would compile every shader synchronously,
// freezing the page (no scrolling) for several seconds on a first visit; compileAsync builds them in parallel
// in the background while the poster is on screen. After that, nothing is drawn while the hero is scrolled
// out of view (scroll and resize callbacks would otherwise keep re-rendering a canvas nobody can see).
// Must sit after Lights in the tree: the environment map set there changes the shaders.
function LoopControl({ tier }) {
  const { gl, scene, camera, setFrameloop } = useThree()
  useEffect(() => {
    let io, gone = false
    // the full tier draws into the post-processing buffer, so compile the off-screen variant of each shader
    const rt = tier === 'full' ? new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType }) : null
    const compiling = (scene.userData.envReady || Promise.resolve()).then(() => {
      if (gone) return
      const prev = gl.getRenderTarget()
      gl.setRenderTarget(rt)
      const c = gl.compileAsync(scene, camera)
      gl.setRenderTarget(prev)
      return c
    })
    const start = () => {
      rt?.dispose()
      if (gone) return
      io = new IntersectionObserver(([e]) => { setFrameloop(e.isIntersecting ? 'demand' : 'never'); if (e.isIntersecting) invalidate() })
      io.observe(gl.domElement)
    }
    compiling.then(start, start)
    return () => { gone = true; io?.disconnect() }
  }, [gl, scene, camera, setFrameloop, tier])
  return null
}

// A positive priority tells R3F that someone else renders (the effect composer), so only use one on the
// full tier; on the lite tier R3F must keep rendering the scene itself.
function FirstFrame({ priority = 0 }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.dataset.scene = 'ready' }))
  }, priority)
  return null
}

export default function Scene() {
  const parts = useRef({})
  const tier = useMemo(quality, [])
  useEffect(() => { story.render = () => invalidate(); invalidate() }, [])
  return (
    <Canvas
      frameloop="never"
      shadows="percentage"
      dpr={[1, tier === 'full' ? 1.5 : isSmall() ? 1.25 : 1]}
      camera={{ fov: 28, near: 0.05, far: 40, position: [-0.78, 1.1, 0.52] }}
      gl={{ antialias: tier === 'lite' && isSmall(), powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color('#eee7da')
        if (tier === 'lite') gl.toneMapping = THREE.NeutralToneMapping
        gl.shadowMap.autoUpdate = false // redrawn by Rig only when something that casts a shadow has moved
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); story.onFail?.('context-lost') })
        document.documentElement.dataset.quality = tier
      }}
      aria-hidden="true"
    >
      <Lights parts={parts} tier={tier} />
      <Room parts={parts} />
      <Showroom />
      {/* showroom light lives outside the toggled group: changing the light count would recompile every material */}
      <pointLight position={[0, 2.7, -2.1]} intensity={6} color="#ffe6c4" decay={2} distance={7} />
      {/* gallery spot on the plinth row: crisp highlights on the metal and contact shadows on the stone tops */}
      <ShowroomSpot tier={tier} />
      <Rig parts={parts} quality={tier} />
      {/* lite (phones, integrated GPUs): no post-processing pass at all; hardware MSAA and renderer tone
          mapping give the same colour at a fraction of the cost. Full: the scene is shown once effects are in. */}
      {tier === 'full' ? <Suspense fallback={null}><Effects /><FirstFrame priority={2} /></Suspense> : <FirstFrame />}
      <LoopControl tier={tier} />
    </Canvas>
  )
}
