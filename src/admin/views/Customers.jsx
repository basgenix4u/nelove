import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Chip, Empty, SearchBar, Spinner, money, dateNice } from '../ui'

export default function Customers() {
  const [tab, setTab] = useState('customers')
  const [customers, setCustomers] = useState(null)
  const [subs, setSubs] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.admin.customers().then((d) => setCustomers(d.customers)).catch(() => setCustomers([]))
    api.admin.subscribers().then((d) => setSubs(d.subscribers)).catch(() => setSubs([]))
  }, [])

  const q = search.toLowerCase()
  const filteredCustomers = (customers || []).filter((c) => !q || `${c.email} ${c.name}`.toLowerCase().includes(q))
  const filteredSubs = (subs || []).filter((s) => !q || s.email.toLowerCase().includes(q))

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Customers</h1>
          <p className="sub">People who’ve ordered — and everyone on the nelove list.</p>
        </div>
        <div className="admin-actions">
          <div className="apill-row">
            <button className={`apill${tab === 'customers' ? ' on' : ''}`} onClick={() => setTab('customers')}>Customers {customers ? `(${customers.length})` : ''}</button>
            <button className={`apill${tab === 'list' ? ' on' : ''}`} onClick={() => setTab('list')}>Newsletter {subs ? `(${subs.length})` : ''}</button>
          </div>
          <a className="abtn" href="/api/admin/subscribers.csv" target="_blank" rel="noreferrer" title="Opens a CSV download (your session cookie authorises it)">Export newsletter CSV ↓</a>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search email or name…" />

      {tab === 'customers' && (
        !customers ? <Spinner /> : filteredCustomers.length === 0 ? <Empty title="No customers yet" /> : (
          <div className="acard" style={{ padding: 6 }}>
            <div className="atable-wrap">
              <table className="atable">
                <thead><tr><th>Customer</th><th>Orders</th><th>Spent</th><th>Last order</th><th>Account</th></tr></thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c.email}>
                      <td><div className="strong">{c.name}</div><div className="muted">{c.email}</div></td>
                      <td className="muted">{c.orders}</td>
                      <td className="strong">{money(c.spent)}</td>
                      <td className="muted">{dateNice(c.lastOrder)}</td>
                      <td>{c.registered ? <Chip value="active" label="Registered" /> : <Chip value="inactive" label="Guest" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab === 'list' && (
        !subs ? <Spinner /> : filteredSubs.length === 0 ? <Empty title="No subscribers yet" body="The list grows from the homepage signup form." /> : (
          <div className="acard" style={{ padding: 6 }}>
            <div className="atable-wrap">
              <table className="atable">
                <thead><tr><th>Email</th><th>Joined</th></tr></thead>
                <tbody>
                  {filteredSubs.map((s) => (
                    <tr key={s.id}>
                      <td className="strong">{s.email}</td>
                      <td className="muted">{dateNice(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </>
  )
}
