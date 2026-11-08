// Code-modelled architectural hardware used by the showroom reveal, the films and the category stills.
// These are original concept objects with typical proportions. They are not Birdi stock items or any
// manufacturer's model, and carry no brand marks. Units: metres.
import { useMemo } from 'react'
import { RoundedBox } from './RBox.jsx'
import * as THREE from 'three'
import { latheZ, roseProfile, collarProfile, keyRoseProfile, leverGeometry, keywayGeometries } from './hardware.js'
import { metalMaterial, darkMaterial } from './materials.js'

const MM = 0.001

// One material set per canvas, shared by every product.
export function useProductMaterials() {
  return useMemo(() => {
    const plate = (color, rough = 0.32) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.1 })
    const mats = {
      brass: metalMaterial('brass'),
      // a touch darker than the swatch colour: real nickel reflects about two thirds of the light, so it
      // keeps its form under the gallery spot instead of reading as white plastic
      nickel: Object.assign(metalMaterial('nickel'), { roughness: 0.26 }),
      bronze: metalMaterial('bronze'),
      gunmetal: plate('#4b4a48', 0.34),
      steel: plate('#b9b6b0', 0.42),
      glass: new THREE.MeshPhysicalMaterial({ color: '#141414', metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.85, metalness: 0 }),
      key: plate('#a9a49a', 0.3),
      dark: darkMaterial(),
      glow: new THREE.MeshBasicMaterial({ color: '#f4dfb6' }),
    }
    mats.nickel.color.set('#b3b0aa')
    return mats
  }, [])
}

const Part = ({ geometry, material, ...p }) => <mesh geometry={geometry} material={material} castShadow receiveShadow {...p} />

/** Lever handle on a round rose, optional key rose below. Origin: centre of the rose back face. */
export function LeverOnRose({ m, finish = 'brass', press = 0, keyRose = true }) {
  const g = useMemo(() => ({ rose: latheZ(roseProfile), collar: latheZ(collarProfile), lever: leverGeometry(), keyRose: latheZ(keyRoseProfile, 96), keyway: keywayGeometries() }), [])
  const mat = m[finish]
  return (
    <group>
      <Part geometry={g.rose} material={mat} />
      <Part geometry={g.collar} material={mat} />
      <group rotation={[0, 0, -0.62 * press]}><Part geometry={g.lever} material={mat} /></group>
      {keyRose && (
        <group position={[0, -0.108, 0]}>
          <Part geometry={g.keyRose} material={mat} />
          {g.keyway.map((k, i) => <mesh key={i} geometry={k} material={m.dark} position={[0, 0, 0.0061]} />)}
        </group>
      )}
    </group>
  )
}

/**
 * Mortise lock body seen from the side: steel case, forend (faceplate) on the door edge, bevelled latch,
 * square deadbolt, spindle follower and euro-cylinder cut-out. Origin: centre of the case.
 * `latch` 0..1 retracts the latch, `bolt` 0..1 throws the deadbolt.
 */
export function MortiseLock({ m, latch = 0, bolt = 0, finish = 'brass' }) {
  const latchGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -9).lineTo(-11, -9).lineTo(-17, 0).lineTo(-17, 9).lineTo(0, 9).closePath()
    const e = new THREE.ExtrudeGeometry(s, { depth: 14, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 2 })
    e.scale(MM, MM, MM); e.translate(0, 0, -7 * MM); return e
  }, [])
  const cylHole = useMemo(() => {
    const s = new THREE.Shape().absarc(0, 0, 8.5 * MM, 0, Math.PI * 2, false)
    const g = new THREE.ShapeGeometry(s, 40); return g
  }, [])
  const W = 0.105, H = 0.165, T = 0.016
  return (
    <group>
      <RoundedBox args={[W, H, T]} radius={0.002} smoothness={3} material={m.steel} castShadow receiveShadow />
      {/* rivets */}
      {[[-0.04, 0.07], [0.04, 0.07], [-0.04, -0.07], [0.04, -0.07]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, T / 2 + 0.0004]} rotation={[Math.PI / 2, 0, 0]} material={m.nickel}><cylinderGeometry args={[0.0028, 0.0028, 0.001, 20]} /></mesh>
      ))}
      {/* spindle follower (square hole in a round boss) */}
      <mesh position={[-0.008, 0.035, T / 2 + 0.0006]} rotation={[Math.PI / 2, 0, 0]} material={m.nickel}><cylinderGeometry args={[0.012, 0.012, 0.0014, 36]} /></mesh>
      <mesh position={[-0.008, 0.035, T / 2 + 0.0015]} material={m.dark}><boxGeometry args={[0.008, 0.008, 0.0004]} /></mesh>
      {/* euro cylinder cut-out */}
      <mesh geometry={cylHole} material={m.dark} position={[-0.008, -0.035, T / 2 + 0.0004]} />
      <mesh position={[-0.008, -0.047, T / 2 + 0.0004]} material={m.dark}><boxGeometry args={[0.0094, 0.022, 0.0004]} /></mesh>
      {/* forend on the door edge (left side, -x) */}
      <RoundedBox args={[0.004, H + 0.07, 0.024]} radius={0.0012} smoothness={3} position={[-W / 2 - 0.002, 0, 0]} material={m[finish]} castShadow receiveShadow />
      {[0.105, -0.105].map((y) => <mesh key={y} position={[-W / 2 - 0.0042, y, 0]} rotation={[0, 0, Math.PI / 2]} material={m.dark}><cylinderGeometry args={[0.0028, 0.0028, 0.0006, 20]} /></mesh>)}
      {/* latch and deadbolt project through the forend */}
      <mesh geometry={latchGeo} material={m[finish]} position={[-W / 2 - 0.004 + 0.012 * latch, 0.035, 0]} castShadow />
      <mesh position={[-W / 2 - 0.004 - 0.022 * bolt + 0.011, -0.035, 0]} material={m[finish]} castShadow><boxGeometry args={[0.022, 0.018, 0.012]} /></mesh>
    </group>
  )
}

