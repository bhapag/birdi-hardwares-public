// Validation and submission rules, tested without a browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate, submitEnquiry, emptyValues } from '../src/lib/enquiry.js'

const ok = (over = {}) => ({ ...emptyValues(), name: 'A', email: 'a@b.co', ...over })

test('name and one contact method are required, everything else is optional', () => {
  assert.deepEqual(Object.keys(validate(emptyValues())).sort(), ['contact', 'name'])
  assert.deepEqual(validate(ok()), {})
  assert.deepEqual(validate({ ...ok(), email: '', phone: '98765 43210' }), {})
})

test('phone accepts international formats, rejects letters and wrong lengths', () => {
  for (const good of ['+91 98765 43210', '+44 (0)20 7946 0958', '020-7946-0958', '9876543210', '+1.202.555.0143']) assert.equal(validate(ok({ phone: good })).phone, undefined, good)
  for (const bad of ['abc', '12345', '1234567890123456', '98765 4321x', '++']) assert.ok(validate(ok({ phone: bad })).phone, bad)
})

test('email needs an at sign and a dotted domain', () => {
  assert.equal(validate(ok({ email: 'buyer@example.in' })).email, undefined)
  for (const bad of ['x', 'x@y', 'x @y.co', '@y.co']) assert.ok(validate(ok({ email: bad })).email, bad)
})

test('quantity is a whole number from 1 to 100000 when present', () => {
  for (const good of ['', '1', '24', '100000']) assert.equal(validate(ok({ quantity: good })).quantity, undefined, good)
  for (const bad of ['0', '-3', '2.5', 'two', '100001']) assert.ok(validate(ok({ quantity: bad })).quantity, bad)
})

test('with no destination nothing is sent and the result says so', async () => {
  let called = false
  const r = await submitEnquiry(ok(), { endpoint: null, fetchImpl: async () => { called = true; return { ok: true } } })
  assert.deepEqual(r, { ok: false, reason: 'no-destination' })
  assert.equal(called, false)
})

test('success is reported only for a 2xx answer', async () => {
  assert.deepEqual(await submitEnquiry(ok(), { endpoint: '/x', fetchImpl: async () => ({ ok: true, status: 200 }) }), { ok: true })
  assert.deepEqual(await submitEnquiry(ok(), { endpoint: '/x', fetchImpl: async () => ({ ok: false, status: 500 }) }), { ok: false, reason: 'server', status: 500 })
  assert.deepEqual(await submitEnquiry(ok(), { endpoint: '/x', fetchImpl: async () => { throw new TypeError('fetch failed') } }), { ok: false, reason: 'network' })
})

test('the whole form is sent as JSON', async () => {
  let sent
  await submitEnquiry(ok({ business: 'Shop', quantity: '4', unit: 'sets' }), { endpoint: '/x', fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return { ok: true } } })
  assert.equal(sent.business, 'Shop')
  assert.equal(sent.unit, 'sets')
})
