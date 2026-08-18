import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { BOARD_COLORS, boardAccent } from '../theme/theme'

const EMOJIS = ['🎁', '🎂', '🎄', '🏡', '✈️', '📚', '🎮', '👗', '🍳', '🎧', '💻', '🚲', '🌱', '💍', '🐾', '⭐']

const EMPTY = { title: '', description: '', emoji: '🎁', color: 'violet' }

/** Create or rename a wishlist board, and pick its emoji + accent colour. */
export default function BoardDialog({ open, board, busy = false, onClose, onSubmit }) {
  const theme = useTheme()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      board
        ? { title: board.title, description: board.description || '', emoji: board.emoji || '🎁', color: board.color || 'violet' }
        : EMPTY,
    )
  }, [open, board])

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Your wishlist needs a title')
      return
    }
    await onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() })
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{board ? 'Edit wishlist' : 'New wishlist'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              label="Title"
              placeholder="Birthday 2026"
              value={form.title}
              onChange={set('title')}
              error={Boolean(error)}
              helperText={error || ' '}
              fullWidth
            />
            <TextField
              label="Description"
              placeholder="What is this list for?"
              value={form.description}
              onChange={set('description')}
              multiline
              minRows={2}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Icon
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {EMOJIS.map((emoji) => {
                  const selected = form.emoji === emoji
                  return (
                    <Box
                      key={emoji}
                      component="button"
                      type="button"
                      aria-label={`Icon ${emoji}`}
                      aria-pressed={selected}
                      onClick={() => setForm((f) => ({ ...f, emoji }))}
                      sx={{
                        width: 40,
                        height: 40,
                        fontSize: 20,
                        cursor: 'pointer',
                        borderRadius: '12px',
                        bgcolor: selected ? alpha(theme.palette.primary.main, 0.16) : 'transparent',
                        border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                      }}
                    >
                      {emoji}
                    </Box>
                  )
                })}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Accent colour
              </Typography>
              <Stack direction="row" spacing={1}>
                {Object.entries(BOARD_COLORS).map(([key, value]) => {
                  const selected = form.color === key
                  return (
                    <Tooltip key={key} title={value.label}>
                      <Box
                        component="button"
                        type="button"
                        aria-label={value.label}
                        aria-pressed={selected}
                        onClick={() => setForm((f) => ({ ...f, color: key }))}
                        sx={{
                          width: 30,
                          height: 30,
                          p: 0,
                          cursor: 'pointer',
                          borderRadius: '50%',
                          bgcolor: boardAccent(key, theme.palette.mode),
                          border: `2px solid ${selected ? theme.palette.text.primary : 'transparent'}`,
                          outline: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                    </Tooltip>
                  )
                })}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {board ? 'Save changes' : 'Create wishlist'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