/** Euro profile cylinder with a key on one side. Axis along +z. */
export function EuroCylinder({ m, finish = 'nickel', keyTurn = 0 }) {
  const profile = useMemo(() => {
    const s = new THREE.Shape()
    s.absarc(0, 0, 8.5, -Math.PI * 0.32, Math.PI * 1.32, false)
    s.lineTo(-5, -26).quadraticCurveTo(0, -30, 5, -26).closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 70, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 3, curveSegments: 40 })
    g.scale(MM, MM, MM); g.translate(0, 0, -35 * MM); return g
  }, [])
  const keyGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -1.2).lineTo(32, -1.2).lineTo(34, 1.5).lineTo(30, 3).lineTo(27, 1.6).lineTo(24, 3.2).lineTo(21, 1.6).lineTo(18, 3.4).lineTo(15, 1.6).lineTo(12, 3).lineTo(9, 1.6).lineTo(0, 1.6).closePath()
    const bow = new THREE.Shape().absarc(-12, 0.2, 12, 0, Math.PI * 2, false)
    bow.holes.push(new THREE.Path().absarc(-17, 0.2, 3.2, 0, Math.PI * 2, true))
    const a = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: false })
    const b = new THREE.ExtrudeGeometry(bow, { depth: 2.6, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 2, curveSegments: 32 })
    a.translate(0, 0, -1.1); b.translate(0, 0, -1.3)
    return [a, b].map((g) => { g.scale(MM, MM, MM); return g })
  }, [])
  return (
    <group>
      <Part geometry={profile} material={m[finish]} />
      <mesh position={[0, 0, 0.0356]} rotation={[Math.PI / 2, 0, 0]} material={m[finish]}><cylinderGeometry args={[0.0076, 0.0076, 0.002, 40]} /></mesh>
      <mesh position={[0, -0.002, 0.0368]} material={m.dark}><boxGeometry args={[0.0018, 0.0075, 0.0004]} /></mesh>
      <group position={[0, 0, 0.037]} rotation={[0, -Math.PI / 2, keyTurn]}>
        {keyGeo.map((g, i) => <Part key={i} geometry={g} material={m.key} />)}
      </group>
    </group>
  )
}

/**
 * Digital lock: slim outer escutcheon with a 4 x 3 keypad (blank keys, dot markers only, no lettering),
 * a small dark reader window, an emergency key cover and a lever below. Origin: centre of the plate back.
 */
export function DigitalLock({ m, finish = 'gunmetal', lit = 0, press = 0 }) {
  const keys = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push([(c - 1) * 0.0215, 0.07 - r * 0.0225])
  return (
    <group>
      <RoundedBox args={[0.072, 0.32, 0.024]} radius={0.008} smoothness={5} position={[0, 0, 0.012]} material={m[finish]} castShadow receiveShadow />
      <RoundedBox args={[0.058, 0.115, 0.002]} radius={0.004} smoothness={3} position={[0, 0.036, 0.0245]} material={m.glass} />
      {keys.map(([x, y], n) => (
        <group key={n} position={[x, y, 0.0258]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.nickel} castShadow><cylinderGeometry args={[0.0074, 0.0077, 0.0026, 32]} /></mesh>
          <mesh position={[0, 0, 0.0014]} material={lit > 0 ? m.glow : m.dark} scale={[1, 1, 1]}><circleGeometry args={[0.0013, 16]} /></mesh>
        </group>
      ))}
      <RoundedBox args={[0.034, 0.012, 0.0015]} radius={0.002} smoothness={2} position={[0, 0.118, 0.0245]} material={m.glass} />
      <mesh position={[0, -0.03, 0.0247]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}><cylinderGeometry args={[0.0062, 0.0062, 0.001, 32]} /></mesh>
      <group position={[0, -0.095, 0.024]} scale={0.88}>
        <LeverOnRose m={m} finish="nickel" press={press} keyRose={false} />
      </group>
    </group>
  )
}

