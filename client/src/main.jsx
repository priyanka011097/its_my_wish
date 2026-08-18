import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ColorModeProvider } from './theme/ColorModeProvider'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ColorModeProvider>
  </StrictMode>,
)
