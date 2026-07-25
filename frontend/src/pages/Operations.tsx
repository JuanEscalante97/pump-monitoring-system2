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
import { Activity, Plus, ShieldAlert, FileText, CheckCircle2, Square, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Operation, Pump, Tank, Vessel, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Operations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
      setSelectedIds([]);
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
        tank_ids: selectedTanks,
        pump_ids: selectedPumps,
        observaciones,
      });

      setSelectedVessel('');
      setSelectedProduct('');
      setSelectedTanks([]);
      setSelectedPumps([]);
      setObservaciones('');
      setDialogOpen(false);
      await loadData();
      navigate('/monitoring');
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Está seguro de que desea eliminar ${selectedIds.length} operaciones seleccionadas y TODO su historial de lecturas asociado? Esta acción es irreversible.`)) {
      return;
    }
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/operations/${id}`)));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar operaciones');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(operations.map(op => op.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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

        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          {user?.role === 'Administrador' && selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Trash2 size={18} />}
              onClick={handleBulkDelete}
              sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1.5, sm: 1 } }}
            >
              Eliminar ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setSelectedVessel('');
              setSelectedProduct('');
              setSelectedTanks([]);
              setSelectedPumps([]);
              setObservaciones('');
              setError(null);
              setDialogOpen(true);
            }}
            disabled={!!activeOp}
            sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1.5, sm: 1 } }}
          >
            Nueva Operación
          </Button>
        </Box>
      </Box>

      {activeOp && (
        <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(49, 130, 206, 0.15)', border: '1px solid #3182ce' }}>
          <b>OPERACIÓN ACTIVA EN CURSO:</b> Embarque de {activeOp.producto?.nombre} hacia buque <b>{activeOp.buque?.nombre}</b>. Bombas en operación: {activeOp.pumps.length > 0 ? activeOp.pumps.map(p => p.codigo).join(', ') : 'aún sin lecturas registradas'}.
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
                {user?.role === 'Administrador' && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < operations.length}
                      checked={operations.length > 0 && selectedIds.length === operations.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>Código</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Buque</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Observaciones</TableCell>
                <TableCell>Hora Inicio / Fin</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => {
                const isSelected = selectedIds.includes(op.id);
                return (
                  <TableRow key={op.id} selected={isSelected}>
                    {user?.role === 'Administrador' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isSelected}
                          onChange={() => handleSelectOne(op.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700, color: '#63b3ed' }}>
                      {op.codigo_operacion.length > 10 ? 'OP-' + op.codigo_operacion.slice(-3) : op.codigo_operacion}
                    </TableCell>
                  <TableCell>{op.fecha}</TableCell>
                  <TableCell>{op.buque?.nombre}</TableCell>
                  <TableCell>{op.producto?.nombre}</TableCell>
                  <TableCell>{op.observaciones || '-'}</TableCell>
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
              );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* New Operation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700, pb: 1, borderBottom: '1px solid #1e293b' }}>
          Iniciar Nueva Operación de Bombeo
        </DialogTitle>
        <form onSubmit={handleCreateOperation}>
          <DialogContent sx={{ py: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mb: 0.8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Buque Destino *
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    required
                    value={selectedVessel}
                    onChange={(e) => setSelectedVessel(Number(e.target.value))}
                    SelectProps={{ native: true }}
                    hiddenLabel
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    }}
                  >
                    <option value="" disabled style={{ color: '#64748b' }}>-- Seleccionar Buque --</option>
                    {vessels.map((v) => (
                      <option key={v.id} value={v.id} style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
                        {v.nombre} ({v.empresa})
                      </option>
                    ))}
                  </TextField>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mb: 0.8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Producto a Transferir *
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    required
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(Number(e.target.value))}
                    SelectProps={{ native: true }}
                    hiddenLabel
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    }}
                  >
                    <option value="" disabled style={{ color: '#64748b' }}>-- Seleccionar Producto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
                        {p.nombre}
                      </option>
                    ))}
                  </TextField>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mb: 0.8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Bombas Habilitadas (Haz clic para activar)
                  </Typography>
                  <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 1.5, minHeight: 70, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    {pumps.map(p => {
                      const isSelected = selectedPumps.includes(p.id);
                      return (
                        <Chip
                          key={p.id}
                          label={`${p.codigo}`}
                          onClick={() => {
                            setSelectedPumps(prev => isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                          }}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            borderColor: isSelected ? '#3b82f6' : '#475569',
                            color: isSelected ? '#ffffff' : '#cbd5e1',
                            px: 0.5
                          }}
                        />
                      );
                    })}
                    {pumps.length === 0 && <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>No hay bombas registradas en el catálogo</Typography>}
                  </Paper>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mb: 0.8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tanques Habilitados (Haz clic para activar)
                  </Typography>
                  <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 1.5, minHeight: 70, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    {tanks.map(t => {
                      const isSelected = selectedTanks.includes(t.id);
                      return (
                        <Chip
                          key={t.id}
                          label={`${t.codigo} (${t.producto?.nombre || 'General'})`}
                          onClick={() => {
                            setSelectedTanks(prev => isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]);
                          }}
                          color={isSelected ? "info" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            borderColor: isSelected ? '#06b6d4' : '#475569',
                            color: isSelected ? '#ffffff' : '#cbd5e1',
                            px: 0.5
                          }}
                        />
                      );
                    })}
                    {tanks.length === 0 && <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>No hay tanques registrados en el catálogo</Typography>}
                  </Paper>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mb: 0.8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Observaciones Iniciales (Opcional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Escribe comentarios u observaciones aquí..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    hiddenLabel
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #1e293b' }}>
            <Button onClick={() => { setDialogOpen(false); setError(null); }} sx={{ color: '#94a3b8' }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700, px: 3 }}>
              Iniciar Operación
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
