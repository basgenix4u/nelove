import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { Spinner } from '../ui'

export default function Content() {
  const { home, refresh } = useCatalog()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!home || form) return
    setForm({
      announcement: (home.announcement || []).slice(),
      hero: { ...(home.hero || {}) },
      editorial: { ...(home.editorial || {}) },
      testimonials: (home.testimonials || []).map((t) => ({ ...t })),
    })
  }, [home, form])

  if (!form) return <Spinner label="Loading homepage content…" />

  const setHero = (k, v) => setForm((f) => ({ ...f, hero: { ...f.hero, [k]: v } }))
  const setEdit = (k, v) => setForm((f) => ({ ...f, editorial: { ...f.editorial, [k]: v } }))
  const setT = (i, k, v) => setForm((f) => ({
    ...f,
    testimonials: f.testimonials.map((t, j) => (j === i ? { ...t, [k]: v } : t)),
  }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.admin.saveContent(form)
      toast('Homepage content published.', { title: 'Saved ✦' })
      refresh()
    } catch (e) {
      toast(e.message || 'Could not save.', { title: 'Try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Homepage content</h1>
          <p className="sub">Announcement bar, hero, editorial and testimonials — live on save.</p>
        </div>
        <div className="admin-actions">
          <button className="abtn violet" onClick={save} disabled={saving}>{saving ? 'Publishing…' : 'Publish changes'}</button>
        </div>
      </div>

      <div className="acard aform-section">
        <h3>Announcement bar (one line per row — they rotate)</h3>
        {form.announcement.map((a, i) => (
          <div className="img-row" key={i} style={{ marginBottom: 6 }}>
            <input value={a} maxLength={160} onChange={(e) => setForm({ ...form, announcement: form.announcement.map((x, j) => (j === i ? e.target.value : x)) })} />
            <button className="abtn sm" onClick={() => setForm({ ...form, announcement: form.announcement.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        {form.announcement.length < 10 && (
          <button className="abtn sm" onClick={() => setForm({ ...form, announcement: [...form.announcement, ''] })}>+ Add line</button>
        )}
      </div>

      <div className="acard aform-section">
        <h3>Hero</h3>
        <div className="aform-grid">
          <label style={{ gridColumn: '1 / -1' }}>Eyebrow chip
            <input value={form.hero.eyebrow || ''} onChange={(e) => setHero('eyebrow', e.target.value)} />
          </label>
          <label>Headline line 1
            <input value={form.hero.headline_a || ''} onChange={(e) => setHero('headline_a', e.target.value)} />
          </label>
          <label>Headline line 2
            <input value={form.hero.headline_b || ''} onChange={(e) => setHero('headline_b', e.target.value)} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>Sub-copy
            <textarea value={form.hero.sub || ''} onChange={(e) => setHero('sub', e.target.value)} />
          </label>
          <label>Primary button label
            <input value={form.hero.cta_primary?.label || ''} onChange={(e) => setHero('cta_primary', { ...(form.hero.cta_primary || {}), label: e.target.value })} />
          </label>
          <label>Primary button link
            <input value={form.hero.cta_primary?.to || ''} onChange={(e) => setHero('cta_primary', { ...(form.hero.cta_primary || {}), to: e.target.value })} placeholder="/shop" />
          </label>
          <label>Secondary button label
            <input value={form.hero.cta_secondary?.label || ''} onChange={(e) => setHero('cta_secondary', { ...(form.hero.cta_secondary || {}), label: e.target.value })} />
          </label>
          <label>Secondary button link
            <input value={form.hero.cta_secondary?.to || ''} onChange={(e) => setHero('cta_secondary', { ...(form.hero.cta_secondary || {}), to: e.target.value })} placeholder="/shop/shoes" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>Micro line (under the buttons)
            <input value={form.hero.micro || ''} onChange={(e) => setHero('micro', e.target.value)} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>Hero product id (the polaroid)
            <input value={form.hero.featured_product || ''} onChange={(e) => setHero('featured_product', e.target.value)} placeholder="aira-court-sneaker" />
            <p className="ahint">An active product id from Products — its photo shows in the hero.</p>
          </label>
        </div>
      </div>

      <div className="acard aform-section">
        <h3>Editorial section</h3>
        <div className="aform-grid">
          <label>Headline line 1
            <input value={form.editorial.headline_a || ''} onChange={(e) => setEdit('headline_a', e.target.value)} />
          </label>
          <label>Headline line 2 (italic)
            <input value={form.editorial.headline_b || ''} onChange={(e) => setEdit('headline_b', e.target.value)} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>Body
            <textarea value={form.editorial.body || ''} onChange={(e) => setEdit('body', e.target.value)} />
          </label>
          <label>Button label
            <input value={form.editorial.cta_label || ''} onChange={(e) => setEdit('cta_label', e.target.value)} />
          </label>
          <label>Main image
            <input value={form.editorial.image_main || ''} onChange={(e) => setEdit('image_main', e.target.value)} placeholder="/images/…" />
          </label>
          <label>Floating image
            <input value={form.editorial.image_float || ''} onChange={(e) => setEdit('image_float', e.target.value)} placeholder="/images/…" />
          </label>
        </div>
      </div>

      <div className="acard aform-section">
        <h3>Testimonials (rotate on the homepage)</h3>
        {form.testimonials.map((t, i) => (
          <div className="review-card" key={i}>
            <div className="aform-grid">
              <label style={{ gridColumn: '1 / -1' }}>Quote
                <textarea value={t.quote} onChange={(e) => setT(i, 'quote', e.target.value)} />
              </label>
              <label>Name
                <input value={t.name} onChange={(e) => setT(i, 'name', e.target.value)} />
              </label>
              <label>Role / location
                <input value={t.role} onChange={(e) => setT(i, 'role', e.target.value)} />
              </label>
            </div>
            <div className="td-btns" style={{ marginTop: 8 }}>
              <button className="abtn sm red" onClick={() => setForm({ ...form, testimonials: form.testimonials.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          </div>
        ))}
        {form.testimonials.length < 6 && (
          <button className="abtn sm" onClick={() => setForm({ ...form, testimonials: [...form.testimonials, { quote: '', name: '', role: '' }] })}>+ Add testimonial</button>
        )}
      </div>

      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="abtn violet" onClick={save} disabled={saving}>{saving ? 'Publishing…' : 'Publish changes'}</button>
      </div>
    </>
  )
}
