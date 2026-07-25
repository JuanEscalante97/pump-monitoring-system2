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
import { useAuth } from '../context/AuthContext';
import { Trash2 } from 'lucide-react';

export const Operations: React.FC = () => {
  const { user } = useAuth();
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

    setLoading(true);
    try {
      await api.post('/operations', {
        buque_id: Number(selectedVessel),
        producto_id: Number(selectedProduct),
        tank_ids: [],
        pump_ids: [],
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
    if (!window.confirm('¿Está seguro de finalizar esta operación? Las bombas volverán a estado Operativa y no se podrán registrar más lecturas.')) {
      return;
    }
    try {
      await api.put(`/operations/${id}/finish`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al finalizar la operación');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta operación y TODO su historial de lecturas asociado? Esta acción es irreversible.')) {
      return;
    }
    try {
      await api.delete(`/operations/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar la operación');
    }
  };

  const activeOp = operations.find((o) => o.estado === 'Activa');

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 4, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            GESTIÓN DE OPERACIONES DE BOMBEO
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Inicie la operación antes de registrar mediciones.
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
          sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1.5, sm: 1 } }}
        >
          Nueva Operación
        </Button>
      </Box>

      {activeOp && (
        <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(49, 130, 206, 0.15)', border: '1px solid #3182ce' }}>
          <b>OPERACIÓN ACTIVA EN CURSO ({activeOp.codigo_operacion}):</b> Embarque de {activeOp.producto?.nombre} hacia buque <b>{activeOp.buque?.nombre}</b>. Bombas en operación: {activeOp.pumps.length > 0 ? activeOp.pumps.map(p => p.codigo).join(', ') : 'aún sin lecturas registradas'}.
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
                  <TableCell>{op.tanks.map((t) => t.codigo).join(', ') || '-'}</TableCell>
                  <TableCell>{op.pumps.map((p) => p.codigo).join(', ') || '-'}</TableCell>
                  <TableCell>{op.hora_inicio.substring(0, 5)} - {op.hora_fin ? op.hora_fin.substring(0, 5) : 'En Proceso'}</TableCell>
                  <TableCell>
                    <Chip
                      label={op.estado}
                      color={op.estado === 'Activa' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {op.estado === 'Activa' && (
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<Square size={14} />}
                          onClick={() => handleFinishOperation(op.id)}
                        >
                          Finalizar
                        </Button>
                      )}
                      {user?.role === 'Administrador' && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Trash2 size={14} />}
                          onClick={() => handleDelete(op.id)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observaciones Iniciales"
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
