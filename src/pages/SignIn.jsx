import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSeo } from '../hooks/useSeo'

export default function SignIn() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useSeo({ title: 'Sign in' })

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      navigate(params.get('next') || (user.role === 'admin' ? '/admin' : '/account'))
    } catch (err) {
      setError(err.fields ? Object.values(err.fields)[0] : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth container">
      <div className="auth-card reveal">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to nelove<span className="dot">.</span></h1>
        <p className="auth-sub">Faster checkout, order history and private offers.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input type="email" required autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" required autoComplete="current-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn-gold btn-lg btn-wide" type="submit" disabled={busy}>
            {busy ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">New here? <Link to={`/sign-up${location.search}`}>Create an account</Link></p>
      </div>
    </main>
  )
}
