import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { Spinner } from '../ui'

export default function Settings() {
  const { home, refresh } = useCatalog()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!home || form) return
    setForm({
      store: { ...(home.store || {}) },
      delivery: { ...(home.delivery || {}) },
    })
  }, [home, form])

  if (!form) return <Spinner label="Loading settings…" />

  const setS = (k, v) => setForm((f) => ({ ...f, store: { ...f.store, [k]: v } }))
  const setD = (k, v) => setForm((f) => ({ ...f, delivery: { ...f.delivery, [k]: v } }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.admin.saveSettings({
        store: form.store,
        delivery: {
          ...form.delivery,
          standard_fee: Number(form.delivery.standard_fee),
          express_fee: Number(form.delivery.express_fee),
          pickup_fee: Number(form.delivery.pickup_fee || 0),
          free_ship_threshold: Number(form.delivery.free_ship_threshold),
        },
      })
      toast('Settings saved and live everywhere.', { title: 'Saved ✦' })
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
          <h1>Site settings</h1>
          <p className="sub">Store identity, delivery pricing and bank details for transfer payments.</p>
        </div>
        <div className="admin-actions">
          <button className="abtn violet" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>

      <div className="dash-grid">
        <div>
          <div className="acard aform-section">
            <h3>Store identity</h3>
            <div className="aform-grid">
              <label>Shop name
                <input value={form.store.name || ''} onChange={(e) => setS('name', e.target.value)} />
              </label>
              <label>Tagline
                <input value={form.store.tagline || ''} onChange={(e) => setS('tagline', e.target.value)} />
              </label>
              <label>Support email
                <input type="email" value={form.store.email || ''} onChange={(e) => setS('email', e.target.value)} />
              </label>
              <label>Phone
                <input value={form.store.phone || ''} onChange={(e) => setS('phone', e.target.value)} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>Pickup address
                <input value={form.store.address || ''} onChange={(e) => setS('address', e.target.value)} />
              </label>
              <label>Instagram URL
                <input value={form.store.instagram || ''} onChange={(e) => setS('instagram', e.target.value)} placeholder="https://instagram.com/…" />
              </label>
              <label>TikTok URL
                <input value={form.store.tiktok || ''} onChange={(e) => setS('tiktok', e.target.value)} placeholder="https://tiktok.com/@…" />
              </label>
              <label>X (Twitter) URL
                <input value={form.store.twitter || ''} onChange={(e) => setS('twitter', e.target.value)} placeholder="https://x.com/…" />
              </label>
            </div>
          </div>

          <div className="acard aform-section">
            <h3>Bank transfer details</h3>
            <p className="ahint" style={{ marginBottom: 12 }}>Shown to customers who choose “Bank transfer” at checkout — keep them current.</p>
            <div className="aform-grid">
              <label>Bank name
                <input value={form.store.bank_name || ''} onChange={(e) => setS('bank_name', e.target.value)} placeholder="Wema Bank" />
              </label>
              <label>Account number
                <input value={form.store.bank_account_number || ''} onChange={(e) => setS('bank_account_number', e.target.value)} placeholder="0123456789" />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>Account name
                <input value={form.store.bank_account_name || ''} onChange={(e) => setS('bank_account_name', e.target.value)} placeholder="nelove Studios Ltd" />
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="acard aform-section">
            <h3>Delivery pricing</h3>
            <div className="aform-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>Standard fee (₦)
                <input type="number" min="0" value={form.delivery.standard_fee ?? ''} onChange={(e) => setD('standard_fee', e.target.value)} />
              </label>
              <label>Express fee — Lagos & Abuja (₦)
                <input type="number" min="0" value={form.delivery.express_fee ?? ''} onChange={(e) => setD('express_fee', e.target.value)} />
              </label>
              <label>Pickup fee (₦ — usually 0)
                <input type="number" min="0" value={form.delivery.pickup_fee ?? ''} onChange={(e) => setD('pickup_fee', e.target.value)} />
              </label>
              <label>Free standard delivery above (₦)
                <input type="number" min="0" value={form.delivery.free_ship_threshold ?? ''} onChange={(e) => setD('free_ship_threshold', e.target.value)} />
              </label>
              <label>Standard ETA label
                <input value={form.delivery.standard_eta || ''} onChange={(e) => setD('standard_eta', e.target.value)} placeholder="2–4 working days" />
              </label>
              <label>Express ETA label
                <input value={form.delivery.express_eta || ''} onChange={(e) => setD('express_eta', e.target.value)} placeholder="Next working day" />
              </label>
            </div>
          </div>

          <div className="acard aform-section">
            <h3>Integrations</h3>
            <p className="ahint">
              Payments and image storage are configured with environment variables on the server
              (see <code>.env</code> / <code>.env.example</code>):<br /><br />
              · <strong>PAYSTACK_SECRET_KEY</strong> — enables card payments + verified webhooks.<br />
              · <strong>CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET</strong> — uploads go to Cloudinary; without them they land on the server disk.<br /><br />
              Secrets never live in this UI or the frontend bundle — change them in your host’s env settings, then restart.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
