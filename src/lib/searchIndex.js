import { CATEGORIES, NEEDS } from '../data/catalogue.js'
import { GUIDES } from '../data/guides.js'
import { waHref } from './contact.js'

const ask = (cat, type) => `/enquiry/?category=${encodeURIComponent(cat)}${type ? `&type=${encodeURIComponent(type)}` : ''}`

// Every searchable entry is something published on the site: a category, an item type listed on it,
// a buyer page or a guide. Nothing here implies stock.
export function searchEntries() {
  const out = []
  for (const c of CATEGORIES) {
    out.push({ kind: 'Category', title: c.title, text: c.short, href: `/range/${c.slug}/`, group: c.group, apps: c.apps, enquire: waHref(c.title) ?? ask(c.title) })
    for (const t of c.types) out.push({ kind: 'Type', title: t.name, text: t.text, href: `/range/${c.slug}/#${slug(t.name)}`, parent: c.title, group: c.group, apps: t.apps, enquire: waHref(`${t.name} (${c.title})`) ?? ask(c.title, t.name) })
  }
  for (const n of NEEDS) out.push({ kind: 'Buyer guide', title: n.title, text: n.short, href: `/needs/${n.slug}/`, apps: [], group: '' })
  for (const g of GUIDES) out.push({ kind: 'Buying guide', title: g.title, text: g.description, href: `/guides/${g.slug}/`, apps: [], group: '' })
  return out
}
export const GROUPS = [...new Set(CATEGORIES.map((c) => c.group))]
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export { ask }
