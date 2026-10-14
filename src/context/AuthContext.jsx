import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    api.me()
      .then((d) => { if (alive) setUser(d.user) })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.login({ email, password })
    setUser(d.user)
    return d.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const d = await api.register({ name, email, password })
    setUser(d.user)
    return d.user
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } catch { /* session may already be gone */ }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === 'admin', login, register, logout, setUser }),
    [user, ready, login, register, logout]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
