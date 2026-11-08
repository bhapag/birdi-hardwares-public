// Walkthrough screenshots (desktop and phone) of the main browsing path. Usage: node tools/phone/walk.mjs [baseURL]
import { chromium } from 'playwright'
const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const STEPS = [['home', '/'], ['catalogue', '/catalogue/'], ['search', '/catalogue/?q=rose%20gold'], ['category', '/catalogue/cabinet-handles/'], ['product', '/catalogue/knobs/fancy-1404/'], ['wardrobe', '/catalogue/wardrobe-accessories/root-leather-drawer-with-password/'], ['chimneys', '/catalogue/chimneys/']]
const b = await chromium.launch({ channel: 'chrome' })
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await b.newPage(opts)
  for (const [name, path] of STEPS) {
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '3d=off', { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await page.screenshot({ path: `deliverables/walkthrough/${dev}-${name}.png` })
  }
  await page.close()
}
await b.close()
