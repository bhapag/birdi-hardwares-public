// Screenshots of the buying-guidance sections (desktop and phone). Usage: node tools/seo/shots.mjs <base> <outdir>
import { chromium } from 'playwright'
const [BASE, OUT] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'chrome' })
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await b.newPage(opts)
  for (const slug of ['cabinet-handles', 'wardrobe-accessories']) {
    await page.goto(`${BASE}/catalogue/${slug}/`, { waitUntil: 'networkidle' })
    await page.locator('#choosing').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.locator('#choosing').screenshot({ path: `${OUT}/${dev}-${slug}-choosing.png` })
  }
  await page.goto(`${BASE}/catalogue/cabinet-handles/fancy-11010/`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${OUT}/${dev}-product-fancy-11010.png`, fullPage: dev === 'phone' })
  await page.close()
}
await b.close()
