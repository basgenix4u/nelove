import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, uploadImage } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { payloadOf } from './Products'
import { Spinner } from '../ui'

const BADGES = ['', 'New', 'Bestseller', 'Sale', 'Trending', 'Iconic']
const EMPTY = {
  id: '', name: '', line: '', category: '', price: '', oldPrice: '', badge: '',
  short: '', description: '', details: [], colors: [], colorNames: [],
  images: [], stock: {}, active: true,
}

export default function ProductForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { categories, refresh } = useCatalog()

  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [sizesText, setSizesText] = useState('')
  const [uploadCfg, setUploadCfg] = useState({ provider: 'local' })
  const fileRef = useRef(null)

  useEffect(() => {
    api.admin.uploadsConfig().then(setUploadCfg).catch(() => {})
    if (!editing) {
      setForm({ ...EMPTY, category: categories[0]?.slug || '' })
      return
    }
    api.admin.product(id).then((d) => {
      setForm(payloadOf(d.product))
      setSizesText(Object.keys(d.product.stock || {}).join(', '))
    }).catch((e) => toast(e.message, { title: 'Load failed' }))
  }, [id, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  /* rebuild sizes when category/sizesText changes */
  const parsedSizes = useMemo(
    () => sizesText.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean),
    [sizesText]
  )
  useEffect(() => {
    setForm((f) => {
      if (!f) return f
      const stock = { ...f.stock }
      for (const s of parsedSizes) if (stock[s] == null) stock[s] = 0
      for (const k of Object.keys(stock)) if (!parsedSizes.includes(k)) delete stock[k]
      return { ...f, stock }
    })
  }, [parsedSizes])

  if (!form) return <Spinner label="Loading the editor…" />

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const pickExistingSizes = (preset) => {
    setSizesText(preset)
  }

  const addImages = async (files) => {
    if (!files.length) return
    setUploading((n) => n + files.length)
    for (const file of files) {
      try {
        const url = await uploadImage(file, uploadCfg)
        setForm((f) => ({ ...f, images: [...f.images, url] }))
      } catch (e) {
        toast(e.message || 'Upload failed', { title: file.name })
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const save = async (e) => {
    e?.preventDefault()
    if (saving) return
    setSaving(true)
    setErrors({})
    try {
      const body = {
        ...form,
        price: Number(form.price),
        oldPrice: form.oldPrice === '' || form.oldPrice == null ? null : Number(form.oldPrice),
        badge: form.badge || null,
        images: form.images.filter(Boolean),
        stock: Object.fromEntries(Object.entries(form.stock).map(([k, v]) => [k, Number(v)])),
      }
      if (editing) {
        await api.admin.updateProduct(id, body)
        toast('Product updated.', { title: 'Saved ✦' })
      } else {
        const r = await api.admin.createProduct(body)
        toast('Product created.', { title: 'Saved ✦' })
        navigate(`/admin/products/${r.id}/edit`, { replace: true })
      }
      refresh()
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      toast(err.message || 'Could not save.', { title: 'Check the form' })
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ k, label: text, ...rest }) => (
    <label>{text}
      <input value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...rest} />
      {errors[k] && <span className="aerr">{errors[k]}</span>}
    </label>
  )

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>{editing ? form.name || 'Edit product' : 'New product'}</h1>
          <p className="sub">{editing ? form.id : 'Add a piece to the shop'} · uploads via {uploadCfg.provider === 'cloudinary' ? 'Cloudinary' : 'server disk'}</p>
        </div>
        <div className="admin-actions">
          <Link className="abtn" to="/admin/products">← All products</Link>
          <button className="abtn violet" onClick={save} disabled={saving || uploading > 0}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="dash-grid">
          {/* ------------------------- left column ------------------------- */}
          <div>
            <div className="acard aform-section">
              <h3>The essentials</h3>
              <div className="aform-grid">
                <Field k="name" label="Product name" required minLength={2} className="full" style={{ gridColumn: '1 / -1' }} placeholder="Aira Court Sneaker" />
                <Field k="line" label="Collection line" placeholder="The Legacy Sneaker" />
                <label>Category
                  <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                  {errors.category && <span className="aerr">{errors.category}</span>}
                </label>
                <Field k="price" label="Price (₦)" type="number" min="0" step="1" required />
                <Field k="oldPrice" label="Was price (₦, optional)" type="number" min="0" step="1" />
                <label>Badge
                  <select value={form.badge || ''} onChange={(e) => set('badge', e.target.value)}>
                    {BADGES.map((b) => <option key={b} value={b}>{b || 'None'}</option>)}
                  </select>
                </label>
                <label className="aswitch" style={{ alignSelf: 'end' }}>
                  <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} />
                  <i /> {form.active ? 'Live in the shop' : 'Hidden (archived)'}
                </label>
                {!editing && (
                  <Field k="id" label="URL id (optional — generated from name)" placeholder="aira-court-sneaker" />
                )}
              </div>
            </div>

            <div className="acard aform-section">
              <h3>Words that sell it</h3>
              <div className="aform-grid">
                <label style={{ gridColumn: '1 / -1' }}>Short hook (one line)
                  <input value={form.short} onChange={(e) => set('short', e.target.value)} maxLength={300} placeholder="Hand-welted, cloud-light, unreasonably handsome." />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>Full description
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={5000} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>Detail bullets (one per line)
                  <textarea value={(form.details || []).join('\n')}
                    onChange={(e) => set('details', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                    placeholder={'Full-grain leather upper\nRubber cupsole, hand-stitched welt'} />
                </label>
              </div>
            </div>
          </div>

          {/* ------------------------- right column ------------------------ */}
          <div>
            <div className="acard aform-section">
              <h3>Photos</h3>
              <div className="img-rows">
                {form.images.map((u, i) => (
                  <div className="img-row" key={i}>
                    <img src={u} alt="" />
                    <input value={u} onChange={(e) => set('images', form.images.map((x, j) => (j === i ? e.target.value : x)))} placeholder="/images/… or https://res.cloudinary.com/…" />
                    <button type="button" className="abtn sm" title="Move up" disabled={i === 0}
                      onClick={() => set('images', form.images.map((x, j) => (j === i ? form.images[i - 1] : j === i - 1 ? u : x)))}>↑</button>
                    <button type="button" className="abtn sm" title="Remove" onClick={() => set('images', form.images.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
              <div
                className={`img-drop${uploading ? ' busy' : ''}`}
                style={{ marginTop: 10 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addImages([...e.dataTransfer.files]) }}
              >
                {uploading ? `Uploading ${uploading}…` : `Drop images here or click to upload — ${uploadCfg.provider === 'cloudinary' ? 'straight to Cloudinary' : 'to the server'}`}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden
                  onChange={(e) => { addImages([...e.target.files]); e.target.value = '' }} />
              </div>
              {errors.images && <span className="aerr">{errors.images}</span>}
              <p className="ahint">First photo is the shop thumbnail. JPG/PNG/WEBP/AVIF up to 6&nbsp;MB each.</p>
            </div>

            <div className="acard aform-section">
              <h3>Sizes & stock</h3>
              <div className="mrow">
                <label>Sizes (comma separated)</label>
                <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="37, 38, 39, 40 or S, M, L" />
                <div className="apill-row" style={{ marginTop: 7 }}>
                  <button type="button" className="apill" onClick={() => pickExistingSizes('One Size')}>One Size</button>
                  <button type="button" className="apill" onClick={() => pickExistingSizes('36, 37, 38, 39, 40, 41, 42, 43, 44, 45')}>EU shoes 36–45</button>
                  <button type="button" className="apill" onClick={() => pickExistingSizes('XS, S, M, L, XL')}>Clothing XS–XL</button>
                </div>
              </div>
              {parsedSizes.length > 0 && (
                <div className="stock-grid" style={{ marginTop: 12 }}>
                  {parsedSizes.map((s) => (
                    <div className="stock-cell" key={s}>
                      <b>{s}</b>
                      <input type="number" min="0" max="99999" value={form.stock[s] ?? 0}
                        onChange={(e) => set('stock', { ...form.stock, [s]: e.target.value })} aria-label={`Stock for size ${s}`} />
                    </div>
                  ))}
                </div>
              )}
              {errors.stock && <span className="aerr">{errors.stock}</span>}
            </div>

            <div className="acard aform-section">
              <h3>Colours</h3>
              <label style={{ marginBottom: 10 }}>Colour names (comma separated)
                <input value={(form.colorNames || []).join(', ')}
                  onChange={(e) => set('colorNames', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
                  placeholder="Cloud White, Jet Black" />
              </label>
              <label>Colour swatches (hex, comma separated)
                <input value={(form.colors || []).join(', ')}
                  onChange={(e) => set('colors', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
                  placeholder="#f4f1ea, #161616" />
              </label>
              <div className="apill-row" style={{ marginTop: 10 }}>
                {(form.colors || []).map((c, i) => (
                  <span key={i} title={form.colorNames[i] || c}
                    style={{ width: 24, height: 24, borderRadius: 8, background: c, border: '1.5px solid var(--ink)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
