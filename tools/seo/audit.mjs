// SEO audit of the built site (dist/) or a live host: titles, descriptions, headings, canonicals, robots,
// images, internal links and orphans for every sitemap URL. Usage: node tools/seo/audit.mjs [https://birdihardwares.com]
import fs from 'node:fs'
import path from 'node:path'

const LIVE = process.argv[2]
const ROOT = 'https://birdihardwares.com'
const read = async (p) => {
  if (LIVE) { const r = await fetch(LIVE + p, { redirect: 'manual' }); return { status: r.status, html: await r.text(), xrobots: r.headers.get('x-robots-tag') } }
  const f = path.join('dist', p, p.endsWith('/') ? 'index.html' : '')
  return fs.existsSync(f) ? { status: 200, html: fs.readFileSync(f, 'utf8'), xrobots: null } : { status: 404, html: '' }
}
const xml = LIVE ? await (await fetch(LIVE + '/sitemap.xml')).text() : fs.readFileSync('dist/sitemap.xml', 'utf8')
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
const issues = [], titles = new Map(), descs = new Map(), inbound = new Map(urls.map((u) => [u, 0]))
const len = { title: [], desc: [] }
const get = (h, re) => (h.match(re) || [])[1]
for (const u of urls) {
  const { status, html, xrobots } = await read(u)
  if (status !== 200) { issues.push(`${u}: status ${status}`); continue }
  const title = get(html, /<title>([^<]*)<\/title>/), desc = get(html, /<meta name="description" content="([^"]*)"/)
  const canon = get(html, /<link rel="canonical" href="([^"]*)"/), robots = get(html, /<meta name="robots" content="([^"]*)"/)
  const h1 = (html.match(/<h1[\s>]/g) || []).length
  if (canon !== ROOT + u) issues.push(`${u}: canonical ${canon}`)
  if (!/^index, follow$/.test(robots || '')) issues.push(`${u}: robots ${robots}`)
  if (xrobots && /noindex/.test(xrobots)) issues.push(`${u}: X-Robots-Tag ${xrobots}`)
  if (h1 !== 1) issues.push(`${u}: ${h1} h1`)
  if (!title || title.length > 75) issues.push(`${u}: title length ${title?.length}: ${title}`)
  if (!desc || desc.length < 70 || desc.length > 170) issues.push(`${u}: description length ${desc?.length}`)
  len.title.push(title?.length || 0); len.desc.push(desc?.length || 0)
  if (titles.has(title)) issues.push(`${u}: duplicate title with ${titles.get(title)}`); titles.set(title, u)
  if (descs.has(desc)) issues.push(`${u}: duplicate description with ${descs.get(desc)}`); descs.set(desc, u)
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const t = m[0]
    if (!/\balt="/.test(t)) issues.push(`${u}: img without alt ${t.slice(0, 80)}`)
    if (!/\bwidth="/.test(t) || !/\bheight="/.test(t)) issues.push(`${u}: img without size ${t.slice(0, 80)}`)
  }
  for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)) if (inbound.has(m[1]) && m[1] !== u) inbound.set(m[1], inbound.get(m[1]) + 1)
}
const orphans = [...inbound].filter(([u, n]) => u !== '/' && n === 0).map(([u]) => u)
const stat = (a) => `${Math.min(...a)}-${Math.max(...a)}`
console.log(JSON.stringify({ urls: urls.length, titleLen: stat(len.title), descLen: stat(len.desc), orphans, issues: issues.slice(0, 60), issueCount: issues.length }, null, 1))
