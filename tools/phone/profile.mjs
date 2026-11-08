// CPU profile of the home page on the phone profile (4x slower CPU): top functions by self time.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start')
await page.goto((process.argv[2] || 'http://127.0.0.1:5175') + '/')
await page.waitForTimeout(6000)
const { profile } = await cdp.send('Profiler.stop')
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]))
const dt = profile.timeDeltas; const total = {}
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)) })
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)
for (const [k, us] of top) console.log((us / 1000).toFixed(0).padStart(6), 'ms', k)
const files = {}
profile.samples.forEach((id, i) => { const u = byId.get(id).callFrame.url.split('/').pop() || '(native)'; files[u] = (files[u] || 0) + (dt[i] || 0) })
console.log(Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, us]) => `${f} ${(us / 1000).toFixed(0)}ms`).join('\n'))
await b.close()
