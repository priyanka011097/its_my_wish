import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { buildTheme } from './theme'

const STORAGE_KEY = 'wishlist:color-mode'
const ColorModeContext = createContext({ mode: 'light', preference: 'system', setPreference: () => {}, toggle: () => {} })

export const useColorMode = () => useContext(ColorModeContext)

/** Holds the light/dark preference ("light" | "dark" | "system") and persists it. */
export function ColorModeProvider({ children }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [preference, setPreferenceState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')

  const mode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference

  const setPreference = useCallback((next) => {
    setPreferenceState(next)
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggle = useCallback(() => setPreference(mode === 'dark' ? 'light' : 'dark'), [mode, setPreference])

  useEffect(() => {
    document.documentElement.style.colorScheme = mode
  }, [mode])

  const theme = useMemo(() => buildTheme(mode), [mode])
  const value = useMemo(() => ({ mode, preference, setPreference, toggle }), [mode, preference, setPreference, toggle])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
