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
} from '@mui/material';
import { Save, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { AlarmEvent, AlarmThreshold } from '../types';
import { useAuth } from '../context/AuthContext';

export const Alarms: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [threshold, setThreshold] = useState<AlarmThreshold | null>(null);

  // Threshold form state
  const [tempMax, setTempMax] = useState('80.0');
  const [currMax, setCurrMax] = useState('45.0');
  const [pSucMin, setPSucMin] = useState('-10.0');
  const [pSucMax, setPSucMax] = useState('30.0');
  const [pDescMin, setPDescMin] = useState('20.0');
  const [pDescMax, setPDescMax] = useState('150.0');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadAlarmsData = async () => {
    try {
      const [evRes, thRes] = await Promise.all([
        api.get('/alarms/events'),
        api.get('/alarms/thresholds'),
      ]);

      setEvents(evRes.data);
      if (thRes.data && thRes.data.length > 0) {
        const th: AlarmThreshold = thRes.data[0];
        setThreshold(th);
        setTempMax(String(th.temp_max_c));
        setCurrMax(String(th.corriente_max_a));
        setPSucMin(String(th.presion_suc_min_inhg));
        setPSucMax(String(th.presion_suc_max_inhg));
        setPDescMin(String(th.presion_desc_min_psi));
        setPDescMax(String(th.presion_desc_max_psi));
      }
    } catch (err) {
      console.error('Error al cargar alarmas:', err);
    }
  };

  useEffect(() => {
    loadAlarmsData();
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.post('/alarms/thresholds', {
        bomba_id: null,
        temp_max_c: parseFloat(tempMax),
        corriente_max_a: parseFloat(currMax),
        presion_suc_min_inhg: parseFloat(pSucMin),
        presion_suc_max_inhg: parseFloat(pSucMax),
        presion_desc_min_psi: parseFloat(pDescMin),
        presion_desc_max_psi: parseFloat(pDescMax),
        is_active: true,
      });

      setSaveSuccess(true);
      loadAlarmsData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar umbrales:', err);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          CONFIGURACIÓN DE ALARMAS Y EVENTOS CRÍTICOS
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Defina límites editables de operación segura. Al excederse los umbrales se disparará una alerta roja e historial de evento.
        </Typography>
      </Box>

      {/* Threshold Configuration Panel */}
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#0f172a', borderRadius: 3, borderLeft: '4px solid #ef4444' }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
          Límites Editables de Alarma (Globales)
        </Typography>

        {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>Umbrales de seguridad actualizados exitosamente.</Alert>}

        <form onSubmit={handleSaveThresholds}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Temp. Máxima Motor (°C)"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                helperText="Defecto: 80.0°C"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Corriente Máxima (A)"
                value={currMax}
                onChange={(e) => setCurrMax(e.target.value)}
                helperText="Defecto: 45.0 A"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Presión Succión Máx (inHg)"
                value={pSucMax}
                onChange={(e) => setPSucMax(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Presión Descarga Máx (psi)"
                value={pDescMax}
                onChange={(e) => setPDescMax(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button type="submit" variant="contained" color="error" disabled={saving} startIcon={<Save size={18} />}>
                {saving ? 'Guardando...' : 'Guardar Nuevos Umbrales'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Alarm Events Table */}
      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
          Historial de Eventos de Alarma Disparados ({events.length})
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
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
              return (
                <TableRow key={ev.id} sx={{ backgroundColor: isUnack ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                  <TableCell sx={{ fontWeight: 700 }}>{new Date(ev.fecha_hora).toLocaleString()}</TableCell>
                  <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>{ev.bomba?.codigo}</TableCell>
                  <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{ev.tipo_alarma}</TableCell>
                  <TableCell>
                    <Chip label={ev.nivel} color={ev.nivel === 'ALARM' ? 'error' : 'warning'} size="small" sx={{ fontWeight: 700 }} />
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
      </Paper>
    </Box>
  );
};
