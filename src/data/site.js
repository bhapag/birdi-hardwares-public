// One place for business facts. null means "not confirmed by the owner": nothing is shown or linked for it.
// Address: Justdial and LudhianaOnline listings agree on B-VII-871, Lakkar Bazar, 141008 (docs/evidence-register.md).
export const site = {
  name: 'Birdi Hardwares',
  locality: 'Lakkar Bazar, Ludhiana',
  address: ['Shop No. B-VII-871, Near JMD Mall,', 'Main Road, Lakkar Bazar, Ludhiana 141008'],
  postal: { streetAddress: 'Shop No. B-VII-871, Near JMD Mall, Main Road, Lakkar Bazar', addressLocality: 'Ludhiana', addressRegion: 'Punjab', postalCode: '141008', addressCountry: 'IN' },
  // Owner-confirmed 2026-10-22 (replaces the conflicting directory numbers, which are never shown).
  phone: { display: '+91 62845 05353', tel: '+916284505353' },
  whatsapp: '916284505353', // wa.me number: country code, no plus or spaces
  email: null,
  instagram: null,
  hours: null,
  enquiryEndpoint: null, // set only once the shop approves where enquiries should go
}

// SEO switch. The owner approved indexing on 26 Oct 2026: builds for https://birdihardwares.com are indexable.
// Any other host (a preview, the old Vercel demo) stays out of search unless PUBLIC_INDEXABLE says otherwise.
const env = import.meta.env || {} // undefined when imported by plain Node (unit tests)
export const SITE_URL = (env.SITE_URL || 'https://birdihardwares.com').replace(/\/$/, '')
export const INDEXABLE = env.PUBLIC_INDEXABLE ? env.PUBLIC_INDEXABLE === 'true' : SITE_URL === 'https://birdihardwares.com'
