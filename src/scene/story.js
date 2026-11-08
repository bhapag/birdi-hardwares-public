// Shared scene state. GSAP/ScrollTrigger write here; the R3F Rig reads it on each rendered frame.
// Kept free of three.js so the page shell paints before the 3D chunk loads.
import gsap from 'gsap'

export const story = {
  p: 0, // scroll progress through the hero, 0..1
  manual: 0, // direct lever press (pointer or button), 0..1
  finish: 'brass',
  reduced: false,
  ptr: { x: 0, y: 0, tx: 0, ty: 0 },
  render: () => {}, // replaced by the Scene with R3F invalidate()
  onFail: null,
}

export const FINISHES = {
  brass: { label: 'Champagne brass', color: '#d6bf98', rough: 0.3 },
  nickel: { label: 'Satin nickel', color: '#d8d6d2', rough: 0.3 },
  bronze: { label: 'Dark bronze', color: '#5f4c3c', rough: 0.34 },
}

export const LEVER_MAX = 0.62 // rad
export const DOOR_MAX = 1.1 // rad, about 63 degrees: wide enough to step into the showroom

export const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

// State is a pure function of scroll progress, so reversing the scroll restores every earlier state.
export const leverAt = (p) => smooth(0.4, 0.5, p) - smooth(0.85, 0.93, p)
export const doorAt = (p) => smooth(0.54, 0.8, p)

// Direct lever press (pointer on the handle, or the "Press the lever" button).
// overwrite: 'auto' replaces only an earlier press (same property). overwrite: true would also kill the
// scroll-scrubbed tween of `p` on this object, and scrolling would stop driving the scene after the first press.
export function press(down) {
  const d = story.reduced ? 0 : down ? 0.16 : 0.4
  gsap.to(story, { manual: down ? 1 : 0, duration: d, ease: down ? 'power2.out' : 'back.out(1.6)', overwrite: 'auto', onUpdate: () => story.render() })
  if (!d) story.render()
}
export function tap() {
  press(true)
  gsap.delayedCall(story.reduced ? 0.4 : 0.7, () => press(false))
}
