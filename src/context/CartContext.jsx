import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocal } from '../hooks/useLocal'

const CartContext = createContext(null)
const CART_KEY = 'nelove:cart:v1'

/** Line id — same product + same options collapses into one line. */
const lineId = (p, size, color) => `${p.id}__${size || 'os'}__${color || 'default'}`

export function CartProvider({ children }) {
  const [items, setItems] = useLocal(CART_KEY, [])

  const add = useCallback(
    (product, { size, color, qty = 1 } = {}) => {
      const id = lineId(product, size, color)
      setItems((prev) => {
        const i = prev.findIndex((l) => l.id === id)
        if (i >= 0) {
          const next = [...prev]
          next[i] = { ...next[i], qty: Math.min(next[i].qty + qty, 10) }
          return next
        }
        return [
          ...prev,
          {
            id,
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            size: size || null,
            color: color || product.colorNames[0],
            qty,
          },
        ]
      })
    },
    [setItems]
  )

  const remove = useCallback((id) => setItems((prev) => prev.filter((l) => l.id !== id)), [setItems])

  const setQty = useCallback(
    (id, qty) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, 10) } : l))
      ),
    [setItems]
  )

  const clear = useCallback(() => setItems([]), [setItems])

  const { subtotal, count } = useMemo(
    () => ({
      subtotal: items.reduce((s, l) => s + l.price * l.qty, 0),
      count: items.reduce((s, l) => s + l.qty, 0),
    }),
    [items]
  )

  const value = useMemo(
    () => ({ items, add, remove, setQty, clear, subtotal, count }),
    [items, add, remove, setQty, clear, subtotal, count]
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
