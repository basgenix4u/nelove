import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useToast } from '../../context/ToastContext'
import { Chip, Empty, Modal, SearchBar, Spinner, money, dateNice } from '../ui'

const STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'failed']
const FLOW = { pending: ['paid', 'cancelled', 'failed'], paid: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: ['pending'], failed: ['pending'] }

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const [orders, setOrders] = useState(null)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const status = params.get('status') || ''

  const load = async () => {
    try {
      const d = await api.admin.orders({ status, search })
      setOrders(d.orders)
    } catch (e) {
      toast(e.message, { title: 'Load failed' })
      setOrders([])
    }
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (target) => {
    if (!detail || busy) return
    setBusy(true)
    try {
      await api.admin.setOrderStatus(detail.id, target, note || undefined)
      toast(`Order is now ${target}.`, { title: detail.number })
      setDetail((d) => ({ ...d, status: target }))
      load()
    } catch (e) {
      toast(e.message, { title: 'Not allowed' })
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = (s) => s[0].toUpperCase() + s.slice(1)

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Orders</h1>
          <p className="sub">Fulfil, track and keep customers happy.</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Order #, name or email…">
        <select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </SearchBar>

      {!orders ? <Spinner label="Loading orders…" /> : orders.length === 0 ? (
        <Empty title="No orders here" body="New orders appear the moment a customer checks out." />
      ) : (
        <div className="acard" style={{ padding: 6 }}>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.number} style={{ cursor: 'pointer' }} onClick={() => { setDetail(o); setNote(o.adminNote || '') }}>
                    <td className="strong">{o.number}</td>
                    <td>
                      <div className="strong">{o.name}</div>
                      <div className="muted">{o.email}</div>
                    </td>
                    <td className="muted">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                    <td className="strong">{money(o.total)}</td>
                    <td className="muted">{o.paymentMethod}</td>
                    <td><Chip value={o.status} /></td>
                    <td className="muted">{dateNice(o.createdAt)}</td>
                    <td><button className="abtn sm">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <Modal wide title={detail.number} sub={`Placed ${dateNice(detail.createdAt)} · ${detail.paymentMethod}`} onClose={() => setDetail(null)}>
          <div className="apill-row" style={{ marginBottom: 6 }}>
            <Chip value={detail.status} label={statusLabel(detail.status)} />
            {detail.discountCode && <span className="aChip ghost">code {detail.discountCode}</span>}
            {detail.paystackRef && <span className="aChip ghost">ref {detail.paystackRef}</span>}
          </div>

          <div className="ord-meta">
            <div><small>Customer</small><p>{detail.name}<br />{detail.email}<br />{detail.phone}</p></div>
            <div><small>Deliver to</small><p>{detail.address}<br />{detail.city}, {detail.state}</p></div>
            <div><small>Delivery</small><p>{detail.deliveryMethod} · {money(detail.deliveryFee)}<br />Arrives {detail.eta}</p></div>
            <div><small>Totals</small><p>Subtotal {money(detail.subtotal)}<br />Discount −{money(detail.discount)}<br /><strong>{money(detail.total)}</strong></p></div>
          </div>

          <table className="atable">
            <thead><tr><th></th><th>Item</th><th>Size</th><th>Qty</th><th style={{ textAlign: 'right' }}>Line</th></tr></thead>
            <tbody>
              {detail.items.map((it, i) => (
                <tr key={i}>
                  <td><img className="thumb" src={it.image} alt="" /></td>
                  <td><div className="strong">{it.name}</div><div className="muted">{it.color}</div></td>
                  <td className="muted">{it.size || '—'}</td>
                  <td className="muted">{it.qty}</td>
                  <td className="strong" style={{ textAlign: 'right' }}>{money(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mrow" style={{ marginTop: 14 }}>
            <label>Internal note (kept with the order)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transfer confirmed at 14:03" />
          </div>

          <div className="status-flow">
            {FLOW[detail.status].length === 0 ? (
              <span className="ahint">This order is in a final state{detail.status === 'cancelled' ? '' : ''}.</span>
            ) : (
              FLOW[detail.status].map((s) => (
                <button key={s} className={`abtn sm${s === 'cancelled' || s === 'failed' ? ' red' : ''}`} disabled={busy} onClick={() => setStatus(s)}>
                  Mark {s}{s === 'cancelled' ? ' (restocks)' : ''} →
                </button>
              ))
            )}
          </div>
          {detail.adminNote && <p className="ahint">Note: {detail.adminNote}</p>}
        </Modal>
      )}
    </>
  )
}
