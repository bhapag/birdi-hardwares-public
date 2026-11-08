import { SITE_URL, INDEXABLE } from '../data/site.js'

// Production: open, with the sitemap. Any non-production build: everything disallowed (pages also carry noindex).
export function GET() {
  const body = INDEXABLE ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
