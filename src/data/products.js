import { hashString } from '../utils.js'

/* ------------------------------------------------------------------ */
/*  Review pools — names & voices from the shop's Lagos clientele      */
/* ------------------------------------------------------------------ */
const REVIEWERS = [
  'Adaeze O.', 'Tunde B.', 'Sarah M.', 'Kemi A.', 'Ibrahim D.', 'Ngozi E.',
  'Daniel K.', 'Funmi A.', 'Chidi N.', 'Aisha B.', 'Tolu O.', 'Emeka U.',
  'Halima S.', 'David O.', 'Blessing E.', 'Yemi A.', 'Zara M.', 'Femi A.',
]
const REVIEW_DATES = [
  '12 Aug 2026', '28 Aug 2026', '3 Sep 2026', '9 Sep 2026', '14 Sep 2026',
  '21 Sep 2026', '25 Sep 2026', '29 Sep 2026', '2 Oct 2026', '6 Oct 2026', '10 Oct 2026',
]
const TITLES = {
  5: ['Absolutely in love', 'Worth every kobo', 'My new favourite', 'Exceeds every expectation', "Can't stop wearing it", 'Pure luxury'],
  4: ['Really lovely piece', 'Great, with room to grow', 'Beautiful quality', 'Very happy', 'Almost perfect', 'Solid purchase'],
  3: ['Nice, not flawless', 'Good for the price', 'Decent piece'],
}
const BODIES = {
  5: [
    'The quality genuinely surprised me — the material feels premium and the finishing is immaculate. Got compliments the very first day I wore it out.',
    'Ordered on Sunday, delivered to my desk in Lekki by Wednesday. It looks even better in person than in the photos. nelove has a loyal customer now.',
    'Everything about this feels considered — from the packaging to the stitching. I have bought from international high-street brands that do not come close.',
    'I wore it to a wedding in Abuja and three different people asked where it was from. Fits true to size and the colour is rich and exactly as pictured.',
    'This is my second nelove order and the consistency is impressive. The fabric has a beautiful weight and it has survived multiple washes without fading.',
    'Bought it as a gift for my sister and she has not stopped talking about it. The attention to detail is on another level entirely.',
  ],
  4: [
    'Really good quality for the price. Took one star off because delivery took a day longer than promised, but the piece itself is beautiful.',
    'Lovely craftsmanship and the fit is almost perfect — I would size up if you are between sizes. Otherwise, highly recommend.',
    'The colour is slightly deeper than in the photos which I actually prefer. Feels sturdy and well-made. Will buy again.',
    'Beautiful piece, though I wish there were more colour options. The quality of the material is genuinely top tier.',
  ],
  3: [
    'It is a good piece for the price, though the sizing runs a little small. Customer service sorted my exchange quickly, which I appreciated.',
    'Decent quality overall. The material is nice but I expected a slightly more structured fit. Still happy with the purchase though.',
  ],
}
const CATEGORY_BODIES = {
  shoes: {
    5: [
      'Walked around Yaba market all afternoon in these and my feet did not complain once. The cushioning is brilliant and they go with everything.',
      'The leather is soft from day one — no painful breaking-in period. True to size and the grip is solid even on wet tiles.',
    ],
    4: ['Comfortable straight out of the box. Runs very slightly narrow, so wide feet should size up half. Otherwise flawless.'],
  },
  bags: {
    5: [
      'It fits my 13-inch laptop, a makeup pouch and a water bottle with room to spare — and still looks structured. The hardware feels expensive.',
      'Three months of daily use and it still looks brand new. The leather is developing a beautiful patina. Best bag purchase I have made in years.',
    ],
    4: ['Gorgeous everyday bag. The strap hardware squeaked a little at first but settled after a week. Holds its shape beautifully.'],
  },
  clothing: {
    5: [
      'The tailoring is exceptional — it sits exactly right on the shoulders and the fabric drapes beautifully. Feels made-to-measure.',
      'Wore this to a gallery opening and felt like the best-dressed person in the room. The fabric breathes well even in Lagos heat.',
    ],
    4: ['Beautiful fabric and cut. It wrinkles a touch after a long day, but honestly that is the nature of good fabric. Fits true to the size chart.'],
  },
}

