import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSeo } from '../hooks/useSeo'

export default function SignUp() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [fieldErrs, setFieldErrs] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useSeo({ title: 'Create your account' })

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setFieldErrs({})
    try {
      await register(form.name, form.email, form.password)
      navigate(params.get('next') || '/account')
    } catch (err) {
      if (err.fields) setFieldErrs(err.fields)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const strength = form.password.length === 0 ? 0 : Math.min(4, (form.password.length >= 8) + (/[A-Z]/.test(form.password)) + (/\d/.test(form.password)) + (/[^A-Za-z0-9]/.test(form.password)))

  return (
    <main className="auth container">
      <div className="auth-card reveal">
        <p className="eyebrow">Join the house</p>
        <h1>Create your account<span className="dot">.</span></h1>
        <p className="auth-sub">One account for checkout, orders and the nelove list.</p>

        <form onSubmit={submit} className="auth-form">
          <label className={fieldErrs.name ? 'bad' : ''}>
            Full name
            <input required minLength={2} autoComplete="name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adaeze Okafor" />
            {fieldErrs.name && <em>{fieldErrs.name}</em>}
          </label>
          <label className={fieldErrs.email ? 'bad' : ''}>
            Email
            <input type="email" required autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            {fieldErrs.email && <em>{fieldErrs.email}</em>}
          </label>
          <label className={fieldErrs.password ? 'bad' : ''}>
            Password
            <input type="password" required minLength={8} autoComplete="new-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
            {fieldErrs.password && <em>{fieldErrs.password}</em>}
          </label>
          {form.password && (
            <div className={`pw-meter s${strength}`} aria-hidden>
              <i /><i /><i /><i />
              <span>{['', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</span>
            </div>
          )}
          {error && !Object.keys(fieldErrs).length && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn-gold btn-lg btn-wide" type="submit" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to={`/sign-in${location.search}`}>Sign in</Link></p>
        <p className="auth-fine">By continuing you agree to the terms of the house. Your details are stored securely on our servers and never shared.</p>
      </div>
    </main>
  )
}
