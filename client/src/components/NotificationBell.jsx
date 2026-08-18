import { useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import NotificationsIcon from '@mui/icons-material/NotificationsRounded'
import CheckIcon from '@mui/icons-material/CheckRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import { useInvitations } from '../context/InvitationsContext'
import { boardAccent } from '../theme/theme'

function timeAgo(value) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** Bell with a count of wishlists waiting for you to accept or decline. */
export default function NotificationBell() {
  const theme = useTheme()
  const { pending, pendingCount, accept, decline } = useInvitations()
  const [anchor, setAnchor] = useState(null)

  return (
    <>
      <Tooltip title={pendingCount ? `${pendingCount} wishlist invitation${pendingCount === 1 ? '' : 's'}` : 'No new invitations'}>
        <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label="Invitations">
          <Badge badgeContent={pendingCount} color="secondary" overlap="circular">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw', borderRadius: 3 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2">Invitations</Typography>
          <Typography variant="caption" color="text.secondary">
            Wishlists people have shared with you
          </Typography>
        </Box>
        <Divider />

        {pending.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Box sx={{ fontSize: 28 }} aria-hidden>
              🔔
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Nothing waiting for you.
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />} sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {pending.map((invitation) => {
              const accent = boardAccent(invitation.board?.color, theme.palette.mode)
              return (
                <Box key={invitation.id} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 38,
                        height: 38,
                        flex: '0 0 auto',
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 20,
                        bgcolor: alpha(accent, 0.16),
                      }}
                    >
                      {invitation.board?.emoji || '🎁'}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {invitation.board?.title || 'A wishlist'}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                        <Avatar src={invitation.invitedBy?.picture} sx={{ width: 18, height: 18 }}>
                          {invitation.invitedBy?.name?.[0]}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {invitation.invitedBy?.name || invitation.invitedBy?.email} &middot; {timeAgo(invitation.createdAt)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {invitation.wishCount} {invitation.wishCount === 1 ? 'wish' : 'wishes'}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                        <Button size="small" variant="contained" startIcon={<CheckIcon />} onClick={() => accept(invitation)}>
                          Accept
                        </Button>
                        <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={() => decline(invitation)}>
                          Decline
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}
      </Popover>
    </>
  )
}
