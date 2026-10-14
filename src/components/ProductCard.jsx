import { Link } from 'react-router-dom'
import { fmt } from '../utils'
import Stars from './Stars'

export default function ProductCard({ p, onQuickAdd, index = 0 }) {
  return (
    <article className="card reveal" style={{ '--rd': `${(index % 8) * 60}ms` }}>
      <Link to={`/product/${p.id}`} className="card-media" aria-label={p.name}>
        <img src={p.image} alt={p.name} loading="lazy" />
        {p.badge && <span className={`badge badge-${p.badge.toLowerCase()}`}>{p.badge}</span>}
        {p.oldPrice && (
          <span className="badge badge-off">-{Math.round((1 - p.price / p.oldPrice) * 100)}%</span>
        )}
        <span className="card-hover-hint">View piece</span>
      </Link>
      <div className="card-body">
        <div className="card-line">{p.line}</div>
        <h3 className="card-name">
          <Link to={`/product/${p.id}`}>{p.name}</Link>
        </h3>
        <div className="card-meta">
          <Stars value={p.rating} size={12} />
          <span className="card-reviews">({p.reviewCount})</span>
          <span className="dot" aria-hidden>·</span>
          <span className="colors" aria-label={`${p.colorNames.length} colours`}>
            {p.colors.slice(0, 4).map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
        </div>
        <div className="card-foot">
          <p className="price">
            {fmt(p.price)}
            {p.oldPrice && <s>{fmt(p.oldPrice)}</s>}
          </p>
          <button className="btn-fill" onClick={() => onQuickAdd(p)} aria-label={`Add ${p.name} to bag`}>
            Add
          </button>
        </div>
      </div>
    </article>
  )
}
