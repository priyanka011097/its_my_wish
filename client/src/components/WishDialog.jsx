import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded'
import PhotoIcon from '@mui/icons-material/ImageRounded'
import LinkIcon from '@mui/icons-material/LinkRounded'
import NoteIcon from '@mui/icons-material/StickyNote2Rounded'
import { endpoints } from '../api/client'
import { useToast } from '../context/ToastContext'

const TYPES = [
  { value: 'photo', label: 'Photo', icon: <PhotoIcon fontSize="small" /> },
  { value: 'link', label: 'Link', icon: <LinkIcon fontSize="small" /> },
  { value: 'note', label: 'Note', icon: <NoteIcon fontSize="small" /> },
]

const EMPTY = { type: 'photo', title: '', imageUrl: '', url: '', note: '', price: '', priority: 'medium', tags: '' }

/** Add or edit a wish. The tab picks which fields matter: image, link or note text. */
export default function WishDialog({ open, wish, busy = false, onClose, onSubmit }) {
  const theme = useTheme()
  const { toast } = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [fetching, setFetching] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setImageFailed(false)
    setForm(
      wish
        ? {
            type: wish.type,
            title: wish.title || '',
            imageUrl: wish.imageUrl || '',
            url: wish.url || '',
            note: wish.note || '',
            price: wish.price || '',
            priority: wish.priority || 'medium',
            tags: (wish.tags || []).join(', '),
          }
        : EMPTY,
    )
  }, [open, wish])

  const set = (key) => (event) => {
    const { value } = event.target
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
    if (key === 'imageUrl') setImageFailed(false)
  }

  // Pull the title/image/price a shop page advertises so the form fills itself in.
  const autofill = async () => {
    if (!form.url.trim()) return
    setFetching(true)
    try {
      const { preview } = await endpoints.linkPreview(form.url.trim())
      setForm((f) => ({
        ...f,
        url: preview.url || f.url,
        title: f.title || preview.title || '',
        imageUrl: f.imageUrl || preview.imageUrl || '',
        price: f.price || preview.price || '',
        note: f.note || preview.description || '',
      }))
      setImageFailed(false)
      if (!preview.title && !preview.imageUrl) toast('That site did not share any preview details', 'info')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setFetching(false)
    }
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Give this wish a name'
    if (form.type === 'photo' && !form.imageUrl.trim()) next.imageUrl = 'Paste an image link'
    if (form.type === 'link' && !form.url.trim()) next.url = 'Paste the link'
    if (form.type === 'note' && !form.note.trim()) next.note = 'Write the note'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    await onSubmit({
      type: form.type,
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      url: form.url.trim(),
      note: form.note.trim(),
      price: form.price.trim(),
      priority: form.priority,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  const showImageField = form.type === 'photo' || form.type === 'link'
  const showUrlField = form.type === 'link' || form.type === 'photo'

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>{wish ? 'Edit wish' : 'Add a wish'}</DialogTitle>
        <DialogContent>
          <Tabs
            value={form.type}
            onChange={(_event, type) => {
              setForm((f) => ({ ...f, type }))
              setErrors({})
            }}
            sx={{ mb: 2.5, minHeight: 40 }}
          >
            {TYPES.map((type) => (
              <Tab
                key={type.value}
                value={type.value}
                icon={type.icon}
                iconPosition="start"
                label={type.label}
                sx={{ minHeight: 40 }}
              />
            ))}
          </Tabs>

          <Stack spacing={2}>
            {showUrlField && (
              <TextField
                label={form.type === 'link' ? 'Link to the thing you want' : 'Where to buy it (optional)'}
                placeholder="https://shop.example.com/item"
                value={form.url}
                onChange={set('url')}
                error={Boolean(errors.url)}
                helperText={errors.url || (form.type === 'link' ? 'We can fetch the title and picture for you' : ' ')}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={autofill}
                        disabled={fetching || !form.url.trim()}
                        startIcon={fetching ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                      >
                        Fetch
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <TextField
              autoFocus={form.type !== 'link'}
              label="Name"
              placeholder="Noise-cancelling headphones"
              value={form.title}
              onChange={set('title')}
              error={Boolean(errors.title)}
              helperText={errors.title || ' '}
              fullWidth
            />

            {showImageField && (
              <TextField
                label={form.type === 'photo' ? 'Image link' : 'Image link (optional)'}
                placeholder="https://images.example.com/photo.jpg"
                value={form.imageUrl}
                onChange={set('imageUrl')}
                error={Boolean(errors.imageUrl)}
                helperText={errors.imageUrl || ' '}
                fullWidth
              />
            )}

            {form.imageUrl.trim() && (
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: 120,
                }}
              >
                {imageFailed ? (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
                    That image link could not be loaded &mdash; check the URL.
                  </Typography>
                ) : (
                  <Box
                    component="img"
                    src={form.imageUrl.trim()}
                    alt="Preview"
                    onError={() => setImageFailed(true)}
                    sx={{ maxHeight: 200, width: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </Box>
            )}

            <TextField
              label={form.type === 'note' ? 'Note' : 'Note (optional)'}
              placeholder={form.type === 'note' ? 'Anything you want to remember about this wish' : 'Size, colour, why you want it'}
              value={form.note}
              onChange={set('note')}
              error={Boolean(errors.note)}
              helperText={errors.note || ' '}
              multiline
              minRows={form.type === 'note' ? 4 : 2}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Price (optional)" placeholder="4,999" value={form.price} onChange={set('price')} fullWidth />
              <TextField select label="Priority" value={form.priority} onChange={set('priority')} fullWidth>
                <MenuItem value="low">Nice to have</MenuItem>
                <MenuItem value="medium">Would love it</MenuItem>
                <MenuItem value="high">Top of the list</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Tags (optional)"
              placeholder="tech, gift, blue"
              value={form.tags}
              onChange={set('tags')}
              helperText="Comma separated, up to 8"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {wish ? 'Save wish' : 'Add wish'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
