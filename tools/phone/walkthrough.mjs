// Unedited phone walkthrough video of the live site: door intro, catalogue, product, finish and size, WhatsApp
// (intercepted: the prepared link is captured, nothing is sent), then the quotation form prefilled.
// Chrome phone emulation (390x844, touch), real touch swipes through CDP. One continuous recording, no cuts.
// Usage: node tools/phone/walkthrough.mjs [baseURL] [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.argv[2] || 'https://birdihardwares.com'
const OUT = process.argv[3] || 'deliverables/redesign/walkthrough'
fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=-2400,0', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: OUT, size: { width: 390, height: 844 } } })
const wa = []
// WhatsApp never opens: the tab it would open is closed at once and its URL kept for the log
await ctx.route(/wa\.me|whatsapp\.com/, (r) => { wa.push(r.request().url()); return r.abort() })
const page = await ctx.newPage()
ctx.on('page', async (p) => { if (p !== page) { wa.push(p.url()); await p.close().catch(() => {}) } })
const cdp = await ctx.newCDPSession(page)
const swipe = async (dy, ms = 16) => {
  const y0 = dy > 0 ? 650 : 200
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: y0 }] })
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: y0 - (dy * i) / 12 }] }); await page.waitForTimeout(ms) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const log = []
const note = (s) => { log.push(`${new Date().toISOString()} ${s}`); console.log(s) }

note('open home')
await page.goto(BASE + '/', { waitUntil: 'load' })
await page.waitForTimeout(2500)
// down through the opening and the door story, slow swipes so each chapter is visible, then a little back up
const heroEnd = await page.evaluate(() => { const h = document.querySelector('.hero'); return h ? h.getBoundingClientRect().top + scrollY + h.offsetHeight : 4000 })
while ((await page.evaluate(() => scrollY)) < heroEnd - 900) { await swipe(260, 30); await page.waitForTimeout(700) }
note('door story reached its end; swiping back up a little')
for (let i = 0; i < 3; i++) { await swipe(-260, 30); await page.waitForTimeout(700) }
for (let i = 0; i < 3; i++) { await swipe(260, 30); await page.waitForTimeout(700) }

note('open the menu and go to the catalogue')
await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
await page.waitForTimeout(1500)
await page.locator('.menu summary').first().tap()
await page.waitForTimeout(900)
await page.locator('.menu').getByRole('link', { name: 'Catalogue', exact: true }).tap()
await page.waitForLoadState('load')
await page.waitForTimeout(1500)
note('search for 1404')
const q = page.getByRole('searchbox', { name: /Search by name, model code/ })
await q.tap()
await q.pressSequentially('1404', { delay: 180 })
await page.waitForTimeout(1500)
await page.locator('[data-results] a[href="/catalogue/knobs/fancy-1404/"]').scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
await page.locator('[data-results] a[href="/catalogue/knobs/fancy-1404/"]').tap()
await page.waitForLoadState('load')
await page.waitForTimeout(1500)
note('product page: look at the views, pick finish and size')
const thumbs = page.locator('.pdp-thumb')
if (await thumbs.count() > 1) { await thumbs.nth(1).tap(); await page.waitForTimeout(1000); await thumbs.nth(0).tap(); await page.waitForTimeout(800) }
await swipe(300, 30); await page.waitForTimeout(1000)
await page.getByRole('combobox', { name: 'Finish' }).selectOption('Antique')
await page.waitForTimeout(1200)
await page.getByRole('combobox', { name: 'Size' }).selectOption('Big')
await page.waitForTimeout(1500)
note('summary reads: ' + await page.locator('[data-summary]').textContent())
note('tap Ask on WhatsApp (intercepted)')
const href = await page.locator('[data-wa-link]').getAttribute('href')
await page.locator('[data-wa-link]').tap()
await page.waitForTimeout(1500)
note('prepared WhatsApp link: ' + href)
note('open the quotation form')
await page.locator('[data-form-link]').tap()
await page.waitForLoadState('load')
await page.waitForTimeout(2000)
await swipe(250, 30); await page.waitForTimeout(2000)
const video = page.video()
await ctx.close()
await b.close()
const src = await video.path()
fs.renameSync(src, `${OUT}/phone-walkthrough.webm`)
fs.writeFileSync(`${OUT}/walkthrough-log.txt`, [...log, `intercepted: ${JSON.stringify(wa)}`, ''].join('\n'))
console.log('saved', `${OUT}/phone-walkthrough.webm`)
