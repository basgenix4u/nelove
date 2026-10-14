import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { api } from '../api'
import ProductCard from '../components/ProductCard'
import Stars from '../components/Stars'
import { GridSkeleton } from '../components/Skeletons'
import { useToast } from '../context/ToastContext'
import { fmt } from '../utils'
import { useSeo } from '../hooks/useSeo'

const TICKER_WORDS = ['shoes', 'bags', 'clothing', 'occasionwear', 'heritage prints', 'everyday icons']

const DAYLINE = [
  { time: '09:12', title: 'Cut & checked', body: 'Your pieces are hand-checked and wrapped at the Lekki atelier.', chip: 'Prepared', chipCls: 'yellow', cls: 'track-chip yellow' },
  { time: '11:40', title: 'With the courier', body: 'Dispatch scans it in — you get tracking the same minute.', chip: 'Shipped', chipCls: 'violet', cls: 'track-chip violet' },
  { time: '16:05', title: 'Across town', body: 'Next-day in Lagos & Abuja, 2–4 days nationwide, tracked door to door.', chip: 'On its way', chipCls: 'pink', cls: 'track-chip violet' },
  { time: '18:30', title: 'At your door', body: 'Pay on delivery if you like. 30 days to change your mind, free.', chip: 'Delivered', chipCls: 'mint', cls: 'track-chip mint' },
]

const FALLBACK_COLLECTION_IMAGES = {
  shoes: '/images/shoe-onyx.jpg',
  clothing: '/images/cloth-sunset-gown.jpg',
  bags: '/images/bag-sahara.jpg',
}
const COLLECTION_TITLES = {
  shoes: { kicker: 'Footwear', title: 'The Legacy Shoe Room' },
  clothing: { kicker: 'Clothing', title: 'The Untold Story' },
  bags: { kicker: 'Carry', title: 'The Nomad Edit' },
}

const FALLBACK_HERO = {
  eyebrow: 'New season · The Golden Hour Edit',
  headline_a: 'Your wardrobe.',
  headline_b: 'All in one place.',
  sub: 'Shoes, clothing & bags for people who dress like they mean it. nelove curates, you decide. Designed in Lagos — worn everywhere.',
  cta_primary: { label: 'Shop the collection →', to: '/shop' },
  cta_secondary: { label: 'Explore shoes', to: '/shop/shoes' },
  micro: 'Free delivery over ₦75,000 · Pay on delivery nationwide · 30-day returns',
  featured_product: 'aira-court-sneaker',
}
const FALLBACK_TESTIMONIALS = [
  { quote: 'nelove is my first stop now. The quality rivals the international houses I used to import from — delivered to my door in Yaba within days.', name: 'Adaeze O.', role: 'Creative director, Lagos' },
  { quote: 'I styled three editorials with their pieces last season. The tailoring, the leather — it photographs like quiet luxury and wears like a dream.', name: 'Kemi A.', role: 'Fashion stylist, Abuja' },
  { quote: 'Ordered Tuesday, wore it to a wedding Saturday. Three people asked for the brand before the reception ended.', name: 'Tunde B.', role: 'Architect, Port Harcourt' },
]

const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Magnetic hover — element eases toward the cursor. */
function useMagnetic(strength = 0.28) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || reducedMotion()) return
    let raf
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)'
      el.style.transform = 'translate(0,0)'
      setTimeout(() => (el.style.transition = ''), 500)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [strength])
  return ref
}

/** Slight 3D tilt following the pointer, on desktop. */
function useTilt(max = 7) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || reducedMotion()) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform = `perspective(700px) rotateX(${-y * max}deg) rotateY(${x * max}deg)`
    }
    const leave = () => {
      el.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)'
      el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)'
      setTimeout(() => (el.style.transition = ''), 600)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [max])
  return ref
}

/** Simple parallax shift on scroll. */
function useParallax(speed = 0.08) {
  const ref = useRef(null)
  useEffect(() => {
    if (reducedMotion()) return
    let raf, ticking = false
    const update = () => {
      ticking = false
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      const center = r.top + r.height / 2 - window.innerHeight / 2
      el.style.transform = `translate3d(0, ${-center * speed}px, 0)`
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        raf = requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [speed])
  return ref
}

/** Count-up when scrolled into view. */
function Counter({ to, decimals = 0, duration = 1400 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf, started = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started) return
        started = true
        io.disconnect()
        if (reducedMotion()) return setVal(to)
        const t0 = performance.now()
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / duration)
          const eased = 1 - Math.pow(1 - p, 4)
          setVal(to * eased)
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])
  return <strong ref={ref}>{val.toFixed(decimals)}</strong>
}

