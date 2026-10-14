import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import { GridSkeleton } from '../components/Skeletons'
import { useSeo } from '../hooks/useSeo'
import { fmt } from '../utils'

const SORTS = [
  ['featured', 'Featured'],
  ['new', 'Newest'],
  ['price-asc', 'Price · low to high'],
  ['price-desc', 'Price · high to low'],
  ['rating', 'Top rated'],
  ['sale', 'On sale first'],
]
const STEP = 5000

export default function Shop({ onAdd }) {
  const { products, categories, categoryLabels, loading, error, refresh } = useCatalog()
  const [params] = useSearchParams()
  const { cat: pathCat } = useParams()
  const navigate = useNavigate()
  const catSlugs = useMemo(() => categories.map((c) => c.slug), [categories])
  const cat = catSlugs.includes(pathCat) || catSlugs.length === 0 ? (pathCat || 'all') : 'all'
  const search = (params.get('search') || '').toLowerCase()
  const setCat = (c) => navigate(c === 'all' ? '/shop' : `/shop/${c}`)

  useSeo({
    title: search ? `“${search}”` : cat === 'all' ? 'Shop all pieces' : `Shop ${categoryLabels[cat] || cat}`,
    description: 'Shop nelove — shoes, clothing and bags designed in Lagos. Free delivery over ₦75,000, pay on delivery nationwide.',
  })

  const priceMin = useMemo(() => (products.length ? Math.min(...products.map((p) => p.price)) : 0), [products])
  const priceMax = useMemo(() => (products.length ? Math.max(...products.map((p) => p.price)) : STEP), [products])

  const [sort, setSort] = useState('featured')
  const [selSizes, setSelSizes] = useState([])
  const [range, setRange] = useState(null) // null = full
  const [mobileFilters, setMobileFilters] = useState(false)
  const lo = range?.[0] ?? priceMin
  const hi = range?.[1] ?? priceMax

  const sizes = useMemo(() => {
    const set = new Set()
    products
      .filter((p) => (cat === 'all' || p.category === cat) && cat !== 'all' || cat === 'all' || p.category === cat)
      .forEach((p) => p.sizes.forEach((s) => set.add(s)))
    const preferred = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'XS', 'S', 'M', 'L', 'XL', 'One Size']
    return [...set].sort((a, b) => {
      const ia = preferred.indexOf(a)
      const ib = preferred.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
    })
  }, [products, cat])

  const filtered = useMemo(() => {
    let list = products.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        p.price >= lo &&
        p.price <= hi &&
        (selSizes.length === 0 || selSizes.some((s) => p.sizes.includes(s) && (p.stock?.[s] ?? 1) >= 0)) &&
        (!search || `${p.name} ${p.line} ${categoryLabels[p.category] || ''}`.toLowerCase().includes(search))
    )
    switch (sort) {
      case 'price-asc': list = [...list].sort((a, b) => a.price - b.price); break
      case 'price-desc': list = [...list].sort((a, b) => b.price - a.price); break
      case 'rating': list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      case 'new': list = [...list].sort((a, b) => (b.badge === 'New') - (a.badge === 'New')); break
      case 'sale': list = [...list].sort((a, b) => (b.oldPrice ? 1 : 0) - (a.oldPrice ? 1 : 0)); break
      default: break
    }
    return list
  }, [products, cat, lo, hi, selSizes, search, sort, categoryLabels])

  const toggleSize = (s) => setSelSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  const activeCount = selSizes.length + (lo > priceMin || hi < priceMax ? 1 : 0)
  const catName = (c) => categoryLabels[c] || c
  const priceCeil = Math.max(priceMax, STEP)

  const filterPanel = (
    <>
      <div className="fgroup">
        <h4>Category</h4>
        <ul className="flist">
          <li>
            <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
              All pieces <span>{products.length}</span>
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button className={cat === c.slug ? 'on' : ''} onClick={() => setCat(c.slug)}>
                {c.name} <span>{products.filter((p) => p.category === c.slug).length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="fgroup">
        <h4>Price</h4>
        <div className="price-inputs">
          <label>
            Min
            <select value={lo} onChange={(e) => setRange([Math.min(Number(e.target.value), hi), hi])}>
              {Array.from({ length: Math.floor(priceCeil / STEP) }, (_, i) => i * STEP).map((v) => (
                <option key={v} value={v}>{fmt(v)}</option>
              ))}
            </select>
          </label>
          <label>
            Max
            <select value={hi} onChange={(e) => setRange([lo, Math.max(Number(e.target.value), lo)])}>
              {[...new Set(Array.from({ length: Math.floor(priceCeil / STEP) + 1 }, (_, i) => i * STEP).slice(1).concat([priceCeil]))].map((v) => (
                <option key={v} value={v}>{v >= priceCeil ? `${fmt(priceCeil)}+` : fmt(v)}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="fgroup">
        <h4>Size {selSizes.length > 0 && <button className="fclear" onClick={() => setSelSizes([])}>clear</button>}</h4>
        <div className="size-chips">
          {sizes.map((s) => (
            <button key={s} className={selSizes.includes(s) ? 'on' : ''} onClick={() => toggleSize(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </>
  )

  if (!loading && error && products.length === 0) {
    return (
      <main className="container notfound">
        <h1>The shop didn’t load</h1>
        <p>{error}</p>
        <button className="btn-ink btn-lg" onClick={() => refresh()}>Try again</button>
      </main>
    )
  }

  return (
    <main className="shop">
      <div className="container shop-head reveal">
        <p className="eyebrow">{cat === 'all' ? 'The full collection' : catName(cat)}</p>
        <h1>
          {search ? <>Results for “{search}”</> : cat === 'all' ? 'Shop all pieces' : `Shop ${catName(cat).toLowerCase()}`}
        </h1>
        <p className="shop-count">{loading ? '…' : `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}`}</p>
      </div>

      <div className="container shop-layout">
        <aside className="filters" aria-label="Filters">{filterPanel}</aside>

        <div className="shop-main">
          <div className="shop-bar">
            <div className="chip-row" role="tablist" aria-label="Category">
              {['all', ...catSlugs].map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
                  {c === 'all' ? 'All' : catName(c)}
                </button>
              ))}
            </div>
            <div className="shop-bar-right">
              <button className="btn-ghost-sm filters-toggle" onClick={() => setMobileFilters(true)} aria-haspopup="dialog">
                Filters{activeCount > 0 && <span className="fdot">{activeCount}</span>}
              </button>
              <label className="sort">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
                  {SORTS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <GridSkeleton count={8} />
          ) : filtered.length === 0 ? (
            <div className="shop-empty">
              <h3>No pieces match those filters</h3>
              <p>Try widening the price range or clearing sizes.</p>
              <button className="btn-ink" onClick={() => { setSelSizes([]); setRange(null) }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid-products">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} p={p} onQuickAdd={onAdd} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <div className={`sheet-wrap${mobileFilters ? ' open' : ''}`}>
        <div className="scrim show" onClick={() => setMobileFilters(false)} aria-hidden />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="sheet-head">
            <h3>Filters</h3>
            <button className="icon-btn" onClick={() => setMobileFilters(false)} aria-label="Close filters">×</button>
          </div>
          <div className="sheet-body">{filterPanel}</div>
          <div className="sheet-foot">
            <button className="btn-ghost-sm" onClick={() => { setSelSizes([]); setRange(null) }}>
              Clear all
            </button>
            <button className="btn-gold" onClick={() => setMobileFilters(false)}>
              Show {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
