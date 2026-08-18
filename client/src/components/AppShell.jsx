import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/LogoutRounded'
import DashboardIcon from '@mui/icons-material/GridViewRounded'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

function Logo() {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          borderRadius: '11px',
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          background: 'linear-gradient(135deg, #6C5CE7 0%, #e0417c 100%)',
          boxShadow: '0 6px 18px rgba(108,92,231,0.35)',
        }}
      >
        🎁
      </Box>
      <Typography variant="h6" noWrap sx={{ letterSpacing: '-0.02em' }}>
        It&rsquo;s My Wish
      </Typography>
    </Stack>
  )
}

/** Shared page frame: sticky app bar, theme switch, account menu, centred content. */
export default function AppShell({ children, maxWidth = 'lg', toolbarExtras = null }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState(null)

  const handleLogout = async () => {
    setAnchor(null)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky">
        <Container maxWidth={maxWidth}>
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Box component={RouterLink} to={user ? '/' : '/login'} sx={{ textDecoration: 'none', color: 'inherit' }}>
              <Logo />
            </Box>
            <Box sx={{ flex: 1 }} />
            {toolbarExtras}
            <ThemeToggle />
            {user ? (
              <>
                <Tooltip title={user.name}>
                  <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }} aria-label="Account">
                    <Avatar src={user.picture} alt={user.name} sx={{ width: 32, height: 32 }}>
                      {user.name?.[0]?.toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchor}
                  open={Boolean(anchor)}
                  onClose={() => setAnchor(null)}
                  slotProps={{ paper: { sx: { minWidth: 240 } } }}
                >
                  <Box sx={{ px: 2, py: 1.25 }}>
                    <Typography variant="subtitle2" noWrap>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setAnchor(null)
                      navigate('/')
                    }}
                  >
                    <ListItemIcon>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>My wishlists</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sign out</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : null}
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth={maxWidth} sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
        {children}
      </Container>

      <Box component="footer" sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">Made for keeping track of the good stuff.</Typography>
      </Box>
    </Box>
  )
}
