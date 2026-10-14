import { Suspense, lazy } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './admin.css'
import { useAuth } from '../context/AuthContext'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Products = lazy(() => import('./views/Products'))
const ProductForm = lazy(() => import('./views/ProductForm'))
const Categories = lazy(() => import('./views/Categories'))
const Orders = lazy(() => import('./views/Orders'))
const Customers = lazy(() => import('./views/Customers'))
const Reviews = lazy(() => import('./views/Reviews'))
const Discounts = lazy(() => import('./views/Discounts'))
const Content = lazy(() => import('./views/Content'))
const Settings = lazy(() => import('./views/Settings'))

const NAV = [
  ['/admin', 'Dashboard', 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', true],
  ['/admin/products', 'Products', 'M20 7 12 3 4 7v10l8 4 8-4V7zM12 3v8m8-4-8 4M4 7l8 4', false],
  ['/admin/categories', 'Categories', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', false],
  ['/admin/orders', 'Orders', 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18m-9 0V2', false],
  ['/admin/customers', 'Customers', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m22 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13-7a4 4 0 0 1 0 6.9', false],
  ['/admin/reviews', 'Reviews', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', false],
  ['/admin/discounts', 'Discounts', 'M9 9h.01M15 15h.01M16 8l-7 7M19 5l-8.59 8.59a2 2 0 0 1-.53 1.87L8 17l-3-3 1.54-1.88a2 2 0 0 1 1.87-.53L19 5zM21 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z', false],
  ['/admin/content', 'Homepage', 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586', false],
  ['/admin/settings', 'Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', false],
]

function SideNav({ pendingReviews }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <aside className="admin-side">
      <a className="admin-brand" href="/#/"><span className="brand-mark">n</span>admin.</a>
      <nav className="admin-nav">
        {NAV.map(([to, label, d, end]) => (
          <NavLink key={to} to={to} end={end}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={d} />
            </svg>
            {label}
            {to === '/admin/reviews' && pendingReviews > 0 && <span className="acount">{pendingReviews}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="admin-side-foot">
        <a href="/#/" target="_blank" rel="noreferrer">View storefront ↗</a>
        <span style={{ padding: '4px 12px', color: 'rgba(250,248,242,.45)', fontSize: 12 }}>{user?.email}</span>
        <button onClick={async () => { await logout(); navigate('/') }}>Sign out →</button>
      </div>
    </aside>
  )
}

import { useState } from 'react'
function AdminLogin() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      if (user.role !== 'admin') setError('This account does not have admin access.')
    } catch (err) {
      setError(err.message || 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="acard">
        <span className="brand-mark">n</span>
        <h1>nelove admin</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>Email
            <input type="email" required autoComplete="username" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@nelove.ng" />
          </label>
          <label>Password
            <input type="password" required autoComplete="current-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </label>
          {error && <span className="aerr" role="alert">{error}</span>}
          <button className="abtn violet wide" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const { user, ready } = useAuth()

  return (
    <div className="admin">
      {!ready ? (
        <div className="admin-login"><div className="acard" style={{ textAlign: 'center' }}><span className="aspinner" /></div></div>
      ) : !user || user.role !== 'admin' ? (
        <AdminLogin />
      ) : (
        <>
          <SideNav pendingReviews={0} />
          <main className="admin-main">
            <Suspense fallback={<div className="aloading"><span className="aspinner" /> Loading…</div>}>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="categories" element={<Categories />} />
                <Route path="orders" element={<Orders />} />
                <Route path="customers" element={<Customers />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="content" element={<Content />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </main>
        </>
      )}
    </div>
  )
}
