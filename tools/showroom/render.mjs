// Usage:
//   node render.mjs still <outDir> [shots]
//   node render.mjs film <fg|bg> <outDir> <fps> <width> <height> [portrait] [from] [to]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'))
const { chromium } = require('@playwright/test')
const BASE = 'http://127.0.0.1:5180/'
const [kind, ...a] = process.argv.slice(2)
// headed (off screen) so the real GPU renders: headless falls back to software GL and the lite material tier
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] })
async function ready(page) { await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 60000 }) }
async function drawAt(page, t) {
  const tok = await page.evaluate((v) => { window.__drawn = -1; window.__setT(v); return true }, t)
  await page.waitForFunction(() => window.__drawn >= 0, null, { timeout: 30000 })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}
if (kind === 'still') {
  const [out, list] = a
  fs.mkdirSync(out, { recursive: true })
  const shots = (list || 'hinges,handles,bolts,spares,main-door,interior,renovation,trade').split(',')
  for (const shot of shots) {
    const page = await b.newPage({ viewport: { width: 600, height: 750 }, deviceScaleFactor: 2 })
    page.on('pageerror', (e) => console.log('pageerror', e.message))
    await page.goto(`${BASE}?mode=still&shot=${shot}`)
    await ready(page)
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `${out}/${shot}.png` })
    console.log('still', shot)
    await page.close()
  }
} else {
  const [film, out, fps, w, h, portrait, from, to] = a
  fs.mkdirSync(out, { recursive: true })
  const dur = film === 'fg' ? 26.5 : 10
  const page = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  await page.goto(`${BASE}?mode=${film}${portrait === '1' ? '&portrait=1' : ''}`)
  await ready(page)
  await page.waitForTimeout(4000)
  const n = Math.round(dur * +fps)
  const f0 = from ? +from : 0, f1 = to ? +to : n
  const t0 = Date.now()
  for (let i = f0; i < f1; i++) {
    await drawAt(page, i / +fps)
    await page.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 })
    if (i % 30 === 0) console.log(film, 'frame', i, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's')
  }
}
await b.close()
