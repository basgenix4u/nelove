import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { fmt, initials } from '../utils'
import Stars from '../components/Stars'
import ProductCard from '../components/ProductCard'
import { useToast } from '../context/ToastContext'
import { useSeo } from '../hooks/useSeo'
import { GridSkeleton } from '../components/Skeletons'

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`acc${open ? ' open' : ''}`}>
      <button className="acc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {title} <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      <div className="acc-body">{children}</div>
    </div>
  )
}

function stockLevelFor(p, size) {
  if (!size || !p?.stock) return null
  const n = p.stock[size]
  if (n == null) return null
  return n
}

export default function ProductDetail({ onAdd }) {
  const { id } = useParams()
  const toast = useToast()
  const { user } = useAuth()
  const { categoryLabels } = useCatalog()

  const [p, setP] = useState(null)
  const [related, setRelated] = useState([])
  const [reviewsData, setReviewsData] = useState({ reviews: [], summary: { count: 0, rating: null, dist: [0, 0, 0, 0, 0] } })
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [helpfulVoted, setHelpfulVoted] = useState(() => new Set(JSON.parse(sessionStorage.getItem('nelove:helpful') || '[]')))
  const [form, setForm] = useState({ name: '', rating: 5, title: '', body: '' })
  const [posting, setPosting] = useState(false)

  useSeo({
    title: p ? p.name : undefined,
    description: p ? (p.short || p.description || '').slice(0, 155) : undefined,
    jsonLd: p
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          image: p.images.map((u) => (u.startsWith('http') ? u : location.origin + u)),
          description: p.short || p.description,
          brand: { '@type': 'Brand', name: 'nelove' },
          ...(p.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount } } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'NGN',
            price: p.price,
            availability: Object.values(p.stock || {}).some((n) => n > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }
      : undefined,
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setMissing(false)
    Promise.all([api.product(id), api.productReviews(id).catch(() => null)])
      .then(([pd, rd]) => {
        if (!alive) return
        setP(pd.product)
        setRelated(pd.related || [])
        if (rd) setReviewsData(rd)
        setColor(pd.product.colorNames[0])
        setSize(pd.product.sizes.length === 1 ? pd.product.sizes[0] : null)
        setQty(1)
        setZoom(false)
        setActiveImg(0)
        setForm((f) => ({ ...f, name: user?.name || f.name }))
      })
      .catch(() => { if (alive) setMissing(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { reviews, summary } = reviewsData
  const dist = useMemo(() => summary.dist || [0, 0, 0, 0, 0], [summary])

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 130 }}>
        <GridSkeleton count={4} />
      </main>
    )
  }

  if (missing || !p) {
    return (
      <main className="container notfound">
        <h1>That piece has sold through</h1>
        <p>The page you’re looking for isn’t in the house anymore.</p>
        <Link to="/shop" className="btn-ink btn-lg">Back to the shop</Link>
      </main>
    )
  }

  const selStock = stockLevelFor(p, size)
  const soldOut = p.sizes.length > 0 && p.sizes.every((s) => (p.stock?.[s] ?? 0) <= 0)

  const handleAdd = () => {
    if (p.sizes.length > 1 && !size) {
      toast('Please choose a size first.', { title: 'Almost there' })
      document.querySelector('.pdp-size')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (selStock != null && selStock <= 0) {
      toast('That size just sold out — try another.', { title: 'Sold out' })
      return
    }
    onAdd(p, { size, color, qty })
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (posting) return
    setPosting(true)
    try {
      const d = await api.postReview(p.id, { name: form.name, rating: Number(form.rating), title: form.title, body: form.body })
      setForm({ name: user?.name || '', rating: 5, title: '', body: '' })
      toast(
        d.moderated ? 'Thank you — your review is with our moderators and appears shortly.' : 'Thank you — your review is live.',
        { title: 'Review posted' }
      )
    } catch (err) {
      toast(err.message || 'Could not post your review.', { title: 'Try again' })
    } finally {
      setPosting(false)
    }
  }

  const voteHelpful = async (r) => {
    if (helpfulVoted.has(r.id)) return
    const next = new Set(helpfulVoted).add(r.id)
    setHelpfulVoted(next)
    sessionStorage.setItem('nelove:helpful', JSON.stringify([...next]))
    try {
      const d = await api.markHelpful(p.id, r.id)
      setReviewsData((prev) => ({
        ...prev,
        reviews: prev.reviews.map((x) => (x.id === r.id ? { ...x, helpful: d.helpful } : x)),
      }))
    } catch { /* vote already reflected locally */ }
  }

  const images = p.images?.length ? p.images : [p.image]

  return (
    <main className="pdp container">
      <nav className="crumbs reveal" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <span>/</span> <Link to={`/shop/${p.category}`}>{categoryLabels[p.category] || p.category}</Link> <span>/</span> <em>{p.name}</em>
      </nav>

      <div className="pdp-grid">
        {/* ---------- Media ---------- */}
        <div className="pdp-media reveal">
          <button
            className={`pdp-frame${zoom ? ' zoomed' : ''}`}
            onClick={() => setZoom(!zoom)}
            aria-label={zoom ? 'Zoom out' : 'Zoom in'}
          >
            <img src={images[activeImg]} alt={p.name} />
            {p.badge && <span className={`badge badge-${p.badge.toLowerCase()}`}>{p.badge}</span>}
            <span className="zoom-hint">{zoom ? '− close' : '+ zoom'}</span>
          </button>
          {images.length > 1 && (
            <div className="pdp-thumbs">
              {images.map((u, i) => (
                <button key={u + i} className={`pdp-thumb${i === activeImg ? ' on' : ''}`} onClick={() => setActiveImg(i)} aria-label={`Photo ${i + 1} of ${p.name}`}>
                  <img src={u} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Info ---------- */}
        <div className="pdp-info">
          <p className="eyebrow reveal">{p.line}</p>
          <h1 className="pdp-name reveal" style={{ '--rd': '60ms' }}>{p.name}</h1>

          <div className="pdp-rating reveal" style={{ '--rd': '110ms' }}>
            {p.rating ? (
              <>
                <Stars value={p.rating} size={15} />
                <strong>{Number(p.rating).toFixed(1)}</strong>
                <a href="#reviews" className="linkish">({p.reviewCount} {p.reviewCount === 1 ? 'review' : 'reviews'})</a>
              </>
            ) : (
              <a href="#reviews" className="linkish">Be the first to review</a>
            )}
          </div>

          <p className="pdp-price reveal" style={{ '--rd': '150ms' }}>
            {fmt(p.price)}
            {p.oldPrice && (
              <>
                <s>{fmt(p.oldPrice)}</s>
                <span className="save">Save {fmt(p.oldPrice - p.price)}</span>
              </>
            )}
          </p>

          <p className="pdp-short reveal" style={{ '--rd': '190ms' }}>{p.short}</p>

          {p.colorNames.length > 0 && (
            <div className="pdp-opt reveal" style={{ '--rd': '230ms' }}>
              <h4>Colour — <em>{color}</em></h4>
              <div className="swatches">
                {p.colors.map((c, i) => (
                  <button
                    key={c + i}
                    className={`swatch${color === p.colorNames[i] ? ' on' : ''}`}
                    style={{ background: c }}
                    title={p.colorNames[i]}
                    aria-label={`Colour ${p.colorNames[i]}`}
                    onClick={() => setColor(p.colorNames[i])}
                  />
                ))}
              </div>
            </div>
          )}

          {p.sizes.length > 1 && (
            <div className="pdp-opt pdp-size reveal" style={{ '--rd': '270ms' }}>
              <h4>
                Size {size ? `— ${size}` : ''}
                <button className="linkish size-guide" onClick={() => toast('Our pieces fit true to size. Between sizes? Take the larger.', { title: 'Size guide' })}>
                  Size guide
                </button>
              </h4>
              <div className="size-chips">
                {p.sizes.map((s) => {
                  const n = p.stock?.[s] ?? 0
                  return (
                    <button
                      key={s}
                      className={`${size === s ? 'on' : ''}${n <= 0 ? ' gone' : ''}`}
                      onClick={() => n > 0 && setSize(s)}
                      disabled={n <= 0}
                      title={n <= 0 ? 'Sold out' : n <= 3 ? `Only ${n} left` : undefined}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {selStock != null && selStock > 0 && selStock <= 3 && <p className="stock-note">Quick — only {selStock} left in this size.</p>}
            </div>
          )}

          <div className="pdp-buy reveal" style={{ '--rd': '310ms' }}>
            <div className="qty qty-lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            {soldOut ? (
              <button className="btn-ghost btn-lg btn-grow" disabled>Sold out — check back soon</button>
            ) : (
              <button className="btn-gold btn-lg btn-grow" onClick={handleAdd}>
                Add to bag — {fmt(p.price * qty)}
              </button>
            )}
          </div>

          <div className="pdp-assure reveal" style={{ '--rd': '350ms' }}>
            <div><strong>Free delivery</strong><span>over ₦75,000</span></div>
            <div><strong>Ships in 24h</strong><span>nationwide 2–5 working days</span></div>
            <div><strong>30-day returns</strong><span>free and painless</span></div>
            <div><strong>Pay on delivery</strong><span>or secure card / transfer</span></div>
          </div>

          <div className="pdp-accordion reveal" style={{ '--rd': '390ms' }}>
            <Accordion title="The details" defaultOpen>
              <ul>{(p.details || []).map((d) => <li key={d}>{d}</li>)}</ul>
            </Accordion>
            <Accordion title="Shipping & returns">
              <p>
                Orders placed before 2pm ship same day from Lagos. Next-day to Lagos & Abuja addresses, 2–4 working
                days nationwide, 5–8 days international. 30 days to return or exchange, free — just keep the tags on.
              </p>
            </Accordion>
            <Accordion title="Why nelove">
              <p>{p.description}</p>
            </Accordion>
          </div>
        </div>
      </div>

      {/* ---------- Reviews ---------- */}
      <section className="reviews reveal" id="reviews">
        <div className="reviews-head">
          <h2>Reviews</h2>
          <p>{summary.count} {summary.count === 1 ? 'review' : 'reviews'} · {summary.rating ? `${summary.rating} average` : 'no ratings yet'}</p>
        </div>
        <div className="reviews-grid">
          <aside className="reviews-summary">
            <div className="reviews-score">
              <strong>{summary.rating?.toFixed(1) ?? '—'}</strong>
              <Stars value={summary.rating || 0} size={16} />
              <span>{summary.count} verified {summary.count === 1 ? 'review' : 'reviews'}</span>
            </div>
            <div className="reviews-dist">
              {dist.map((n, i) => (
                <div className="dist-row" key={i}>
                  <span>{5 - i}★</span>
                  <div className="dist-bar"><i style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} /></div>
                  <span>{n}</span>
                </div>
              ))}
            </div>
            <form className="review-form" onSubmit={submitReview}>
              <h3>Share your take</h3>
              <label>
                Your rating
                <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5 - r)} — {['Poor', 'Fair', 'Good', 'Great', 'Excellent'][r - 1]}</option>)}
                </select>
              </label>
              <label>
                Name
                <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adaeze O." autoComplete="name" />
              </label>
              <label>
                Headline (optional)
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Worth every kobo" />
              </label>
              <label>
                Review
                <textarea required minLength={10} rows="4" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="How does it fit? How’s the quality?" />
              </label>
              <button className="btn-ink" type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post review'}</button>
              <p className="review-note">Reviews are moderated before they appear — usually within hours.</p>
            </form>
          </aside>

          <div className="reviews-list">
            {reviews.length === 0 && <p className="search-empty">No reviews yet — be the first to tell the world how it fits.</p>}
            {reviews.map((r) => (
              <article className="review" key={r.id}>
                <div className="review-top">
                  <span className="avatar" aria-hidden>{initials(r.name)}</span>
                  <div>
                    <strong>{r.name}</strong>
                    {r.verified ? <span className="verified">Verified buyer</span> : null}
                    <Stars value={r.rating} size={12} />
                  </div>
                  <time>{r.date}</time>
                </div>
                {r.title && <h4>{r.title}</h4>}
                <p>{r.body}</p>
                <button
                  className={`helpful${helpfulVoted.has(r.id) ? ' on' : ''}`}
                  onClick={() => voteHelpful(r)}
                  disabled={helpfulVoted.has(r.id)}
                >
                  Helpful ({(r.helpful ?? 0)})
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Related ---------- */}
      {related.length > 0 && (
        <section className="related">
          <div className="section-head reveal">
            <p className="eyebrow">Keep looking</p>
            <h2>You may also love</h2>
          </div>
          <div className="grid-products">
            {related.map((x, i) => (
              <ProductCard key={x.id} p={x} onQuickAdd={onAdd} index={i} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
