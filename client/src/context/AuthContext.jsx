import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { endpoints } from '../api/client'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

/**
 * Tracks the signed-in user plus the Google client id served by the API,
 * so the front end never needs its own copy of the OAuth config.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [status, setStatus] = useState('loading') // loading | ready

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [config, me] = await Promise.all([
        endpoints.config().catch(() => null),
        endpoints.me().catch(() => null),
      ])
      if (cancelled) return
      setGoogleClientId(config?.googleClientId || '')
      setUser(me?.user || null)
      setStatus('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential) => {
    const { user: signedIn } = await endpoints.googleLogin(credential)
    setUser(signedIn)
    return signedIn
  }, [])

  const logout = useCallback(async () => {
    await endpoints.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, googleClientId, status, loading: status === 'loading', loginWithGoogle, logout }),
    [user, googleClientId, status, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
