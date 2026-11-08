import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

// Atmospheric background film. Muted, looping, plays only while on screen and the tab is visible.
// Reduced motion or data saving: the poster still stands in and the video is never downloaded.
export default function VideoLoop({ base, poster, posterPortrait, label }) {
  const ref = useRef(null)
  const [mode, setMode] = useState('poster') // poster | video
  const [paused, setPaused] = useState(true)
  const userPaused = useRef(false)
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const save = navigator.connection?.saveData
    if (!reduce && !save) setMode('video')
  }, [])
  useEffect(() => {
    const v = ref.current
    if (mode !== 'video' || !v) return
    const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches
    const canWebm = v.canPlayType('video/webm; codecs="vp9"')
    let visible = false
    let loaded = false
    // Only start downloading once the section is near the screen; a pause() that lands before any data has
    // arrived would otherwise abort the load with nothing to retry it, so `canplay` re-syncs as well.
    const load = () => {
      if (loaded) return
      loaded = true
      v.preload = 'auto'
      // 1080p only where it is shown large enough to matter (wide screen, or a high-density laptop)
      const big = !portrait && innerWidth * Math.min(devicePixelRatio || 1, 2) > 1500
      v.src = `${base}${portrait ? '-portrait' : big ? '-1080' : ''}.${canWebm ? 'webm' : 'mp4'}`
      v.load()
    }
    const sync = () => {
      if (visible && !document.hidden && !userPaused.current) { load(); if (v.readyState >= 2) v.play().catch(() => {}) }
      else if (!v.paused) v.pause()
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync() }, { threshold: 0.15, rootMargin: '200px 0px' })
    io.observe(v)
    v.addEventListener('canplay', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { io.disconnect(); v.removeEventListener('canplay', sync); document.removeEventListener('visibilitychange', sync); v.pause() }
  }, [mode, base])
  const toggle = () => {
    const v = ref.current
    if (!v) return
    userPaused.current = !v.paused
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }
  return (
    <div className="loop">
      <picture className="loop-poster">
        <source media="(max-aspect-ratio: 4/5)" srcSet={posterPortrait} />
        <img src={poster} alt="" width="1920" height="1080" loading="lazy" decoding="async" />
      </picture>
      {mode === 'video' && (
        <>
          <video ref={ref} className="loop-video" muted loop playsInline preload="none" aria-hidden="true" onPlaying={() => setPaused(false)} onPause={() => setPaused(true)} />
          <button type="button" className="media-btn loop-toggle" onClick={toggle} aria-label={paused ? `Play ${label}` : `Pause ${label}`}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        </>
      )}
    </div>
  )
}