/** Overhead door closer with a two-piece scissor arm. Origin: centre of the closer body back. `open` 0..1 folds the arm. */
export function DoorCloser({ m, finish = 'nickel', open = 0 }) {
  const fold = 0.35 + 0.9 * open
  const L1 = 0.13, L2 = 0.16
  return (
    <group>
      <RoundedBox args={[0.24, 0.062, 0.05]} radius={0.016} smoothness={6} position={[0, 0, 0.025]} material={m[finish]} castShadow receiveShadow />
      {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, 0, 0.026]} rotation={[0, 0, Math.PI / 2]} material={m.gunmetal}><cylinderGeometry args={[0.024, 0.024, 0.004, 36]} /></mesh>)}
      {/* pinion and arms */}
      <mesh position={[0.08, 0, 0.056]} material={m.gunmetal}><cylinderGeometry args={[0.0105, 0.0105, 0.016, 32]} /></mesh>
      <group position={[0.08, 0, 0.064]} rotation={[0, fold, 0]}>
        <RoundedBox args={[L1, 0.014, 0.007]} radius={0.003} smoothness={3} position={[L1 / 2, 0, 0]} material={m[finish]} castShadow />
        <group position={[L1, 0, 0]} rotation={[0, -2 * fold + 0.25, 0]}>
          <mesh material={m.gunmetal}><cylinderGeometry args={[0.008, 0.008, 0.016, 28]} /></mesh>
          <RoundedBox args={[L2, 0.012, 0.006]} radius={0.003} smoothness={3} position={[L2 / 2, 0, -0.006]} material={m[finish]} castShadow />
          <group position={[L2, 0, -0.006]}>
            <mesh material={m.gunmetal}><cylinderGeometry args={[0.0095, 0.0095, 0.016, 28]} /></mesh>
            <RoundedBox args={[0.05, 0.028, 0.006]} radius={0.002} smoothness={2} position={[0.012, 0, -0.01]} material={m[finish]} castShadow />
          </group>
        </group>
      </group>
    </group>
  )
}

