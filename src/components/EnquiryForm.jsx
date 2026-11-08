import { useEffect, useRef, useState } from 'react'
import { UNITS, validate, submitEnquiry } from '../lib/enquiry.js'
import { waHref, telHref, enquiryDetails } from '../lib/contact.js'
import { site } from '../data/site.js'

// Full quotation request. Until the shop approves a destination, nothing is sent and the form says so.
const APPLICATIONS = ['Main door', 'Interior door', 'Bathroom door', 'Double door', 'Gate or cupboard', 'Several doors (project)', 'Not sure']
const FINISHES = ['No preference', 'Brass', 'Satin nickel or steel', 'Dark bronze or black', 'Chrome', 'Match a sample I will bring']
const CONTACT = ['Phone call', 'Email', 'I will visit the shop']
const empty = () => ({ name: '', phone: '', email: '', category: '', type: '', quantity: '', unit: 'pieces', application: '', thickness: '', backset: '', width: '', finish: 'No preference', contactBy: 'Phone call', business: '', city: '', message: '' })

function Field({ id, label, mark, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{mark && <span className="opt">({mark})</span>}</label>
      {children}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      <div className="slot">{error && <p className="err" id={`${id}-err`}>{error}</p>}</div>
    </div>
  )
}

export default function EnquiryForm({ categories, endpoint = null }) {
  const handoff = !endpoint && !!site.whatsapp // WhatsApp is the working route until a server destination exists
  const [waLink, setWaLink] = useState('')
  const [v, setV] = useState(empty)
  const [errors, setErrors] = useState({})
  const [phase, setPhase] = useState('idle')
  const [summary, setSummary] = useState('')
  const sending = useRef(false)
  const formRef = useRef(null)
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const cat = p.get('category')
    setV((x) => ({ ...x, category: categories.includes(cat) ? cat : x.category, type: p.get('type') || x.type }))
  }, [categories])
  const set = (k) => (e) => { const next = { ...v, [k]: e.target.value }; setV(next); if (Object.keys(errors).length) setErrors(validate(next, { requireContact: !handoff })) }
  const inv = (k) => (errors[k] ? 'true' : undefined)
  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending.current) return
    const found = validate(v, { requireContact: !handoff })
    setErrors(found)
    const n = Object.keys(found).length
    if (n) {
      setSummary(`${n} ${n === 1 ? 'field needs' : 'fields need'} attention.`)
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setSummary('')
    if (handoff) {
      const item = v.type ? `${v.type}${v.category ? ` (${v.category})` : ''}` : v.category || null
      const href = waHref(item, enquiryDetails({ ...v, type: '' }))
      setWaLink(href)
      window.open(href, '_blank', 'noopener')
      setPhase('handoff')
      return
    }
    sending.current = true
    setPhase('sending')
    const details = [v.type && `Item: ${v.type}`, v.application && `Door: ${v.application}`, v.thickness && `Thickness ${v.thickness} mm`, v.backset && `Backset ${v.backset} mm`, v.width && `Width ${v.width} mm`, `Finish: ${v.finish}`, `Contact by: ${v.contactBy}`].filter(Boolean).join('. ')
    const r = await submitEnquiry({ ...v, message: `${details}. ${v.message}`.trim() }, { endpoint })
    sending.current = false
    setPhase(r.ok ? 'sent' : r.reason === 'no-destination' ? 'demo' : 'failed')
  }
  if (phase === 'sent') return <div className="form-done" role="status"><h2>Enquiry received</h2><p>The shop will reply using the contact details you gave.</p></div>
  const contactErr = errors.phone || errors.contact
  return (
    <form ref={formRef} className="quote-form" onSubmit={onSubmit} noValidate aria-busy={phase === 'sending'}>
      {handoff
        ? <p className="enq-status" role="note">Your enquiry opens in WhatsApp, addressed to the shop, for you to check and send. Prefer to talk? <a href={telHref}>Call {site.phone.display}</a></p>
        : !endpoint && <p className="enq-status" role="note">Demonstration form. Nothing is sent until the shop’s contact details are approved.</p>}
      {summary && <p className="enq-status problem" role="alert">{summary}</p>}
      <fieldset>
        <legend>What you need</legend>
        <div className="row">
          <Field id="q-cat" label="Category" mark="optional">
            <select id="q-cat" value={v.category} onChange={set('category')}><option value="">Not sure yet</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field id="q-type" label="Item or type" mark="optional">
            <input id="q-type" value={v.type} onChange={set('type')} placeholder="For example: euro cylinder…" autoComplete="off" />
          </Field>
        </div>
        <div className="row trio">
          <Field id="q-qty" label="Quantity" mark="optional" error={errors.quantity}>
            <input id="q-qty" inputMode="numeric" value={v.quantity} onChange={set('quantity')} aria-invalid={inv('quantity')} aria-describedby={errors.quantity ? 'q-qty-err' : undefined} autoComplete="off" />
          </Field>
          <Field id="q-unit" label="Unit">
            <select id="q-unit" value={v.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field id="q-app" label="Door or use" mark="optional">
            <select id="q-app" value={v.application} onChange={set('application')}><option value="">Choose</option>{APPLICATIONS.map((a) => <option key={a}>{a}</option>)}</select>
          </Field>
        </div>
        <div className="row trio">
          <Field id="q-thk" label="Door thickness, mm" mark="optional"><input id="q-thk" inputMode="numeric" value={v.thickness} onChange={set('thickness')} autoComplete="off" /></Field>
          <Field id="q-bks" label="Backset, mm" mark="optional"><input id="q-bks" inputMode="numeric" value={v.backset} onChange={set('backset')} autoComplete="off" /></Field>
          <Field id="q-wid" label="Door width, mm" mark="optional"><input id="q-wid" inputMode="numeric" value={v.width} onChange={set('width')} autoComplete="off" /></Field>
        </div>
        <Field id="q-fin" label="Preferred finish" mark="optional">
          <select id="q-fin" value={v.finish} onChange={set('finish')}>{FINISHES.map((f) => <option key={f}>{f}</option>)}</select>
        </Field>
        <Field id="q-msg" label="Anything else" mark="optional" hint="Photos of the existing fitting help: attach them in WhatsApp after the message opens, or show them at the shop.">
          <textarea id="q-msg" rows="3" value={v.message} onChange={set('message')} aria-describedby="q-msg-hint" />
        </Field>
      </fieldset>
      <fieldset>
        <legend>How to reach you</legend>
        <Field id="q-name" label="Name" mark="required" error={errors.name}>
          <input id="q-name" value={v.name} onChange={set('name')} autoComplete="name" aria-invalid={inv('name')} aria-describedby={errors.name ? 'q-name-err' : undefined} />
        </Field>
        <div className="row">
          <Field id="q-phone" label="Phone" error={contactErr}>
            <input id="q-phone" type="tel" inputMode="tel" spellCheck="false" value={v.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={contactErr ? 'true' : undefined} aria-describedby={contactErr ? 'q-phone-err' : 'q-contact-hint'} />
          </Field>
          <Field id="q-email" label="Email" error={errors.email}>
            <input id="q-email" type="email" spellCheck="false" value={v.email} onChange={set('email')} autoComplete="email" aria-invalid={errors.email || errors.contact ? 'true' : undefined} aria-describedby={errors.email ? 'q-email-err' : 'q-contact-hint'} />
          </Field>
        </div>
        <p className="hint" id="q-contact-hint">{handoff ? 'Optional: WhatsApp already shows the shop your number.' : 'Give a phone number or an email address, at least one.'}</p>
        <div className="row">
          <Field id="q-by" label="Preferred contact">
            <select id="q-by" value={v.contactBy} onChange={set('contactBy')}>{CONTACT.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field id="q-biz" label="Business or project" mark="optional"><input id="q-biz" value={v.business} onChange={set('business')} autoComplete="organization" /></Field>
        </div>
      </fieldset>
      <div className="form-actions">
        {phase === 'handoff' && <p className="enq-status" role="status">WhatsApp opened in a new tab with your enquiry. Nothing is sent until you press send there. <a href={waLink} target="_blank" rel="noopener">Open WhatsApp again</a></p>}
        {phase === 'demo' && <p className="enq-status" role="status">Demo only: nothing was sent. Your details are still in this form and nowhere else.</p>}
        {phase === 'failed' && <p className="enq-status problem" role="alert">The enquiry could not be sent. Check your connection and try again.</p>}
        <button className="btn btn-primary" type="submit" disabled={phase === 'sending'}>{phase === 'sending' ? 'Sending…' : endpoint ? 'Send enquiry' : handoff ? 'Continue on WhatsApp' : 'Preview enquiry'}</button>
      </div>
    </form>
  )
}
