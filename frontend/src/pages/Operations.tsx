import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  TableContainer,
} from '@mui/material';
import { Workflow, Plus, CheckCircle2, Clock, Play, Square, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { Operation, Pump, Tank, Vessel, Product } from '../types';

export const Operations: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<number | ''>('');
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
  const [selectedTanks, setSelectedTanks] = useState<number[]>([]);
  const [selectedPumps, setSelectedPumps] = useState<number[]>([]);
  const [observaciones, setObservaciones] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [opRes, pRes, tRes, vRes, prRes] = await Promise.all([
        api.get('/operations'),
        api.get('/pumps'),
        api.get('/tanks'),
        api.get('/vessels'),
        api.get('/products'),
      ]);

      setOperations(opRes.data);
      setPumps(pRes.data);
      setTanks(tRes.data);
      setVessels(vRes.data);
      setProducts(prRes.data);
    } catch (err) {
      console.error('Error al cargar operaciones:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedPumps.length > 3 || selectedPumps.length === 0) {
      setError('Debe seleccionar entre 1 y hasta un máximo de 3 bombas.');
      return;
    }

    if (selectedTanks.length === 0 || selectedTanks.length > 3) {
      setError('Debe seleccionar entre 1 y hasta un máximo de 3 tanques de origen.');
      return;
    }


    setLoading(true);
    try {
      await api.post('/operations', {
        buque_id: Number(selectedVessel),
        producto_id: Number(selectedProduct),
        tank_ids: selectedTanks,
        pump_ids: selectedPumps,
        observaciones,
      });

      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar la operación.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOperation = async (id: number) => {
    if (!window.confirm('¿Está seguro de finalizar esta operación de bombeo?')) return;
    try {
      await api.put(`/operations/${id}/finish`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al finalizar la operación.');
    }
  };

  const activeOp = operations.find((o) => o.estado === 'Activa');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            GESTIÓN DE OPERACIONES DE BOMBEO
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Inicie la operación antes de registrar mediciones y programe inspecciones automáticas por hora.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => {
            setError(null);
            setDialogOpen(true);
          }}
          disabled={!!activeOp}
        >
          Nueva Operación
        </Button>
      </Box>

      {activeOp && (
        <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(49, 130, 206, 0.15)', border: '1px solid #3182ce' }}>
          <b>OPERACIÓN ACTIVA EN CURSO ({activeOp.codigo_operacion}):</b> Embarque de {activeOp.producto?.nombre} hacia buque <b>{activeOp.buque?.nombre}</b> con {activeOp.pumps.length} bombas activas.
        </Alert>
      )}

      {/* Operations Table */}
      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
          Historial de Operaciones de Embarque
        </Typography>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Buque</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Tanques</TableCell>
                <TableCell>Bombas (Máx 3)</TableCell>
                <TableCell>Hora Inicio / Fin</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#63b3ed' }}>{op.codigo_operacion}</TableCell>
                  <TableCell>{op.fecha}</TableCell>
                  <TableCell>{op.buque?.nombre}</TableCell>
                  <TableCell>{op.producto?.nombre}</TableCell>
                  <TableCell>{op.tanks.map((t) => t.codigo).join(', ')}</TableCell>
                  <TableCell>{op.pumps.map((p) => p.codigo).join(', ')}</TableCell>
                  <TableCell>{op.hora_inicio} - {op.hora_fin || 'En Proceso'}</TableCell>
                  <TableCell>
                    <Chip
                      label={op.estado}
                      color={op.estado === 'Activa' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {op.estado === 'Activa' && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Square size={14} />}
                        onClick={() => handleFinishOperation(op.id)}
                      >
                        Finalizar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Scheduled Inspections for Active Operation */}
      {activeOp && (
        <Paper sx={{ p: 2.5, mt: 3, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
            Inspecciones Programadas Automáticas Cada Hora (Operación {activeOp.codigo_operacion})
          </Typography>

          <Grid container spacing={1.5}>
            {activeOp.scheduled_inspections.map((insp) => (
              <Grid item xs={12} sm={6} md={3} key={insp.id}>
                <Paper
                  sx={{
                    p: 1.5,
                    backgroundColor: insp.estado === 'A tiempo' ? 'rgba(16, 185, 129, 0.1)' : insp.estado === 'Retrasado' ? 'rgba(239, 68, 68, 0.1)' : '#1e293b',
                    border: `1px solid ${insp.estado === 'A tiempo' ? '#10b981' : insp.estado === 'Retrasado' ? '#ef4444' : '#334155'}`,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      Slot Hora: {insp.hora_programada}
                    </Typography>
                    <Chip
                      label={insp.estado}
                      size="small"
                      color={insp.estado === 'A tiempo' ? 'success' : insp.estado === 'Retrasado' ? 'error' : 'default'}
                    />
                  </Box>
                  {insp.retraso_minutos > 0 && (
                    <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 0.5, fontWeight: 700 }}>
                      Retraso: {insp.retraso_minutos} minutos
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* New Operation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a' } }}>
        <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700 }}>Iniciar Nueva Operación de Bombeo</DialogTitle>
        <form onSubmit={handleCreateOperation}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Buque Destino"
                  value={selectedVessel}
                  onChange={(e) => setSelectedVessel(Number(e.target.value))}
                  SelectProps={{ native: true }}
                >
                  <option value="">Seleccionar Buque...</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id} style={{ background: '#1e293b' }}>{v.nombre} ({v.empresa})</option>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Producto a Transferir"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(Number(e.target.value))}
                  SelectProps={{ native: true }}
                >
                  <option value="">Seleccionar Producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} style={{ background: '#1e293b' }}>{p.nombre}</option>
                  ))}
                </TextField>
              </Grid>

              {/* Multi-select Tanks */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tanques de Origen Utilizados (HASTA MÁXIMO 2 O 3 TANQUES)</InputLabel>
                  <Select
                    multiple
                    value={selectedTanks}
                    onChange={(e) => {
                      const vals = typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : (e.target.value as number[]);
                      if (vals.length <= 3) setSelectedTanks(vals);
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={tanks.find((t) => t.id === value)?.codigo} size="small" color="secondary" />
                        ))}
                      </Box>
                    )}
                  >

                    {tanks.map((tank) => (
                      <MenuItem key={tank.id} value={tank.id}>
                        <Checkbox checked={selectedTanks.indexOf(tank.id) > -1} />
                        <ListItemText primary={`${tank.codigo} (${tank.capacidad_m3} m³)`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Multi-select Pumps (Max 3) */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Bombas Utilizadas (HASTA MÁXIMO 3 BOMBAS)</InputLabel>
                  <Select
                    multiple
                    value={selectedPumps}
                    onChange={(e) => {
                      const vals = typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : (e.target.value as number[]);
                      if (vals.length <= 3) setSelectedPumps(vals);
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={pumps.find((p) => p.id === value)?.codigo} size="small" color="primary" />
                        ))}
                      </Box>
                    )}
                  >
                    {pumps.map((pump) => (
                      <MenuItem key={pump.id} value={pump.id}>
                        <Checkbox checked={selectedPumps.indexOf(pump.id) > -1} />
                        <ListItemText primary={`${pump.codigo} - ${pump.nombre} (${pump.marca})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observaciones Inciales"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Iniciar Operación
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