/** Split a CMS headline into animated word-mask spans. */
function WordMask({ text, base = 0, emIdx = null }) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  return words.map((w, i) => (
    <span className="word" key={i} style={{ '--wd': `${base + i * 90}ms` }}>
      {emIdx !== null && emIdx.includes(i) ? <span><em>{w}</em></span> : <span>{w}</span>}
    </span>
  ))
}

export default function Home({ onAdd }) {
  const toast = useToast()
  const { products, categories, home, loading, error, productById } = useCatalog()
  const railRef = useRef(null)
  const slideBy = (dir) => railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })

  const hero = home?.hero?.headline_a ? home.hero : FALLBACK_HERO
  const editorial = home?.editorial || null
  const testimonials = home?.testimonials?.length ? home.testimonials : FALLBACK_TESTIMONIALS

  useSeo({
    title: null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: 'nelove',
      description: 'Shoes, clothing & bags designed in Lagos and worn everywhere.',
      url: typeof location !== 'undefined' ? location.origin : '',
      address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
      currenciesAccepted: 'NGN',
      paymentAccepted: 'Card, Bank Transfer, Pay on Delivery',
    },
  })

  const [t, setT] = useState(0)
  const [tVisible, setTVisible] = useState(true)
  useEffect(() => {
    if (testimonials.length < 2) return
    const id = setInterval(() => {
      setTVisible(false)
      setTimeout(() => {
        setT((i) => (i + 1) % testimonials.length)
        setTVisible(true)
      }, 420)
    }, 5200)
    return () => clearInterval(id)
  }, [testimonials.length])

  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const subscribe = async (e) => {
    e.preventDefault()
    if (subscribing) return
    setSubscribing(true)
    try {
      await api.subscribe(email)
      setEmail('')
      toast('Welcome to the nelove list — your 10% code is WELCOME10 at checkout.', { title: 'You’re in' })
    } catch (err) {
      toast(err.message || 'Could not subscribe right now — try again.', { title: 'Almost there' })
    } finally {
      setSubscribing(false)
    }
  }

  const heroP = home?.hero?.featured_product
    ? productById(home.hero.featured_product) || productById(FALLBACK_HERO.featured_product) || products[0]
    : productById(FALLBACK_HERO.featured_product) || products[0]

  const featured = products.filter((p) => p.badge).concat(products.filter((p) => !p.badge)).slice(0, 8)

  const cta1 = useMagnetic(0.3)
  const cta2 = useMagnetic(0.22)
  const tilt = useTilt(8)
  const parallaxArt = useParallax(0.07)

  return (
    <main>
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="hero">
        <div className="hero-grid-bg" aria-hidden />
        <svg className="hero-blob" style={{ right: '-7vw', top: '6vh', width: '44vw' }} viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#c4b5fd" strokeWidth="26" opacity="0.5" strokeDasharray="150 100" transform="rotate(24 100 100)" />
          <circle cx="100" cy="100" r="66" fill="none" stroke="#f6e27a" strokeWidth="20" opacity="0.55" strokeDasharray="90 130" transform="rotate(150 100 100)" />
        </svg>
        <div className="container hero-in">
          <div className="hero-copy">
            <p className="chip-tag chip-dot" style={{ '--rd': '0ms' }}>{hero.eyebrow}</p>
            <h1 className="hero-h1">
              <WordMask text={hero.headline_a} base={120} />
              <br />
              <WordMask text={hero.headline_b} base={330} emIdx={hero.headline_b ? [2, 3].filter((i) => i < hero.headline_b.split(/\s+/).length) : null} />
            </h1>
            <p className="hero-sub reveal" style={{ '--rd': '500ms' }}>{hero.sub}</p>
            <div className="hero-cta reveal" style={{ '--rd': '620ms' }}>
              <Link to={hero.cta_primary?.to || '/shop'} className="btn-violet btn-lg" ref={cta1}>{hero.cta_primary?.label || 'Shop the collection →'}</Link>
              <Link to={hero.cta_secondary?.to || '/shop'} className="btn-ghost btn-lg" ref={cta2}>{hero.cta_secondary?.label || 'Browse the shop'}</Link>
            </div>
            <p className="hero-micro reveal" style={{ '--rd': '740ms' }}>{hero.micro}</p>
          </div>

          <div className="hero-art" ref={parallaxArt}>
            {heroP && (
              <div className="sticker hero-polaroid tilt" ref={tilt}>
                <img src={heroP.image} alt={heroP.name} fetchPriority="high" />
                <div className="cap">
                  <span>
                    <strong>{heroP.name}</strong>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>{fmt(heroP.price)}</span>
                  </span>
                  <button className="buy-chip" onClick={() => onAdd(heroP, { size: heroP.sizes.length === 1 ? heroP.sizes[0] : null })}>+ Add</button>
                </div>
              </div>
            )}

            <div className="sticker hero-tracker">
              <h5><span>Order NLV-13408</span><span>Live</span></h5>
              <div className="track-row">Packed at atelier <span className="track-chip mint">Done</span></div>
              <div className="track-row">With the courier <span className="track-chip violet">Now</span></div>
              <div className="track-row">Arriving Thursday <span className="track-chip yellow">2 days</span></div>
              <div className="track-bar"><i /></div>
            </div>

            <div className="sticker hero-rating">
              <h5><span>Store rating</span><span>✦</span></h5>
              <span className="big">4.8</span>
              <Stars value={4.8} size={13} />
              <p>2,400+ verified reviews this season</p>
            </div>
          </div>
        </div>
        <div className="hero-scroll" aria-hidden><span />scroll</div>
      </section>

      {/* ------------------------- PRODUCT TICKER ------------------------- */}
      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[0, 1].map((n) => (
            <div className="ticker-half" key={n}>
              {TICKER_WORDS.concat(TICKER_WORDS).map((w, i) => (
                <span key={i}>{w} <em>✦</em></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------- COLLECTIONS --------------------------- */}
      <section className="section container">
        <div className="section-head reveal">
          <p className="sec-label"><span className="sec-num">01</span> — Three rooms, one house</p>
          <h2>Shop by collection<span className="dot">.</span></h2>
        </div>
        <div className="collections">
          {categories.map((c, i) => (
            <Link to={`/shop/${c.slug}`} className="collection reveal" style={{ '--rd': `${i * 90}ms` }} key={c.slug}>
              <img src={c.image || FALLBACK_COLLECTION_IMAGES[c.slug] || '/images/hero-poster.jpg'} alt={c.name} loading="lazy" />
              <span className="collection-veil" aria-hidden />
              <div className="collection-label">
                <small>{String(i + 1).padStart(2, '0')} · {COLLECTION_TITLES[c.slug]?.kicker || c.name}</small>
                <h3>{COLLECTION_TITLES[c.slug]?.title || c.name}</h3>
                <span className="collection-go">Shop {c.name.toLowerCase()} <i>→</i></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------- THE EDIT ----------------------------- */}
      <section className="section section-cream">
        <div className="container">
          <div className="section-head section-head-row reveal">
            <div>
              <p className="sec-label"><span className="sec-num">02</span> — Bestsellers &amp; icons</p>
              <h2>The edit<span className="dot">,</span> this week<span className="dot">.</span></h2>
            </div>
            <div className="rail-nav">
              <button className="icon-btn" onClick={() => slideBy(-1)} aria-label="Previous pieces">←</button>
              <button className="icon-btn" onClick={() => slideBy(1)} aria-label="Next pieces">→</button>
            </div>
          </div>
        </div>
        <div className="rail-wrap reveal">
          {loading ? (
            <div style={{ paddingInline: 20 }}><GridSkeleton count={4} /></div>
          ) : error ? (
            <p style={{ paddingInline: 20, fontFamily: 'var(--font-sans)' }}>Couldn’t load the edit — {error}</p>
          ) : (
            <div className="rail" ref={railRef}>
              {featured.map((p, i) => (
                <div className="rail-item" key={p.id}>
                  <ProductCard p={p} onQuickAdd={onAdd} index={i} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------ A DAY WITH NELOVE ----------------------- */}
      <section className="section container">
        <div className="section-head reveal">
          <p className="sec-label"><span className="sec-num">03</span> — A day with nelove</p>
          <h2>Your order, hour by hour<span className="dot">.</span></h2>
        </div>
        <div className="dayline">
          <div className="dayline-grid">
            {DAYLINE.map((d, i) => (
              <div className="day-card reveal" key={d.time} style={{ '--rd': `${i * 100}ms` }}>
                <span className="day-time">{d.time}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
                <span className={d.cls + ' day-chip'}>{d.chip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- EDITORIAL ---------------------------- */}
      <section className="editorial">
        <div className="container editorial-grid">
          <div className="editorial-media reveal">
            <img src={editorial?.image_main || '/images/cloth-zuri.jpg'} alt="Editorial look from the house" loading="lazy" />
            <img src={editorial?.image_float || '/images/editorial.jpg'} alt="Golden hour portrait" className="editorial-float" loading="lazy" />
          </div>
          <div className="editorial-copy">
            <p className="sec-label reveal" style={{ color: 'rgba(250,248,242,0.6)' }}><span className="sec-num">04</span> — The house</p>
            <h2 className="reveal" style={{ '--rd': '80ms' }}>{editorial?.headline_a || 'Designed in Lagos.'}<br /><em>{editorial?.headline_b || 'Worn everywhere.'}</em></h2>
            <p className="reveal" style={{ '--rd': '160ms' }}>
              {editorial?.body || 'nelove began in a two-room atelier off Admiralty Way with one conviction: that world-class craft doesn’t need a foreign postcode.'}
            </p>
            <div className="editorial-stats reveal" style={{ '--rd': '240ms' }}>
              <div><Counter to={products.length || 19} /><span>pieces this season</span></div>
              <div><Counter to={4.8} decimals={1} /><span>average rating</span></div>
              <div><Counter to={30} /><span>day returns</span></div>
            </div>
            <Link to="/shop/clothing" className="btn-light btn-lg reveal" style={{ '--rd': '320ms' }}>
              {editorial?.cta_label || 'Discover heritage, reimagined'}
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------- PILLARS ------------------------------ */}
      <section className="section container">
        <div className="pillars">
          {[
            ['✦', 'Hand-finished', 'Welted stitching, hand-placed prints and edges painted by people who care.'],
            ['→', 'Nationwide in days', 'Lagos & Abuja next-day; everywhere else in 2–4 working days.'],
            ['↺', '30 easy days', 'Changed your mind? Free returns and instant exchanges — no interrogation.'],
            ['₦', 'Pay your way', 'Cards, bank transfer or pay on delivery. All secured, all simple.'],
          ].map(([g, h, p], i) => (
            <div className="pillar reveal" key={h} style={{ '--rd': `${i * 90}ms` }}>
              <span className="pillar-glyph" aria-hidden>{g}</span>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------- TESTIMONIALS -------------------------- */}
      <section className="section section-cream">
        <div className="container testi">
          <p className="sec-label reveal" style={{ justifyContent: 'center' }}><span className="sec-num">05</span> — Word on the street</p>
          <span className="testi-mark" aria-hidden>”</span>
          <blockquote className={tVisible ? 'in' : ''} key={t}>
            <p>“{testimonials[t]?.quote}”</p>
            <footer>
              <Stars value={5} size={13} />
              <strong>{testimonials[t]?.name}</strong> — {testimonials[t]?.role}
            </footer>
          </blockquote>
          <div className="testi-dots" role="tablist" aria-label="Testimonials">
            {testimonials.map((_, i) => (
              <button key={i} role="tab" aria-selected={i === t} className={i === t ? 'on' : ''} onClick={() => setT(i)} aria-label={`Testimonial ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- NEWSLETTER --------------------------- */}
      <section className="section container newsletter reveal">
        <p className="sec-label" style={{ justifyContent: 'center' }}><span className="sec-num">06</span> — The nelove list</p>
        <h2>First looks, private sales, <em>10% off</em> your first order<span className="dot">.</span></h2>
        <form onSubmit={subscribe} className="news-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            required
          />
          <button className="btn-ink btn-lg" type="submit" disabled={subscribing}>{subscribing ? 'Joining…' : 'Join the list'}</button>
        </form>
        <small>One beautiful email a week · Unsubscribe anytime</small>
      </section>
    </main>
  )
}
