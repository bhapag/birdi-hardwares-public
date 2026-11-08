// Render SVG files to PNG with Chrome (exact browser rasterisation). Usage: node tools/brand/render.mjs in.svg out.png width [height] [background]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
const [inp, out, w, h = w, bg = 'transparent'] = process.argv.slice(2)
const svg = fs.readFileSync(inp, 'utf8')
const b = await chromium.launch({ channel: 'chrome' })
const page = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="width:${w}px;height:${h}px">${svg.replace(/<svg /, `<svg style="width:${w}px;height:${h}px;display:block" `)}</div></body></html>`)
await page.screenshot({ path: out, omitBackground: bg === 'transparent', clip: { x: 0, y: 0, width: +w, height: +h } })
await b.close()
console.log(path.basename(out), w, h)
