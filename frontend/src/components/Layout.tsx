import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  LayoutDashboard,
  Activity,
  Gauge,
  History,
  ShieldAlert,
  FileSpreadsheet,
  Database,
  FileCheck,
  Menu as MenuIcon,
  LogOut,
  User as UserIcon,
  Radio,
  Workflow,
  Ship,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 260;

const menuItems = [
  { text: 'Panel de Control', path: '/', icon: <LayoutDashboard size={20} /> },
  { text: 'Operaciones', path: '/operations', icon: <Ship size={20} /> },
  { text: 'Registro de Monitoreo', path: '/monitoring', icon: <Activity size={20} /> },
  { text: 'Historial', path: '/history', icon: <History size={20} /> },
  { text: 'Alarmas & Umbrales', path: '/alarms', icon: <ShieldAlert size={20} /> },
  { text: 'Catálogos', path: '/catalogs', icon: <Database size={20} /> },
  { text: 'Reportes PDF / Excel', path: '/reports', icon: <FileSpreadsheet size={20} /> },
  { text: 'Auditoría', path: '/audit', icon: <FileCheck size={20} /> },
];

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #26334d' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: '#3182ce',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(49, 130, 206, 0.5)',
          }}
        >
          <Gauge size={24} color="#ffffff" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontSize: '1.05rem', lineHeight: 1.2 }}>
            MONITOREO DE BOMBAS
          </Typography>
          <Typography variant="caption" sx={{ color: '#00b4d8', fontWeight: 600, letterSpacing: 0.5 }}>
            TERMINAL DE LIQUIDOS TRAMARSA - ILO
          </Typography>
        </Box>
      </Box>


      {/* Navigation List */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {menuItems.filter(item => {
          if (item.text === 'Auditoría' && user?.role !== 'Administrador') return false;
          if (item.text === 'Catálogos' && user?.role !== 'Administrador') return false;
          return true;
        }).map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  backgroundColor: active ? 'rgba(49, 130, 206, 0.15)' : 'transparent',
                  borderLeft: active ? '3px solid #3182ce' : '3px solid transparent',
                  color: active ? '#63b3ed' : '#94a3b8',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#f1f5f9',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#63b3ed' : '#64748b' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: active ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: '#26334d' }} />

      {/* System Status Footer */}
      <Box sx={{ p: 2, backgroundColor: '#0b0f19' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Radio size={16} color="#10b981" />
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
            SERVIDOR EN LÍNEA (RELOJ ACTIVO)
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
          Versión Corporativa v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', overflowX: 'hidden' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #26334d',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, color: '#f8fafc', fontSize: '1.1rem' }}>
              Monitoreo de Condición de Bombas - Terminal Tramarsa Ilo
            </Typography>

          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.role || 'Mantenimiento'}
              color="primary"
              size="small"
              sx={{ fontWeight: 600, backgroundColor: 'rgba(49, 130, 206, 0.2)', color: '#63b3ed', border: '1px solid #3182ce' }}
            />

            <Tooltip title="Cuenta de Usuario">
              <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0.5, border: '1px solid #334155' }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#3182ce', fontSize: '0.9rem', fontWeight: 700 }}>
                  {(user && typeof user.full_name === 'string' && user.full_name.length > 0) ? user.full_name.charAt(0) : 'M'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: { backgroundColor: '#1e293b', border: '1px solid #334155', minWidth: 200, mt: 1 },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                  {user?.full_name || 'Usuario Mantenimiento'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  @{user?.username || 'mantenimiento'}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: '#334155' }} />
              <MenuItem onClick={handleLogout} sx={{ color: '#ef4444', gap: 1.5, py: 1 }}>
                <LogOut size={16} />
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #26334d' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: '#0b0f19',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
