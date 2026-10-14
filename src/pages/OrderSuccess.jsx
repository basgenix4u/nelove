import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt, readJSON, LAST_ORDER_KEY } from '../utils'
import { useSeo } from '../hooks/useSeo'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { api } from '../api'

const BURST = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  delay: (i % 13) * 0.12,
  size: 7 + ((i * 7) % 9),
  hue: ['#5F3EF8', '#F6E27A', '#ED99E1', '#34D399', '#C4B5FD'][i % 5],
}))

const PAYMENT_LABEL = { card: 'Card — Paystack', transfer: 'Bank transfer', pod: 'Pay on delivery' }
const STATUS_LABEL = { pending: 'Awaiting confirmation', paid: 'Confirmed', processing: 'Being prepared', shipped: 'On its way', delivered: 'Delivered', failed: 'Payment failed', cancelled: 'Cancelled' }

export default function OrderSuccess() {
  const order = readJSON(LAST_ORDER_KEY, null)
  const { store } = useCatalog()
  const toast = useToast()
  const [retrying, setRetrying] = useState(false)

  useSeo({ title: 'Order confirmed', noindex: true })

  const retryPayment = async () => {
    setRetrying(true)
    try {
      const pay = await api.payInitialize(order.number)
      window.location.assign(pay.authorizationUrl)
    } catch (e) {
      toast(e.message || 'Online payment is not available yet — use bank transfer below.', { title: 'Almost there' })
    } finally {
      setRetrying(false)
    }
  }

  if (!order) {
    return (
      <main className="container notfound">
        <h1>No recent order found</h1>
        <p>Your orders will appear here right after checkout — or in your account if you’re signed in.</p>
        <Link to="/shop" className="btn-ink btn-lg">Continue shopping</Link>
      </main>
    )
  }

  const needsAction = order.payment === 'transfer' && order.status !== 'paid'
  const hedFailed = order.status === 'failed'
  const isFinal = order.status === 'paid' || order.payment !== 'transfer'

  return (
    <main className="success container">
      {!hedFailed && (
        <div className="burst" aria-hidden>
          {BURST.map((b) => (
            <i
              key={b.id}
              style={{
                left: `${b.left}%`,
                width: b.size,
                height: b.size * 1.6,
                background: b.hue,
                animationDelay: `${b.delay}s`,
                rotate: `${(b.id * 47) % 360}deg`,
              }}
            />
          ))}
        </div>
      )}

      <div className="success-card reveal">
        <span className="success-tick" aria-hidden>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="eyebrow">Order {order.number}</p>
        <h1>
          {hedFailed
            ? <>Payment didn’t go through, {order.name.split(' ')[0]}.</>
            : <>Thank you, {order.name.split(' ')[0]}. <em>{needsAction ? 'One step left.' : 'It’s on its way.'}</em></>}
        </h1>
        <p className="success-sub">
          A confirmation is on its way to <strong>{order.email}</strong>. Status: <strong>{STATUS_LABEL[order.status] || order.status}</strong>.
        </p>

        {needsAction && store.bank_account_number && (
          <div className="bank-panel">
            <h4>Complete your bank transfer of {fmt(order.total)}</h4>
            <p className="bank-box">{store.bank_account_name} · {store.bank_name} · <strong>{store.bank_account_number}</strong></p>
            <p className="hint">Use <strong>{order.number}</strong> as the payment reference — we confirm transfers within minutes on working days and your pieces ship immediately after.</p>
            <button className="btn-ghost-sm" onClick={retryPayment} disabled={retrying}>
              {retrying ? 'Opening…' : 'Pay by card instead →'}
            </button>
          </div>
        )}
        {hedFailed && (
          <div className="bank-panel">
            <h4>Your order {order.number} is reserved for 24 hours</h4>
            <p className="hint">Nothing was charged. You can retry securely below — or choose bank transfer / pay on delivery.</p>
            <button className="btn-gold" onClick={retryPayment} disabled={retrying}>
              {retrying ? 'Opening…' : 'Retry card payment'}
            </button>
          </div>
        )}
        {order.payment === 'pod' && (
          <p className="success-sub small">Please have {fmt(order.total)} ready (cash or POS) when the courier arrives.</p>
        )}

        <div className="success-facts">
          <div><h4>Arriving</h4><p>{order.eta}</p></div>
          <div><h4>Deliver to</h4><p>{order.address}</p></div>
          <div><h4>Payment</h4><p>{PAYMENT_LABEL[order.payment] || order.payment}</p></div>
        </div>

        <ul className="success-lines">
          {order.items.map((l, i) => (
            <li key={i}>
              <img src={l.image} alt="" />
              <span>{l.name}<small>{l.size && l.size !== 'One Size' ? `Size ${l.size} · ` : ''}{l.color} × {l.qty}</small></span>
              <strong>{fmt(l.price * l.qty)}</strong>
            </li>
          ))}
        </ul>
        <div className="success-total">
          {order.deliveryFee === 0 && <span className="ship-meter-done">✦ Free delivery unlocked</span>}
          <span>Total</span>
          <strong>{fmt(order.total)}</strong>
        </div>

        <div className="success-actions">
          <Link to="/shop" className="btn-gold btn-lg">Continue shopping</Link>
          <Link to="/account" className="btn-ghost-sm">Track in my account</Link>
        </div>
      </div>
    </main>
  )
}
