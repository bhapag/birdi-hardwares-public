// Range data for the site. Category pages, the range index, search and enquiry prefill all read from here.
// Evidence rule (docs/evidence-register.md): categories are the ones in the shop's directory listing or the
// approved demo. Item types are general hardware types to ask about, not confirmed stock, brands or models.

export const APPLICATIONS = {
  main: 'Main doors',
  interior: 'Interior doors',
  renovation: 'Replacement and repair',
  trade: 'Projects and trade',
}

export const IMAGES = {
  'door-locks': { src: '/img/showcase/door-locks', w: 1200, h: 1500, alt: 'Illustration of a satin brass lever handle, round rose and keyhole escutcheon fitted to a walnut door section, with a plain brass key in front', kind: 'illustration' },
  'digital-locks': { src: '/img/showcase/digital-locks', w: 1200, h: 1500, alt: 'Illustration of a digital door lock on a walnut door section, with a dark bronze backplate, a twelve-key keypad and a nickel lever handle', kind: 'illustration' },
  'door-closers': { src: '/img/showcase/door-closers', w: 1200, h: 1500, alt: 'Illustration of an overhead door closer on a walnut door, with its two-part arm connected to a bracket on the door frame', kind: 'illustration' },
  'door-fittings': { src: '/img/showcase/door-fittings', w: 1200, h: 1500, alt: 'Illustration of door fittings on a travertine surface: a pair of brass hinges, a lever handle, a barrel bolt and a door stop', kind: 'illustration' },
  hinges: { src: '/img/range/hinges', w: 1200, h: 1500, alt: 'Rendered brass and satin nickel butt hinges fixed to a walnut panel', kind: 'render' },
  'door-handles': { src: '/img/range/handles', w: 1200, h: 1500, alt: 'Rendered brass lever handle on a round rose with a key rose, beside a bronze pull handle on a fluted walnut panel', kind: 'render' },
  'bolts-and-latches': { src: '/img/range/bolts', w: 1200, h: 1500, alt: 'Rendered satin nickel and brass tower bolts mounted on a walnut panel', kind: 'render' },
  'spare-parts': { src: '/img/range/spares', w: 1200, h: 1500, alt: 'Rendered strike plate, euro profile cylinder with key, square spindle and screws laid on stone', kind: 'render' },
  'main-door': { src: '/img/range/main-door', w: 1200, h: 1500, alt: 'Rendered digital lock and brass pull handle on a fluted walnut main door sample', kind: 'render' },
  interior: { src: '/img/range/interior', w: 1200, h: 1500, alt: 'Rendered satin nickel lever handle and hinge on a plain walnut interior door sample', kind: 'render' },
  renovation: { src: '/img/range/renovation', w: 1200, h: 1500, alt: 'Rendered mortise lock body, strike plate, spindle and screws laid out on walnut for replacement', kind: 'render' },
  trade: { src: '/img/range/trade', w: 1200, h: 1500, alt: 'Rendered set of hardware for a project: lever handle, door closer, hinge and door stopper', kind: 'render' },
}

