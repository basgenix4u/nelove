/** Shared admin UI primitives. */
import { useEffect, useRef } from 'react'

export const STATUS_CHIP = {
  pending: 'yellow', paid: 'mint', processing: 'violet', shipped: 'violet',
  delivered: 'mint', failed: 'red', cancelled: 'red', active: 'mint', inactive: 'ghost',
  approved: 'mint', hidden: 'ghost',
}

export function Chip({ value, label }) {
  return <span className={`aChip ${STATUS_CHIP[value] || 'ghost'}`}>{label || value}</span>
}

export function Spinner({ label = 'Loading…' }) {
  return <p className="aloading"><span className="aspinner" /> {label}</p>
}

export function Empty({ title = 'Nothing here yet', body, children }) {
  return (
    <div className="aempty">
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {children}
    </div>
  )
}

export function Modal({ title, sub, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    ref.current?.focus?.()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="amodal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="amodal-scrim" onClick={onClose} />
      <div className={`amodal${wide ? ' ord-drawer' : ''}`} ref={ref} tabIndex={-1}>
        <h2>{title}</h2>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search…', children }) {
  return (
    <div className="abar">
      <div className="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
        </svg>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
      {children}
    </div>
  )
}

export function money(n) {
  return '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG')
}

export function dateNice(s) {
  if (!s) return '—'
  try {
    return new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z')).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return s }
}
