import { site, SITE_URL } from '../data/site.js'

export const abs = (path) => SITE_URL + path

// HardwareStore is a LocalBusiness type. Only owner-independent facts: no phone, hours, ratings or prices.
export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HardwareStore',
    '@id': abs('/#store'),
    name: site.name,
    url: abs('/'),
    image: abs('/brand/birdi-social-1200x630.png'),
    logo: abs('/brand/birdi-logo-stacked.png'),
    address: { '@type': 'PostalAddress', ...site.postal },
    ...(site.phone ? { telephone: site.phone.tel } : {}),
    ...(site.whatsapp ? { sameAs: [`https://wa.me/${site.whatsapp}`] } : {}),
  }
}

export function breadcrumbJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  }
}
