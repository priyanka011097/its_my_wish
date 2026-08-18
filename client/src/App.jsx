import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BoardPage from './pages/BoardPage'
import SharedBoardPage from './pages/SharedBoardPage'
import NotFoundPage from './pages/NotFoundPage'

function FullPageSpinner() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export default function App() {
  const { googleClientId, loading } = useAuth()

  const routes = (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/b/:boardId"
        element={
          <RequireAuth>
            <BoardPage />
          </RequireAuth>
        }
      />
      <Route path="/s/:token" element={<SharedBoardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )

  if (loading) return <FullPageSpinner />
  // The Google provider needs the client id, which the API hands us at boot.
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{routes}</GoogleOAuthProvider> : routes
}
