import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { Chip, Empty, Spinner, dateNice } from '../ui'

export default function Reviews() {
  const [tab, setTab] = useState('pending')
  const [data, setData] = useState(null)
  const toast = useToast()
  const { refresh } = useCatalog()

  const load = () => api.admin.reviews(tab === 'all' ? '' : tab).then(setData).catch((e) => toast(e.message))
  useEffect(() => { load() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (rv, status) => {
    try {
      await api.admin.moderateReview(rv.id, status)
      toast(status === 'approved' ? 'Review is live.' : status === 'hidden' ? 'Review hidden.' : 'Back to pending.', { title: rv.productName })
      load()
      if (status === 'approved') refresh()
    } catch (e) {
      toast(e.message, { title: 'Moderation failed' })
    }
  }

  const remove = async (rv) => {
    if (!confirm(`Delete this review on “${rv.productName}” permanently?`)) return
    await api.admin.deleteReview(rv.id)
    toast('Review deleted.', { title: 'Done' })
    load()
  }

  return (
    <>
      <div className="admin-top">
        <div>
          <h1>Reviews</h1>
          <p className="sub">Moderate what shows on product pages. {data ? `${data.pendingCount} waiting` : ''}</p>
        </div>
        <div className="apill-row">
          {['pending', 'approved', 'hidden', 'all'].map((t) => (
            <button key={t} className={`apill${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}{t === 'pending' && data?.pendingCount ? ` (${data.pendingCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {!data ? <Spinner /> : data.reviews.length === 0 ? (
        <Empty title={tab === 'pending' ? 'Inbox zero ✦' : 'Nothing in this bucket'} body={tab === 'pending' ? 'Every review has been seen.' : undefined} />
      ) : (
        data.reviews.map((rv) => (
          <article className="review-card" key={rv.id}>
            <header>
              <span className="stars-line">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
              <strong>{rv.name}</strong>
              {rv.verified ? <Chip value="mint" label="Verified buyer" /> : null}
              <Chip value={rv.status} />
              <span className="muted" style={{ marginLeft: 'auto' }}>on <strong>{rv.productName}</strong> · {dateNice(rv.createdAt)}</span>
            </header>
            {rv.title && <h4>“{rv.title}”</h4>}
            <p>{rv.body}</p>
            <div className="td-btns" style={{ justifyContent: 'flex-start' }}>
              {rv.status !== 'approved' && <button className="abtn sm violet" onClick={() => act(rv, 'approved')}>Approve</button>}
              {rv.status !== 'hidden' && <button className="abtn sm" onClick={() => act(rv, 'hidden')}>Hide</button>}
              {rv.status !== 'pending' && <button className="abtn sm" onClick={() => act(rv, 'pending')}>Back to pending</button>}
              <span className="muted" style={{ alignSelf: 'center' }}>· {rv.helpful} found helpful</span>
              <button className="abtn sm red" style={{ marginLeft: 'auto' }} onClick={() => remove(rv)}>Delete</button>
            </div>
          </article>
        ))
      )}
    </>
  )
}