function seedReviews(product) {
  const rnd = hashString('nelove:' + product.id)
  const count = product.reviewCount
  const avg = product.rating
  const reviews = []
  let sum = 0
  const used = new Set()
  for (let i = 0; i < count; i++) {
    let rating = i === 0 ? Math.round(avg) : Math.min(5, Math.max(3, Math.round(avg + (rnd() % 3) - 1)))
    if (avg >= 4.5 && i > 2) rating = 4 + (rnd() % 2)
    sum += rating
    let nameIdx = rnd() % REVIEWERS.length
    while (used.has(nameIdx)) nameIdx = (nameIdx + 1) % REVIEWERS.length
    used.add(nameIdx)
    const catBodies = CATEGORY_BODIES[product.category]?.[rating]
    const body =
      catBodies && rnd() % 2 === 0 ? catBodies[rnd() % catBodies.length] : BODIES[rating][rnd() % BODIES[rating].length]
    reviews.push({
      name: REVIEWERS[nameIdx],
      rating,
      title: TITLES[rating][rnd() % TITLES[rating].length],
      body,
      date: REVIEW_DATES[(rnd() % REVIEW_DATES.length + i) % REVIEW_DATES.length],
      helpful: 3 + (rnd() % 34),
      verified: rnd() % 10 < 8,
    })
  }
  // nudge first review so average stays honest
  reviews.sort((a, b) => b.helpful - a.helpful)
  return reviews
}

const withReviews = (p) => ({ ...p, reviews: seedReviews(p) })

