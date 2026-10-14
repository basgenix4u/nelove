import { useEffect } from 'react'

/** Smooth-scrolls to top whenever the route path changes. */
export default function ScrollToTop({ path }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [path])
  return null
}
