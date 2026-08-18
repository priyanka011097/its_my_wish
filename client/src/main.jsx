import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ColorModeProvider } from './theme/ColorModeProvider'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { InvitationsProvider } from './context/InvitationsContext'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <InvitationsProvider>
              <App />
            </InvitationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ColorModeProvider>
  </StrictMode>,
)
