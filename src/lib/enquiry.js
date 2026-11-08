// Enquiry validation and submission. Pure functions so they can be unit tested without a browser.

export const UNITS = ['pieces', 'sets', 'pairs', 'boxes']

export const emptyValues = () => ({ name: '', phone: '', email: '', category: '', business: '', quantity: '', unit: 'pieces', city: '', message: '' })

export function validate(v, { requireContact = true } = {}) {
  const e = {}
  if (!v.name.trim()) e.name = 'Enter your name.'

  const phone = v.phone.trim()
  const email = v.email.trim()
  if (requireContact && !phone && !email) e.contact = 'Add a phone number or an email address so we can reply.'
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    // International-friendly: digits plus the usual separators; 7 to 15 digits (E.164 allows up to 15).
    if (!/^[+()\-.\s\d]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      e.phone = 'Enter 7 to 15 digits.'
    }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Enter an email like name@example.com.'

  if (String(v.quantity).trim() !== '') {
    const n = Number(v.quantity)
    if (!Number.isInteger(n) || n < 1 || n > 100000) e.quantity = 'Whole number, 1 to 100000.'
  }
  return e
}

/**
 * Sends the enquiry to a destination. Returns ok only after the destination answered 2xx.
 * With no destination configured nothing is sent and the caller must say so.
 */
export async function submitEnquiry(values, { endpoint = null, fetchImpl = globalThis.fetch, signal } = {}) {
  if (!endpoint) return { ok: false, reason: 'no-destination' }
  try {
    const res = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values), signal })
    return res.ok ? { ok: true } : { ok: false, reason: 'server', status: res.status }
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'aborted' : 'network' }
  }
}
