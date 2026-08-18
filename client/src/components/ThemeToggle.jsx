import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import DarkModeIcon from '@mui/icons-material/DarkModeRounded'
import LightModeIcon from '@mui/icons-material/LightModeRounded'
import ComputerIcon from '@mui/icons-material/ComputerRounded'
import CheckIcon from '@mui/icons-material/CheckRounded'
import { useColorMode } from '../theme/ColorModeProvider'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: <LightModeIcon fontSize="small" /> },
  { value: 'dark', label: 'Dark', icon: <DarkModeIcon fontSize="small" /> },
  { value: 'system', label: 'Match system', icon: <ComputerIcon fontSize="small" /> },
]

export default function ThemeToggle() {
  const { mode, preference, setPreference } = useColorMode()
  const [anchor, setAnchor] = useState(null)

  return (
    <>
      <Tooltip title={`Theme: ${preference === 'system' ? `system (${mode})` : preference}`}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Change theme">
          {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={preference === option.value}
            onClick={() => {
              setPreference(option.value)
              setAnchor(null)
            }}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
            {preference === option.value && <CheckIcon fontSize="small" sx={{ ml: 1.5, opacity: 0.6 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
