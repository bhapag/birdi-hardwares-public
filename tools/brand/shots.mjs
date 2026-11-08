// Header/footer/home screenshots for before-and-after. Usage: node tools/brand/shots.mjs <baseURL> <prefix>
import { chromium } from 'playwright'
const [BASE, PRE] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'chrome' })
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone-390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['phone-320', { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await b.newPage(opts)
  await page.goto(BASE + '/catalogue/?3d=off', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${PRE}-${dev}-catalogue.png` })
  await page.goto(BASE + '/?3d=off', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${PRE}-${dev}-home.png` })
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.locator('.foot-visit').screenshot({ path: `${PRE}-${dev}-footer.png` })
  await page.close()
}
await b.close()
