// Phone probe for the 3D door story: frames along the scroll, scroll mapping, resize (browser bar) and rotation.
// Chrome emulation on this PC, not a real phone. Headed off screen so the GPU renders (headless = software GL).
// Usage: node tools/phone/probe.mjs [baseURL]   -> media-src/phone/<label>/*.png and probe.json
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const OUT = 'media-src/phone'
const SIZES = [
  ['320x568', 320, 568, 2], ['360x640', 360, 640, 3], ['390x844', 390, 844, 3], ['412x915', 412, 915, 2.6],
  ['844x390-landscape', 844, 390, 3], ['768x1024-tablet', 768, 1024, 2], ['1440x900-desktop', 1440, 900, 1],
]
const STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const report = {}
for (const [label, w, h, dpr] of SIZES) {
  const mobile = w < 1000
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__long = []
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
  })
  await page.goto(`${BASE}/?debug`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.hero')?.classList.contains('live'), null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  const top = await page.evaluate(() => Math.ceil(document.querySelector('.hero').getBoundingClientRect().top + scrollY))
  await page.evaluate((y) => scrollTo(0, y), top)
  const ready = await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 30000 }).then(() => true, () => false)
  const info = await page.evaluate(() => ({ quality: document.documentElement.dataset.quality, heroH: document.querySelector('.hero').offsetHeight, stageH: document.querySelector('.stage').offsetHeight, canvas: (() => { const c = document.querySelector('.hero canvas'); return c && [c.width, c.height] })() }))
  const dir = `${OUT}/${label}`
  fs.mkdirSync(dir, { recursive: true })
  const span = info.heroH - info.stageH
  const frames = []
  for (const s of STEPS) {
    await page.evaluate((y) => scrollTo(0, y), top + Math.round(span * s))
    await page.waitForTimeout(450)
    const p = await page.evaluate(() => window.__story?.p)
    frames.push({ s, p: p && +p.toFixed(3) })
    await page.screenshot({ path: `${dir}/s${String(Math.round(s * 100)).padStart(3, '0')}.png` })
  }
  // continuous scroll down and back up: frame gaps measured with rAF in the page
  await page.evaluate((y) => scrollTo(0, y), top)
  await page.waitForTimeout(300)
  const motion = await page.evaluate(async ([top, span]) => {
    const gaps = []; let last = performance.now(), run = true
    const tick = (t) => { gaps.push(t - last); last = t; if (run) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const go = (from, to, ms) => new Promise((res) => { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); scrollTo(0, from + (to - from) * k); k < 1 ? requestAnimationFrame(f) : res() }; f() })
    window.__long = []
    await go(top, top + span, 1800); await go(top + span, top, 900) // normal down, fast reverse
    run = false
    gaps.sort((a, b) => a - b)
    return { frames: gaps.length, p50: +gaps[Math.floor(gaps.length / 2)].toFixed(1), p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1), worst: +gaps[gaps.length - 1].toFixed(1), longTasks: window.__long.slice() }
  }, [top, span])
  // browser bar: the visible height changes by 56px mid-story; progress and framing must hold
  let bar = null
  if (mobile) {
    await page.evaluate((y) => scrollTo(0, y), top + Math.round(span * 0.6))
    await page.waitForTimeout(500)
    const before = await page.evaluate(() => [window.__story.p, scrollY])
    await page.setViewportSize({ width: w, height: h - 56 })
    await page.waitForTimeout(700)
    const after = await page.evaluate(() => [window.__story.p, scrollY])
    await page.screenshot({ path: `${dir}/bar-shrunk.png` })
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(700)
    const back = await page.evaluate(() => [window.__story.p, scrollY])
    bar = { before, after, back }
    // rotation: swap the sides at the same scroll position
    await page.setViewportSize({ width: h, height: w })
    await page.waitForTimeout(900)
    const rot = await page.evaluate(() => [window.__story.p, scrollY, document.querySelector('.hero').getBoundingClientRect().top])
    await page.screenshot({ path: `${dir}/rotated.png` })
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(900)
    const unrot = await page.evaluate(() => [window.__story.p, scrollY, document.querySelector('.hero').getBoundingClientRect().top])
    await page.screenshot({ path: `${dir}/unrotated.png` })
    bar.rotation = { rot, unrot }
  }
  const mem = await page.evaluate(() => performance.memory && Math.round(performance.memory.usedJSHeapSize / 1e6))
  report[label] = { ready, ...info, frames, motion, bar, heapMB: mem }
  console.log(label, JSON.stringify(report[label]))
  await ctx.close()
}
fs.writeFileSync(`${OUT}/probe.json`, JSON.stringify(report, null, 1))
await b.close()
