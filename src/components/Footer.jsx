import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

export default function Footer() {
  const toast = useToast()
  const [email, setEmail] = useState('')

  const subscribe = (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Please enter a valid email address.', { title: 'Almost there' })
    setEmail('')
    toast('Welcome to the list — 10% off your first order is on its way.', { title: 'You’re in' })
  }

  return (
    <footer className="site-footer">
      <div className="container foot-grid">
        <div className="foot-brand">
          <Link to="/" className="brand brand-light">nelove<em>.</em></Link>
          <p>
            A modern house of style — shoes, clothing and bags for people who dress like they mean it.
            Designed in Lagos, worn everywhere.
          </p>
          <form className="foot-news" onSubmit={subscribe}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for 10% off your first order"
              aria-label="Email address"
            />
            <button className="btn-gold" type="submit">Join</button>
          </form>
        </div>
        <nav className="foot-col" aria-label="Shop">
          <h4>Shop</h4>
          <Link to="/shop">All pieces</Link>
          <Link to="/shop/shoes">Shoes</Link>
          <Link to="/shop/clothing">Clothing</Link>
          <Link to="/shop/bags">Bags</Link>
        </nav>
        <nav className="foot-col" aria-label="House">
          <h4>The House</h4>
          <a href="#story" onClick={(e) => e.preventDefault()}>Our story</a>
          <a href="#atelier" onClick={(e) => e.preventDefault()}>The atelier</a>
          <a href="#journal" onClick={(e) => e.preventDefault()}>Journal</a>
          <a href="#careers" onClick={(e) => e.preventDefault()}>Careers</a>
        </nav>
        <nav className="foot-col" aria-label="Support">
          <h4>Support</h4>
          <a href="#shipping" onClick={(e) => e.preventDefault()}>Shipping & delivery</a>
          <a href="#returns" onClick={(e) => e.preventDefault()}>Returns — 30 days</a>
          <a href="#size-guide" onClick={(e) => e.preventDefault()}>Size guide</a>
          <a href="#contact" onClick={(e) => e.preventDefault()}>hello@nelove.ng</a>
        </nav>
      </div>
      <div className="container foot-base">
        <span>© 2026 nelove. All rights reserved.</span>
        <span className="foot-pay">Visa · Mastercard · Verve · Paystack · Pay on Delivery</span>
      </div>
    </footer>
  )
}
