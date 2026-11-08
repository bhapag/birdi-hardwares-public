import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Full-tier post-processing: ambient occlusion and neutral tone mapping, with 4x MSAA for clean edges on thin
// hardware (levers, spindles). No depth of field: it blurred the showroom and the products in it.
export default function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.16} distanceFalloff={1} intensity={2.2} halfRes quality="performance" color="#2a1a10" />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}
