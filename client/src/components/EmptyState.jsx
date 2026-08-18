import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function EmptyState({ icon = '✨', title, description, action, dense = false }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: dense ? 3 : 6,
        borderRadius: 4,
        borderStyle: 'dashed',
        textAlign: 'center',
        bgcolor: 'transparent',
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Box sx={{ fontSize: dense ? 32 : 44, lineHeight: 1 }} aria-hidden>
          {icon}
        </Box>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ pt: 1 }}>{action}</Box>}
      </Stack>
    </Paper>
  )
}
