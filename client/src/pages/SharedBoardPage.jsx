import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import VisibilityIcon from '@mui/icons-material/VisibilityRounded'
import { endpoints } from '../api/client'
import AppShell from '../components/AppShell'
import BoardView from '../components/BoardView'
import { useAuth } from '../context/AuthContext'

/** Public, read-only view of a board opened through a share link. */
export default function SharedBoardPage() {
  const { token } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState({ board: null, wishes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    endpoints
      .sharedBoard(token)
      .then((data) => {
        if (cancelled) return
        setState({ board: data.board, wishes: data.wishes })
        setError('')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <AppShell
      toolbarExtras={
        !user ? (
          <Button component={RouterLink} to="/login" size="small" variant="outlined" sx={{ mr: 0.5 }}>
            Sign in
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={150} sx={{ borderRadius: 5 }} />
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={260} sx={{ borderRadius: 4 }} />
            ))}
          </Box>
        </Stack>
      ) : error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" component={RouterLink} to="/login">
              Sign in
            </Button>
          }
        >
          {error}
        </Alert>
      ) : (
        <BoardView
          board={state.board}
          wishes={state.wishes}
          canEdit={false}
          banner={
            <Box sx={{ mt: 2.5 }}>
              <Chip
                icon={<VisibilityIcon />}
                size="small"
                variant="outlined"
                label="Shared with you - view only"
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
          }
        />
      )}
    </AppShell>
  )
}
