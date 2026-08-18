import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded'
import { endpoints } from '../api/client'
import { useToast } from '../context/ToastContext'
import AppShell from '../components/AppShell'
import BoardView from '../components/BoardView'
import BoardDialog from '../components/BoardDialog'
import WishDialog from '../components/WishDialog'
import ShareDialog from '../components/ShareDialog'
import ConfirmDialog from '../components/ConfirmDialog'

export default function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [state, setState] = useState({ board: null, wishes: [], role: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [wishDialog, setWishDialog] = useState(null) // { wish } | { wish: null }
  const [boardDialog, setBoardDialog] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deletingWish, setDeletingWish] = useState(null)
  const [deletingBoard, setDeletingBoard] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await endpoints.getBoard(boardId)
      setState({ board: data.board, wishes: data.wishes, role: data.role })
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    load()
  }, [load])

  const canEdit = state.role === 'owner'

  const submitWish = async (values) => {
    setBusy(true)
    try {
      if (wishDialog?.wish) {
        const { wish } = await endpoints.updateWish(wishDialog.wish.id, values)
        setState((s) => ({ ...s, wishes: s.wishes.map((w) => (w.id === wish.id ? wish : w)) }))
        toast('Wish updated')
      } else {
        const { wish } = await endpoints.createWish(boardId, values)
        setState((s) => ({ ...s, wishes: [wish, ...s.wishes] }))
        toast('Wish added')
      }
      setWishDialog(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const submitBoard = async (values) => {
    setBusy(true)
    try {
      const { board } = await endpoints.updateBoard(boardId, values)
      setState((s) => ({ ...s, board: { ...s.board, ...board } }))
      setBoardDialog(false)
      toast('Wishlist updated')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteWish = async () => {
    setBusy(true)
    try {
      await endpoints.deleteWish(deletingWish.id)
      setState((s) => ({ ...s, wishes: s.wishes.filter((w) => w.id !== deletingWish.id) }))
      setDeletingWish(null)
      toast('Wish removed')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteBoard = async () => {
    setBusy(true)
    try {
      await endpoints.deleteBoard(boardId)
      toast('Wishlist deleted')
      navigate('/', { replace: true })
    } catch (err) {
      toast(err.message, 'error')
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2, ml: -1.5 }}>
        All wishlists
      </Button>

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
            <Button color="inherit" size="small" component={RouterLink} to="/">
              Go home
            </Button>
          }
        >
          {error}
        </Alert>
      ) : (
        <BoardView
          board={state.board}
          wishes={state.wishes}
          canEdit={canEdit}
          onAddWish={() => setWishDialog({ wish: null })}
          onEditWish={(wish) => setWishDialog({ wish })}
          onDeleteWish={(wish) => setDeletingWish(wish)}
          onEditBoard={() => setBoardDialog(true)}
          onShareBoard={() => setShareOpen(true)}
          onDeleteBoard={() => setDeletingBoard(true)}
        />
      )}

      <WishDialog
        open={Boolean(wishDialog)}
        wish={wishDialog?.wish}
        busy={busy}
        onClose={() => setWishDialog(null)}
        onSubmit={submitWish}
      />
      <BoardDialog open={boardDialog} board={state.board} busy={busy} onClose={() => setBoardDialog(false)} onSubmit={submitBoard} />
      <ShareDialog
        open={shareOpen}
        board={state.board}
        onClose={() => setShareOpen(false)}
        onBoardChange={(board) => setState((s) => ({ ...s, board: { ...s.board, ...board } }))}
      />
      <ConfirmDialog
        open={Boolean(deletingWish)}
        busy={busy}
        title="Remove this wish?"
        message={`"${deletingWish?.title}" will be deleted from this wishlist.`}
        confirmLabel="Remove"
        onConfirm={confirmDeleteWish}
        onClose={() => setDeletingWish(null)}
      />
      <ConfirmDialog
        open={deletingBoard}
        busy={busy}
        title="Delete this wishlist?"
        message={`"${state.board?.title}" and all of its wishes will be permanently removed.`}
        onConfirm={confirmDeleteBoard}
        onClose={() => setDeletingBoard(false)}
      />
    </AppShell>
  )
}
