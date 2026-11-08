import LogoLoop from './vendor/LogoLoop.jsx'
import './vendor/LogoLoop.css'

// Category names only (taken from the range copy): no brands, prices or stock claims.
const WORDS = ['Door locks', 'Digital locks', 'Door closers', 'Door fittings', 'Hinges', 'Handles', 'Bolts', 'Spare parts']
const LOGOS = WORDS.map((w) => ({ node: <span className="tick">{w}</span>, title: w }))

export default function CategoryTicker() {
  return (
    <LogoLoop logos={LOGOS} speed={46} gap={56} logoHeight={30} fadeOut fadeOutWidth={0.14} pauseOnHover={false} draggable={false} scrollBoost={0.6} ariaLabel="Hardware categories" />
  )
}