/* ------------------------------------------------------------------ */
/*  Catalogue                                                          */
/* ------------------------------------------------------------------ */
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
const CLOTH_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export const products = [
  /* ------------------------------ SHOES ------------------------------ */
  withReviews({
    id: 'aira-court-sneaker',
    name: 'Aira Court Sneaker',
    line: 'The Everyday Icons',
    category: 'shoes',
    price: 38500,
    oldPrice: 46000,
    rating: 4.6,
    reviewCount: 4,
    image: '/images/shoe-aira.jpg',
    badge: 'Sale',
    colors: ['#F5F2EC', '#181410'],
    colorNames: ['Cloud White', 'Noir'],
    sizes: SHOE_SIZES,
    short: 'A featherlight leather court sneaker that goes with absolutely everything.',
    description:
      'Cut from butter-soft full-grain leather on a cushioned cup sole, the Aira is the sneaker you will reach for every single morning. A padded collar, breathable lining and hand-finished edges make it feel broken-in from the very first wear — no pain, all gain.',
    details: [
      'Full-grain leather upper, stitched not glued',
      'Cushioned OrthoLite-style insole, removable',
      'Natural rubber cup sole with subtle nelove emboss',
      'Handmade in Lagos; dust bag included',
    ],
  }),
  withReviews({
    id: 'vela-sport-sneaker',
    name: 'Vela Sport Sneaker',
    line: 'The Everyday Icons',
    category: 'shoes',
    price: 41200,
    oldPrice: null,
    rating: 4.8,
    reviewCount: 5,
    image: '/images/shoe-vela.jpg',
    badge: 'Bestseller',
    colors: ['#F5F2EC', '#2E4A62', '#181410'],
    colorNames: ['White / Noir', 'Steel Blue', 'All Black'],
    sizes: SHOE_SIZES,
    short: 'A perforated leather retro court profile with understated contrast heel.',
    description:
      'The Vela reworks a seventies court silhouette for right now: crisp perforated leather, a contrast heel tab and a slim, city-ready profile. It is the quiet flex — polished enough for a canoe of occasions, comfortable enough for all of them.',
    details: [
      'Perforated calf leather upper',
      'Contrast heel counter in matte finish',
      'Padded tongue and collar, all-day cushioning',
      'Fits true to size',
    ],
  }),
  withReviews({
    id: 'onyx-stiletto-pump',
    name: 'Onyx Stiletto Pump',
    line: 'After Dark',
    category: 'shoes',
    price: 52000,
    oldPrice: null,
    rating: 4.7,
    reviewCount: 4,
    image: '/images/shoe-onyx.jpg',
    badge: 'Bestseller',
    colors: ['#181410'],
    colorNames: ['Onyx Patent'],
    sizes: SHOE_SIZES.slice(0, 7),
    short: 'The definitive black stiletto — 100mm of pure invitation.',
    description:
      'Every wardrobe earns its Onyx. A knife-sharp 100mm stiletto in glossy patent leather, balanced on a hidden comfort platform that makes hours feel like minutes. Boardroom at nine, owambe by seven — it never misses.',
    details: [
      'Patent calf leather upper, leather lining',
      '100mm covered stiletto heel',
      'Cushioned leather footbed',
      'Protective sole film — remove before first wear',
    ],
  }),
  withReviews({
    id: 'seraphine-rouge-pump',
    name: 'Séraphine Rouge Pump',
    line: 'After Dark',
    category: 'shoes',
    price: 54500,
    oldPrice: null,
    rating: 4.9,
    reviewCount: 5,
    image: '/images/shoe-rouge.jpg',
    badge: 'New',
    colors: ['#7A1420'],
    colorNames: ['Rouge Patent'],
    sizes: SHOE_SIZES.slice(0, 7),
    short: 'A lacquered red stiletto that walks into the room before you do.',
    description:
      'Séraphine is theatre. Mirror-glazed rouge patent sculpted over a 105mm heel, with a silhouette so clean it looks drawn in one stroke. Wear it to be remembered — it pairs beautifully with little black dresses and loud entrances.',
    details: [
      'High-shine patent leather in signature Rouge',
      '105mm lacquered heel',
      'Pointed toe, cushioned insole',
      'Arrives in a keepsake nelove box',
    ],
  }),
  withReviews({
    id: 'legacy-chelsea-boot',
    name: 'Legacy Chelsea Boot',
    line: 'The Everyday Icons',
    category: 'shoes',
    price: 64000,
    oldPrice: 74000,
    rating: 4.8,
    reviewCount: 4,
    image: '/images/shoe-chelsea.jpg',
    badge: 'Sale',
    colors: ['#181410', '#5A3A22'],
    colorNames: ['Noir', 'Cognac'],
    sizes: SHOE_SIZES,
    short: 'Goodyear-welted, mirror-polished, built for a decade of wear.',
    description:
      'The Legacy is the last Chelsea boot you will need for years: full-grain leather, Goodyear welt construction and elastic gussets that keep their snap. It polishes up for dinner and shrugs off the rain on the way there.',
    details: [
      'Full-grain aniline leather',
      'Goodyear welted — resoleable for life',
      'Elastic side gussets, rear pull loops',
      'Storm-sealed rubber outsole',
    ],
  }),
  withReviews({
    id: 'aurora-heeled-sandal',
    name: 'Aurora Heeled Sandal',
    line: 'After Dark',
    category: 'shoes',
    price: 44750,
    oldPrice: null,
    rating: 4.9,
    reviewCount: 3,
    image: '/images/shoe-aurora.jpg',
    badge: 'New',
    colors: ['#EDE0C8', '#181410'],
    colorNames: ['Pearl', 'Noir'],
    sizes: SHOE_SIZES.slice(0, 7),
    short: 'Lace-up straps and a sculpted block heel — daylight to dance floor.',
    description:
      'Aurora wraps the ankle in slender laces and lifts you on a walkable sculpted block heel. The pearl satin catches light like the first hour of morning — hence the name. Weddings, rooftop dinners, anywhere the evening might go long.',
    details: [
      'Satin upper with self-tie ankle laces',
      '85mm sculpted block heel',
      'Leather-lined, padded footbed',
      'Runs true to size',
    ],
  }),

  /* ------------------------------ BAGS ------------------------------- */
  withReviews({
    id: 'obi-structured-top-handle',
    name: 'Obi Structured Top-Handle',
    line: 'Carry Everything',
    category: 'bags',
    price: 74500,
    oldPrice: null,
    rating: 4.8,
    reviewCount: 5,
    image: '/images/bag-obi.jpg',
    badge: 'Bestseller',
    colors: ['#B4692D', '#181410'],
    colorNames: ['Burnt Sienna', 'Noir'],
    sizes: ['One Size'],
    short: 'Hand-finished sienna leather with a trapezoid silhouette that means business.',
    description:
      'Named for strength, the Obi is a study in structure: pebbled full-grain leather, a confident trapezoid body and hand-rolled top handles. A detachable shoulder strap takes it from power meetings to palm-wine Sundays without missing a beat.',
    details: [
      'Pebbled full-grain leather',
      'Detachable, adjustable shoulder strap',
      'Suede-touch lining, interior zip + slip pockets',
      'Protective metal feet; fits a 13" laptop',
    ],
  }),
  withReviews({
    id: 'gala-suede-clutch',
    name: 'Gala Suede Clutch',
    line: 'After Dark',
    category: 'bags',
    price: 32500,
    oldPrice: null,
    rating: 4.9,
    reviewCount: 4,
    image: '/images/bag-gala.jpg',
    badge: null,
    colors: ['#D8C3A5'],
    colorNames: ['Champagne Suede'],
    sizes: ['One Size'],
    short: 'An envelope clutch in champagne suede with a whisper of a gold chain.',
    description:
      'The Gala holds exactly what the evening demands: phone, card case, keys, lipstick, confidence. Buttery faux-suede folds into a clean envelope, and a fine curb chain tucks inside when you would rather carry it by hand.',
    details: [
      'Soft-touch premium faux suede',
      'Removable gold-tone curb chain (110cm)',
      'Magnetic envelope closure',
      'Interior card slots, fits all phone sizes',
    ],
  }),
  withReviews({
    id: 'noir-crescent-shoulder-bag',
    name: 'Lauren Crescent Shoulder Bag',
    line: 'Carry Everything',
    category: 'bags',
    price: 41900,
    oldPrice: null,
    rating: 4.5,
    reviewCount: 4,
    image: '/images/bag-noir.jpg',
    badge: 'Trending',
    colors: ['#F1EBE0'],
    colorNames: ['Ivory'],
    sizes: ['One Size'],
    short: 'A sculptural ivory crescent that sits just so under the arm.',
    description:
      'The crescent everyone is carrying — smooth ivory leather curved to hug the body, closed with a polished gold-tone zip. Compact outside, surprisingly organised inside, it makes every outfit look instantly intentional.',
    details: [
      'Smooth vegan leather with structured base',
      'Gold-tone hardware, smooth-glide zip',
      'Cotton-twill lining, zip + slip pockets',
      'Fits phone, small purse, sunglasses',
    ],
  }),
  withReviews({
    id: 'cora-fold-tote',
    name: 'Cora Fold Tote Duo',
    line: 'Carry Everything',
    category: 'bags',
    price: 58750,
    oldPrice: null,
    rating: 4.7,
    reviewCount: 4,
    image: '/images/bag-cora.jpg',
    badge: 'New',
    colors: ['#D9D3C7', '#7A4A2B'],
    colorNames: ['Stone / Saddle Duo', 'Saddle / Noir'],
    sizes: ['One Size'],
    short: 'Origami-fold leather that expands from day tote to everything-bag.',
    description:
      'Cora folds and unfolds like origami — a clever gusset lets it expand a full 40% when the day demands more. Smooth stone and saddle leathers, magnetic closure, and a silhouette that draws stares at the till.',
    details: [
      'Two-tone smooth calf leather',
      'Expanding origami gusset (+40% capacity)',
      'Magnetic top closure, interior organiser',
      'Fits a 15" laptop when expanded',
    ],
  }),
  withReviews({
    id: 'voyager-leather-weekender',
    name: 'Voyager Leather Weekender',
    line: 'The Journey Edit',
    category: 'bags',
    price: 92000,
    oldPrice: null,
    rating: 4.9,
    reviewCount: 5,
    image: '/images/bag-voyager.jpg',
    badge: 'Bestseller',
    colors: ['#181410'],
    colorNames: ['Noir'],
    sizes: ['One Size'],
    short: 'A full-grain duffle for the two-day escape — cabin-sized, statement-grade.',
    description:
      'The Voyager swallows a long weekend: two pairs of shoes, three looks and a camera, all inside a cabin-legal silhouette of thick full-grain leather. Solid brass fittings, a wide-mouth zip and handles that only get better with mileage.',
    details: [
      'Thick full-grain leather, waxed finish',
      'IATA cabin-size compliant (55 × 25 × 35cm)',
      'Solid brass hardware, wide-mouth opening',
      'Separate ventilated shoe compartment',
    ],
  }),
  withReviews({
    id: 'sahara-saddle-crossbody',
    name: 'Sahara Saddle Crossbody',
    line: 'The Journey Edit',
    category: 'bags',
    price: 47200,
    oldPrice: 54900,
    rating: 4.6,
    reviewCount: 4,
    image: '/images/bag-sahara.jpg',
    badge: 'Sale',
    colors: ['#9C6B3C'],
    colorNames: ['Desert Tan'],
    sizes: ['One Size'],
    short: 'A desert-tan saddle bag born for farmers markets and far-flung terminals.',
    description:
      'Inspired by the dunes at golden hour, the Sahara is a hands-free saddle silhouette in sun-warmed tan leather. The flap closes with a satisfying magnetic snap, and the adjustable strap wears crossbody or on the shoulder.',
    details: [
      'Vegetable-tanned leather, develops rich patina',
      'Magnetic snap flap, slip back pocket',
      'Adjustable crossbody strap (100–125cm)',
      'Fits phone, cardholder, keys, compact sunscreen',
    ],
  }),

  /* ---------------------------- CLOTHING ----------------------------- */
  withReviews({
    id: 'lagos-line-blazer',
    name: 'Lagos Line Blazer',
    line: 'Tailored Stories',
    category: 'clothing',
    price: 72500,
    oldPrice: null,
    rating: 4.8,
    reviewCount: 5,
    image: '/images/cloth-lagos-blazer.jpg',
    badge: 'Bestseller',
    colors: ['#C2714F', '#181410'],
    colorNames: ['Terracotta', 'Noir'],
    sizes: CLOTH_SIZES,
    short: 'A double-breasted terracotta blazer, cut sharp and lined soft.',
    description:
      'Power, tailored in terracotta. The Lagos Line is a double-breasted blazer with a strong, soft shoulder, real horn-effect buttons and a breathable half-lining built for city heat. Wear it over everything — it handles the rest.',
    details: [
      'Wool-touch crepe with fluid drape',
      'Double-breasted, peak lapel, six-button front',
      'Half-lined for breathability in warm climates',
      'Functional flap pockets; dry clean recommended',
    ],
  }),
  withReviews({
    id: 'harbour-knit-blazer',
    name: 'Harbour Knit Blazer',
    line: 'Tailored Stories',
    category: 'clothing',
    price: 64000,
    oldPrice: null,
    rating: 4.6,
    reviewCount: 4,
    image: '/images/cloth-harbour-knit.jpg',
    badge: null,
    colors: ['#1F2A44'],
    colorNames: ['Midnight Navy'],
    sizes: CLOTH_SIZES,
    short: 'A deconstructed knitted blazer that reads boardroom, wears like a cardigan.',
    description:
      'The Harbour is tailoring without the starch: a deconstructed, knitted navy blazer with the ease of your favourite cardigan and the silhouette of a suit jacket. Roll it into a carry-on, pull it out, look composed.',
    details: [
      'Midweight cotton knit, fully fashioned',
      'Unstructured shoulder, patch pockets',
      'Wrinkle-resistant — travel approved',
      'Machine washable on gentle cycle',
    ],
  }),
  withReviews({
    id: 'amara-satin-slip-dress',
    name: 'Amara Satin Midi Dress',
    line: 'Occasion, Elevated',
    category: 'clothing',
    price: 49900,
    oldPrice: null,
    rating: 4.7,
    reviewCount: 4,
    image: '/images/cloth-amara.jpg',
    badge: 'New',
    colors: ['#9DA98A'],
    colorNames: ['Sage'],
    sizes: CLOTH_SIZES,
    short: 'Liquid sage satin with flutter sleeves and a midi-length swish.',
    description:
      'Amara pours over the body like water: bias-cut sage satin, soft flutter sleeves and a midi hem that moves a half-second after you do. Dinner dates, garden parties, any RSVP that says "dress up" — answered.',
    details: [
      'Heavyweight matte satin, bias cut',
      'V-neckline with flutter sleeves',
      'Concealed side zip, midi length',
      'Hand wash cold, hang dry',
    ],
  }),
  withReviews({
    id: 'ivory-muse-gown',
    name: 'Ivory Muse Gown',
    line: 'Occasion, Elevated',
    category: 'clothing',
    price: 88000,
    oldPrice: null,
    rating: 4.9,
    reviewCount: 5,
    image: '/images/cloth-ivory-gown.jpg',
    badge: 'Iconic',
    colors: ['#EEF0EA'],
    colorNames: ['Ivory'],
    sizes: CLOTH_SIZES,
    short: 'A flowing ivory statement gown with gallery-opening energy.',
    description:
      'The Muse is the gown people photograph: layers of feather-light ivory georgette engineered to float, with a sculpted bodice that holds its own. Limited cut per season — when your size sells out, it is gone until next year.',
    details: [
      'Feather-light layered georgette',
      'Sculpted bodice with internal structure',
      'Floor-skimming hem, concealed back zip',
      'Limited seasonal cut; specialist dry clean',
    ],
  }),
  withReviews({
    id: 'sunset-gala-gown',
    name: 'Sunset Gala Gown',
    line: 'Occasion, Elevated',
    category: 'clothing',
    price: 96000,
    oldPrice: null,
    rating: 5.0,
    reviewCount: 3,
    image: '/images/cloth-sunset-gown.jpg',
    badge: 'Iconic',
    colors: ['#B0477A'],
    colorNames: ['Sunset Ombré'],
    sizes: CLOTH_SIZES,
    short: 'Hand-draped ombré silk that turns every entrance into the golden hour.',
    description:
      'Six metres of hand-draped silk dyed in a sunset ombré — saffron melting into orchid into night. Each Sunset Gala is cut and draped by hand, so no two are identical. This is the dress of the photograph everyone keeps.',
    details: [
      'Hand-draped silk chiffon, one-of-one ombré dye',
      'Sculpted one-shoulder bodice',
      'Approx. 6m of silk in the skirt alone',
      'Made to order option available; dry clean only',
    ],
  }),
  withReviews({
    id: 'adaeze-ankara-dress',
    name: 'Adaeze Ankara Midi Dress',
    line: 'Heritage, Reimagined',
    category: 'clothing',
    price: 56500,
    oldPrice: null,
    rating: 4.8,
    reviewCount: 5,
    image: '/images/cloth-adaeze.jpg',
    badge: 'Bestseller',
    colors: ['#2E5B3E'],
    colorNames: ['Botanical Print'],
    sizes: CLOTH_SIZES,
    short: 'A puff-sleeve ankara midi celebrating botanical wax prints.',
    description:
      'Adaeze — "daughter of the king" — wears like it sounds. A botanical wax-print midi with sculpted puff sleeves, a nipped waist and a skirt with real presence. The print is placed by hand so every seam line honours the pattern.',
    details: [
      'Authentic premium wax-print cotton',
      'Sculpted puff sleeves, smocked bodice',
      'Hand-placed print matching at every seam',
      'Machine washable; colourfast guaranteed',
    ],
  }),
  withReviews({
    id: 'zuri-kimono-set',
    name: 'Zuri Kimono Co-ord Set',
    line: 'Heritage, Reimagined',
    category: 'clothing',
    price: 68500,
    oldPrice: 79000,
    rating: 4.7,
    reviewCount: 4,
    image: '/images/cloth-zuri.jpg',
    badge: 'Sale',
    colors: ['#C0392B'],
    colorNames: ['Festival Print'],
    sizes: CLOTH_SIZES,
    short: 'A bold ankara kimono and co-ord — resort energy, Lagos soul.',
    description:
      'Zuri means beautiful, and the set delivers: a sweeping ankara kimono over a matching co-ord, equally at home poolside in Zanzibar or at a Victoria Island day party. Wear the pieces together for maximum ceremony or split them across a dozen outfits.',
    details: [
      'Three-piece set: kimono, top and wide-leg trouser',
      'Vivid colourfast ankara wax print',
      'Kimono with deep side slits and belt',
      'Mix-and-match designed; gentle wash cold',
    ],
  }),
]

/* ------------------------------------------------------------------ */
/*  Catalogue helpers                                                  */
/* ------------------------------------------------------------------ */
export const productById = (id) => products.find((p) => p.id === id)

export const CATEGORY_LABELS = { shoes: 'Shoes', bags: 'Bags', clothing: 'Clothing' }

export const priceMin = Math.min(...products.map((p) => p.price))
export const priceMax = Math.max(...products.map((p) => p.price))

export const allSizesFor = (cat) =>
  [...new Set(products.filter((p) => p.category === cat).flatMap((p) => p.sizes))].sort()
