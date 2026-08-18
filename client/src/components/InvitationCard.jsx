import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/CheckRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import { boardAccent } from '../theme/theme'

/** A wishlist waiting on you, shown on the dashboard above your own boards. */
export default function InvitationCard({ invitation, onAccept, onDecline }) {
  const theme = useTheme()
  const accent = boardAccent(invitation.board?.color, theme.palette.mode)

  return (
    <Card
      sx={{
        p: 2.25,
        borderColor: alpha(accent, 0.45),
        background: `linear-gradient(135deg, ${alpha(accent, 0.12)}, transparent)`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          aria-hidden
          sx={{
            width: 44,
            height: 44,
            flex: '0 0 auto',
            borderRadius: '14px',
            display: 'grid',
            placeItems: 'center',
            fontSize: 22,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {invitation.board?.emoji || '🎁'}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {invitation.board?.title || 'A wishlist'}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
            <Avatar src={invitation.invitedBy?.picture} sx={{ width: 20, height: 20 }}>
              {invitation.invitedBy?.name?.[0]}
            </Avatar>
            <Typography variant="caption" color="text.secondary" noWrap>
              {invitation.invitedBy?.name || invitation.invitedBy?.email} shared this with you
            </Typography>
          </Stack>
          {invitation.board?.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {invitation.board.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            {invitation.wishCount} {invitation.wishCount === 1 ? 'wish' : 'wishes'} inside
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
            <Button size="small" variant="contained" startIcon={<CheckIcon />} onClick={() => onAccept(invitation)}>
              Accept
            </Button>
            <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={() => onDecline(invitation)}>
              Decline
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Card>
  )
}
