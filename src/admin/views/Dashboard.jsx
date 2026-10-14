import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { Chip, Empty, Spinner, money, dateNice } from '../ui'

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.admin.stats().then(setS).catch((e) => setError(e.message))
  }, [])

  if (error) return <Empty title="Dashboard failed to load" body={error} />
  if (!s) return <Spinner label="Crunching the numbers…" />

  // pad to a full 14-day series so the bar chart always reads as a timeline
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10)
    const hit = s.trend.find((t) => t.d === d)
    days.push({ d, revenue: hit?.revenue || 0 })
  }
  const max = Math.max(1, ...days.map((t) => t.revenue))
  const statusRows = Object.entries(s.byStatus).sort((a, b) => b[1] - a[1])

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Good day ✦</h1>
          <p className="sub">Here’s what the shop is doing — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="admin-actions">
          <Link className="abtn" to="/admin/orders">View orders</Link>
          <Link className="abtn violet" to="/admin/products/new">+ New product</Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat hero-stat"><small>Revenue (paid)</small><strong>{money(s.revenue)}</strong><span className="trend">last 14 days in chart →</span></div>
        <div className="stat"><small>Paid orders</small><strong>{s.paidOrders}</strong><span className="trend">total {Object.values(s.byStatus).reduce((a, b) => a + b, 0)}</span></div>
        <div className="stat"><small>Live products</small><strong>{s.products}</strong><span className="trend"><Link to="/admin/products">manage →</Link></span></div>
        <div className="stat"><small>Customers</small><strong>{s.customers}</strong><span className="trend"><Link to="/admin/customers">view →</Link></span></div>
        <div className="stat"><small>Pending reviews</small><strong>{s.pendingReviews}</strong><span className="trend">{s.pendingReviews > 0 ? <Link to="/admin/reviews">moderate now →</Link> : 'all clear'}</span></div>
      </div>

      <div className="dash-grid">
        <div className="acard">
          <h3>Revenue — last 14 days</h3>
          {days.every((d) => d.revenue === 0) ? (
            <Empty title="No sales yet" body="Paid orders will chart here as they land." />
          ) : (
            <svg className="chart" viewBox="0 0 616 160" preserveAspectRatio="xMidYMid meet" style={{ height: 170 }} aria-hidden>
              {days.map((t, i) => {
                const h = Math.max(t.revenue ? 6 : 2, (t.revenue / max) * 118)
                return (
                  <g key={t.d}>
                    <rect className="chart-bar" x={i * 44 + 6} y={140 - h} width="30" height={h} fill={i === days.length - 1 ? '#5f3ef8' : '#d9d1fb'} rx="4" />
                    <text x={i * 44 + 21} y="158" fontSize="9" fill="#8b8577" textAnchor="middle" fontFamily="IBM Plex Mono">{t.d.slice(8)}</text>
                  </g>
                )
              })}
            </svg>
          )}

          <h3 style={{ marginTop: 20 }}>Orders by status</h3>
          <div className="apill-row">
            {statusRows.length === 0 && <span className="ahint">No orders yet</span>}
            {statusRows.map(([st, n]) => (
              <button key={st} className="apill" onClick={() => navigate(`/admin/orders?status=${st}`)}>
                <Chip value={st} /> <span style={{ marginLeft: 6 }}>{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="acard">
            <h3>Latest orders</h3>
            {s.recent.length === 0 && <span className="ahint">No orders yet — they’ll land here.</span>}
            <table className="atable">
              <tbody>
                {s.recent.map((o) => (
                  <tr key={o.number}>
                    <td className="strong">{o.number}</td>
                    <td className="muted">{o.name}</td>
                    <td><Chip value={o.status} /></td>
                    <td className="strong" style={{ textAlign: 'right' }}>{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acard">
            <h3>Low stock — restock soon</h3>
            {s.lowStock.length === 0 && <span className="ahint">Every size is well stocked. ✦</span>}
            <table className="atable">
              <tbody>
                {s.lowStock.map((x, i) => (
                  <tr key={i}>
                    <td className="strong">{x.name}</td>
                    <td className="muted">Size {x.size}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`aChip ${x.stock === 0 ? 'red' : 'yellow'}`}>{x.stock === 0 ? 'out' : `${x.stock} left`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
