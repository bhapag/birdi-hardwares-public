import { execFileSync } from 'node:child_process'
import { CATEGORIES, NEEDS } from '../data/catalogue.js'
import { GUIDES } from '../data/guides.js'
import { SITE_URL } from '../data/site.js'
import { SHOP, PRODUCTS } from '../data/shop.js'

// lastmod = date of the last commit that changed the files a page is built from (its template and its content
// data), so it moves only when that page's content can have changed. No date is given if git history is missing.
const cache = new Map()
function lastmod(files) {
  const key = files.join('|')
  if (!cache.has(key)) {
    let d = ''
    try { d = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { encoding: 'utf8' }).trim() } catch {}
    cache.set(key, d)
  }
  return cache.get(key)
}
const P = (f) => `src/pages/${f}`
const CAT_DATA = ['src/data/products.json', 'src/data/shop.js']

// Every public, indexable content page with its source files. tests/site.spec.js checks this list against the
// built pages. The 404 page, search.json, filter URLs (?sub=) and variant choices are deliberately not listed.
export const ENTRIES = [
  ['/', [P('index.astro'), 'src/components/IntroHero.astro', 'src/components/ShopGrid.astro', 'src/data/shop.js']],
  ['/about/', [P('about.astro')]],
  ['/contact/', [P('contact.astro'), 'src/data/site.js']],
  ['/catalogue/', [P('catalogue/index.astro'), ...CAT_DATA]],
  ...SHOP.map((c) => [`/catalogue/${c.slug}/`, [P('catalogue/[cat]/index.astro'), 'src/components/ProductCard.astro', ...CAT_DATA]]),
  ...PRODUCTS.map((p) => [p.url, [P('catalogue/[cat]/[id].astro'), 'src/data/products.json']]),
  ['/range/', [P('range/index.astro'), 'src/data/catalogue.js']],
  ...CATEGORIES.map((c) => [`/range/${c.slug}/`, [P('range/[slug].astro'), 'src/data/catalogue.js']]),
  ...NEEDS.map((n) => [`/needs/${n.slug}/`, [P('needs/[slug].astro'), 'src/data/catalogue.js']]),
  ['/guides/', [P('guides/index.astro'), 'src/data/guides.js']],
  ...GUIDES.map((g) => [`/guides/${g.slug}/`, [P('guides/[slug].astro'), 'src/data/guides.js']]),
  ['/faq/', [P('faq.astro'), 'src/data/guides.js']],
  ['/enquiry/', [P('enquiry.astro')]],
  ['/privacy/', [P('privacy.astro')]],
  ['/terms/', [P('terms.astro')]],
]
export const PAGES = ENTRIES.map(([p]) => p)

export function GET() {
  const urls = ENTRIES.map(([p, files]) => {
    const d = lastmod(files)
    return `  <url><loc>${SITE_URL}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`
  })
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
