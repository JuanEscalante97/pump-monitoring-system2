import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Checkbox,
  TableContainer,
} from '@mui/material';
import { Save, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { AlarmEvent, AlarmThreshold, Pump } from '../types';
import { useAuth } from '../context/AuthContext';

export const Alarms: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadAlarmsData = async () => {
    try {
      const [evRes, thRes, pRes] = await Promise.all([
        api.get('/alarms/events'),
        api.get('/alarms/thresholds'),
        api.get('/pumps'),
      ]);

      setEvents(evRes.data);
      setThresholds(thRes.data);
      setPumps(pRes.data);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error al cargar alarmas:', err);
    }
  };

  useEffect(() => {
    loadAlarmsData();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.put(`/alarms/events/${id}/acknowledge`);
      loadAlarmsData();
    } catch (err) {
      console.error('Error al reconocer alarma:', err);
    }
  };

  const handleDeleteAlarm = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este evento de alarma permanentemente?')) {
      return;
    }
    try {
      await api.delete(`/alarms/events/${id}`);
      loadAlarmsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar alarma');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Está seguro de eliminar ${selectedIds.length} eventos de alarma seleccionados? Esta acción es irreversible.`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/alarms/events/${id}`)));
      loadAlarmsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar alarmas');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(events.map(ev => ev.id));
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
            HISTORIAL DE ALARMAS
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Visualice el registro histórico de eventos de alarma disparados por el sistema de monitoreo.
          </Typography>
        </Box>
        {user?.role === 'Administrador' && selectedIds.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Trash2 size={18} />}
            onClick={handleBulkDelete}
          >
            Eliminar ({selectedIds.length})
          </Button>
        )}
      </Box>

      {/* Alarm Events Table */}
      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
          Historial de Eventos de Alarma Disparados ({events.length})
        </Typography>

        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role === 'Administrador' && (
                  <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selectedIds.length > 0 && selectedIds.length < events.length}
                    checked={events.length > 0 && selectedIds.length === events.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>Fecha y Hora</TableCell>
              <TableCell>Bomba</TableCell>
              <TableCell>Tipo Alarma</TableCell>
              <TableCell>Nivel</TableCell>
              <TableCell>Valor Registrado</TableCell>
              <TableCell>Límite Umbral</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => {
              const isUnack = ev.estado === 'Activa';
              const isSelected = selectedIds.includes(ev.id);
              return (
                <TableRow key={ev.id} selected={isSelected} sx={{ backgroundColor: isUnack ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                  {user?.role === 'Administrador' && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isSelected}
                        onChange={() => handleSelectOne(ev.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 700 }}>{new Date(ev.fecha_hora).toLocaleString()}</TableCell>
                  <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>{ev.bomba?.codigo}</TableCell>
                  <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{ev.tipo_alarma}</TableCell>
                  <TableCell>
                    <Chip
                      label={ev.nivel === 'ALARM' ? 'ALARMA' : ev.nivel === 'WARNING' ? 'ADVERTENCIA' : ev.nivel}
                      color={ev.nivel === 'ALARM' ? 'error' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>{ev.valor_registrado}</TableCell>
                  <TableCell>{ev.limite_umbral}</TableCell>
                  <TableCell>
                    <Chip label={ev.estado} color={isUnack ? 'error' : 'success'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {isUnack && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle2 size={14} />}
                          onClick={() => handleAcknowledge(ev.id)}
                        >
                          Reconocer
                        </Button>
                      )}
                      {user?.role === 'Administrador' && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Trash2 size={14} />}
                          onClick={() => handleDeleteAlarm(ev.id)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </Box>
                  </TableCell>
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
