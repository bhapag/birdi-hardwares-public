import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { UNITS, emptyValues, validate, submitEnquiry } from '../lib/enquiry.js'
import { waHref, telHref, enquiryDetails } from '../lib/contact.js'
import { site } from '../data/site.js'

// Destination for enquiries. null until the shop's delivery route is approved: nothing is sent and the dialog says so.
// On localhost only, ?enquiryEndpoint=... lets tests exercise the real send, loading and failure paths.
function destination(configured) {
  if (configured) return configured
  if (typeof location === 'undefined') return null
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return new URLSearchParams(location.search).get('enquiryEndpoint')
  return null
}

const Opt = () => <span className="opt">(optional)</span>
const Req = () => <span className="req">(required)</span>

function Field({ id, label, mark, hint, error, reserve, children }) {
  const err = error && <p className="err" id={`${id}-err`}>{error}</p>
  return (
    <div className="field">
      <label htmlFor={id}>{label}{mark}</label>
      {children}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {reserve ? <div className="slot">{err}</div> : err}
    </div>
  )
}

export default function EnquiryDialog({ categories = [], endpoint = null }) {
  const [waLink, setWaLink] = useState('')
  const dlg = useRef(null)
  const sending = useRef(false)
  const [v, setV] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [phase, setPhase] = useState('idle') // idle | sending | demo | failed | sent
  const [summary, setSummary] = useState('')
  const [dest, setDest] = useState(endpoint) // resolved after mount so server and first client render match
  useEffect(() => { setDest(destination(endpoint)) }, [endpoint])

  const openWith = (category) => {
    if (category) setV((p) => ({ ...p, category }))
    setPhase((p) => (p === 'sent' ? 'idle' : p))
    if (!dlg.current.open) dlg.current.showModal()
    requestAnimationFrame(() => { // never steal focus from a field the visitor has already started using
      const d = dlg.current
      if (!d) return
      const a = document.activeElement
      if (d.contains(a) && a.matches('input, select, textarea')) return
      // On touch screens a focused field would raise the keyboard over the form, so focus the title instead.
      const coarse = window.matchMedia('(pointer: coarse)').matches
      d.querySelector(coarse ? '#enq-h' : 'input[name="name"]')?.focus()
    })
  }

  useEffect(() => {
    const onOpen = (e) => { openWith(e.detail?.category); window.__enqPending = undefined }
    window.addEventListener('birdi:enquire', onOpen)
    if (window.__enqPending !== undefined) { // a click that arrived before this component hydrated
      openWith(window.__enqPending)
      window.__enqPending = undefined
    }
    return () => window.removeEventListener('birdi:enquire', onOpen)
  }, [])

  const set = (name) => (e) => {
    const next = { ...v, [name]: e.target.value }
    setV(next)
    if (touched[name] || touched.submitted) setErrors(validate(next))
  }
  // Empty fields are only checked on submit, so tabbing past a field never pushes the layout around.
  const blur = (name) => () => {
    if (!String(v[name]).trim()) return
    setTouched((t) => ({ ...t, [name]: true }))
    setErrors(validate(v))
  }
  const show = (key) => (touched[key] || touched.submitted ? errors[key] : undefined)
  const contactErr = touched.submitted || (touched.phone && touched.email) ? errors.contact : undefined

  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending.current) return // no duplicate submissions
    // With no server destination, the working route is WhatsApp: the visitor reviews and sends the message there.
    const handoff = !dest && !!site.whatsapp
    const found = validate(v, { requireContact: !handoff })
    setErrors(found)
    setTouched((t) => ({ ...t, submitted: true }))
    const keys = Object.keys(found)
    if (keys.length) {
      setSummary(`${keys.length} ${keys.length === 1 ? 'field needs' : 'fields need'} attention.`)
      requestAnimationFrame(() => dlg.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setSummary('')
    if (handoff) {
      const href = waHref(v.category || null, enquiryDetails(v))
      setWaLink(href)
      window.open(href, '_blank', 'noopener')
      setPhase('handoff')
      return
    }
    sending.current = true
    setPhase('sending')
    const result = await submitEnquiry(v, { endpoint: dest })
    sending.current = false
    if (result.ok) { setPhase('sent'); setV(emptyValues()); setTouched({}); setErrors({}) }
    else setPhase(result.reason === 'no-destination' ? 'demo' : 'failed')
  }

  const close = () => dlg.current?.close()
  const busy = phase === 'sending'
  const inv = (key) => (show(key) ? 'true' : undefined)
  const describe = (id, key, hint) => [hint && `${id}-hint`, show(key) && `${id}-err`].filter(Boolean).join(' ') || undefined

  return (
    <dialog ref={dlg} className="enquiry" aria-labelledby="enq-h" onClick={(e) => { if (e.target === dlg.current) close() }}>
      {phase === 'sent' ? (
        <div className="enq">
          <div className="enq-top"><h2 id="enq-h" tabIndex={-1}>Enquiry received</h2><button type="button" className="icon-btn" onClick={close} aria-label="Close"><X size={20} strokeWidth={1.5} /></button></div>
          <p>Thank you. The shop will reply using the contact details you gave.</p>
          <div className="enq-actions"><button type="button" className="btn btn-primary" onClick={close}>Close</button></div>
        </div>
      ) : (
        <form className="enq" onSubmit={onSubmit} noValidate aria-busy={busy}>
          <div className="enq-top">
            <h2 id="enq-h" tabIndex={-1}>Enquire about hardware</h2>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close enquiry"><X size={20} strokeWidth={1.5} /></button>
          </div>
          <p className="enq-sub">{!dest && site.whatsapp ? 'Only your name is required. Your enquiry opens in WhatsApp for you to check and send.' : 'Only your name and one way to reach you are required.'}</p>
          {!dest && site.whatsapp && <p className="enq-alt">Prefer to talk? <a href={telHref}>Call {site.phone.display}</a></p>}
          {!dest && !site.whatsapp && <p className="enq-status" role="note">Demo. Nothing is sent until the shop’s contact details are approved.</p>}
          {summary && <p className="enq-status problem" role="alert">{summary}</p>}

          <Field id="f-name" label="Name" mark={<Req />} error={show('name')}>
            <input id="f-name" name="name" value={v.name} onChange={set('name')} onBlur={blur('name')} autoComplete="name" aria-invalid={inv('name')} aria-describedby={describe('f-name', 'name')} aria-required="true" />
          </Field>

          <fieldset className="field" aria-describedby={contactErr ? 'f-contact-err' : undefined}>
            <legend>How should we reach you?<span className="req">{!dest && site.whatsapp ? '(optional: WhatsApp already shows your number)' : '(phone or email, at least one)'}</span></legend>
            <div className="contact">
              <div className="field c-phone">
                <label htmlFor="f-phone">Phone</label>
                <input id="f-phone" name="phone" type="tel" inputMode="tel" spellCheck="false" value={v.phone} onChange={set('phone')} onBlur={blur('phone')} autoComplete="tel" aria-invalid={show('phone') || contactErr ? 'true' : undefined} aria-describedby={describe('f-phone', 'phone')} />
              </div>
              <div className="field c-email">
                <label htmlFor="f-email">Email</label>
                <input id="f-email" name="email" type="email" inputMode="email" spellCheck="false" value={v.email} onChange={set('email')} onBlur={blur('email')} autoComplete="email" aria-invalid={show('email') || contactErr ? 'true' : undefined} aria-describedby={describe('f-email', 'email')} />
              </div>
              {/* messages sit in reserved cells under their field, so showing one never moves the form */}
              <div className="slot c-phone-err">{show('phone') && <p className="err" id="f-phone-err">{show('phone')}</p>}</div>
              <div className="slot c-email-err">{show('email') && <p className="err" id="f-email-err">{show('email')}</p>}</div>
              {contactErr && <p className="err c-contact-err" id="f-contact-err">{contactErr}</p>}
            </div>
          </fieldset>

          <div className="row">
            <Field id="f-cat" label="Interested in" mark={<Opt />}>
              <select id="f-cat" name="category" value={v.category} onChange={set('category')} autoComplete="off">
                <option value="">Not sure yet</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field id="f-biz" label="Business name" mark={<Opt />}>
              <input id="f-biz" name="business" value={v.business} onChange={set('business')} autoComplete="organization" />
            </Field>
          </div>

          <div className="row trio">
            <Field id="f-qty" label="Quantity" mark={<Opt />} error={show('quantity')} reserve>
              <input id="f-qty" name="quantity" inputMode="numeric" value={v.quantity} onChange={set('quantity')} onBlur={blur('quantity')} autoComplete="off" aria-invalid={inv('quantity')} aria-describedby={describe('f-qty', 'quantity')} />
            </Field>
            <Field id="f-unit" label="Unit">
              <select id="f-unit" name="unit" value={v.unit} onChange={set('unit')} autoComplete="off">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            </Field>
            <Field id="f-city" label="Delivery city" mark={<Opt />}>
              <input id="f-city" name="city" value={v.city} onChange={set('city')} autoComplete="address-level2" />
            </Field>
          </div>

          <Field id="f-msg" label="Requirements" mark={<Opt />} hint="Sizes, finishes, or anything else that helps.">
            <textarea id="f-msg" name="message" rows="2" value={v.message} onChange={set('message')} autoComplete="off" aria-describedby="f-msg-hint" />
          </Field>

          <div className="enq-actions">
            {phase === 'handoff' && <p className="enq-status" role="status">WhatsApp opened in a new tab with your enquiry. Nothing is sent until you press send there. <a href={waLink} target="_blank" rel="noopener">Open WhatsApp again</a></p>}
            {phase === 'demo' && <p className="enq-status" role="status">Demo only: nothing was sent. Your details are still in this form and nowhere else.</p>}
            {phase === 'failed' && <p className="enq-status problem" role="alert">The enquiry could not be sent. Check your connection and try again. Your details are still here.</p>}
            <button className="btn btn-primary" type="submit" disabled={busy} aria-disabled={busy}>
              {busy ? (<><span className="spinner" aria-hidden="true" />Sending…</>) : dest ? 'Send enquiry' : site.whatsapp ? 'Continue on WhatsApp' : 'Preview enquiry'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}
