import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { writeJSON, LAST_ORDER_KEY } from '../utils'
import { useSeo } from '../hooks/useSeo'

/** Paystack redirects here after hosted checkout. We verify server-side, then
 *  persist the order snapshot and hand off to the confirmation page. */
export default function PaymentCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { clear } = useCart()
  const [state, setState] = useState({ phase: 'verifying', error: null })
  const ran = useRef(false)

  useSeo({ title: 'Confirming payment', noindex: true })

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) {
      setState({ phase: 'error', error: 'No payment reference came back from the gateway.' })
      return
    }
    ;(async () => {
      try {
        clear()
        const d = await api.payVerify(reference)
        if (d.status === 'paid') {
          writeJSON(LAST_ORDER_KEY, d.order)
          navigate('/order-success', { replace: true })
          return
        }
        writeJSON(LAST_ORDER_KEY, d.order)
        navigate('/order-success', { replace: true }) // failed orders show retry options
      } catch (e) {
        setState({ phase: 'error', error: e.message || 'We could not verify this payment.' })
      }
    })()
  }, [params, navigate, clear])

  return (
    <main className="container notfound" style={{ textAlign: 'center', paddingTop: 140 }}>
      {state.phase === 'verifying' ? (
        <>
          <span className="pay-spinner" aria-hidden />
          <h1>Confirming your payment…</h1>
          <p>Talking to Paystack — this takes a second.</p>
        </>
      ) : (
        <>
          <h1>We couldn’t confirm that payment</h1>
          <p>{state.error}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 18 }}>
            <Link to="/account" className="btn-ink btn-lg">Check my orders</Link>
            <Link to="/shop" className="btn-ghost-sm">Back to the shop</Link>
          </div>
        </>
      )}
    </main>
  )
}
