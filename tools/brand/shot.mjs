// One screenshot plus a horizontal-overflow check. Usage: node tools/brand/shot.mjs <url> <out.png> <w> <h> [scrollY or selector]
import { chromium } from 'playwright'
const [url, out, w, h, y = '0'] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +w < 600 ? 2 : 1, isMobile: +w < 600, hasTouch: +w < 600 })
await p.goto(url, { waitUntil: 'networkidle' })
if (y.startsWith('#') || y.startsWith('.') || y.includes('[')) { await p.locator(y).first().evaluate((e) => e.scrollIntoView()); } else await p.evaluate((v) => scrollTo(0, v), +y)
await p.waitForTimeout(900)
await p.screenshot({ path: out })
console.log('overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth))
await b.close()