/** Butt hinge, leaves open by `angle` (radians). Knuckle axis along y. */
export function ButtHinge({ m, finish = 'brass', angle = 1.4, height = 0.1 }) {
  const leaf = (side, rot) => (
    <group rotation={[0, rot, 0]}>
      <RoundedBox args={[0.034, height, 0.003]} radius={0.001} smoothness={3} position={[side * 0.021, 0, 0]} material={m[finish]} castShadow receiveShadow />
      {[-0.032, 0, 0.032].map((y, i) => (
        <group key={i} position={[side * (i === 1 ? 0.03 : 0.022), y, side > 0 ? 0.0016 : -0.0016]} rotation={[side > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
          <mesh material={m[finish]}><cylinderGeometry args={[0.0042, 0.0018, 0.0016, 24]} /></mesh>
          <mesh position={[0, 0.0009, 0]} material={m.dark}><boxGeometry args={[0.0058, 0.0004, 0.0008]} /></mesh>
        </group>
      ))}
    </group>
  )
  const knuckles = 5, kh = height / knuckles
  return (
    <group>
      {leaf(-1, 0)}
      {leaf(1, -(Math.PI - angle))}
      {Array.from({ length: knuckles }, (_, i) => (
        <mesh key={i} position={[0, -height / 2 + kh * (i + 0.5), 0]} material={m[finish]} castShadow receiveShadow><cylinderGeometry args={[0.0058, 0.0058, kh - 0.0006, 32]} /></mesh>
      ))}
      <mesh position={[0, height / 2 + 0.0016, 0]} material={m[finish]}><sphereGeometry args={[0.0058, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, -height / 2 - 0.0016, 0]} rotation={[Math.PI, 0, 0]} material={m[finish]}><sphereGeometry args={[0.0058, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    </group>
  )
}

/** Tower bolt (barrel bolt): back plate, two guides, bolt with knob. `shot` 0..1 slides the bolt. Bolt along +x. */
export function TowerBolt({ m, finish = 'nickel', shot = 0.4, length = 0.15 }) {
  const travel = 0.035
  return (
    <group>
      <RoundedBox args={[length, 0.038, 0.0025]} radius={0.001} smoothness={2} material={m[finish]} castShadow receiveShadow />
      {[-length * 0.36, length * 0.08].map((x) => (
        <RoundedBox key={x} args={[0.022, 0.024, 0.016]} radius={0.004} smoothness={3} position={[x, 0, 0.008]} material={m[finish]} castShadow />
      ))}
      <group position={[shot * travel, 0, 0.009]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={m[finish]} castShadow><cylinderGeometry args={[0.0052, 0.0052, length * 0.95, 28]} /></mesh>
        <mesh position={[-length * 0.14, 0.008, 0.002]} material={m[finish]} castShadow><cylinderGeometry args={[0.0028, 0.0028, 0.016, 16]} /></mesh>
        <mesh position={[-length * 0.14, 0.019, 0.002]} material={m[finish]} castShadow><sphereGeometry args={[0.0058, 24, 16]} /></mesh>
      </group>
      {[-0.06, 0.06].map((x) => <mesh key={x} position={[x * length / 0.15, 0, 0.0014]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}><cylinderGeometry args={[0.0022, 0.0022, 0.0004, 16]} /></mesh>)}
    </group>
  )
}

/** Pull handle (bar on two stand-offs). Bar along y. */
export function PullHandle({ m, finish = 'brass', length = 0.3 }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, s * length * 0.38, 0]}>
          <mesh position={[0, 0, 0.002]} rotation={[Math.PI / 2, 0, 0]} material={m[finish]}><cylinderGeometry args={[0.012, 0.012, 0.004, 36]} /></mesh>
          <mesh position={[0, 0, 0.026]} rotation={[Math.PI / 2, 0, 0]} material={m[finish]} castShadow><cylinderGeometry args={[0.0075, 0.0075, 0.046, 32]} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0.05]} material={m[finish]} castShadow receiveShadow><capsuleGeometry args={[0.0105, length, 8, 32]} /></mesh>
    </group>
  )
}

/** Floor door stopper: domed base with a rubber buffer. Axis along +y. */
export function DoorStopper({ m, finish = 'nickel' }) {
  const g = useMemo(() => latheZ([[0, 0], [24, 0], [24, 3], [20, 6], [12, 9], [11, 30], [0, 30]], 64), [])
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <Part geometry={g} material={m[finish]} />
      <mesh position={[0, 0, 0.034]} rotation={[Math.PI / 2, 0, 0]} material={m.rubber} castShadow><cylinderGeometry args={[0.0118, 0.0118, 0.012, 32]} /></mesh>
    </group>
  )
}

/** Strike plate with a latch opening and a dust box behind it. */
export function StrikePlate({ m, finish = 'nickel' }) {
  const plate = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-12, -45).lineTo(12, -45).lineTo(12, 45).lineTo(-12, 45).closePath()
    s.holes.push(new THREE.Path().moveTo(-6, -11).lineTo(6, -11).lineTo(6, 11).lineTo(-6, 11).closePath())
    s.holes.push(new THREE.Path().absarc(0, 33, 2.4, 0, Math.PI * 2, true))
    s.holes.push(new THREE.Path().absarc(0, -33, 2.4, 0, Math.PI * 2, true))
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 2, curveSegments: 24 })
    g.scale(MM, MM, MM); return g
  }, [])
  return (
    <group>
      <Part geometry={plate} material={m[finish]} />
      <mesh position={[0, 0, -0.008]} material={m.dark}><boxGeometry args={[0.012, 0.022, 0.016]} /></mesh>
    </group>
  )
}

/** Square spindle and a pair of fixing screws: the small parts people come in to replace. */
export function SpareParts({ m, finish = 'nickel' }) {
  const screw = (x, y, rot) => (
    <group position={[x, y, 0]} rotation={[0, 0, rot]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m[finish]} castShadow><cylinderGeometry args={[0.0019, 0.0019, 0.03, 16]} /></mesh>
      <mesh position={[-0.0165, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m[finish]} castShadow><cylinderGeometry args={[0.0042, 0.0019, 0.003, 24]} /></mesh>
    </group>
  )
  return (
    <group>
      <mesh rotation={[0, 0, 0.3]} material={m.steel} castShadow receiveShadow><boxGeometry args={[0.11, 0.008, 0.008]} /></mesh>
      {screw(0.01, -0.03, 0.15)}
      {screw(0.02, -0.045, 0.1)}
      {screw(-0.03, 0.03, -0.2)}
    </group>
  )
}
