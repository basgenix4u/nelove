import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../context/ToastContext'
import { Chip, Empty, Modal, Spinner, money } from '../ui'

const EMPTY_CODE = { code: '', type: 'percent', value: '', minSpend: 0, startsAt: '', endsAt: '', maxUses: '', active: true }

export default function Discounts() {
  const [list, setList] = useState(null)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const toast = useToast()

  const load = () => api.admin.discounts().then((d) => setList(d.discounts)).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const openEdit = (d) => {
    setErrors({})
    setModal({
      editing: true, code: d.code, type: d.type, value: d.value, minSpend: d.minSpend,
      startsAt: d.startsAt ? d.startsAt.slice(0, 10) : '', endsAt: d.endsAt ? d.endsAt.slice(0, 10) : '',
      maxUses: d.maxUses ?? '', active: !!d.active,
    })
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    setErrors({})
    try {
      const body = {
        code: modal.code.trim().toUpperCase(),
        type: modal.type,
        value: Number(modal.value),
        minSpend: Number(modal.minSpend || 0),
        startsAt: modal.startsAt || null,
        endsAt: modal.endsAt ? modal.endsAt + 'T23:59:59Z' : null,
        maxUses: modal.maxUses === '' ? null : Number(modal.maxUses),
        active: !!modal.active,
      }
      if (modal.editing) await api.admin.updateDiscount(body.code, body)
      else await api.admin.createDiscount(body)
      toast(`Code ${body.code} saved.`, { title: 'Saved ✦' })
      setModal(null)
      load()
    } catch (e) {
      if (e.fields) setErrors(e.fields)
      toast(e.message, { title: 'Could not save' })
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async (d) => {
    await api.admin.deactivateDiscount(d.code)
    toast(`Code ${d.code} switched off (history kept).`, { title: 'Done' })
    load()
  }

  if (!list) return <Spinner />

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Discount codes</h1>
          <p className="sub">Percent or fixed-amount codes, validated live at checkout.</p>
        </div>
        <div className="admin-actions">
          <button className="abtn violet" onClick={() => { setErrors({}); setModal({ ...EMPTY_CODE }) }}>+ New code</button>
        </div>
      </div>

      {list.length === 0 ? <Empty title="No codes yet" body="Create your first promotion — e.g. WELCOME10 for 10% off." /> : (
        <div className="acard" style={{ padding: 6 }}>
          <div className="atable-wrap">
            <table className="atable">
              <thead><tr><th>Code</th><th>Discount</th><th>Min spend</th><th>Window</th><th>Uses</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.code}>
                    <td className="strong" style={{ fontFamily: 'IBM Plex Mono', letterSpacing: '.04em' }}>{d.code}</td>
                    <td className="strong">{d.type === 'percent' ? `${d.value}%` : money(d.value)}</td>
                    <td className="muted">{d.minSpend ? money(d.minSpend) : '—'}</td>
                    <td className="muted">{d.startsAt ? d.startsAt.slice(0, 10) : 'now'} → {d.endsAt ? d.endsAt.slice(0, 10) : 'forever'}</td>
                    <td className="muted">{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ''}</td>
                    <td><Chip value={d.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div className="td-btns">
                        <button className="abtn sm" onClick={() => openEdit(d)}>Edit</button>
                        {d.active && <button className="abtn sm" onClick={() => deactivate(d)}>Switch off</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal.editing ? `Edit ${modal.code}` : 'New discount code'} sub="Customers type this at checkout; the server validates it." onClose={() => setModal(null)}>
          <div className="aform-grid">
            <div className="mrow">
              <label>Code
                <input value={modal.code} disabled={modal.editing} onChange={(e) => setModal({ ...modal, code: e.target.value.toUpperCase() })} placeholder="FESTIVE15" />
              </label>
              {errors.code && <span className="aerr">{errors.code}</span>}
            </div>
            <div className="mrow">
              <label>Type</label>
              <div className="apill-row" style={{ marginTop: 6 }}>
                <button className={`apill${modal.type === 'percent' ? ' on' : ''}`} onClick={() => setModal({ ...modal, type: 'percent' })}>Percent %</button>
                <button className={`apill${modal.type === 'flat' ? ' on' : ''}`} onClick={() => setModal({ ...modal, type: 'flat' })}>Fixed ₦</button>
              </div>
            </div>
            <div className="mrow">
              <label>{modal.type === 'percent' ? 'Percentage (1–100)' : 'Amount (₦)'}
                <input type="number" min="1" max={modal.type === 'percent' ? 100 : undefined} value={modal.value} onChange={(e) => setModal({ ...modal, value: e.target.value })} />
              </label>
              {errors.value && <span className="aerr">{errors.value}</span>}
            </div>
            <div className="mrow">
              <label>Minimum spend (₦, 0 = none)
                <input type="number" min="0" value={modal.minSpend} onChange={(e) => setModal({ ...modal, minSpend: e.target.value })} />
              </label>
            </div>
            <div className="mrow">
              <label>Starts (optional)</label>
              <input type="date" value={modal.startsAt} onChange={(e) => setModal({ ...modal, startsAt: e.target.value })} />
            </div>
            <div className="mrow">
              <label>Ends (optional)</label>
              <input type="date" value={modal.endsAt} onChange={(e) => setModal({ ...modal, endsAt: e.target.value })} />
            </div>
            <div className="mrow">
              <label>Max total uses (optional)</label>
              <input type="number" min="1" value={modal.maxUses} onChange={(e) => setModal({ ...modal, maxUses: e.target.value })} placeholder="Unlimited" />
            </div>
            <div className="mrow" style={{ alignSelf: 'end' }}>
              <label className="aswitch">
                <input type="checkbox" checked={!!modal.active} onChange={(e) => setModal({ ...modal, active: e.target.checked })} />
                <i /> {modal.active ? 'Live' : 'Paused'}
              </label>
            </div>
          </div>
          <div className="amodal-foot">
            <button className="abtn" onClick={() => setModal(null)}>Cancel</button>
            <button className="abtn violet" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save code'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
