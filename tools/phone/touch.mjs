// Touch-scroll profile on the phone profile (390x844, DPR 3, 4x CPU): real synthesized touch flings through the door
// story and back (CDP Input.dispatchTouchEvent swipes, so the browser's own touch scrolling and fling run, not scrollTo;
// Input.synthesizeScrollGesture with a touch source does not scroll in this emulation).
// Records frame gaps, long tasks and story progress. Chrome emulation on this PC, not a real phone.
// Usage: node tools/phone/touch.mjs [baseURL] > out.json
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.addInitScript(() => {
  window.__long = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: true })
})
await page.goto(BASE + '/?debug', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const hero = await page.evaluate(() => { const h = document.querySelector('.hero'); return h ? { top: h.getBoundingClientRect().top + scrollY, h: h.offsetHeight } : null })
const out = { base: BASE, hero }
const swipe = async (dy) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: dy > 0 ? 650 : 200 }] })
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: (dy > 0 ? 650 : 200) - (dy * i) / 10 }] }); await page.waitForTimeout(16) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
// swipe (each a 400px finger move, released with momentum) until the target is passed, as a person would
async function fling(to, label) {
  await page.evaluate(() => {
    window.__gaps = []; let last = performance.now(); window.__run = true; window.__ps = []
    const t = (n) => { window.__gaps.push(n - last); last = n; window.__ps.push(window.__story?.p ?? null); if (window.__run) requestAnimationFrame(t) }
    requestAnimationFrame(t)
  })
  const y0 = await page.evaluate(() => scrollY)
  const down = to > y0
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => scrollY)
    if (down ? y >= to : y <= to) break
    await swipe(down ? 400 : -400)
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(1200)
  const r = await page.evaluate(() => {
    window.__run = false
    const g = window.__gaps.slice(1).sort((a, b) => a - b)
    // the largest jump in story progress between two frames: a skip would show as a big step
    const ps = window.__ps.filter((x) => x !== null); let jump = 0
    for (let i = 1; i < ps.length; i++) jump = Math.max(jump, Math.abs(ps[i] - ps[i - 1]))
    return { frames: g.length, p50: +g[Math.floor(g.length / 2)].toFixed(1), p95: +g[Math.floor(g.length * 0.95)].toFixed(1), worst: +g[g.length - 1].toFixed(1), over50: g.filter((x) => x > 50).length, maxStoryStep: +jump.toFixed(3), story: window.__story?.p ?? null, y: Math.round(scrollY) }
  })
  out[label] = { from: Math.round(y0), ...r }
}
const end = hero ? hero.top + hero.h : 4000
await fling(end, 'down')
await fling(0, 'up')
out.longTasks = await page.evaluate(() => window.__long)
console.log(JSON.stringify(out, null, 1))
await b.close()
