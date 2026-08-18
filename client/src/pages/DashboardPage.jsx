import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/AddRounded'
import SearchIcon from '@mui/icons-material/SearchRounded'
import { endpoints } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useInvitations } from '../context/InvitationsContext'
import { useToast } from '../context/ToastContext'
import AppShell from '../components/AppShell'
import BoardCard from '../components/BoardCard'
import BoardDialog from '../components/BoardDialog'
import ShareDialog from '../components/ShareDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import InvitationCard from '../components/InvitationCard'

const gridSx = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
}

function BoardGridSkeleton() {
  return (
    <Box sx={gridSx}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={230} sx={{ borderRadius: 4 }} />
      ))}
    </Box>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { pending, accept, decline, acceptedAt } = useInvitations()
  const [boards, setBoards] = useState({ owned: [], shared: [] })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null) // { board } | { board: null } while creating
  const [sharing, setSharing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await endpoints.listBoards()
      setBoards({ owned: data.owned, shared: data.shared })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load, acceptedAt])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const match = (board) =>
      !needle || board.title.toLowerCase().includes(needle) || (board.description || '').toLowerCase().includes(needle)
    return { owned: boards.owned.filter(match), shared: boards.shared.filter(match) }
  }, [boards, query])

  const upsertOwned = (updated) =>
    setBoards((prev) => ({
      ...prev,
      owned: prev.owned.some((b) => b.id === updated.id)
        ? prev.owned.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
        : [{ ...updated }, ...prev.owned],
    }))

  const submitBoard = async (values) => {
    setBusy(true)
    try {
      if (editing?.board) {
        const { board } = await endpoints.updateBoard(editing.board.id, values)
        upsertOwned(board)
        toast('Wishlist updated')
      } else {
        const { board } = await endpoints.createBoard(values)
        upsertOwned(board)
        toast('Wishlist created')
      }
      setEditing(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await endpoints.deleteBoard(deleting.id)
      setBoards((prev) => ({ ...prev, owned: prev.owned.filter((b) => b.id !== deleting.id) }))
      toast(`Deleted "${deleting.title}"`)
      setDeleting(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const sharingBoard = sharing ? boards.owned.find((b) => b.id === sharing.id) || sharing : null

  return (
    <AppShell>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">Hi {user?.name?.split(' ')[0] || 'there'} 👋</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {pending.length
              ? `${pending.length} invitation${pending.length === 1 ? '' : 's'} waiting for you`
              : boards.owned.length
                ? `${boards.owned.length} wishlist${boards.owned.length === 1 ? '' : 's'} of your own${
                    boards.shared.length ? ` · ${boards.shared.length} shared with you` : ''
                  }`
                : 'Create your first wishlist board to get going.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            placeholder="Search wishlists"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { sm: 220 }, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ board: null })} sx={{ whiteSpace: 'nowrap' }}>
            New
          </Button>
        </Stack>
      </Stack>

      {pending.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="overline" color="text.secondary">
            Waiting for you
          </Typography>
          <Box sx={{ ...gridSx, mt: 1.5 }}>
            {pending.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} onAccept={accept} onDecline={decline} />
            ))}
          </Box>
        </Box>
      )}

      {loading ? (
        <BoardGridSkeleton />
      ) : (
        <Stack spacing={5}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              My wishlists
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              {filtered.owned.length ? (
                <Box sx={gridSx}>
                  {filtered.owned.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onEdit={(b) => setEditing({ board: b })}
                      onShare={(b) => setSharing(b)}
                      onDelete={(b) => setDeleting(b)}
                    />
                  ))}
                </Box>
              ) : (
                <EmptyState
                  icon="🎁"
                  dense={Boolean(query)}
                  title={query ? 'No wishlists match that search' : 'No wishlists yet'}
                  description={
                    query
                      ? 'Try a different word, or clear the search.'
                      : 'A board can be anything: a birthday list, a home project, or things you just like.'
                  }
                  action={
                    !query && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ board: null })}>
                        Create a wishlist
                      </Button>
                    )
                  }
                />
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">
              Shared with me
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              {filtered.shared.length ? (
                <Box sx={gridSx}>
                  {filtered.shared.map((board) => (
                    <BoardCard key={board.id} board={board} />
                  ))}
                </Box>
              ) : boards.shared.length ? (
                <EmptyState dense icon="🔍" title="Nothing shared matches that search" />
              ) : (
                <EmptyState
                  dense
                  icon="🤝"
                  title="No shared wishlists yet"
                  description={
                    pending.length
                      ? 'Accept an invitation above and the wishlist will appear here.'
                      : 'When someone invites you to their wishlist, you will get a notification - accept it and the wishlist lands here.'
                  }
                />
              )}
            </Box>
          </Box>
        </Stack>
      )}

      <BoardDialog
        open={Boolean(editing)}
        board={editing?.board}
        busy={busy}
        onClose={() => setEditing(null)}
        onSubmit={submitBoard}
      />
      <ShareDialog
        open={Boolean(sharing)}
        board={sharingBoard}
        onClose={() => setSharing(null)}
        onBoardChange={(board) => {
          upsertOwned(board)
          setSharing(board)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete this wishlist?"
        message={`"${deleting?.title}" and all of its wishes will be permanently removed. This cannot be undone.`}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </AppShell>
  )
}
