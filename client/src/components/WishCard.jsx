import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
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
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded'
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded'
import PhotoIcon from '@mui/icons-material/ImageRounded'
import LinkIcon from '@mui/icons-material/LinkRounded'
import NoteIcon from '@mui/icons-material/StickyNote2Rounded'

export const WISH_META = {
  photo: { label: 'Photo', icon: <PhotoIcon fontSize="small" />, emoji: '🖼️' },
  link: { label: 'Link', icon: <LinkIcon fontSize="small" />, emoji: '🔗' },
  note: { label: 'Note', icon: <NoteIcon fontSize="small" />, emoji: '📝' },
}

const PRIORITY_COLOR = { high: 'error', medium: 'warning', low: 'default' }

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function WishCard({ wish, canEdit = false, onEdit, onDelete, onPreview }) {
  const theme = useTheme()
  const [anchor, setAnchor] = useState(null)
  const [imageFailed, setImageFailed] = useState(false)
  const meta = WISH_META[wish.type] || WISH_META.note
  const image = !imageFailed ? wish.imageUrl : ''

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', '&:hover': { boxShadow: theme.shadows[4] } }}>
      {image && (
        <Box
          role={onPreview ? 'button' : undefined}
          onClick={onPreview ? () => onPreview(wish) : undefined}
          sx={{
            position: 'relative',
            aspectRatio: '4 / 3',
            overflow: 'hidden',
            cursor: onPreview ? 'zoom-in' : 'default',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          }}
        >
          <Box
            component="img"
            src={image}
            alt={wish.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
      )}

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            icon={meta.icon}
            label={meta.label}
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}
          />
          {wish.price && <Chip size="small" variant="outlined" label={wish.price} />}
          {wish.priority && wish.priority !== 'medium' && (
            <Chip size="small" color={PRIORITY_COLOR[wish.priority]} variant="outlined" label={wish.priority} />
          )}
          <Box sx={{ flex: 1 }} />
          {canEdit && (
            <IconButton size="small" aria-label="Wish options" onClick={(e) => setAnchor(e.currentTarget)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {wish.title}
        </Typography>

        {wish.note && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {wish.note}
          </Typography>
        )}

        {wish.tags?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {wish.tags.map((tag) => (
              <Chip key={tag} size="small" variant="outlined" label={`#${tag}`} sx={{ fontWeight: 500 }} />
            ))}
          </Stack>
        )}

        <Box sx={{ flex: 1 }} />

        {wish.url && (
          <Tooltip title={wish.url}>
            <Button
              href={wish.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={{ alignSelf: 'flex-start', px: 1.5 }}
            >
              {hostOf(wish.url)}
            </Button>
          </Tooltip>
        )}
      </Box>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            onEdit?.(wish)
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            onDelete?.(wish)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  )
}