export const CATEGORIES = [
  {
    slug: 'door-locks', title: 'Door locks', group: 'Locks', apps: ['main', 'interior', 'renovation', 'trade'],
    short: 'Mortise lock sets, rim and safety locks, cylinders and knob locks for main and interior doors.',
    intro: [
      'A door lock is really a small system: the lock body in or on the door, the cylinder or key mechanism, the handles that operate the latch, and the strike on the frame. Choosing well means matching all four to the door you have.',
      'Bring the door thickness, the backset of any existing lock and a photograph, and the shop can talk you through what suits a main door, a bedroom or a bathroom.',
    ],
    types: [
      { name: 'Mortise lock sets', text: 'A lock body fitted into a pocket in the door edge, worked by lever handles on roses or plates. Common on wooden main and interior doors.', apps: ['main', 'interior', 'trade'] },
      { name: 'Rim and safety locks', text: 'Surface-mounted locks on the inside face of the door, often added to a main door as a second, deadlocking lock.', apps: ['main', 'renovation'] },
      { name: 'Cylinders', text: 'The keyed part of many locks. Euro profile cylinders are sized by the distance from each face of the door to the fixing screw.', apps: ['main', 'renovation', 'trade'] },
      { name: 'Knob and lever locks', text: 'Cylindrical or tubular locks for lighter interior doors, including privacy versions with a turn on the inside.', apps: ['interior'] },
    ],
    bring: ['Door thickness', 'Backset: door edge to the centre of the handle or key hole', 'Which side the door opens and hinges on', 'Photo of the existing lock and its faceplate'],
    guides: ['choosing-a-door-lock', 'digital-vs-mechanical-locks', 'door-measurements-checklist'],
  },
  {
    slug: 'digital-locks', title: 'Digital locks', group: 'Locks', apps: ['main', 'trade'],
    short: 'Keypad and card-access locks for main doors, with a mechanical key override.',
    intro: [
      'Digital locks replace or supplement the key with a code, a card or another credential. The useful questions are less about features and more about fit: door thickness, door material, lock body, and what happens when the batteries run low.',
      'This page explains the general types to ask about. Specific models, features and availability are confirmed at the shop.',
    ],
    types: [
      { name: 'Keypad locks', text: 'Open with a personal code. Look for a way to hide or scramble the code and a clear low-battery warning.', apps: ['main'] },
      { name: 'Card and key-fob locks', text: 'Open by holding a card or fob to a reader, which is easy to issue and withdraw for family or staff.', apps: ['main', 'trade'] },
      { name: 'Locks with mechanical override', text: 'A conventional key, usually behind a cover, so the door can still be opened if the electronics cannot.', apps: ['main'] },
      { name: 'Rim-mounted and mortise digital locks', text: 'Some fit like a surface rim lock, others replace a mortise lock body. The door you have decides which is practical.', apps: ['main', 'renovation'] },
    ],
    bring: ['Door thickness and material', 'Existing lock type and backset', 'Whether the door is a main door or an interior door', 'Photo of both faces of the door around the lock'],
    guides: ['digital-vs-mechanical-locks', 'choosing-a-door-lock', 'door-measurements-checklist'],
  },
  {
    slug: 'door-closers', title: 'Door closers', group: 'Door control', apps: ['main', 'trade', 'renovation'],
    short: 'Overhead hydraulic door closers sized to the door, with adjustable closing speed.',
    intro: [
      'A door closer brings a door back to its frame in a controlled way. The right closer depends mainly on the width and weight of the door, and on whether it is mounted on the push or pull side.',
      'Hydraulic closers usually let you adjust the closing speed and the final latching action, so a heavy main door shuts firmly without slamming.',
    ],
    types: [
      { name: 'Overhead closers with a scissor arm', text: 'The most familiar type: a body on the door or frame and a jointed arm. Common for main doors and offices.', apps: ['main', 'trade'] },
      { name: 'Parallel-arm mounting', text: 'The arm sits along the door on the push side, a neater look where the closer is visible from the corridor.', apps: ['trade'] },
      { name: 'Hold-open arms', text: 'Hold the door at an angle until it is pushed again. Not suitable for doors that must close on their own.', apps: ['trade'] },
      { name: 'Replacement closer arms and parts', text: 'Arms and fixing brackets wear out before the closer body sometimes. Bring the old part.', apps: ['renovation'] },
    ],
    bring: ['Door width and approximate weight', 'Which side you will mount it on (push or pull)', 'Space above the door and the frame depth', 'Photo of any existing closer and its label'],
    guides: ['choosing-a-door-closer', 'door-measurements-checklist'],
  },
  {
    slug: 'door-fittings', title: 'Door fittings', group: 'Fittings', apps: ['main', 'interior', 'renovation', 'trade'],
    short: 'Hinges, handles, bolts, stoppers and the small fittings that make a door work well.',
    intro: [
      'Door fittings are everything a door needs beyond the lock: what it hangs on, what you hold, what keeps it shut and what stops it hitting the wall.',
      'The pages below go into hinges, handles and bolts in more detail. Matching finishes across all of them is one of the simplest ways to make a door look considered.',
    ],
    types: [
      { name: 'Hinges', text: 'Butt hinges, ball-bearing hinges and other types, sized to the door. See the hinges page.', apps: ['main', 'interior', 'trade'] },
      { name: 'Handles', text: 'Levers on roses or plates, pull handles and knobs. See the door handles page.', apps: ['main', 'interior'] },
      { name: 'Bolts and latches', text: 'Tower bolts, flush bolts for double doors, and latches. See the bolts and latches page.', apps: ['main', 'interior', 'trade'] },
      { name: 'Door stoppers', text: 'Floor or wall stoppers that protect the wall and the handle.', apps: ['interior', 'trade'] },
    ],
    bring: ['Door size and material', 'Finish you want to match', 'Photos of the door and existing fittings'],
    guides: ['hardware-finishes-and-materials', 'choosing-hinges', 'door-measurements-checklist'],
  },
  {
    slug: 'hinges', title: 'Hinges', group: 'Fittings', apps: ['main', 'interior', 'renovation', 'trade'],
    short: 'Butt, ball-bearing and other door hinges, chosen by door weight, size and finish.',
    intro: [
      'Hinges carry the whole weight of the door, so they are worth choosing by the door rather than by habit. Heavier and taller doors need stronger hinges, and often an extra one.',
      'Size, thickness of the leaf, the number of hinges and the screws used all matter. Bring the door height, thickness and an idea of its weight.',
    ],
    types: [
      { name: 'Butt hinges', text: 'Two leaves around a pin, set into the door edge and the frame. The everyday hinge for most doors.', apps: ['interior', 'main'] },
      { name: 'Ball-bearing hinges', text: 'Bearings between the knuckles reduce wear and keep heavy or busy doors swinging smoothly.', apps: ['main', 'trade'] },
      { name: 'Parliament hinges', text: 'Wider leaves that let a door swing clear of a deep frame or a moulding.', apps: ['renovation'] },
      { name: 'Spring hinges', text: 'Contain a spring that pulls the door closed. A lighter alternative to a closer on some interior doors.', apps: ['interior'] },
    ],
    bring: ['Door height, thickness and approximate weight', 'Size of any existing hinge leaf', 'Finish to match', 'Photo of the hinge and the door edge'],
    guides: ['choosing-hinges', 'hardware-finishes-and-materials'],
  },
  {
    slug: 'door-handles', title: 'Door handles', group: 'Fittings', apps: ['main', 'interior', 'renovation'],
    short: 'Lever handles on roses or plates, pull handles and knobs, matched to the lock.',
    intro: [
      'A handle has to suit the lock behind it as much as the look you want. A lever on a plate already has the right cut-out for a key or cylinder; a lever on a rose is paired with a separate key rose.',
      'Ask about the spindle size and the screw positions if you are replacing handles on an existing lock.',
    ],
    types: [
      { name: 'Lever on rose', text: 'A lever on a round or square rose, with a separate key or thumb-turn rose. Clean and adaptable.', apps: ['interior', 'main'] },
      { name: 'Lever on plate', text: 'Lever and key or cylinder opening on one backplate. Useful where screw holes from an older plate need covering.', apps: ['renovation', 'main'] },
      { name: 'Pull handles', text: 'D-shaped or straight bars, fixed through the door or on one face. Common on main doors and glass doors.', apps: ['main', 'trade'] },
      { name: 'Knobs', text: 'Simple to operate on lighter doors, though levers are easier for many hands.', apps: ['interior'] },
    ],
    bring: ['The lock type behind the handle', 'Distance between the handle and key hole centres', 'Door thickness', 'Photo of the existing handle'],
    guides: ['hardware-finishes-and-materials', 'choosing-a-door-lock'],
  },
  {
    slug: 'bolts-and-latches', title: 'Bolts and latches', group: 'Fittings', apps: ['main', 'interior', 'trade'],
    short: 'Tower and barrel bolts, flush bolts for double doors, and latches.',
    intro: [
      'Bolts add a simple, positive way to secure a door from one side; latches hold a door shut until the handle is turned.',
      'For double doors, the second leaf usually needs bolts at top and bottom so the active leaf has something firm to close against.',
    ],
    types: [
      { name: 'Tower bolts', text: 'A bolt sliding in guides on a back plate, surface-mounted. Sizes vary with the strength needed.', apps: ['main', 'interior'] },
      { name: 'Barrel bolts', text: 'The bolt runs in a closed barrel, a tidy and robust choice for gates, cabinets and doors.', apps: ['interior', 'trade'] },
      { name: 'Flush bolts', text: 'Set into the edge of the passive leaf of a double door, out of sight when the doors are closed.', apps: ['trade', 'main'] },
      { name: 'Latches', text: 'Tubular or mortise latches, with no key, for doors that need to stay shut but not locked.', apps: ['interior'] },
    ],
    bring: ['Door type and whether it is single or double', 'Bolt length you have or need', 'Photo of the fitting position'],
    guides: ['door-measurements-checklist', 'hardware-finishes-and-materials'],
  },
  {
    slug: 'spare-parts', title: 'Hardware spare parts', group: 'Spares', apps: ['renovation'],
    short: 'Replacement cylinders, spindles, strike plates, screws and closer parts: bring the old part.',
    intro: [
      'Often only one part has failed: a cylinder, a spindle, a strike plate or a closer arm. Replacing that part can be quicker and kinder to the door than replacing the whole fitting.',
      'The most reliable way to get a match is to bring the old part, or clear photos with a ruler beside it.',
    ],
    types: [
      { name: 'Cylinders', text: 'Measured from the fixing screw to each face of the door, so the new one sits flush.', apps: ['renovation'] },
      { name: 'Spindles and screws', text: 'The square bar between lever handles and the fixings that hold handles and plates.', apps: ['renovation'] },
      { name: 'Strike plates', text: 'The plate on the frame the latch closes into. A worn or misaligned strike makes a door hard to shut.', apps: ['renovation'] },
      { name: 'Closer and hinge parts', text: 'Arms, brackets and pins. Bring the label or model marking from the original if it has one.', apps: ['renovation'] },
    ],
    bring: ['The old part, or photos with a ruler beside it', 'Any brand or model marking on the original', 'Door thickness if it is a cylinder or spindle'],
    guides: ['door-measurements-checklist', 'choosing-a-door-lock'],
  },
]

