import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
} from '@mui/material';
import { FileCheck, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLog } from '../types';

export const Audit: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const loadLogs = () => {
    api.get('/audit').then((res) => setLogs(res.data));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este registro de auditoría?')) return;
    try {
      await api.delete(`/audit/${id}`);
      loadLogs();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar el registro');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          BITÁCORA Y AUDITORÍA DEL SISTEMA
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Registro automático de usuario, fecha, hora, dirección IP y acción realizada. Cumplimiento de trazabilidad corporativa.
        </Typography>
      </Box>

      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha y Hora</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción Realizada</TableCell>
                <TableCell>Entidad Afectada</TableCell>
                <TableCell>Dirección IP</TableCell>
                <TableCell>Detalles Técnicos</TableCell>
                {user?.role === 'Administrador' && <TableCell align="right">Acción</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{new Date(log.fecha_hora).toLocaleString()}</TableCell>
                  <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>{log.username}</TableCell>
                  <TableCell>
                    <Chip label={log.accion} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{log.entidad} (ID: {log.entidad_id || '-'})</TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{log.ip_address || '127.0.0.1'}</TableCell>
                  <TableCell>{log.detalles || '-'}</TableCell>
                  {user?.role === 'Administrador' && (
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Trash2 size={14} />}
                        onClick={() => handleDelete(log.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
