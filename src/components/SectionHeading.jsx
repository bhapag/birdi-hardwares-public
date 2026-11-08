import SplitText from './vendor/SplitText.jsx'

// React Bits SplitText, restyled by the page CSS: words rise into place once, when the heading scrolls into view.
export default function SectionHeading({ text, tag = 'h2' }) {
  return <SplitText tag={tag} text={text} splitType="words" effect="rise" mask textAlign="left" delay={70} duration={0.9} rootMargin="-60px" />
}
