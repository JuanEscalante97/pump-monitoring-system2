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
  TableContainer,
  Checkbox,
} from '@mui/material';
import { FileCheck, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLog } from '../types';

export const Audit: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadLogs = () => {
    api.get('/audit').then((res) => {
      setLogs(res.data);
      setSelectedIds([]);
    });
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Está seguro de eliminar ${selectedIds.length} registros seleccionados? Esta acción es irreversible.`)) return;
    try {
      await api.post('/audit/bulk-delete', { ids: selectedIds });
      loadLogs();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar registros');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(logs.map(log => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            BITÁCORA Y AUDITORÍA DEL SISTEMA
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Registro automático de usuario, fecha, hora, dirección IP y acción realizada. Cumplimiento de trazabilidad corporativa.
          </Typography>
        </Box>
        {user?.role === 'Administrador' && selectedIds.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Trash2 size={18} />}
            onClick={handleBulkDelete}
          >
            Eliminar Seleccionados ({selectedIds.length})
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role === 'Administrador' && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < logs.length}
                      checked={logs.length > 0 && selectedIds.length === logs.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
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
              {logs.map((log) => {
                const isSelected = selectedIds.includes(log.id);
                return (
                  <TableRow key={log.id} selected={isSelected}>
                    {user?.role === 'Administrador' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isSelected}
                          onChange={() => handleSelectOne(log.id)}
                        />
                      </TableCell>
                    )}
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
