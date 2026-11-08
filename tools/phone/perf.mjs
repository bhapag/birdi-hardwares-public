// Page-load measurements on the production build: cold cache (fresh context) and warm cache (second visit in the
// same context). Phone = 390x844, DPR 3, 4x CPU slowdown and a "fast 4G" network profile through CDP; this is
// Chrome emulation on a desktop PC, not a real phone. Usage: node tools/phone/perf.mjs [baseURL] > out.json
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ['/', '/catalogue/', '/catalogue/cabinet-handles/', '/catalogue/knobs/fancy-1404/', '/catalogue/wardrobe-accessories/root-leather-drawer-with-password/']
const PROFILES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4, net: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 } },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, cpu: 1, net: null },
}
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const out = {}
const observe = () => {
  window.__m = { lcp: 0, cls: 0, long: [] }
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__m.lcp = e.startTime })).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__m.cls += e.value })).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.long.push(e.duration))).observe({ type: 'longtask', buffered: true })
}
async function visit(page) {
  const t0 = Date.now()
  await page.goto(BASE + page.__path, { waitUntil: 'load' })
  const load = Date.now() - t0
  await page.waitForTimeout(3000) // idle work (hydration, 3D chunk) lands in the long-task count
  return page.evaluate((load) => {
    const res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0]
    const bytes = res.reduce((s, r) => s + (r.transferSize || 0), nav.transferSize || 0)
    const long = window.__m.long
    return { loadMs: load, lcpMs: Math.round(window.__m.lcp), cls: +window.__m.cls.toFixed(3), requests: res.length + 1, kB: Math.round(bytes / 1024), longTasks: long.length, blockingMs: Math.round(long.reduce((s, d) => s + Math.max(0, d - 50), 0)), longestMs: Math.round(Math.max(0, ...long)), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }
  }, load)
}
for (const [name, prof] of Object.entries(PROFILES)) {
  for (const path of PAGES) {
    const ctx = await b.newContext({ viewport: prof.viewport, deviceScaleFactor: prof.deviceScaleFactor, isMobile: prof.isMobile, hasTouch: prof.hasTouch })
    await ctx.addInitScript(observe)
    const page = await ctx.newPage()
    page.__path = path
    const cdp = await ctx.newCDPSession(page)
    if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu })
    if (prof.net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...prof.net })
    const cold = await visit(page)
    const warm = await visit(page)
    out[`${name} ${path}`] = { cold, warm }
    console.error(name, path, JSON.stringify(cold), JSON.stringify(warm))
    await ctx.close()
  }
}
console.log(JSON.stringify(out, null, 1))
await b.close()
