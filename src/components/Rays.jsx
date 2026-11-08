import { useEffect, useState } from 'react'
import LightRays from './vendor/LightRays.jsx'
import './vendor/LightRays.css'

// Warm window light for page stages (React Bits LightRays). Skipped for reduced motion, data saving and
// small screens, where the CSS gradient underneath is the whole effect.
export default function Rays({ origin = 'top-left' }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const save = navigator.connection?.saveData
    const small = matchMedia('(max-width: 760px)').matches
    setOn(!reduce && !save && !small)
  }, [])
  if (!on) return null
  return (
    <LightRays raysOrigin={origin} raysColor="#ffe3b8" raysSpeed={0.35} lightSpread={0.9} rayLength={2.2} rayDensity={0.8} raySharpness={0.3} glow={0.35} haze={0.3} intensity={0.75}
      followMouse={false} cursorShadow={false} clickPulse={false} lightMode opacity={0.85} maxDevicePixelRatio={1.25} className="rays" />
  )
}
