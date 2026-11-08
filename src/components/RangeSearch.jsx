import { useEffect, useMemo, useState } from 'react'

// Search and filter over the published range (categories, the item types listed on them, guides and
// buyer pages). Everything is in the server-rendered list, so the page works without JavaScript; the
// island only narrows it. Filters come straight from the data: hardware group and door application.
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ')

export default function RangeSearch({ entries, groups, apps }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [app, setApp] = useState('')
  const [ready, setReady] = useState(false)
  const [all, setAll] = useState(false)
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    // keep anything typed before the island hydrated
    const typed = document.getElementById('range-q')?.value
    if (p.get('q') || typed) setQ(p.get('q') || typed)
    setReady(true)
  }, [])
  const words = norm(q).split(/\s+/).filter(Boolean)
  const shown = useMemo(() => entries.filter((e) => {
    if (group && e.group !== group) return false
    if (app && !(e.apps || []).includes(app)) return false
    if (!words.length) return true
    const hay = norm(`${e.title} ${e.text} ${e.parent || ''} ${e.group || ''}`)
    return words.every((w) => hay.includes(w))
  }), [entries, group, app, q])
  // With nothing typed or picked, show a first screenful instead of the whole catalogue as one long page.
  const PREVIEW = 12
  const browsing = ready && !words.length && !group && !app && !all // without JavaScript the full list stays
  const visible = browsing ? shown.slice(0, PREVIEW) : shown
  const chip = (value, current, set, label) => (
    <button key={value} type="button" className="chip-btn" aria-pressed={current === value} onClick={() => set(current === value ? '' : value)}>{label}</button>
  )
  return (
    <div className="range-search" data-ready={ready ? '' : undefined}>
      <form role="search" className="search-bar" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="range-q">Search the range</label>
        <input id="range-q" type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: hinge, cylinder, closer…" autoComplete="off" spellCheck="false" />
      </form>
      <div className="filters">
        <div className="filter-row" role="group" aria-label="Hardware group">{groups.map((g) => chip(g, group, setGroup, g))}</div>
        <div className="filter-row" role="group" aria-label="Door application">{Object.entries(apps).map(([k, label]) => chip(k, app, setApp, label))}</div>
      </div>
      <p className="result-count" role="status" aria-live="polite">{shown.length === entries.length ? `${entries.length} entries${browsing ? `, showing the first ${PREVIEW}` : ''}` : `${shown.length} of ${entries.length} entries`}</p>
      {shown.length ? (
        <ul className="results">
          {visible.map((e) => (
            <li key={e.href + e.title} className="result">
              <span className="result-kind">{e.kind}{e.parent ? ` · ${e.parent}` : ''}</span>
              <a href={e.href} className="result-title">{e.title}</a>
              <p>{e.text}</p>
              {e.enquire && <a className="result-ask" href={e.enquire} target={e.enquire.startsWith('https://wa.me/') ? '_blank' : undefined} rel="noopener">Ask about availability{e.enquire.startsWith('https://wa.me/') && <span className="sr-only"> of {e.title} on WhatsApp (opens in a new tab)</span>}</a>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-results">Nothing in the published range matches that. <a href={`/enquiry/?type=${encodeURIComponent(q)}`}>Ask the shop about it</a> anyway: not everything is listed here.</p>
      )}
      {browsing && shown.length > PREVIEW && <button type="button" className="btn btn-quiet show-all" onClick={() => setAll(true)}>Show all {shown.length} entries</button>}
    </div>
  )
}
