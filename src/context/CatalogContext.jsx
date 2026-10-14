import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'

const CatalogContext = createContext(null)

const FALLBACK_LABELS = { shoes: 'Shoes', bags: 'Bags', clothing: 'Clothing' }
const FALLBACK_DELIVERY = { standard_fee: 2500, express_fee: 5000, pickup_fee: 0, free_ship_threshold: 75000 }
const FALLBACK_ANNOUNCEMENT = [
  'Free delivery in Lagos & Abuja over ₦75,000',
  'New season — The Golden Hour Edit is live',
  'Easy 30-day returns, always',
  'Pay on delivery available nationwide',
]

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ products: [], categories: [] })
  const [home, setHome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lastLoad = useRef(0)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [cat, hm] = await Promise.all([api.catalog(), api.home()])
      setCatalog(cat)
      setHome(hm)
      lastLoad.current = Date.now()
    } catch (e) {
      setError(e.message || 'Could not load the collection')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // stale-while-rehash: keep the catalogue fresh across long SPA sessions
  useEffect(() => {
    const onHash = () => {
      if (Date.now() - lastLoad.current > 30e3) load(true)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [load])

  const categoryLabels = useMemo(() => {
    const labels = { ...FALLBACK_LABELS }
    for (const c of catalog.categories) labels[c.slug] = c.name
    return labels
  }, [catalog.categories])

  const delivery = home?.delivery?.standard_fee != null ? home.delivery : FALLBACK_DELIVERY

  const value = useMemo(() => ({
    products: catalog.products,
    categories: catalog.categories,
    categoryLabels,
    productById: (id) => catalog.products.find((p) => p.id === id),
    home,
    announcement: home?.announcement?.length ? home.announcement : FALLBACK_ANNOUNCEMENT,
    store: home?.store || {},
    delivery,
    freeShip: delivery.free_ship_threshold ?? 75000,
    loading,
    error,
    refresh: () => load(true),
  }), [catalog, home, loading, error, categoryLabels, load])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
