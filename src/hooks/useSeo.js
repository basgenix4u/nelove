import { useEffect } from 'react'

const BASE_TITLE = 'nelove — A Modern House of Style'
const BASE_DESC = 'Shoes, clothing & bags designed in Lagos and made to be worn everywhere. Free delivery over ₦75,000, pay on delivery nationwide, 30-day returns.'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Page-level SEO: title, description, canonical + optional JSON-LD block. */
export function useSeo({ title, description = BASE_DESC, canonical, jsonLd, noindex = false } = {}) {
  useEffect(() => {
    document.title = title ? `${title} — nelove` : BASE_TITLE
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : null)
    upsertMeta('property', 'og:title', title ? `${title} — nelove` : BASE_TITLE)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', jsonLd ? 'product' : 'website')
    const url = canonical || (location.origin + location.pathname + location.hash)
    upsertMeta('property', 'og:url', url)
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonical || location.origin + '/#/' + (location.hash.replace(/^#\//, '') || '')

    let ld = document.getElementById('seo-jsonld')
    if (jsonLd) {
      if (!ld) {
        ld = document.createElement('script')
        ld.type = 'application/ld+json'
        ld.id = 'seo-jsonld'
        document.head.appendChild(ld)
      }
      ld.textContent = JSON.stringify(jsonLd)
    } else if (ld) {
      ld.remove()
    }
    return () => { document.getElementById('seo-jsonld')?.remove() }
  }, [title, description, canonical, noindex, JSON.stringify(jsonLd ?? null)])
}
