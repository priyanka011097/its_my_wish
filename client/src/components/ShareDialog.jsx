import { useEffect, useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded'
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Rounded'
import RefreshIcon from '@mui/icons-material/AutorenewRounded'
import { endpoints } from '../api/client'
import { useToast } from '../context/ToastContext'

/**
 * Two ways to share a board: invite specific Google accounts by email,
 * or switch on a secret link that anyone can open read-only.
 */
export default function ShareDialog({ open, board, onClose, onBoardChange }) {
  const theme = useTheme()
  const { toast } = useToast()
  const [emailInput, setEmailInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setEmailInput('')
  }, [open, board?.id])

  if (!board) return null

  const shareUrl = `${window.location.origin}/s/${board.shareToken}`

  const run = async (work, successMessage) => {
    setBusy(true)
    try {
      const { board: updated } = await work()
      onBoardChange?.(updated)
      if (successMessage) toast(successMessage)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const addEmails = async (event) => {
    event.preventDefault()
    const value = emailInput.trim()
    if (!value) return
    await run(
      () => endpoints.addShareEmails(board.id, value.split(/[,\s;]+/).filter(Boolean)),
      'Invited - they can see this wishlist once they sign in',
    )
    setEmailInput('')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast('Share link copied')
    } catch {
      toast('Could not copy - select the link and copy it manually', 'error')
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Share &ldquo;{board.title}&rdquo;
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          People you share with can view the wishlist, but only you can change it.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={addEmails}>
          <TextField
            label="Invite by email"
            placeholder="friend@gmail.com, family@gmail.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            fullWidth
            disabled={busy}
            helperText="They sign in with Google using this address to see the list"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button type="submit" size="small" startIcon={<PersonAddIcon />} disabled={busy || !emailInput.trim()}>
                    Invite
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {board.sharedEmails?.length > 0 ? (
          <List dense sx={{ mt: 1 }}>
            {board.sharedEmails.map((email) => (
              <ListItem
                key={email}
                sx={{ borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) } }}
                secondaryAction={
                  <Tooltip title="Remove access">
                    <IconButton
                      edge="end"
                      size="small"
                      disabled={busy}
                      onClick={() => run(() => endpoints.removeShareEmail(board.id, email), `Removed ${email}`)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>{email[0]?.toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={email} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            No one has been invited yet.
          </Typography>
        )}

        <Divider sx={{ my: 2.5 }} />

        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(board.linkSharing)}
                disabled={busy}
                onChange={(e) =>
                  run(
                    () => endpoints.setLinkSharing(board.id, { enabled: e.target.checked }),
                    e.target.checked ? 'Anyone with the link can now view' : 'Link sharing turned off',
                  )
                }
              />
            }
            label={
              <Box>
                <Typography variant="subtitle2">Share with a link</Typography>
                <Typography variant="caption" color="text.secondary">
                  Anyone holding the link can view the wishlist without signing in.
                </Typography>
              </Box>
            }
          />

          {board.linkSharing && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField
                value={shareUrl}
                fullWidth
                onFocus={(e) => e.target.select()}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy link">
                        <IconButton size="small" onClick={copyLink}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title="Create a new link and break the old one">
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<RefreshIcon />}
                  disabled={busy}
                  onClick={() => run(() => endpoints.setLinkSharing(board.id, { regenerate: true }), 'New link created')}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Reset link
                </Button>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="contained" disabled={busy}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
