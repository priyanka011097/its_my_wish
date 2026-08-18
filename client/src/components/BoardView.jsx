import { useMemo, useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/AddRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditIcon from '@mui/icons-material/EditRounded'
import LinkIcon from '@mui/icons-material/LinkRounded'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import SearchIcon from '@mui/icons-material/SearchRounded'
import ShareIcon from '@mui/icons-material/IosShareRounded'
import { boardAccent } from '../theme/theme'
import EmptyState from './EmptyState'
import WishCard from './WishCard'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

const gridSx = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
}

/** The board header plus the filtered wish grid. Shared by the owner view and the public link view. */
export default function BoardView({
  board,
  wishes,
  canEdit = false,
  onAddWish,
  onEditWish,
  onDeleteWish,
  onEditBoard,
  onShareBoard,
  onDeleteBoard,
  banner = null,
}) {
  const theme = useTheme()
  const accent = boardAccent(board.color, theme.palette.mode)
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [lightbox, setLightbox] = useState(null)

  const counts = useMemo(
    () =>
      wishes.reduce((acc, wish) => {
        acc[wish.type] = (acc[wish.type] || 0) + 1
        return acc
      }, {}),
    [wishes],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = wishes.filter((wish) => {
      if (typeFilter !== 'all' && wish.type !== typeFilter) return false
      if (!needle) return true
      return [wish.title, wish.note, wish.url, ...(wish.tags || [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    })

    const sorted = [...list]
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    if (sort === 'priority') sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    if (sort === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [wishes, typeFilter, query, sort])

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          borderRadius: 5,
          borderColor: alpha(accent, 0.35),
          background: `linear-gradient(135deg, ${alpha(accent, 0.16)}, ${alpha(accent, 0.03)})`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'center' }}>
          <Box
            aria-hidden
            sx={{
              width: 62,
              height: 62,
              flex: '0 0 auto',
              borderRadius: '20px',
              display: 'grid',
              placeItems: 'center',
              fontSize: 32,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            {board.emoji || '🎁'}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>
              {board.title}
            </Typography>
            {board.description && (
              <Typography color="text.secondary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }}>
                {board.description}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.75 }} alignItems="center">
              <Chip
                size="small"
                label={`${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'}`}
                sx={{ bgcolor: alpha(accent, 0.16), color: accent }}
              />
              {canEdit && board.linkSharing && <Chip size="small" variant="outlined" icon={<LinkIcon />} label="Link sharing on" />}
              {canEdit && board.sharedEmails?.length > 0 && (
                <Tooltip title={board.sharedEmails.join(', ')}>
                  <Chip size="small" variant="outlined" icon={<PeopleIcon />} label={`${board.sharedEmails.length} invited`} />
                </Tooltip>
              )}
              {!canEdit && board.owner && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Avatar src={board.owner.picture} sx={{ width: 22, height: 22 }}>
                    {board.owner.name?.[0]}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {board.owner.name}&apos;s wishlist
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          {canEdit && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={onAddWish}>
                Add wish
              </Button>
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={onShareBoard}>
                Share
              </Button>
              <Tooltip title="Edit board details">
                <IconButton onClick={onEditBoard} aria-label="Edit board">
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete board">
                <IconButton onClick={onDeleteBoard} aria-label="Delete board" color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>
        {banner}
      </Paper>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2.5 }}
      >
        <Tabs value={typeFilter} onChange={(_event, value) => setTypeFilter(value)} sx={{ minHeight: 40 }}>
          <Tab value="all" label={`All (${wishes.length})`} sx={{ minHeight: 40 }} />
          <Tab value="photo" label={`Photos (${counts.photo || 0})`} sx={{ minHeight: 40 }} />
          <Tab value="link" label={`Links (${counts.link || 0})`} sx={{ minHeight: 40 }} />
          <Tab value="note" label={`Notes (${counts.note || 0})`} sx={{ minHeight: 40 }} />
        </Tabs>

        <Stack direction="row" spacing={1.5}>
          <TextField
            placeholder="Search wishes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ minWidth: { sm: 200 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField select value={sort} onChange={(event) => setSort(event.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="priority">By priority</MenuItem>
            <MenuItem value="name">By name</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {visible.length ? (
        <Box sx={gridSx}>
          {visible.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              canEdit={canEdit}
              onEdit={onEditWish}
              onDelete={onDeleteWish}
              onPreview={(item) => setLightbox(item)}
            />
          ))}
        </Box>
      ) : (
        <EmptyState
          icon={wishes.length ? '🔍' : '✨'}
          title={wishes.length ? 'Nothing matches those filters' : canEdit ? 'This board is empty' : 'Nothing here yet'}
          description={
            wishes.length
              ? 'Try another search word, or switch back to All.'
              : canEdit
                ? 'Add a photo, a link to something you want, or just a note.'
                : 'The owner has not added any wishes yet.'
          }
          action={
            canEdit && !wishes.length ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={onAddWish}>
                Add the first wish
              </Button>
            ) : null
          }
        />
      )}

      <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="md">
        <Box sx={{ position: 'relative', bgcolor: 'background.default' }}>
          <IconButton
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {lightbox && (
            <>
              <Box
                component="img"
                src={lightbox.imageUrl}
                alt={lightbox.title}
                sx={{ display: 'block', maxWidth: '100%', maxHeight: '78dvh' }}
              />
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {lightbox.title}
                </Typography>
                {lightbox.note && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {lightbox.note}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      </Dialog>
    </>
  )
}
