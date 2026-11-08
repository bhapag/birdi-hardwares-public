import TiltedCard from './vendor/TiltedCard.jsx'

const AMPLITUDE = 8
const PARALLAX = 0.8
// Same overscan TiltedCard applies to its own image, so the picture never shows an edge while it shifts.
const BLEED = Math.ceil(Math.sin((AMPLITUDE * Math.PI) / 180) * 24 * PARALLAX) + 1

// One image on a card that tilts toward the pointer, with a soft glare and parallax (React Bits TiltedCard).
// The <picture> keeps the optimised AVIF/WebP sizes; with no JavaScript or with reduced motion it is a still image.
export default function ShowcasePlate({ image, alt, label = 'Illustrative', eager = false, avif = true, sizes = '(max-width: 860px) 92vw, 44vw' }) {
  return (
    <TiltedCard className="show-plate" containerWidth="100%" containerHeight="auto" imageWidth="100%" imageHeight="100%" radius={2} rotateAmplitude={AMPLITUDE} parallax={PARALLAX} scaleOnHover={1.025} glare={0.32} glareColor="#fff3dc" shadow={0.3} gyroscope={false} showTooltip={false}>
      <picture>
        {avif && <source type="image/avif" srcSet={`${image}-720.avif 720w, ${image}-1200.avif 1200w`} sizes={sizes} />}
        <source type="image/webp" srcSet={`${image}-720.webp 720w, ${image}-1200.webp 1200w`} sizes={sizes} />
        <img className="tilted-card__img" src={`${image}-1200.jpg`} alt={alt} width="1200" height="1500" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" draggable={false}
          style={{ '--tc-depth': -24, top: `-${BLEED}px`, left: `-${BLEED}px`, width: `calc(100% + ${BLEED * 2}px)`, height: `calc(100% + ${BLEED * 2}px)` }} />
      </picture>
      {label && <span className="chip-tag">{label}</span>}
    </TiltedCard>
  )
}
