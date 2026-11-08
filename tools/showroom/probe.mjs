// node probe.mjs fg|bg out t1,t2,... [w h] [portrait]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'))
const { chromium } = require('@playwright/test')
const [film, out, ts, w = 960, h = 540, portrait] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const page = await b.newPage({ viewport: { width: +w, height: +h } })
page.on('pageerror', (e) => console.log('pageerror', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)) })
await page.goto(`http://127.0.0.1:5180/?mode=${film}${portrait ? '&portrait=1' : ''}`)
await page.waitForFunction(() => document.documentElement.dataset.ready === '1')
await page.waitForTimeout(4000)
for (const t of ts.split(',').map(Number)) {
  await page.evaluate((v) => { window.__drawn = -1; window.__setT(v) }, t)
  await page.waitForFunction(() => window.__drawn >= 0, null, { timeout: 30000 })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${out}/${film}-${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 85 })
}
await b.close()
