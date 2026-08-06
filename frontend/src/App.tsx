import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomThemeProvider } from './context/ThemeContext';

import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Operations } from './pages/Operations';
import { Monitoring } from './pages/Monitoring';
import { History } from './pages/History';
import { Catalogs } from './pages/Catalogs';
import { Alarms } from './pages/Alarms';
import { Reports } from './pages/Reports';
import { Audit } from './pages/Audit';

import { Box, Button, Typography, Alert } from '@mui/material';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary capturó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, backgroundColor: '#0b0f19', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Alert severity="error" sx={{ maxWidth: 600, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Error al renderizar el componente
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {this.state.error?.message || 'Ocurrió un error inesperado en la interfaz.'}
            </Typography>
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            Limpiar Caché y Reiniciar Sesión
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <CustomThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="operations" element={<Operations />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="history" element={<History />} />
                <Route path="catalogs" element={<Catalogs />} />
                <Route path="alarms" element={<Alarms />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audit" element={<Audit />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </CustomThemeProvider>
  );
};


export default App;
