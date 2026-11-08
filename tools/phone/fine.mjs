// Fine frame sampling of one stretch of the story (default 0.56..0.76 at 390x844), for checking jumps.
import { chromium } from 'playwright'
import fs from 'node:fs'
const [a = 0.56, z = 0.76, step = 0.02, w = 390, h = 844] = process.argv.slice(2).map(Number)
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: w < 1000 })
await page.goto('http://127.0.0.1:5175/?debug')
await page.waitForFunction(() => document.querySelector('.hero')?.classList.contains('live'))
await page.waitForTimeout(800)
const top = await page.evaluate(() => Math.ceil(document.querySelector('.hero').getBoundingClientRect().top + scrollY))
await page.evaluate((y) => scrollTo(0, y), top)
await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 30000 })
const dir = `media-src/phone/fine-${w}x${h}`
fs.mkdirSync(dir, { recursive: true })
for (let p = a; p <= z + 1e-9; p += step) {
  await page.evaluate((p) => { window.__story.p = p; window.__story.render() }, p)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${dir}/p${Math.round(p * 1000)}.png` })
}
await b.close()
