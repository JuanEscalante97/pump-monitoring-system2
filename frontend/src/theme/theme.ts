import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0b0f19',
      paper: '#151c2c',
    },
    primary: {
      main: '#3182ce',
      light: '#63b3ed',
      dark: '#2b6cb0',
      contractText: '#ffffff',
    },
    secondary: {
      main: '#00b4d8',
      light: '#90e0ef',
      dark: '#0077b6',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: '#26334d',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Chakra Petch", sans-serif', fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #26334d',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(49, 130, 206, 0.3)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #26334d',
        },
        head: {
          fontWeight: 700,
          backgroundColor: '#1e293b',
          color: '#cbd5e1',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});
