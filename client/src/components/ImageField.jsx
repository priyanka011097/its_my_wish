import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import CloudUploadIcon from '@mui/icons-material/CloudUploadRounded'
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'
import { endpoints } from '../api/client'
import { useToast } from '../context/ToastContext'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif'

const isUploaded = (value) => typeof value === 'string' && value.startsWith('/api/uploads/')

/**
 * Two ways to give a wish its picture: upload a file (stored in MongoDB via GridFS)
 * or paste a link to one already on the web. Both end up in the same `value`.
 */
export default function ImageField({ value, onChange, label = 'Image', required = false, error = '', disabled = false }) {
  const theme = useTheme()
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const send = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('That file is not an image', 'error')
      return
    }
    if (file.size > MAX_BYTES) {
      toast(`Images must be ${MAX_BYTES / 1024 / 1024}MB or smaller - that one is ${(file.size / 1024 / 1024).toFixed(1)}MB`, 'error')
      return
    }

    setUploading(true)
    setProgress(0)
    setImageFailed(false)
    try {
      const { upload } = await endpoints.uploadImage(file, { onProgress: setProgress })
      onChange(upload.url)
      toast('Image uploaded')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    if (disabled || uploading) return
    send(event.dataTransfer.files?.[0])
  }

  const uploaded = isUploaded(value)
  const hasValue = Boolean(String(value || '').trim())

  return (
    <Box>
      <Box
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !uploading) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px ${dragging ? 'solid' : 'dashed'} ${
            error ? theme.palette.error.main : dragging ? theme.palette.primary.main : theme.palette.divider
          }`,
          bgcolor: dragging ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
          transition: 'background-color .15s ease, border-color .15s ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(event) => send(event.target.files?.[0])}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {uploading ? `Uploading ${progress}%` : 'Upload image'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {label}
            {required ? ' (required)' : ' (optional)'} &mdash; drag a file here, or paste a link below. JPEG, PNG, GIF,
            WebP, AVIF or HEIC up to 5MB.
          </Typography>
        </Stack>

        {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 1.5, borderRadius: 1 }} />}

        <Divider sx={{ my: 1.75 }}>
          <Typography variant="caption" color="text.secondary">
            or
          </Typography>
        </Divider>

        <TextField
          label="Image link"
          placeholder="https://images.example.com/photo.jpg"
          value={uploaded ? '' : value || ''}
          onChange={(event) => {
            onChange(event.target.value)
            setImageFailed(false)
          }}
          disabled={disabled || uploading || uploaded}
          helperText={uploaded ? 'Using your uploaded image - remove it to paste a link instead' : error || ' '}
          error={Boolean(error)}
          fullWidth
        />

        {hasValue && (
          <Box
            sx={{
              mt: 1,
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              display: 'grid',
              placeItems: 'center',
              minHeight: 120,
            }}
          >
            {imageFailed ? (
              <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
                That image could not be loaded &mdash; check the link.
              </Typography>
            ) : (
              <Box
                component="img"
                src={value}
                alt="Preview"
                onError={() => setImageFailed(true)}
                sx={{ maxHeight: 220, width: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}

            <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 8, right: 8 }}>
              {uploaded && (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon />}
                  label="Uploaded"
                  color="success"
                  sx={{ bgcolor: alpha(theme.palette.success.main, 0.9), color: '#fff' }}
                />
              )}
              <Tooltip title="Remove image">
                <IconButton
                  size="small"
                  onClick={() => {
                    onChange('')
                    setImageFailed(false)
                  }}
                  disabled={disabled || uploading}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    '&:hover': { bgcolor: theme.palette.background.paper },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  )
}
