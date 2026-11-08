// Buying guides: general, unbranded hardware guidance. Figures quoted as "typical" come from published
// manufacturer data and standards summaries (see docs/evidence-register.md) and are not claims about Birdi stock.

export const GUIDES = [
  {
    slug: 'choosing-a-door-lock', title: 'Choosing a door lock', image: 'door-locks', cats: ['door-locks', 'door-handles', 'spare-parts'],
    description: 'How to choose a door lock: lock bodies, cylinders, handles and the measurements that decide what fits your door.',
    lead: 'Start with the door, not the catalogue. The door decides which locks will fit; your use of the room decides which of those is right.',
    sections: [
      { h: 'Four parts of every lock', p: ['Most door locks are made of the same four parts: a lock body, a key mechanism, the handles that work the latch, and a strike plate on the frame. A good choice matches all four to each other and to the door.'] },
      { h: 'Lock bodies', list: [
        'Mortise lock: set into a pocket cut in the door edge. Neat, strong and common on wooden doors.',
        'Rim lock: mounted on the inside face of the door, often as a second lock on a main door.',
        'Cylindrical or tubular lock: bored through the door, typical on lighter interior doors.',
      ] },
      { h: 'Key mechanisms', p: ['Lever locks use a key that lifts a set of levers inside the body. Cylinder locks use a separate, replaceable cylinder. A cylinder can have a key on both sides, or a key outside and a turn inside; manufacturers list these as different configurations, so say which you need.'] },
      { h: 'The measurements that decide fit', list: [
        'Door thickness. Published lock sets typically quote a range, for example 25 to 45 mm or 28 to 40 mm.',
        'Backset: the distance from the door edge to the centre of the handle or key hole. Around 48 to 50 mm is common on mortise sets.',
        'Centre distance between the handle and the key hole, if you are reusing the holes in the door.',
        'Hand of the door: which side it hinges on and which way it opens.',
      ] },
      { h: 'Match the function to the room', list: ['Main door: a deadlocking lock, often with a second lock or bolt.', 'Bedroom or study: a lock or latch with a key.', 'Bathroom: a privacy turn inside with an emergency release outside.', 'Cupboard: a simple latch.'] },
      { h: 'Bring to the shop', p: ['The door thickness, the backset, a photo of the existing lock and its faceplate, and any marking on the lock body. That is usually enough to narrow the choice quickly.'] },
    ],
  },
  {
    slug: 'digital-vs-mechanical-locks', title: 'Digital or mechanical lock?', image: 'digital-locks', cats: ['digital-locks', 'door-locks'],
    description: 'Digital versus mechanical door locks: convenience, power, overrides, fit and upkeep, explained without brand claims.',
    lead: 'Both can secure a door well. The difference is in how you open it, what can go wrong, and who needs access.',
    sections: [
      { h: 'What a digital lock changes', p: ['A digital lock lets you open the door with a code, a card or another credential instead of, or as well as, a key. You can give access to someone without handing over a key, and often withdraw it again.'] },
      { h: 'What it does not change', p: ['The door, the frame and the lock body still do the physical work. A digital front end on a weak door is still a weak door. Check that the lock body and strike are suited to a main door.'] },
      { h: 'Power and overrides', list: ['Digital locks run on batteries. Ask how the lock warns you when they are low.', 'Ask what happens if the batteries are flat: many locks have an emergency power point or a mechanical key behind a cover.', 'Keep the override key somewhere you can reach from outside.'] },
      { h: 'Fit', p: ['Digital locks are made for particular door thicknesses and materials, and some need a specific lock body. Bring the door thickness, the material and a photo of both faces of the door around the existing lock.'] },
      { h: 'When a mechanical lock is the better choice', list: ['Doors that are rarely locked or used by few people.', 'Places where batteries would be inconvenient to change.', 'Interior doors, where a simple latch or privacy lock is enough.'] },
      { h: 'Side by side', table: [['', 'Mechanical', 'Digital'], ['Opens with', 'Key or thumb-turn', 'Code, card, and usually a key override'], ['Needs power', 'No', 'Yes, batteries'], ['Sharing access', 'Copy keys', 'Add or remove codes or cards'], ['Typical use', 'Any door', 'Main doors, offices']] },
    ],
  },
  {
    slug: 'choosing-a-door-closer', title: 'Choosing a door closer', image: 'door-closers', cats: ['door-closers'],
    description: 'How to size and mount a door closer: door width and weight, EN 1154 power sizes, arms and adjustment.',
    lead: 'A closer is chosen by the door it has to move. Width and weight come first; mounting and adjustment follow.',
    sections: [
      { h: 'Size the closer to the door', p: ['Closers are graded by power size in the European standard EN 1154. Each size corresponds to a maximum door width and weight, from size 1 for narrow, light doors up to size 7 for very wide, heavy ones. Published summaries of the standard give, for example:'], table: [['Power size', 'Door width up to', 'Door weight up to'], ['EN 2', '850 mm', '40 kg'], ['EN 3', '950 mm', '60 kg'], ['EN 4', '1100 mm', '80 kg'], ['EN 5', '1250 mm', '100 kg']], after: 'Many closers are adjustable across a range of sizes. Fire doors that need a closer are generally specified at EN 3 or above; if your door is a fire door, follow its own specification.' },
      { h: 'Arms and mounting', list: ['Regular (scissor) arm: the arm projects from the door, the most common arrangement.', 'Parallel arm: the arm runs along the door on the push side for a neater look.', 'Hold-open arm: keeps the door open at a set angle. Not for doors that must close on their own.'] },
      { h: 'Adjustment', p: ['Hydraulic closers usually have separate valves for the closing speed and for the final latching action. Set the door to close steadily and then latch firmly without slamming.'] },
      { h: 'Bring to the shop', p: ['Door width, approximate weight, which side you want to mount it, and a photo of the top of the door and the frame.'] },
    ],
  },
  {
    slug: 'choosing-hinges', title: 'Choosing hinges', image: 'hinges', cats: ['hinges', 'door-fittings'],
    description: 'How to choose door hinges: types, size, number of hinges and finish, for main and interior doors.',
    lead: 'Hinges hold the whole door. Undersized hinges are the most common reason a door drops and starts catching on the frame.',
    sections: [
      { h: 'Types', list: ['Butt hinges: the everyday choice, set into the door edge and frame.', 'Ball-bearing hinges: smoother and longer-lasting on heavy or busy doors.', 'Parliament hinges: wider leaves so the door clears a deep frame or moulding.', 'Spring hinges: pull the door closed on lighter interior doors.'] },
      { h: 'Size and number', p: ['Larger and thicker hinges carry more weight. A standard-height door commonly uses three hinges; tall or heavy doors often use four. If you are unsure, more support is the safer side to err on.'] },
      { h: 'Fixing', p: ['Use screws long enough to reach solid timber in the frame, and fit hinges square in their recesses so the door hangs true.'] },
      { h: 'Finish', p: ['Match hinge finish to the handles and lock on the same door. The finishes guide explains the common options.'] },
      { h: 'Bring to the shop', p: ['Door height, thickness and approximate weight, plus the leaf size of any existing hinge.'] },
    ],
  },
  {
    slug: 'hardware-finishes-and-materials', title: 'Finishes and materials', image: 'door-handles', cats: ['door-handles', 'hinges', 'door-fittings'],
    description: 'Door hardware finishes and materials: brass, satin nickel, stainless steel, dark bronze and how to choose and care for them.',
    lead: 'Finish is what you notice first and touch every day. Choose it for the room, then keep it consistent on each door.',
    sections: [
      { h: 'Common finishes', list: ['Polished or satin brass: warm, works with walnut and cream.', 'Satin nickel or satin steel: cool and quiet, hides fingerprints well.', 'Dark bronze or matte black: strong contrast on light doors.', 'Chrome: bright and reflective.'] },
      { h: 'Material and finish are different things', p: ['A finish is the surface; the material underneath decides strength and how the finish wears. Ask what a handle or hinge is made of as well as what colour it is.'] },
      { h: 'Consistency', p: ['Keep one finish per door: handle, key rose, hinges and stopper. Across a house, one or two finishes are usually enough.'] },
      { h: 'Care', p: ['Wipe with a soft, damp cloth. Avoid abrasive cleaners, which cut through plated and lacquered finishes.'] },
    ],
  },
  {
    slug: 'door-measurements-checklist', title: 'Door measurements checklist', image: 'door-fittings', cats: ['door-locks', 'digital-locks', 'door-closers', 'hinges', 'spare-parts'],
    description: 'A checklist of door measurements to take before buying locks, handles, hinges, closers or spare parts.',
    lead: 'Five minutes with a tape measure saves a second trip. Measure, photograph, then ask.',
    sections: [
      { h: 'For every door', list: ['Door height, width and thickness.', 'Material: solid wood, board, metal or glass.', 'Which side the hinges are on and whether the door opens towards you or away.'] },
      { h: 'For locks and handles', list: ['Backset: door edge to the centre of the handle or key hole.', 'Centre distance between handle and key hole.', 'Faceplate size of any existing mortise lock.'] },
      { h: 'For cylinders', list: ['Distance from the fixing screw to the outside face of the door.', 'Distance from the fixing screw to the inside face.'] },
      { h: 'For hinges and closers', list: ['Hinge leaf height and width.', 'Approximate door weight.', 'Space above the door and the frame depth for a closer.'] },
      { h: 'Photos to take', list: ['The whole door from each side.', 'Each fitting close up with a ruler beside it.', 'Any marking on the part.'] },
    ],
  },
]

