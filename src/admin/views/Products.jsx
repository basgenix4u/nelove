import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { Chip, Empty, SearchBar, Spinner, money } from '../ui'

export default function Products() {
  const [list, setList] = useState(null)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')
  const { categories, refresh } = useCatalog()

  const load = () => api.admin.products(search).then((d) => setList(d.products)).catch(() => setList([]))
  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(
    () => (list || []).filter((p) => !cat || p.category === cat),
    [list, cat]
  )

  const archive = async (p) => {
    if (!confirm(`Archive “${p.name}”? It disappears from the shop but orders keep their history.`)) return
    await api.admin.archiveProduct(p.id)
    refresh()
    load()
  }

  if (!list) return <Spinner label="Loading products…" />

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Products</h1>
          <p className="sub">{filtered.length} of {list.length} shown</p>
        </div>
        <div className="admin-actions">
          <Link className="abtn violet" to="/admin/products/new">+ New product</Link>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search name or ID…">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </SearchBar>

      {filtered.length === 0 ? (
        <Empty title="No products match" body="Try a different search or category." />
      ) : (
        <div className="acard" style={{ padding: 6 }}>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td><img className="thumb" src={p.image} alt="" /></td>
                    <td>
                      <div className="strong">{p.name}</div>
                      <div className="muted">{p.id}{p.badge ? ` · ${p.badge}` : ''}</div>
                    </td>
                    <td className="muted">{p.category}</td>
                    <td>
                      <span className="strong">{money(p.price)}</span>
                      {p.oldPrice && <span className="muted"> <s>{money(p.oldPrice)}</s></span>}
                    </td>
                    <td>
                      <span className={`aChip ${p.stockTotal === 0 ? 'red' : p.stockTotal <= 6 ? 'yellow' : 'mint'}`}>
                        {p.stockTotal === 0 ? 'sold out' : p.stockTotal}
                      </span>
                    </td>
                    <td className="muted">{p.rating ? `${p.rating}★ (${p.reviewCount})` : '—'}</td>
                    <td><Chip value={p.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div className="td-btns">
                        <Link className="abtn sm" to={`/admin/products/${p.id}/edit`}>Edit</Link>
                        {p.active
                          ? <button className="abtn sm" onClick={() => archive(p)}>Archive</button>
                          : <button className="abtn sm" onClick={async () => { await api.admin.updateProduct(p.id, { ...payloadOf(p), active: true }); refresh(); load() }}>Restore</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

/** Map a list-row product into the PUT payload shape. */
export function payloadOf(p) {
  return {
    id: p.id, name: p.name, line: p.line, category: p.category, price: p.price,
    oldPrice: p.oldPrice ?? null, badge: p.badge ?? null, short: p.short,
    description: p.description, details: p.details || [], colors: p.colors || [],
    colorNames: p.colorNames || [], images: p.images, stock: p.stock || {}, active: !!p.active,
  }
}
