import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';
import { Activity, Plus, AlertCircle, Clock, ShieldAlert, MessageCircle, Copy } from 'lucide-react';
import { api } from '../api/client';
import { Operation, Measurement } from '../types';
import { MeasurementModal } from '../components/MeasurementModal';
import { useAuth } from '../context/AuthContext';
import { Checkbox } from '@mui/material';
import { Trash2 } from 'lucide-react';

export const Monitoring: React.FC = () => {
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadMonitoringData = async () => {
    try {
      const opRes = await api.get('/operations/active');
      const currentOp: Operation | null = opRes.data;
      setActiveOp(currentOp);

      if (currentOp) {
        const mRes = await api.get(`/measurements?operation_id=${currentOp.id}`);
        setMeasurements(mRes.data);
        setSelectedIds([]);
      } else {
        setMeasurements([]);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error al cargar monitoreo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Está seguro de que desea eliminar ${selectedIds.length} lecturas seleccionadas? Esta acción es irreversible.`)) {
      return;
    }
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/measurements/${id}`)));
      loadMonitoringData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar mediciones');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(measurements.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const formatBriefSummary = (m: Measurement) => {
    const pSucc = m.presion_succion_inhg !== null && m.presion_succion_inhg !== undefined ? `${m.presion_succion_inhg} inHg` : 'N/A';
    const opCode = activeOp?.codigo_operacion || `OP-${m.operation_id}`;
    const buqueName = activeOp?.buque?.nombre || 'Buque en puerto';
    return ` REPORTE EMBARQUE\n` +
           ` Nave :  ${opCode} (${buqueName})\n` +
           ` Bomba en operacion : ${m.bomba?.codigo || '-'}\n` +
           ` P. Descarga: ${m.presion_descarga_psi} PSI | P. Succión: ${pSucc}\n` +
           ` Temp: ${m.temperatura_c} °C |  Corriente: ${m.corriente_a} A\n` +
           };

  const handleShareWhatsApp = (m: Measurement) => {
    const text = encodeURIComponent(formatBriefSummary(m));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopySummary = (m: Measurement) => {
    const text = formatBriefSummary(m);
    navigator.clipboard.writeText(text);
    alert('¡Estructura de registro copiada en el portapapeles y lista para compartir!');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            REGISTRO DE MONITOREO DE CONDICIÓN
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Capture presiones, temperatura y corriente. La fecha y hora exacta son estampadas por el servidor.
          </Typography>
        </Box>

        {activeOp && (
          <Box sx={{ display: 'flex', gap: 2 }}>
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
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={18} />}
              onClick={() => setModalOpen(true)}
            >
              Registrar Lectura
            </Button>
          </Box>
        )}
      </Box>

      {/* RULE ENFORCEMENT: No measurements if no active operation */}
      {!activeOp ? (
        <Alert
          severity="warning"
          icon={<AlertCircle size={28} />}
          sx={{
            py: 3,
            px: 3,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fbbf24' }}>
            REGISTRO DE MEDICIONES BLOQUEADO
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5, color: '#fef3c7' }}>
            No existe una <b>Operación Activa</b> en este momento. De acuerdo a la normativa operativa, debe iniciar una Operación de Bombeo antes de registrar lecturas de condición de equipos.
          </Typography>
          <Button
            variant="contained"
            color="warning"
            sx={{ mt: 2, fontWeight: 700 }}
            href="/operations"
          >
            Ir a Gestión de Operaciones para Iniciar
          </Button>
        </Alert>
      ) : (
        <Box>
          {/* Active Operation Details Banner */}
          <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#0f172a', borderRadius: 3, borderLeft: '4px solid #3182ce' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>OPERACIÓN ACTIVA</Typography>
                <Typography variant="h6" sx={{ color: '#63b3ed', fontWeight: 700 }}>
                  {activeOp.codigo_operacion.length > 10 ? 'OP-' + activeOp.codigo_operacion.slice(-3) : activeOp.codigo_operacion}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>BUQUE EN PUERTO</Typography>
                <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>{activeOp.buque?.nombre}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>PRODUCTO</Typography>
                <Typography variant="subtitle1" sx={{ color: '#00b4d8', fontWeight: 700 }}>{activeOp.producto?.nombre}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>BOMBAS HABILITADAS ({activeOp.pumps.length})</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {activeOp.pumps.map((p) => (
                    <Chip key={p.id} label={p.codigo} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Measurements Table for Active Operation */}
          <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
              Lecturas Registradas en la Operación Actual ({measurements.length})
            </Typography>

            <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {user?.role === 'Administrador' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          indeterminate={selectedIds.length > 0 && selectedIds.length < measurements.length}
                          checked={measurements.length > 0 && selectedIds.length === measurements.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell>FECHA Y HORA</TableCell>
                    <TableCell>Bomba</TableCell>
                    <TableCell>Tanque</TableCell>
                    <TableCell>P. Succión (inHg)</TableCell>
                    <TableCell>P. Descarga (psi)</TableCell>
                    <TableCell>Temp. Motor (°C)</TableCell>
                    <TableCell>Corriente (A)</TableCell>
                    <TableCell>Estado Alarma</TableCell>
                    <TableCell>Observaciones</TableCell>
                    <TableCell align="right">Compartir</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {measurements.map((m) => {
                    const isAlarm = m.temperatura_c > 80.0 || m.corriente_a > 45.0;
                    const isSelected = selectedIds.includes(m.id);
                    return (
                      <TableRow key={m.id} selected={isSelected}>
                        {user?.role === 'Administrador' && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="primary"
                              checked={isSelected}
                              onChange={() => handleSelectOne(m.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 700, color: '#f8fafc' }}>
                          {m.fecha_registro.split('-').reverse().join('/')} {m.hora_registro.substring(0, 5)}
                        </TableCell>
                        <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>
                          {m.bomba?.codigo}
                        </TableCell>
                        <TableCell>{m.tanque?.codigo || '-'}</TableCell>
                        <TableCell>{m.presion_succion_inhg !== null && m.presion_succion_inhg !== undefined ? m.presion_succion_inhg : '-'}</TableCell>
                        <TableCell>{m.presion_descarga_psi}</TableCell>
                        <TableCell sx={{ color: m.temperatura_c > 80 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                          {m.temperatura_c}
                        </TableCell>
                        <TableCell sx={{ color: m.corriente_a > 45 ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                          {m.corriente_a}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isAlarm ? 'CRÍTICO' : 'NORMAL'}
                            color={isAlarm ? 'error' : 'success'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>{m.observaciones || '-'}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<MessageCircle size={14} />}
                              onClick={() => handleShareWhatsApp(m)}
                              sx={{ fontSize: '0.75rem', px: 1, textTransform: 'none', backgroundColor: '#25D366', '&:hover': { backgroundColor: '#1EBE5D' } }}
                            >
                              WhatsApp
                            </Button>
                            <Button
                              variant="outlined"
                              color="info"
                              size="small"
                              startIcon={<Copy size={14} />}
                              onClick={() => handleCopySummary(m)}
                              sx={{ fontSize: '0.75rem', px: 1, textTransform: 'none' }}
                            >
                              Copiar
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {measurements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'Administrador' ? 11 : 10} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        Aún no se han registrado lecturas en esta operación.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Modal */}
          <MeasurementModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            operationId={activeOp.id}
            onSuccess={loadMonitoringData}
          />
        </Box>
      )}
    </Box>
  );
};
