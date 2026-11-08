// Matched screenshots of key pages on desktop and phone. Usage: node tools/brand/pages.mjs <base> <outdir>
import { chromium } from 'playwright'
const [BASE, OUT] = process.argv.slice(2)
const PAGES = [['home', '/'], ['catalogue', '/catalogue/'], ['search', '/catalogue/?q=rose%20gold'], ['category', '/catalogue/cabinet-handles/'], ['product', '/catalogue/knobs/fancy-1404/'], ['wardrobe-product', '/catalogue/wardrobe-accessories/root-leather-drawer-with-password/'], ['chimneys', '/catalogue/chimneys/'], ['contact', '/contact/']]
const b = await chromium.launch({ channel: 'chrome' })
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await b.newPage(opts)
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${dev}-${name}.png` })
  }
  await page.close()
}
await b.close()
