import test from 'node:test'
import assert from 'node:assert/strict'
import { waHref, waMessage, telHref, enquiryDetails } from '../src/lib/contact.js'

test('generic and product messages match the agreed wording', () => {
  assert.equal(waMessage(), 'Hi Birdi Hardwares, I’m interested in your hardware products. Please share availability and a quotation.')
  assert.equal(waMessage('Door closers'), 'Hi Birdi Hardwares, I’m interested in Door closers. Please share availability and a quotation.')
})

test('WhatsApp link targets the confirmed number and encodes the message', () => {
  const href = waHref('Butt hinges (Hinges)')
  assert.match(href, /^https:\/\/wa\.me\/916284505353\?text=/)
  const text = decodeURIComponent(href.split('?text=')[1])
  assert.equal(text, waMessage('Butt hinges (Hinges)'))
  assert.ok(!/[\s&]/.test(href.split('?text=')[1]), 'no raw spaces or ampersands in the message')
  assert.match(href, /%E2%80%99/) // the curly apostrophe is percent-encoded
})

test('call link uses the dialable form', () => {
  assert.equal(telHref, 'tel:+916284505353')
})

test('enquiry details skip empty fields and keep sizes readable', () => {
  const d = enquiryDetails({ type: 'Euro cylinder', quantity: '2', unit: 'pieces', thickness: '40', finish: 'No preference', name: 'Asha', phone: '', email: '' })
  assert.equal(d, 'Item: Euro cylinder\nQuantity: 2 pieces\nDoor thickness: 40 mm\nName: Asha')
})
