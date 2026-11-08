// Contact links built from the owner-confirmed number in src/data/site.js.
// WhatsApp links only prefill a message: the visitor reviews it and presses send in WhatsApp themselves.
import { site } from '../data/site.js'

export const telHref = site.phone ? `tel:${site.phone.tel}` : null

export function waMessage(item) {
  const what = item ? item : 'your hardware products'
  return `Hi Birdi Hardwares, I’m interested in ${what}. Please share availability and a quotation.`
}

export function waHref(item, extra = '') {
  if (!site.whatsapp) return null
  const text = waMessage(item) + (extra ? `\n\n${extra}` : '')
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`
}

// Lines appended to the WhatsApp message from an enquiry form, skipping empty fields.
export function enquiryDetails(v) {
  return [
    v.type && `Item: ${v.type}`,
    v.quantity && `Quantity: ${v.quantity} ${v.unit || ''}`.trim(),
    v.application && `Door: ${v.application}`,
    v.thickness && `Door thickness: ${v.thickness} mm`,
    v.backset && `Backset: ${v.backset} mm`,
    v.width && `Door width: ${v.width} mm`,
    v.finish && v.finish !== 'No preference' && `Finish: ${v.finish}`,
    v.city && `City: ${v.city}`,
    v.business && `Business: ${v.business}`,
    v.message && `Notes: ${v.message}`,
    v.name && `Name: ${v.name}`,
    v.phone && `Phone: ${v.phone}`,
    v.email && `Email: ${v.email}`,
  ].filter(Boolean).join('\n')
}
