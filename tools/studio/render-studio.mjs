// Usage: node render-studio.mjs <baseUrl> <outDir> [items]
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')
const [base, out, only] = process.argv.slice(2)
const map = { lock: 'door-locks', digital: 'digital-locks', closer: 'door-closers', hinge: 'door-fittings' }
const b = await chromium.launch({ channel: 'chrome' })
for (const [item, slug] of Object.entries(map)) {
  if (only && !only.split(',').includes(item)) continue
  const page = await b.newPage({ viewport: { width: 600, height: 750 }, deviceScaleFactor: 2 })
  const logs = []
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message.slice(0, 200)))
  await page.goto(`${base}/studio/?item=${item}`)
  try { await page.waitForFunction(() => document.documentElement.dataset.studio === 'ready', null, { timeout: 40000 }) } catch { logs.push('never ready') }
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${out}/${slug}.jpg`, type: 'jpeg', quality: 90 })
  console.log('rendered', slug, logs.join(' | '))
  await page.close()
}
await b.close()
