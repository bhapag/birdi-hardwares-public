import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown } from 'lucide-react'
import { story, FINISHES, tap } from '../scene/story.js'
import ClickSpark from './vendor/ClickSpark.jsx'

gsap.registerPlugin(ScrollTrigger)

// Start downloading the 3D scene as soon as this script runs (not after the first render), so the live door
// arrives sooner; the matching poster below covers the wait.
const loadScene = () => import('../scene/Scene.jsx')
let earlyScene = null
if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('3d') !== 'off') earlyScene = loadScene()
const Scene = lazy(() => earlyScene || loadScene())

const VIEWS = [
  { p: 0, label: 'Three-quarter', text: 'A concept lever handle on a walnut door.' },
  { p: 0.5, label: 'Lever pressed', text: 'Press the lever and the latch draws back.' },
  { p: 0.8, label: 'Door ajar', text: 'The door gives way on its hinge.' },
  { p: 1, label: 'Full door', text: 'The whole entrance, door slightly open.' },
]

function webglOk() {
  try {
    if (new URLSearchParams(location.search).get('3d') === 'off') return false
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) { console.warn('3D scene failed', e) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

// Static illustration shown when WebGL is unavailable or the 3D scene fails.
function Fallback({ note }) {
  return (
    <div className="fallback">
      <svg viewBox="0 0 400 520" role="img" aria-label="Illustration of a walnut door with a lever handle">
        <rect width="400" height="520" fill="#bdb3a1" />
        <rect x="96" y="40" width="208" height="480" fill="#2b1a0f" />
        <rect x="104" y="48" width="192" height="472" fill="#3a2414" />
        <circle cx="132" cy="290" r="16" fill="#cfd0cd" />
        <rect x="124" y="283" width="72" height="14" rx="7" fill="#e3e4e1" />
        <circle cx="132" cy="332" r="10" fill="#cfd0cd" />
      </svg>
      <p>{note}</p>
    </div>
  )
}

export default function Hero() {
  const hero = useRef(null)
  const [gl, setGl] = useState(null) // null until checked on the client
  const [failed, setFailed] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [finish, setFinish] = useState('brass')
  const [view, setView] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => { story.reduced = mq.matches; setReduced(mq.matches) }
    apply()
    mq.addEventListener('change', apply)
    setGl(webglOk())
    story.onFail = () => setFailed(true)
    if (new URLSearchParams(location.search).has('debug')) window.__story = story
    return () => mq.removeEventListener('change', apply)
  }, [])

  // One scrubbed timeline drives camera, lever, door and copy from the same scroll progress.
  useEffect(() => {
    if (reduced || !gl) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        // progress runs exactly while the stage is pinned: on short screens the stage (min-height 580px) is taller
        // than the viewport, and 'bottom bottom' would end the story before its last frame was ever shown
        scrollTrigger: { trigger: hero.current, start: 'top top', end: () => `+=${hero.current.offsetHeight - hero.current.querySelector('.stage').offsetHeight}`, scrub: 0.15, invalidateOnRefresh: true },
      })
      tl.to(story, { p: 1, duration: 1, onUpdate: () => story.render() }, 0)
      tl.to('.progress', { scaleX: 1, duration: 1 }, 0)
      tl.to('.ch-a', { autoAlpha: 0, y: -28, duration: 0.07 }, 0.1)
      tl.fromTo('.ch-b', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.17)
      tl.to('.ch-b', { autoAlpha: 0, y: -28, duration: 0.06 }, 0.37)
      tl.fromTo('.ch-c', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.43)
      tl.to('.ch-c', { autoAlpha: 0, y: -28, duration: 0.06 }, 0.78)
      tl.fromTo('.ch-d', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.88)
      tl.fromTo('.floor-fade', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.88)
      tl.to('.controls, .concept, .progress', { autoAlpha: 0, duration: 0.05 }, 0.9)
    }, hero)
    // Rotation (a width change) reflows everything above the hero, so the same scrollY lands somewhere else in
    // the story. The progress is captured at the resize event (before layout and ScrollTrigger's refresh move
    // anything) and restored once ScrollTrigger has measured the new layout.
    let width = innerWidth, keep = null
    const st = () => ScrollTrigger.getAll().find((t) => t.trigger === hero.current)
    const onResize = () => {
      if (innerWidth === width) return // browser bar or keyboard: height only, nothing to restore
      width = innerWidth
      const t = st()
      if (keep === null && t && t.progress > 0 && t.progress < 1) keep = t.progress
    }
    const after = () => {
      const t = st()
      if (t && keep !== null) { window.scrollTo(0, t.start + keep * (t.end - t.start)); t.update() }
      keep = null
    }
    window.addEventListener('resize', onResize)
    ScrollTrigger.addEventListener('refresh', after)
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => { window.removeEventListener('resize', onResize); ScrollTrigger.removeEventListener('refresh', after); ctx.revert() }
  }, [reduced, gl])

  useEffect(() => {
    if (reduced || !gl) return
    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      story.ptr.tx = (e.clientX / innerWidth - 0.5) * 2
      story.ptr.ty = -(e.clientY / innerHeight - 0.5) * 2
      story.render()
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, gl])

  useEffect(() => { story.finish = finish; story.render() }, [finish])

  const pickView = (i) => { setView(i); story.p = VIEWS[i].p; story.render() }

  const show3d = gl && !failed
  const live = !reduced && show3d

  // The story only takes its scroll length once it is live (after hydration). If the visitor has already
  // scrolled past the one-screen version by then, keep their place instead of pushing the page down.
  useLayoutEffect(() => {
    const el = hero.current
    // browsers with scroll anchoring (Chrome, Firefox) already hold the position; Safari does not
    if (!live || !el || CSS.supports('overflow-anchor', 'auto')) return
    const stageH = el.querySelector('.stage')?.offsetHeight || innerHeight
    if (el.getBoundingClientRect().top + stageH <= 0) window.scrollBy(0, el.offsetHeight - stageH)
  }, [live])
  const note = gl === false ? '3D preview is not available on this device. Showing an illustration.' : '3D preview could not load. Showing an illustration.'

  const headline = ['Details', 'that', 'define', 'an', 'entrance.']

  return (
    <section ref={hero} className={`hero${reduced || gl === false ? ' static' : gl && !failed ? ' live' : ''}`} aria-label="Introduction">
      <div className="stage">
        <div className="wall-poster" aria-hidden="true" />
        {/* Pre-rendered opening frame, one per screen shape: the door is on screen in the first paint and the
            live canvas fades in over it once ready (src/scene renders the identical frame). */}
        {gl !== false && !failed && (
          <picture className="hero-poster" aria-hidden="true">
            <source media="(max-aspect-ratio: 3/5)" srcSet="/img/hero/door-phone.webp" type="image/webp" />
            <source media="(max-aspect-ratio: 23/20)" srcSet="/img/hero/door-tablet.webp" type="image/webp" />
            <source media="(max-aspect-ratio: 29/20)" srcSet="/img/hero/door-square.webp" type="image/webp" />
            <source media="(max-aspect-ratio: 17/10)" srcSet="/img/hero/door-laptop.webp" type="image/webp" />
            <source srcSet="/img/hero/door-wide.webp" type="image/webp" />
            <img src="/img/hero/door-wide.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async" />
          </picture>
        )}
        {/* ClickSpark: brass sparks where the visitor clicks or taps the scene (the lever included) */}
        <ClickSpark className="canvas-wrap" style={{ position: 'absolute', inset: 0, width: 'auto', height: 'auto' }} sparkColor="#e6cd9c" sparkCount={9} sparkRadius={34} sparkSize={12} sparkWidth={1.6} duration={700} disabled={!show3d}>
          {show3d ? (
            <Boundary fallback={<Fallback note={note} />}>
              <Suspense fallback={null}><Scene /></Suspense>
            </Boundary>
          ) : gl === null ? null : <Fallback note={note} />}
        </ClickSpark>
        <div className="scrim" aria-hidden="true" />
        <div className="floor-fade" aria-hidden="true" />

        <div className="copy">
          <div className="chapter ch-a">
            <h2 className="rise hero-title">
              {headline.map((w, n) => (
                <span key={w}><span className="w"><span style={{ '--i': n }}>{w}</span></span>{n < headline.length - 1 ? ' ' : ''}</span>
              ))}
            </h2>
            <p className="lede enter">Locks, door closers and fittings. Lakkar Bazar, Ludhiana.</p>
            <div className="actions enter">
              <button className="btn btn-primary" data-enquire="">Enquire</button>
              <a className="link" href="#range">Browse the range<ArrowDown size={16} strokeWidth={1.5} aria-hidden="true" /></a>
            </div>
          </div>
          {!reduced && gl && (
            <>
              <div className="chapter ch-b"><h2>Softly drawn.</h2><p>A turned rose, a tapered lever and a brushed finish.</p></div>
              <div className="chapter ch-c"><h2>Press, and the latch draws back.</h2><p>Then the door gives way.</p></div>
              <div className="chapter ch-d"><h2>Step into the showroom.</h2><p>Eight kinds of door hardware, from locks to the smallest spare part.</p><a className="link" href="/range/">Explore the range</a></div>
            </>
          )}
        </div>

        {show3d && <p className="concept">Concept model. Finishes are illustrative.</p>}

        <div className="controls">
          {show3d ? (
            <>
              <div className="finishes" role="radiogroup" aria-labelledby="fin-l">
                <span id="fin-l">Finish</span>
                {Object.entries(FINISHES).map(([k, f]) => (
                  <label key={k} className="swatch">
                    <input type="radio" name="finish" value={k} checked={finish === k} onChange={() => setFinish(k)} />
                    <span className="chip" style={{ '--c': f.color }} aria-hidden="true" />
                    <span className="chip-label">{f.label}</span>
                  </label>
                ))}
              </div>
              <span className="sep" aria-hidden="true" />
              <button className="lever-btn" onClick={() => tap()}>Press the lever</button>
            </>
          ) : null}
        </div>

        {show3d && reduced && (
          <div className="views" role="group" aria-label="View">
            {VIEWS.map((v, i) => (
              <button key={v.label} className="btn btn-quiet" aria-pressed={view === i} onClick={() => pickView(i)}>{v.label}</button>
            ))}
            <p aria-live="polite">{VIEWS[view].text}</p>
          </div>
        )}

        {!reduced && gl && <div className="progress" aria-hidden="true" />}
      </div>
    </section>
  )
}
