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
  const [maxUploadBytes, setMaxUploadBytes] = useState(4 * 1024 * 1024)
  const [status, setStatus] = useState('loading') // loading | ready
  const [configError, setConfigError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [config, me] = await Promise.all([
        endpoints.config().catch((err) => err),
        endpoints.me().catch(() => null),
      ])
      if (cancelled) return
      // A failed /api/config means the API is unreachable - a different problem
      // from the API answering with no Google client id configured.
      if (config instanceof Error) {
        setConfigError(config.message || 'The API did not respond')
        setStatus('ready')
        return
      }
      setGoogleClientId(config?.googleClientId || '')
      if (config?.maxUploadBytes) setMaxUploadBytes(config.maxUploadBytes)
      setUser(me?.user || null)
      setStatus('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential) => {
    const { user: signedIn } = await endpoints.googleLogin(credential)

    // The sign-in worked, but it is only useful if the session cookie stuck.
    // Checking now turns a silently dropped cookie into a message that says so.
    const check = await endpoints.me().catch((err) => err)
    if (check instanceof Error) {
      throw new Error(
        `Signed in as ${signedIn.email}, but the session was not kept (${check.message}). ` +
          'A browser blocking cookies for this site would do that.',
      )
    }

    setUser(check.user || signedIn)
    return signedIn
  }, [])

  const logout = useCallback(async () => {
    await endpoints.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      googleClientId,
      maxUploadBytes,
      configError,
      status,
      loading: status === 'loading',
      loginWithGoogle,
      logout,
    }),
    [user, googleClientId, maxUploadBytes, configError, status, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
