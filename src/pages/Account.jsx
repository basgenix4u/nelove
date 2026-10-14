import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useSeo } from '../hooks/useSeo'
import { useToast } from '../context/ToastContext'
import { fmt } from '../utils'
import Stars from '../components/Stars'

const STATUS_LABEL = {
  pending: 'Awaiting confirmation', paid: 'Confirmed', processing: 'Being prepared',
  shipped: 'On its way', delivered: 'Delivered', failed: 'Payment failed', cancelled: 'Cancelled',
}
const STATUS_CLS = {
  pending: 'yellow', paid: 'mint', processing: 'violet', shipped: 'violet', delivered: 'mint', failed: 'red', cancelled: 'red',
}

export default function Account() {
  const { user, ready, logout, setUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '' })

  useSeo({ title: 'My account' })

  useEffect(() => {
    if (ready && !user) navigate('/sign-in?next=/account', { replace: true })
  }, [ready, user, navigate])

  useEffect(() => {
    if (!user) return
    api.myOrders().then((d) => setOrders(d.orders)).catch(() => setOrders([]))
    setProfile({ name: user.name || '', phone: user.phone || '' })
  }, [user])

  if (!ready || !user) return null

  const saveProfile = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const d = await api.updateProfile(profile)
      setUser(d.user)
      toast('Profile updated.', { title: 'Saved ✦' })
    } catch (err) {
      toast(err.message || 'Could not save.', { title: 'Try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="account container">
      <div className="account-head reveal">
        <div>
          <p className="eyebrow">My account</p>
          <h1>Hello, {user.name.split(' ')[0] || 'there'}<span className="dot">.</span></h1>
        </div>
        <div className="account-actions">
          {user.role === 'admin' && <a href="/#/admin" className="btn-ghost-sm">Admin dashboard</a>}
          <button className="btn-ghost-sm" onClick={async () => { await logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      <div className="account-grid">
        <section className="account-orders reveal">
          <h2>Order history</h2>
          {orders === null ? (
            <p className="hint">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className="shop-empty" style={{ padding: '30px 0' }}>
              <h3>Nothing here yet</h3>
              <p>Your orders — pending, confirmed and delivered — will live in this space.</p>
              <Link to="/shop" className="btn-ink">Find your first piece</Link>
            </div>
          ) : (
            <ul className="order-list">
              {orders.map((o) => (
                <li key={o.number} className="order-card">
                  <header>
                    <div>
                      <strong>{o.number}</strong>
                      <small>{new Date(o.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                    </div>
                    <span className={`track-chip ${STATUS_CLS[o.status] || 'violet'}`}>{STATUS_LABEL[o.status] || o.status}</span>
                  </header>
                  <ul className="order-items">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        <img src={it.image} alt="" />
                        <span>{it.name}<small>{it.size && it.size !== 'One Size' ? `Size ${it.size} · ` : ''}{it.color} × {it.qty}</small></span>
                        <strong>{fmt(it.price * it.qty)}</strong>
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <span className="hint">Arrives {o.eta}</span>
                    <strong>{fmt(o.total)}</strong>
                  </footer>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="account-side reveal" style={{ '--rd': '90ms' }}>
          <form className="panel account-profile" onSubmit={saveProfile}>
            <h2>Profile</h2>
            <label>
              Full name
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} />
            </label>
            <label>
              Phone
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="0803 000 0000" />
            </label>
            <label>
              Email
              <input value={user.email} disabled />
            </label>
            <button className="btn-ink" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </form>

          <div className="panel account-perks">
            <h2>Your perks</h2>
            <ul>
              <li><Stars value={5} size={11} /> 10% off with code <strong>WELCOME10</strong></li>
              <li>✦ Free delivery over ₦75,000</li>
              <li>✦ 30-day returns, always</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
