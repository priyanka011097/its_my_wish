import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVertRounded'
import EditIcon from '@mui/icons-material/EditRounded'
import ShareIcon from '@mui/icons-material/IosShareRounded'
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded'
import LinkIcon from '@mui/icons-material/LinkRounded'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import { boardAccent } from '../theme/theme'

export default function BoardCard({ board, onEdit, onShare, onDelete }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState(null)
  const accent = boardAccent(board.color, theme.palette.mode)
  const isOwner = board.role === 'owner'

  const runAction = (action) => (event) => {
    event.stopPropagation()
    setAnchor(null)
    action(board)
  }

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 34px ${alpha(accent, 0.22)}`, borderColor: alpha(accent, 0.5) },
      }}
    >
      <CardActionArea onClick={() => navigate(`/b/${board.id}`)} sx={{ height: '100%' }}>
        <Box
          sx={{
            height: 92,
            position: 'relative',
            background: board.coverImage
              ? `linear-gradient(0deg, ${alpha(theme.palette.background.paper, 0.55)}, ${alpha(accent, 0.35)}), url(${board.coverImage}) center/cover`
              : `linear-gradient(135deg, ${alpha(accent, 0.85)}, ${alpha(accent, 0.35)})`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: -22,
              left: 18,
              width: 46,
              height: 46,
              borderRadius: '14px',
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[2],
            }}
            aria-hidden
          >
            {board.emoji || '🎁'}
          </Box>
        </Box>

        <Box sx={{ p: 2.25, pt: 3.5 }}>
          <Typography variant="h6" noWrap title={board.title}>
            {board.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              minHeight: 40,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {board.description || 'No description yet.'}
          </Typography>

          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.75, flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              size="small"
              label={`${board.wishCount ?? 0} ${board.wishCount === 1 ? 'wish' : 'wishes'}`}
              sx={{ bgcolor: alpha(accent, 0.14), color: accent }}
            />
            {isOwner && board.linkSharing && (
              <Tooltip title="Anyone with the link can view">
                <Chip size="small" variant="outlined" icon={<LinkIcon />} label="Link" />
              </Tooltip>
            )}
            {isOwner && board.invites?.length > 0 && (
              <Tooltip
                title={board.invites.map((invite) => `${invite.email} (${invite.status})`).join(', ')}
              >
                <Chip size="small" variant="outlined" icon={<PeopleIcon />} label={board.invites.length} />
              </Tooltip>
            )}
            {!isOwner && board.owner && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 'auto' }}>
                <Avatar src={board.owner.picture} sx={{ width: 20, height: 20 }}>
                  {board.owner.name?.[0]}
                </Avatar>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                  {board.owner.name}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
      </CardActionArea>

      {isOwner && (
        <>
          <IconButton
            size="small"
            aria-label="Board options"
            onClick={(e) => {
              e.stopPropagation()
              setAnchor(e.currentTarget)
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              '&:hover': { bgcolor: theme.palette.background.paper },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem onClick={runAction(onEdit)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit details</ListItemText>
            </MenuItem>
            <MenuItem onClick={runAction(onShare)}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share</ListItemText>
            </MenuItem>
            <MenuItem onClick={runAction(onDelete)} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
    </Card>
  )
}
