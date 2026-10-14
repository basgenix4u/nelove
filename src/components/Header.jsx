import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { fmt } from '../utils'

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const on = () => setY(window.scrollY)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return y
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  if (!user) {
    return (
      <button className="icon-btn" onClick={() => navigate('/sign-in')} aria-label="Sign in">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.5-3.6 4.2-5.5 7.5-5.5s6 1.9 7.5 5.5" />
        </svg>
      </button>
    )
  }
  const first = user.name.split(' ')[0] || 'You'
  return (
    <div className="acct" ref={ref}>
      <button className="icon-btn acct-btn" onClick={() => setOpen((s) => !s)} aria-haspopup="menu" aria-expanded={open} aria-label={`Account — ${first}`}>
        <span aria-hidden>{first.slice(0, 1).toUpperCase()}</span>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <p className="acct-hello">Hello, {first}</p>
          <Link to="/account" role="menuitem" onClick={() => setOpen(false)}>My orders & profile</Link>
          {user.role === 'admin' && <a href="/#/admin" role="menuitem" onClick={() => setOpen(false)}>Admin dashboard</a>}
          <button role="menuitem" className="acct-out" onClick={async () => { setOpen(false); await logout(); navigate('/') }}>Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function Header({ onCartOpen }) {
  const { count } = useCart()
  const { products, categories, categoryLabels, announcement, freeShip } = useCatalog()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const scrolled = useScrollY() > 600

  const results = q.trim()
    ? products.filter((p) => `${p.name} ${p.line} ${categoryLabels[p.category] || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : []

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60)
  }, [searchOpen])

  useEffect(() => {
    document.body.classList.toggle('menu-locked', menuOpen)
    return () => document.body.classList.remove('menu-locked')
  }, [menuOpen])

  const go = (path) => {
    setSearchOpen(false)
    setMenuOpen(false)
    setQ('')
    navigate(path)
  }

  const marquee = announcement.length
    ? announcement
    : [`Free delivery over ${fmt(freeShip)}`, 'Easy 30-day returns, always']

  return (
    <>
      <div className={`announcement-bar${scrolled ? ' scrolled' : ''}`} aria-hidden={false}>
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((n) => (
              <div className="marquee-half" key={n} aria-hidden={n === 1}>
                {marquee.concat(marquee).map((m, i) => (
                  <span key={i}>{m} <em>✦</em></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container header-in">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>

          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden>n</span>elove<em>.</em>
          </Link>

          <nav className="nav-desktop" aria-label="Primary">
            <NavLink to="/shop" end>Shop All</NavLink>
            {categories.slice(0, 4).map((c) => (
              <NavLink key={c.slug} to={`/shop/${c.slug}`}>{c.name}</NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearchOpen((s) => !s)} aria-label="Search">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
              </svg>
            </button>
            <AccountMenu />
            <button className="icon-btn cart-btn" onClick={onCartOpen} aria-label={`Open shopping bag, ${count} items`}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M6 8h12l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" />
              </svg>
              {count > 0 && <span className="cart-count" aria-hidden>{count}</span>}
            </button>
          </div>
        </div>

        <div className={`search-drawer${searchOpen ? ' open' : ''}`}>
          <div className="container">
            <div className="search-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && go(`/shop?search=${encodeURIComponent(q)}`)}
                placeholder="Search gowns, sneakers, totes…"
                aria-label="Search products"
              />
              <button className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">×</button>
            </div>
            {q.trim() && (
              <div className="search-results">
                {results.length === 0 && <p className="search-empty">Nothing found for “{q}” — try “dress”, “sneaker” or “leather”.</p>}
                {results.map((p) => (
                  <button key={p.id} className="search-hit" onClick={() => go(`/product/${p.id}`)}>
                    <img src={p.image} alt="" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{categoryLabels[p.category] || p.category} · {fmt(p.price)}</small>
                    </span>
                  </button>
                ))}
                {results.length > 0 && (
                  <button className="search-all" onClick={() => go(`/shop?search=${encodeURIComponent(q)}`)}>
                    See all results →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`nav-mobile${menuOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="nav-mobile-head">
          <span className="brand brand-light"><span className="brand-mark" aria-hidden>n</span>elove<em>.</em></span>
          <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
        </div>
        <nav>
          {[['Shop All', '/shop'], ...categories.map((c) => [c.name, `/shop/${c.slug}`]), ['My orders', '/account'], ['Checkout', '/checkout']].map(
            ([label, to]) => (
              <button key={to} className="nav-mobile-link" onClick={() => go(to)} style={{ '--rd': '0ms' }}>
                {label} <span aria-hidden>→</span>
              </button>
            )
          )}
        </nav>
        <p className="nav-mobile-foot">Designed in Lagos. Worn everywhere.</p>
      </div>
      <div className={`scrim${menuOpen ? ' show' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden />
    </>
  )
}
