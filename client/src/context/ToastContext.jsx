import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

const ToastContext = createContext({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

/** One shared snackbar so any screen can report success or failure. */
export function ToastProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'success' })

  const toast = useCallback((message, severity = 'success') => {
    setState({ open: true, message: String(message ?? ''), severity })
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={state.severity === 'error' ? 6000 : 3200}
        onClose={() => setState((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity={state.severity}
          onClose={() => setState((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: 3, boxShadow: 6 }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
