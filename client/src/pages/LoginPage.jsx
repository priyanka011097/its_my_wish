import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import PhotoIcon from '@mui/icons-material/ImageRounded'
import LinkIcon from '@mui/icons-material/LinkRounded'
import NoteIcon from '@mui/icons-material/StickyNote2Rounded'
import ShareIcon from '@mui/icons-material/IosShareRounded'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../theme/ColorModeProvider'
import ThemeToggle from '../components/ThemeToggle'

const FEATURES = [
  { icon: <PhotoIcon />, title: 'Photos', text: 'Drop in a picture of the thing you are dreaming about.' },
  { icon: <LinkIcon />, title: 'Links', text: 'Paste a shop link and we fetch the title and image for you.' },
  { icon: <NoteIcon />, title: 'Notes', text: 'Sizes, colours, reasons - anything worth remembering.' },
  { icon: <ShareIcon />, title: 'Sharing', text: 'Invite people by email, or hand out a read-only link.' },
]

export default function LoginPage() {
  const theme = useTheme()
  const { mode } = useColorMode()
  const { user, googleClientId, configError, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  const handleCredential = async (response) => {
    setError('')
    try {
      await loginWithGoogle(response.credential)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err.status ? `${err.message} (HTTP ${err.status})` : err.message)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <ThemeToggle />
      </Box>

      <Container maxWidth="md" sx={{ flex: 1, display: 'grid', placeItems: 'center', pb: 6 }}>
        <Paper
          variant="outlined"
          sx={{
            width: '100%',
            p: { xs: 3, sm: 5 },
            borderRadius: 5,
            display: 'grid',
            gap: { xs: 4, md: 6 },
            gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            bgcolor: alpha(theme.palette.background.paper, 0.78),
          }}
        >
          <Box>
            <Box
              aria-hidden
              sx={{
                width: 54,
                height: 54,
                borderRadius: '18px',
                display: 'grid',
                placeItems: 'center',
                fontSize: 28,
                mb: 2.5,
                background: 'linear-gradient(135deg, #6C5CE7 0%, #e0417c 100%)',
                boxShadow: '0 10px 26px rgba(108,92,231,0.35)',
              }}
            >
              🎁
            </Box>
            <Typography variant="h3" sx={{ fontSize: { xs: 32, sm: 40 }, lineHeight: 1.1 }}>
              Every wish,
              <br />
              on its own board.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 420 }}>
              Build a board for a birthday, a new flat or someday-maybe. Fill it with photos, links and notes, then
              share it with exactly the people you choose.
            </Typography>

            <Stack spacing={1.75} sx={{ mt: 3.5 }}>
              {FEATURES.map((feature) => (
                <Stack key={feature.title} direction="row" spacing={1.75} alignItems="flex-start">
                  <Box
                    sx={{
                      mt: 0.25,
                      width: 34,
                      height: 34,
                      flex: '0 0 auto',
                      borderRadius: '11px',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">{feature.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.text}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack spacing={2.5} alignItems="center" sx={{ textAlign: 'center' }}>
            <Typography variant="h6">Sign in to get started</Typography>
            <Typography variant="body2" color="text.secondary">
              Your Google account is all you need - no extra password to remember.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                {error}
              </Alert>
            )}

            {googleClientId ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 44 }}>
                <GoogleLogin
                  onSuccess={handleCredential}
                  onError={() =>
                  setError(
                    'Google did not return a sign-in. If this deployment is new, add its origin ' +
                      `(${window.location.origin}) to the OAuth client's authorised JavaScript origins.`,
                  )
                }
                  theme={mode === 'dark' ? 'filled_black' : 'outline'}
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="260"
                />
              </Box>
            ) : configError ? (
              <Alert severity="error" sx={{ textAlign: 'left' }}>
                <AlertTitle>Cannot reach the API</AlertTitle>
                {configError}
                {isLocal ? (
                  <> Start it with <code>npm run dev:all</code>.</>
                ) : (
                  <> Check the deployment&apos;s function logs, and that <code>/api/health</code> responds.</>
                )}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ textAlign: 'left' }}>
                <AlertTitle>Google sign-in is not configured</AlertTitle>
                The API is running but reported no <code>GOOGLE_CLIENT_ID</code>.
                {isLocal ? (
                  <> Add it to <code>server/.env</code> and restart the API.</>
                ) : (
                  <> Add it to this deployment&apos;s environment variables, then redeploy &mdash; new variables do not
                    apply to an existing deployment.</>
                )}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary">
              We only store your name, email and profile picture.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
