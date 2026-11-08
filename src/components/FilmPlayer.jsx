import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

// Foreground showroom film. Starts muted once it is meaningfully on screen (never with reduced motion or
// data saving), pauses off screen and in hidden tabs, and always offers play, pause and replay.
export default function FilmPlayer({ base, poster, title, duration }) {
  const ref = useRef(null)
  const [state, setState] = useState('idle') // idle | playing | paused | ended
  const [progress, setProgress] = useState(0)
  const user = useRef(false)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const save = navigator.connection?.saveData
    let started = false
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.6 && !started && !reduce && !save && !user.current) { started = true; v.play().catch(() => {}) }
      if (e.intersectionRatio < 0.2 && !v.paused) v.pause()
    }, { threshold: [0, 0.2, 0.6] })
    io.observe(v)
    const vis = () => { if (document.hidden && !v.paused) v.pause() }
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [])
  const play = () => { user.current = true; ref.current?.play().catch(() => {}) }
  const pause = () => { user.current = true; ref.current?.pause() }
  const replay = () => { const v = ref.current; if (!v) return; user.current = true; v.currentTime = 0; v.play().catch(() => {}) }
  return (
    <div className="film-frame">
      <video ref={ref} muted playsInline preload="metadata" poster={poster} aria-label={title} width="1920" height="1080"
        onPlay={() => setState('playing')} onPause={() => setState((s) => (s === 'ended' ? s : 'paused'))} onEnded={() => setState('ended')}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || duration))}>
        {/* 1080p for wide screens; browsers that ignore `media` on video sources take the first match, 1080p */}
        <source media="(min-width: 900px)" src={`${base}-1080.webm`} type='video/webm; codecs="vp9"' />
        <source media="(min-width: 900px)" src={`${base}-1080.mp4`} type="video/mp4" />
        <source src={`${base}.webm`} type='video/webm; codecs="vp9"' />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      {state === 'idle' && <button type="button" className="film-start" onClick={play}><Play size={20} aria-hidden="true" /> Play the film</button>}
      <div className="film-bar">
        {state === 'playing'
          ? <button type="button" className="media-btn" onClick={pause} aria-label="Pause film"><Pause size={16} aria-hidden="true" /></button>
          : <button type="button" className="media-btn" onClick={play} aria-label="Play film"><Play size={16} aria-hidden="true" /></button>}
        <button type="button" className="media-btn" onClick={replay} aria-label="Replay film from the start"><RotateCcw size={16} aria-hidden="true" /></button>
        <span className="film-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></span>
      </div>
    </div>
  )
}
