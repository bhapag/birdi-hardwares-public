// Raster exports of the vector identity in public/brand/ (run after build_logo.py). Chrome rasterises the SVGs,
// so the PNGs match what browsers draw. Then: python tools/brand/make_ico.py
import { chromium } from 'playwright'
import fs from 'node:fs'

const B = 'public/brand'
const read = (f) => fs.readFileSync(`${B}/${f}`, 'utf8')
const box = (f) => { const m = read(f).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); return [+m[1], +m[2]] }
const JOBS = [
  // [svg, out, width, background or null for transparent]
  ['birdi-logo-line.svg', 'birdi-logo-line.png', 1600, null],
  ['birdi-logo-line-on-dark.svg', 'birdi-logo-line-on-dark.png', 1600, null],
  ['birdi-logo-line-mono.svg', 'birdi-logo-line-mono.png', 1600, null],
  ['birdi-logo-stacked.svg', 'birdi-logo-stacked.png', 1200, null],
  ['birdi-logo-stacked-on-dark.svg', 'birdi-logo-stacked-on-dark.png', 1200, null],
  ['birdi-symbol.svg', 'birdi-symbol-512.png', 512, null],
  ['birdi-symbol-on-dark.svg', 'birdi-symbol-on-dark-512.png', 512, null],
  ...[16, 32, 48, 96, 192, 512].map((s) => ['favicon.svg', `favicon-${s}.png`, s, null]),
]
const b = await chromium.launch({ channel: 'chrome' })
const page = await b.newPage({ deviceScaleFactor: 1 })
async function shot(html, w, h, out, transparent) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`)
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
}
for (const [svg, out, w, bg] of JOBS) {
  const [vw, vh] = box(svg)
  const h = Math.round((w * vh) / vw)
  await shot(`<div style="width:${w}px;height:${h}px;background:${bg || 'transparent'}">${read(svg).replace(/<svg /, `<svg style="width:${w}px;height:${h}px;display:block" `)}</div>`, w, h, `${B}/${out}`, !bg)
}
// Apple touch icon: full-bleed square (iOS rounds the corners itself), mark on espresso
const mark = read('birdi-favicon-mark.svg').replace(/fill="#2A1A10"/, 'fill="#EEE7DA"')
await shot(`<div style="width:180px;height:180px;background:#2A1A10;display:grid;place-items:center">${mark.replace(/<svg /, '<svg style="width:150px;height:150px;display:block" ')}</div>`, 180, 180, 'public/apple-touch-icon.png', false)
// Social preview 1200x630: stacked logo on ivory
const st = read('birdi-logo-stacked.svg')
await shot(`<div style="width:1200px;height:630px;background:#EEE7DA;display:grid;place-items:center">${st.replace(/<svg /, '<svg style="width:760px;height:auto;display:block" ')}</div>`, 1200, 630, `${B}/birdi-social-1200x630.png`, false)
await b.close()
console.log('exported', JOBS.length + 2)