export const NEEDS = [
  {
    slug: 'main-door', title: 'Main door hardware', image: 'main-door',
    short: 'Locks, handles, closers and bolts for the door that matters most.',
    lead: 'Your main door does the most work: it is used most, faces the weather and is the first line of security. It is worth planning its hardware as one set.',
    points: [
      ['Lock', 'Decide between a mortise lock set, a rim or safety lock, a digital lock, or a combination. Many main doors use two locks.'],
      ['Handles', 'Match the handle to the lock: lever on plate, lever on rose with a key rose, or a pull handle outside.'],
      ['Closing', 'A closer suits doors that should never be left ajar. Size it to the door.'],
      ['Bolts and stops', 'Bolts on the inside and a stopper to protect the wall complete the set.'],
    ],
    cats: ['door-locks', 'digital-locks', 'door-handles', 'door-closers', 'bolts-and-latches'],
    guides: ['choosing-a-door-lock', 'digital-vs-mechanical-locks', 'choosing-a-door-closer'],
  },
  {
    slug: 'interior-doors', title: 'Interior door hardware', image: 'interior',
    short: 'Handles, latches, privacy locks and hinges for bedrooms, bathrooms and studies.',
    lead: 'Interior doors need comfort and consistency more than heavy security. A matching handle, a quiet latch and good hinges throughout a home make a real difference.',
    points: [
      ['Function by room', 'Bedrooms and studies often use a lock or latch; bathrooms a privacy turn; cupboards a simple latch.'],
      ['Matching sets', 'Choose one handle style and finish, then vary only the function.'],
      ['Hinges', 'Lighter doors still benefit from good hinges, fitted square so the door does not drop.'],
      ['Stoppers', 'Small, cheap and they save walls and handles.'],
    ],
    cats: ['door-handles', 'door-locks', 'hinges', 'door-fittings'],
    guides: ['hardware-finishes-and-materials', 'choosing-hinges'],
  },
  {
    slug: 'replacement-and-renovation', title: 'Replacement and renovation', image: 'renovation',
    short: 'Matching an existing lock, handle or part, or updating a door without starting again.',
    lead: 'When something fails or a door is being refreshed, the aim is usually to reuse the holes and pockets already in the door. That depends on careful measurement.',
    points: [
      ['Start with the old part', 'Bring it, or photograph it beside a ruler, including any markings.'],
      ['Measure before you buy', 'Backset, door thickness and the centre distance between handle and key hole decide what fits.'],
      ['Cover old marks', 'A larger plate or rose can hide old screw holes when the style changes.'],
      ['Check the strike', 'A door that will not latch is often a strike plate problem, not a lock problem.'],
    ],
    cats: ['spare-parts', 'door-locks', 'door-handles', 'hinges'],
    guides: ['door-measurements-checklist', 'choosing-a-door-lock'],
  },
  {
    slug: 'trade-enquiries', title: 'Architects, builders and contractors', image: 'trade',
    short: 'Hardware schedules and quantity enquiries for projects.',
    lead: 'For a project, a door hardware schedule saves time on both sides: list each door type, its use, its size and the finish, and ask for a quotation against it.',
    points: [
      ['Door types', 'Group doors by type and function: main, bedroom, bathroom, service.'],
      ['Quantities', 'Give quantities per door type, plus any spares you want held.'],
      ['Finish', 'Name one finish for the project, or one per area.'],
      ['Closers and sizes', 'Give door widths and weights where closers are needed.'],
    ],
    cats: ['door-locks', 'door-closers', 'hinges', 'door-handles', 'bolts-and-latches'],
    guides: ['choosing-a-door-closer', 'choosing-hinges', 'hardware-finishes-and-materials'],
  },
]

export const categoryBySlug = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]))
