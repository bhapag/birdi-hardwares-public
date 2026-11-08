// Render quality tier for the hero scene: 'full' (discrete GPU, big screen) or 'lite' (phones, integrated GPUs).
// Integrated / software GPUs get the lite tier even on a big screen: the full tier is tuned for a discrete GPU.
function weakGpu() {
  try {
    const g = document.createElement('canvas').getContext('webgl')
    const i = g && g.getExtension('WEBGL_debug_renderer_info')
    const name = i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : ''
    g?.getExtension('WEBGL_lose_context')?.loseContext()
    return /intel|swiftshader|llvmpipe|basic render|microsoft|mali|adreno|powervr/i.test(name)
  } catch { return false }
}

// phones in either orientation (a landscape phone is wider than 760px) and small touch tablets
export const isSmall = () => window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1100px)').matches

let cached
// Decided once per page: the canvas settings and the procedural materials both read it.
export const quality = () => cached || (cached = (() => {
  const small = isSmall()
  const lowEnd = (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4
  return small || lowEnd || weakGpu() ? 'lite' : 'full'
})())
