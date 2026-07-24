import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  Container,
} from '@mui/material';
import { Gauge, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.access_token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0f19',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(49, 130, 206, 0.15) 0%, transparent 60%)',
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Logo & Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                backgroundColor: '#3182ce',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 0 25px rgba(49, 130, 206, 0.6)',
              }}
            >
              <Gauge size={32} color="#ffffff" />
            </Box>
            <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'Chakra Petch' }}>
              MONITOREO DE BOMBAS
            </Typography>
            <Typography variant="caption" sx={{ color: '#00b4d8', fontWeight: 600, display: 'block', mt: 0.5 }}>
              TERMINAL DE LIQUIDOS TRAMARSA - ILO
            </Typography>
          </Box>


          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type="password"
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={<ArrowRight size={18} />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  backgroundColor: '#3182ce',
                  '&:hover': { backgroundColor: '#2b6cb0' },
                }}
              >
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
            </Box>
          </form>

          {/* Quick Demo Credentials Help */}
          <Box sx={{ mt: 3, p: 1.5, borderRadius: 2, backgroundColor: '#1e293b', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
              Credenciales de Acceso por Defecto:
            </Typography>
            <Typography variant="caption" sx={{ color: '#63b3ed', fontWeight: 700 }}>
              Usuario: <b>mantenimiento</b> | Clave: <b>mantenimiento123</b>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
