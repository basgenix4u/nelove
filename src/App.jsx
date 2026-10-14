import { Suspense, lazy, useCallback, useState } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Reveal from './components/Reveal'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import { FullPageSkeleton } from './components/Skeletons'

const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Account = lazy(() => import('./pages/Account'))

const AdminApp = lazy(() => import('./admin/AdminApp'))

function Shell() {
  const { add } = useCart()
  const toast = useToast()
  const location = useLocation()
  const [cartOpen, setCartOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState(null)
  const isAdminRoute = location.pathname.startsWith('/admin')

  const addAndOpen = useCallback(
    (p, opts = {}) => {
      add(p, opts)
      setLastAdded(p.id)
      setCartOpen(true)
      toast(`${p.name} added to your bag.`, { title: 'Added ✦' })
    },
    [add, toast]
  )

  const quickAdd = useCallback(
    (p) => {
      const size = p.sizes.length === 1 ? p.sizes[0] : null
      if (!size) {
        toast(`${p.name} comes in sizes — pick yours on the product page.`, { title: 'Choose a size' })
        window.location.hash = `#/product/${p.id}`
        return
      }
      add(p, { size, color: p.colorNames[0] })
      setLastAdded(p.id)
      setCartOpen(true)
      toast(`${p.name} added to your bag.`, { title: 'Added ✦' })
    },
    [add, toast]
  )

  if (isAdminRoute) {
    return (
      <Suspense fallback={<div className="boot-splash"><span className="brand-mark">n</span></div>}>
        <Routes location={location}>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <>
      <ScrollToTop path={location.pathname} />
      <Header onCartOpen={() => setCartOpen(true)} />
      <Reveal />
      <div className="page" key={location.pathname}>
        <Suspense fallback={<FullPageSkeleton />}>
        <Routes location={location}>
          <Route path="/" element={<Home onAdd={addAndOpen} />} />
          <Route path="/shop" element={<Shop onAdd={quickAdd} />} />
          <Route path="/shop/:cat" element={<Shop onAdd={quickAdd} />} />
          <Route path="/product/:id" element={<ProductDetail onAdd={addAndOpen} />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Shop onAdd={quickAdd} />} />
        </Routes>
        </Suspense>
      </div>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} lastAdded={lastAdded} />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <CatalogProvider>
            <CartProvider>
              <Shell />
            </CartProvider>
          </CatalogProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  )
}
