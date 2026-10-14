import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useCatalog } from '../context/CatalogContext'
import { fmt, readJSON, writeJSON, LAST_ORDER_KEY } from '../utils'
import { useSeo } from '../hooks/useSeo'

const NAIJA_STATES = ['Abuja FCT', 'Lagos', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']

const formInitial = {
  email: '', phone: '', first: '', last: '', address: '', city: '', state: 'Lagos',
  method: 'standard', payment: 'card', discount: '',
}

const METHOD_META = {
  standard: { id: 'standard', name: 'Standard delivery', info: 'Nationwide, tracked' },
  express: { id: 'express', name: 'Express — Lagos & Abuja', info: 'Order before 2pm' },
  pickup: { id: 'pickup', name: 'Atelier pickup — Lekki', info: '14 Admiralty Way, Lekki Phase 1' },
}

export function normalizePlacedOrder({ order, items }) {
  return {
    number: order.number,
    reference: order.paystackRef,
    email: order.email,
    name: order.name,
    address: `${order.address}, ${order.city}, ${order.state}`,
    eta: order.eta,
    payment: order.paymentMethod,
    deliveryMethod: order.deliveryMethod,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    placedAt: order.createdAt,
    discountCode: order.discountCode,
    items: items.map((l) => ({ name: l.name, qty: l.qty, price: l.price, size: l.size, color: l.color, image: l.image })),
  }
}

export default function Checkout() {
  const { items: cartItems, clear } = useCart()
  const { delivery } = useCatalog()
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => {
    const saved = readJSON('nelove:checkout:v1', {})
    return { ...formInitial, ...saved }
  })
  const [placing, setPlacing] = useState(false)
  const [quote, setQuote] = useState(null)
  const [quoteErr, setQuoteErr] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const quoteSeq = useRef(0)

  useSeo({ title: 'Secure checkout', noindex: true })

  useEffect(() => {
    if (user && !form.email) persist({ ...form, email: user.email, first: form.first || user.name.split(' ')[0] || '', last: form.last || user.name.split(' ').slice(1).join(' ') || '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const persist = (next) => {
    setForm(next)
    const { discount, ...rest } = next
    writeJSON('nelove:checkout:v1', rest)
  }

  const itemsPayload = useMemo(
    () => cartItems.map((l) => ({ productId: l.productId, size: l.size, color: l.color, qty: l.qty })),
    [cartItems]
  )

  /* --------- server-authoritative quote (debounced) --------- */
  useEffect(() => {
    if (cartItems.length === 0) return
    const seq = ++quoteSeq.current
    setQuoting(true)
    const t = setTimeout(async () => {
      try {
        const q = await api.quote({
          items: itemsPayload,
          deliveryMethod: form.method,
          paymentMethod: form.payment,
          discountCode: form.discount.trim(),
        })
        if (seq !== quoteSeq.current) return
        setQuote(q)
        setQuoteErr(null)
      } catch (e) {
        if (seq !== quoteSeq.current) return
        setQuoteErr(e)
        // invalid discount shouldn't block checkout — quote without it
        if (/code|MIN_SPEND|INVALID|EXPIRED|EXHAUSTED/i.test(e.code || '')) {
          try {
            const q = await api.quote({ items: itemsPayload, deliveryMethod: form.method, paymentMethod: form.payment, discountCode: '' })
            if (seq === quoteSeq.current) setQuote(q)
          } catch (e2) {
            if (seq === quoteSeq.current) setQuoteErr(e2)
          }
        }
      } finally {
        if (seq === quoteSeq.current) setQuoting(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [itemsPayload, form.method, form.payment, form.discount, cartItems.length])

  const errors = useMemo(() => {
    const e = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number'
    if (!form.first.trim()) e.first = 'Required'
    if (!form.last.trim()) e.last = 'Required'
    if (form.address.trim().length < 6) e.address = 'Enter a full street address'
    if (!form.city.trim()) e.city = 'Required'
    return e
  }, [form])

  const step1Ok = !errors.email && !errors.phone && !errors.first && !errors.last && !errors.address && !errors.city

  const subtotal = quote?.subtotal ?? cartItems.reduce((s, l) => s + l.price * l.qty, 0)
  const discount = quote?.discount ?? 0
  const shippingFee = quote?.deliveryFee ?? null
  const total = quote?.total ?? subtotal
  const eta = quote?.eta ?? '—'

  const feeLabel = (m) => {
    if (m.id === 'pickup') return 'Free'
    if (m.id === 'express') return fmt(delivery.express_fee ?? 5000)
    const base = delivery.standard_fee ?? 2500
    return subtotal >= (delivery.free_ship_threshold ?? 75000) ? <><s>{fmt(base)}</s> Free</> : fmt(base)
  }

  const placeOrder = async () => {
    if (placing || !quote) return
    setPlacing(true)
    try {
      const placed = await api.placeOrder({
        customer: {
          email: form.email.trim(),
          name: `${form.first.trim()} ${form.last.trim()}`,
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state,
        },
        items: itemsPayload,
        deliveryMethod: form.method,
        paymentMethod: form.payment,
        discountCode: form.discount.trim(),
      })
      const lastOrder = normalizePlacedOrder(placed)
      writeJSON(LAST_ORDER_KEY, lastOrder)
      clear()

      if (form.payment === 'card') {
        try {
          const pay = await api.payInitialize(lastOrder.number)
          toast('Taking you to our secure payment page…', { title: 'Order reserved' })
          window.location.assign(pay.authorizationUrl)
          return
        } catch (e) {
          if (e.code === 'PAYMENTS_NOT_CONFIGURED') {
            toast('Card payment is being configured — your order is reserved; choose transfer or pay on delivery.', { title: 'One step left' })
            navigate('/order-success', { state: { orderNumber: lastOrder.number, incomplete: true } })
            return
          }
          throw e
        }
      }
      navigate('/order-success', { state: { orderNumber: lastOrder.number } })
    } catch (e) {
      if (e.code === 'OUT_OF_STOCK' || e.code === 'UNKNOWN_PRODUCT') {
        toast(e.message, { title: 'Bag needs a tweak' })
        window.location.reload()
        return
      }
      toast(e.message || 'Could not place your order right now.', { title: 'Something’s off' })
    } finally {
      setPlacing(false)
    }
  }

  if (cartItems.length === 0 && !placing) {
    return (
      <main className="container notfound">
        <h1>Your bag is empty</h1>
        <p>Add a few beautiful things first, then come back to check out.</p>
        <Link to="/shop" className="btn-ink btn-lg">Back to the shop</Link>
      </main>
    )
  }

  return (
    <main className="container checkout">
      <div className="check-head reveal">
        <h1>Secure checkout</h1>
        <ol className="steps" aria-label="Progress">
          {['Details', 'Payment', 'Review'].map((s, i) => (
            <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}>
              <span>{step > i + 1 ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </div>

      <div className="check-grid">
        <div className="check-main">
          {/* ---------------- STEP 1 — DETAILS ---------------- */}
          {step === 1 && (
            <section className="panel reveal">
              <h2>Where is it going?</h2>
              {!user && (
                <p className="hint" style={{ marginBottom: 14 }}>
                  Have an account? <Link to="/sign-in" className="linkish">Sign in</Link> for faster checkout and order history.
                </p>
              )}
              <div className="frow">
                <label className={errors.email && form.email ? 'bad' : ''}>
                  Email
                  <input type="email" value={form.email} onChange={(e) => persist({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
                  {errors.email && form.email && <em>{errors.email}</em>}
                </label>
                <label className={errors.phone && form.phone ? 'bad' : ''}>
                  Phone
                  <input type="tel" value={form.phone} onChange={(e) => persist({ ...form, phone: e.target.value })} placeholder="0803 000 0000" autoComplete="tel" />
                  {errors.phone && form.phone && <em>{errors.phone}</em>}
                </label>
              </div>
              <div className="frow">
                <label>
                  First name
                  <input value={form.first} onChange={(e) => persist({ ...form, first: e.target.value })} placeholder="Adaeze" autoComplete="given-name" />
                </label>
                <label>
                  Last name
                  <input value={form.last} onChange={(e) => persist({ ...form, last: e.target.value })} placeholder="Okafor" autoComplete="family-name" />
                </label>
              </div>
              <label>
                Street address
                <input value={form.address} onChange={(e) => persist({ ...form, address: e.target.value })} placeholder="12 Bourdillon Rd, Ikoyi" autoComplete="street-address" />
              </label>
              <div className="frow">
                <label>
                  City
                  <input value={form.city} onChange={(e) => persist({ ...form, city: e.target.value })} placeholder="Lagos" autoComplete="address-level2" />
                </label>
                <label>
                  State
                  <select value={form.state} onChange={(e) => persist({ ...form, state: e.target.value })}>
                    {NAIJA_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <h3 className="panel-sub">Delivery speed</h3>
              <div className="ship-methods">
                {Object.values(METHOD_META).map((m) => (
                  <button
                    key={m.id}
                    className={`ship-method${form.method === m.id ? ' on' : ''}`}
                    onClick={() => persist({ ...form, method: m.id })}
                  >
                    <span className="ship-radio" aria-hidden />
                    <span className="ship-info">
                      <strong>{m.name}</strong>
                      <small>{quote && form.method === m.id ? quote.eta : ''} · {m.info}</small>
                    </span>
                    <span className="ship-fee">{feeLabel(m)}</span>
                  </button>
                ))}
              </div>

              <div className="panel-actions">
                <button
                  className="btn-gold btn-lg btn-wide"
                  disabled={!step1Ok}
                  onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                  Continue to payment
                </button>
                {!step1Ok && <p className="hint">Fill in the highlighted contact & address fields to continue.</p>}
              </div>
            </section>
          )}

          {/* ---------------- STEP 2 — PAYMENT ---------------- */}
          {step === 2 && (
            <section className="panel reveal">
              <h2>How would you like to pay?</h2>
              <div className="pay-methods">
                {[
                  ['card', 'Card — via Paystack', 'Visa, Mastercard, Verve · secured on Paystack’s page'],
                  ['transfer', 'Bank transfer', 'Get the account details after you place the order'],
                  ['pod', 'Pay on delivery', 'Cash or POS at your door'],
                ].map(([v, label, sub]) => (
                  <button key={v} className={`ship-method${form.payment === v ? ' on' : ''}`} onClick={() => persist({ ...form, payment: v })}>
                    <span className="ship-radio" aria-hidden />
                    <span className="ship-info"><strong>{label}</strong><small>{sub}</small></span>
                  </button>
                ))}
              </div>

              {form.payment === 'card' && (
                <div className="alt-pay">
                  <p className="secure-note">🔒 You’ll complete payment on <strong>Paystack’s secure page</strong> — your card details never touch our servers. We verify every payment server-side before your order is confirmed.</p>
                </div>
              )}
              {form.payment === 'transfer' && (
                <div className="alt-pay">
                  <p>Place your order and we’ll show the bank details with your reference. We confirm transfers within minutes on working days.</p>
                  <p><strong>Use your order number as the payment reference.</strong></p>
                </div>
              )}
              {form.payment === 'pod' && (
                <div className="alt-pay">
                  <p>Pay <strong>{fmt(total)}</strong> cash or by POS when your order arrives. Please have someone available to receive the package.</p>
                </div>
              )}

              <div className="panel-actions split">
                <button className="btn-ghost-sm" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="btn-gold btn-lg"
                  onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                  Review order
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 3 — REVIEW ---------------- */}
          {step === 3 && (
            <section className="panel reveal">
              <h2>One last look</h2>
              <ul className="review-lines">
                {cartItems.map((l) => (
                  <li key={l.id}>
                    <img src={l.image} alt="" />
                    <div>
                      <strong>{l.name}</strong>
                      <small>{l.size && l.size !== 'One Size' ? `Size ${l.size} · ` : ''}{l.color} · Qty {l.qty}</small>
                    </div>
                    <span>{fmt(l.price * l.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="review-facts">
                <div>
                  <h4>Deliver to</h4>
                  <p>{form.first} {form.last}<br />{form.address}<br />{form.city}, {form.state}<br />{form.phone}</p>
                </div>
                <div>
                  <h4>Delivery</h4>
                  <p>{METHOD_META[form.method].name}<br />Arrives {eta}</p>
                </div>
                <div>
                  <h4>Payment</h4>
                  <p>{form.payment === 'card' ? 'Card via Paystack' : form.payment === 'transfer' ? 'Bank transfer' : 'Pay on delivery'}</p>
                </div>
              </div>
              {quoteErr && (
                <p className="hint" style={{ color: 'var(--red)' }}>{quoteErr.message}</p>
              )}
              <div className="panel-actions split">
                <button className="btn-ghost-sm" onClick={() => setStep(2)} disabled={placing}>← Back</button>
                <button className="btn-gold btn-lg" onClick={placeOrder} disabled={placing || !quote || quoting}>
                  {placing ? 'Placing your order…' : `Place order — ${fmt(total)}`}
                </button>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>Stock is reserved only once payment is confirmed (card) or the order is placed (transfer / delivery).</p>
            </section>
          )}
        </div>

        {/* ---------------- SUMMARY ---------------- */}
        <aside className="summary reveal">
          <h3>Order summary</h3>
          <ul className="summary-lines">
            {cartItems.map((l) => (
              <li key={l.id}>
                <span className="summary-thumb">
                  <img src={l.image} alt="" />
                  <em>{l.qty}</em>
                </span>
                <span className="summary-name">{l.name}<small>{l.color}</small></span>
                <span>{fmt(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="discount-row">
            <input
              value={form.discount}
              onChange={(e) => persist({ ...form, discount: e.target.value.toUpperCase() })}
              placeholder="Discount code"
              aria-label="Discount code"
            />
            {form.discount && quote?.discount > 0 && <span className="discount-ok">−{fmt(quote.discount)}</span>}
          </div>
          {quoteErr && /code|spend|MIN_SPEND|EXPIRED|EXHAUSTED/i.test((quoteErr.code || '') + quoteErr.message) && form.discount && (
            <p className="hint" style={{ color: 'var(--red)', marginTop: 4 }}>{quoteErr.message}</p>
          )}

          <div className="summary-totals">
            <div><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {discount > 0 && <div className="summary-discount"><span>Discount {quote?.discountCode ? `(${quote.discountCode})` : ''}</span><span>−{fmt(discount)}</span></div>}
            <div><span>Delivery</span><span>{shippingFee == null ? '…' : shippingFee === 0 ? 'Free' : fmt(shippingFee)}</span></div>
            <div className="grand"><span>Total</span><strong>{fmt(total)}</strong></div>
          </div>
          <p className="summary-eta">Arrives {eta} · 30-day free returns</p>
        </aside>
      </div>
    </main>
  )
}
