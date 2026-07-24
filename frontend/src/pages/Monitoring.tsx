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
} from '@mui/material';
import { Activity, Plus, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { Operation, Measurement } from '../types';
import { MeasurementModal } from '../components/MeasurementModal';

export const Monitoring: React.FC = () => {
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadMonitoringData = async () => {
    try {
      const opRes = await api.get('/operations/active');
      const currentOp: Operation | null = opRes.data;
      setActiveOp(currentOp);

      if (currentOp) {
        const mRes = await api.get(`/measurements?operation_id=${currentOp.id}`);
        setMeasurements(mRes.data);
      } else {
        setMeasurements([]);
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => setModalOpen(true)}
          >
            Registrar Lectura
          </Button>
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
                <Typography variant="h6" sx={{ color: '#63b3ed', fontWeight: 700 }}>{activeOp.codigo_operacion}</Typography>
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
                    <TableCell>Estampa Servidor (Hora)</TableCell>
                    <TableCell>Bomba</TableCell>
                    <TableCell>P. Succión (inHg)</TableCell>
                    <TableCell>P. Descarga (psi)</TableCell>
                    <TableCell>Temp. Motor (°C)</TableCell>
                    <TableCell>Corriente (A)</TableCell>
                    <TableCell>Estado Alarma</TableCell>
                    <TableCell>Técnico Mecánico</TableCell>
                    <TableCell>Registrado Por</TableCell>
                    <TableCell>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {measurements.map((m) => {
                    const isAlarm = m.temperatura_c > 80.0 || m.corriente_a > 45.0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell sx={{ fontWeight: 700, color: '#f8fafc' }}>
                          {m.fecha_registro} {m.hora_registro}
                        </TableCell>
                        <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>
                          {m.bomba?.codigo} ({m.bomba?.nombre})
                        </TableCell>
                        <TableCell>{m.presion_succion_inhg}</TableCell>
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
                        <TableCell>{m.tecnico_mecanico || '-'}</TableCell>
                        <TableCell>{m.registrado_por?.full_name}</TableCell>
                        <TableCell>{m.observaciones || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {measurements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#94a3b8' }}>
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
            pumps={activeOp.pumps}
            onSuccess={loadMonitoringData}
          />
        </Box>
      )}
    </Box>
  );
};