export const FAQ = [
  ['Does the website show prices?', 'No. Prices depend on the item, finish and quantity, so every item is price on request. Ask for a quotation on WhatsApp, by phone or with the quotation form.'],
  ['Can I buy online?', 'Not on this website. It is a catalogue and enquiry site with no checkout. Ask about availability, then visit the shop.'],
  ['Are the pictures photographs of the shop’s stock?', 'No. Product photos in the catalogue are the manufacturers’ own catalogue photos, and the category pictures are illustrations and 3D renders made for this website. None of them shows the shop’s own stock.'],
  ['Which brands are available?', 'The catalogue lists products from the FANCY and ROOT catalogues, as printed by those manufacturers. Ask the shop about availability of any model, or about other brands.'],
  ['Is a particular item in stock?', 'Ask about availability on WhatsApp or by phone. The website does not show stock levels.'],
  ['Where is the shop?', 'Shop No. B-VII-871, near JMD Mall, Main Road, Lakkar Bazar, Ludhiana 141008. See the visit page.'],
  ['What should I bring to replace a part?', 'The old part if you can, or clear photos with a ruler beside it, plus the door thickness. The measurements checklist lists the rest.'],
  ['Do you fit or deliver hardware?', 'This website does not describe fitting or delivery services. Ask the shop directly.'],
  ['How do I contact the shop?', 'Call or WhatsApp +91 62845 05353. WhatsApp links on this website open with a short message for you to check and send. Opening hours are not listed yet, so call before a special trip.'],
  ['Is this the official Birdi Hardwares website?', 'Yes. birdihardwares.com is the shop’s website, with its confirmed phone and WhatsApp number.'],
]
