import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmt } from '../utils'
import Stars from './Stars'
import { useCatalog } from '../context/CatalogContext'

export default function CartDrawer({ open, onClose, lastAdded }) {
  const { items, setQty, remove, subtotal, count } = useCart()
  const { products, freeShip } = useCatalog()
  const navigate = useNavigate()
  const toFree = Math.max(0, freeShip - subtotal)
  const suggestions = products
    .filter((p) => !items.some((l) => l.productId === p.id) && Object.values(p.stock || {}).some((q) => q > 0))
    .slice(0, 2)

  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`cart-drawer${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="cart-head">
          <h2>
            Your Bag {count > 0 && <span className="cart-head-count">{count}</span>}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close bag">×</button>
        </div>

        {items.length > 0 && (
          <div className="ship-meter">
            {toFree > 0 ? (
              <p>You’re <strong>{fmt(toFree)}</strong> away from free delivery</p>
            ) : (
              <p className="ship-meter-done">✦ Free delivery unlocked</p>
            )}
            <div className="ship-bar">
              <i style={{ width: `${Math.min(100, (subtotal / freeShip) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
                <path d="M6 8h12l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" />
              </svg>
              <h3>Your bag is empty</h3>
              <p>Fill it with something beautiful.</p>
              <button className="btn-ink" onClick={() => { onClose(); navigate('/shop') }}>Start shopping</button>
              {lastAdded && (
                <p className="cart-bump">Psst — the <Link to={`/product/${lastAdded}`} onClick={onClose}>piece you just viewed</Link> is still waiting.</p>
              )}
            </div>
          ) : (
            <>
              <ul className="cart-lines">
                {items.map((l) => (
                  <li key={l.id} className="cart-line">
                    <Link to={`/product/${l.productId}`} onClick={onClose} className="cart-line-img">
                      <img src={l.image} alt={l.name} />
                    </Link>
                    <div className="cart-line-info">
                      <div className="cart-line-top">
                        <h4><Link to={`/product/${l.productId}`} onClick={onClose}>{l.name}</Link></h4>
                        <button className="cart-line-x" onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`}>×</button>
                      </div>
                      <p className="cart-line-variant">
                        {l.size && l.size !== 'One Size' && <>Size {l.size} · </>}{l.color}
                      </p>
                      <div className="cart-line-foot">
                        <div className="qty">
                          <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease quantity">−</button>
                          <span>{l.qty}</span>
                          <button onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <strong>{fmt(l.price * l.qty)}</strong>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cart-upsell">
                <h5>Complete the look</h5>
                {suggestions.map((p) => (
                  <div key={p.id} className="upsell-row">
                    <img src={p.image} alt={p.name} />
                    <div>
                      <strong>{p.name}</strong>
                      <span><Stars value={p.rating} size={10} /> {fmt(p.price)}</span>
                    </div>
                    <Link className="btn-ghost-sm" to={`/product/${p.id}`} onClick={onClose}>View</Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-foot">
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>{fmt(subtotal)}</strong>
            </div>
            <p className="cart-note">Delivery & taxes calculated at checkout. Pay on delivery available.</p>
            <button className="btn-gold btn-wide" onClick={() => { onClose(); navigate('/checkout') }}>
              Checkout securely
            </button>
            <button className="linkish" onClick={() => { onClose(); navigate('/shop') }}>Continue shopping</button>
          </div>
        )}
      </aside>
    </>
  )
}
