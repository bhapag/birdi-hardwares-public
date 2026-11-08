import { searchRows } from '../../data/shop.js'

// Compact product index for the catalogue search box, fetched only when someone searches or filters.
export function GET() {
  return new Response(JSON.stringify(searchRows()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
