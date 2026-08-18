import { alpha, createTheme } from '@mui/material/styles'

// Board accent colours, shared by the board cards and their headers.
export const BOARD_COLORS = {
  violet: { light: '#6C5CE7', dark: '#9d92ff', label: 'Violet' },
  blue: { light: '#2f7cf6', dark: '#6fa8ff', label: 'Blue' },
  teal: { light: '#0f9b8e', dark: '#4fd1c5', label: 'Teal' },
  green: { light: '#2f9e44', dark: '#69db7c', label: 'Green' },
  amber: { light: '#c9791a', dark: '#ffc078', label: 'Amber' },
  rose: { light: '#e0417c', dark: '#ff8fb1', label: 'Rose' },
  slate: { light: '#556072', dark: '#a9b4c4', label: 'Slate' },
}

export const boardAccent = (color, mode) => (BOARD_COLORS[color] || BOARD_COLORS.violet)[mode === 'dark' ? 'dark' : 'light']

const FONT = '"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif'

const palettes = {
  light: {
    mode: 'light',
    primary: { main: '#6C5CE7', light: '#8d80ff', dark: '#4c3fc4', contrastText: '#fff' },
    secondary: { main: '#e0417c', contrastText: '#fff' },
    success: { main: '#2f9e44' },
    warning: { main: '#c9791a' },
    background: { default: '#f6f5fb', paper: '#ffffff' },
    text: { primary: '#161a25', secondary: '#5b6273' },
    divider: 'rgba(22, 26, 37, 0.1)',
  },
  dark: {
    mode: 'dark',
    primary: { main: '#9d92ff', light: '#bdb5ff', dark: '#6C5CE7', contrastText: '#12131a' },
    secondary: { main: '#ff8fb1', contrastText: '#12131a' },
    success: { main: '#69db7c' },
    warning: { main: '#ffc078' },
    background: { default: '#0d0f16', paper: '#161a24' },
    text: { primary: '#eef0f6', secondary: '#a3aabb' },
    divider: 'rgba(238, 240, 246, 0.12)',
  },
}

export function buildTheme(mode) {
  const palette = palettes[mode] || palettes.light
  const isDark = mode === 'dark'

  return createTheme({
    palette,
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: FONT,
      h1: { fontFamily: FONT, fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(1000px 600px at 12% -10%, rgba(108,92,231,0.22), transparent 60%), radial-gradient(900px 500px at 92% 0%, rgba(224,65,124,0.16), transparent 55%)'
              : 'radial-gradient(1000px 600px at 12% -10%, rgba(108,92,231,0.14), transparent 60%), radial-gradient(900px 500px at 92% 0%, rgba(224,65,124,0.10), transparent 55%)',
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backdropFilter: 'blur(12px)',
            backgroundColor: isDark ? 'rgba(13,15,22,0.72)' : 'rgba(255,255,255,0.72)',
            borderBottom: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            borderRadius: 18,
            transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20, backgroundImage: 'none' } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiAlert: { styleOverrides: { root: ({ theme }) => ({ borderRadius: 12, border: `1px solid ${alpha(theme.palette.divider, 1)}` }) } },
    },
  })
}
