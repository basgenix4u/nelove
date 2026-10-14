import { useState } from 'react'
import { api } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { Empty, Modal } from '../ui'

const EMPTY_CAT = { slug: '', name: '', description: '', image: '', sortOrder: 0 }

export default function Categories() {
  const { categories, products, refresh } = useCatalog()
  const toast = useToast()
  const [modal, setModal] = useState(null) // null | {mode:'new'|'edit', ...values}
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  const openNew = () => { setErrors({}); setModal({ mode: 'new', ...EMPTY_CAT, sortOrder: categories.length }) }
  const openEdit = (c) => { setErrors({}); setModal({ mode: 'edit', ...c }) }

  const save = async () => {
    if (busy) return
    setBusy(true)
    setErrors({})
    try {
      const body = { slug: modal.slug, name: modal.name, description: modal.description, image: modal.image, sortOrder: Number(modal.sortOrder) }
      if (modal.mode === 'new') await api.admin.createCategory(body)
      else await api.admin.updateCategory(modal.slug, body)
      toast(`Category “${modal.name}” saved.`, { title: 'Saved ✦' })
      setModal(null)
      refresh()
    } catch (e) {
      if (e.fields) setErrors(e.fields)
      toast(e.message, { title: 'Could not save' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c) => {
    if (!confirm(`Delete category “${c.name}”?`)) return
    try {
      await api.admin.deleteCategory(c.slug)
      toast('Category deleted.', { title: 'Done' })
      refresh()
    } catch (e) {
      toast(e.message, { title: 'Cannot delete' })
    }
  }

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Categories</h1>
          <p className="sub">The rooms your products live in — shown on the homepage and shop nav.</p>
        </div>
        <div className="admin-actions">
          <button className="abtn violet" onClick={openNew}>+ New category</button>
        </div>
      </div>

      <div className="acard" style={{ padding: 6 }}>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th></th><th>Category</th><th>Slug</th><th>Products</th><th>Order</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.slug}>
                  <td>{c.image ? <img className="thumb" src={c.image} alt="" /> : '—'}</td>
                  <td><div className="strong">{c.name}</div><div className="muted">{c.description}</div></td>
                  <td className="muted">{c.slug}</td>
                  <td><span className="aChip violet">{products.filter((p) => p.category === c.slug).length}</span></td>
                  <td className="muted">{c.sortOrder}</td>
                  <td>
                    <div className="td-btns">
                      <button className="abtn sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="abtn sm" onClick={() => remove(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {categories.length === 0 && <Empty title="No categories yet" body="Create one to organise the shop." />}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'new' ? 'New category' : `Edit “${modal.name}”`}
          sub={modal.mode === 'new' ? 'Slug becomes the URL: /shop/your-slug' : 'Renaming keeps products attached (slug is the key).'}
          onClose={() => setModal(null)}
        >
          <div className="mrow">
            <label>Slug
              <input value={modal.slug} disabled={modal.mode === 'edit'} placeholder="occasionwear"
                onChange={(e) => setModal({ ...modal, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
            </label>
            {errors.slug && <span className="aerr">{errors.slug}</span>}
          </div>
          <div className="mrow">
            <label>Name
              <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Occasionwear" />
            </label>
            {errors.name && <span className="aerr">{errors.name}</span>}
          </div>
          <div className="mrow">
            <label>Description
              <textarea value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} maxLength={300} />
            </label>
          </div>
          <div className="mrow">
            <label>Cover image path or URL
              <input value={modal.image} onChange={(e) => setModal({ ...modal, image: e.target.value })} placeholder="/images/… or https://…" />
            </label>
            <p className="ahint">Uploads live in the product editor — paste any uploaded URL here too.</p>
          </div>
          <div className="mrow">
            <label>Sort order
              <input type="number" value={modal.sortOrder} onChange={(e) => setModal({ ...modal, sortOrder: e.target.value })} />
            </label>
          </div>
          <div className="amodal-foot">
            <button className="abtn" onClick={() => setModal(null)}>Cancel</button>
            <button className="abtn violet" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
