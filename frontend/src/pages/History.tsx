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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TableContainer,
} from '@mui/material';
import { History as HistoryIcon, Search, Edit3, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Measurement, Pump, Vessel, Product } from '../types';
import { useAuth } from '../context/AuthContext';

export const History: React.FC = () => {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filter states
  const [fecha, setFecha] = useState('');
  const [bombaId, setBombaId] = useState('');
  const [buqueId, setBuqueId] = useState('');
  const [productoId, setProductoId] = useState('');

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<Measurement | null>(null);
  const [pSuc, setPSuc] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [temp, setTemp] = useState('');
  const [corr, setCorr] = useState('');
  const [motivo, setMotivo] = useState('');
  const [corrError, setCorrError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [pRes, vRes, prRes] = await Promise.all([
        api.get('/pumps'),
        api.get('/vessels'),
        api.get('/products'),
      ]);
      setPumps(pRes.data);
      setVessels(vRes.data);
      setProducts(prRes.data);
      handleSearch();
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  };

  const handleSearch = async () => {
    try {
      let queryParams = [];
      if (fecha) queryParams.push(`fecha=${fecha}`);
      if (bombaId) queryParams.push(`bomba_id=${bombaId}`);
      if (buqueId) queryParams.push(`buque_id=${buqueId}`);
      if (productoId) queryParams.push(`producto_id=${productoId}`);

      const url = `/history?${queryParams.join('&')}`;
      const res = await api.get(url);
      setMeasurements(res.data);
    } catch (err) {
      console.error('Error al buscar historial:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCorrectionModal = (m: Measurement) => {
    setCorrectionTarget(m);
    setPSuc(String(m.presion_succion_inhg));
    setPDesc(String(m.presion_descarga_psi));
    setTemp(String(m.temperatura_c));
    setCorr(String(m.corriente_a));
    setMotivo('');
    setCorrError(null);
  };

  const handleSaveCorrection = async () => {
    if (!motivo.trim()) {
      setCorrError('Debe ingresar obligatoriamente un motivo para la corrección.');
      return;
    }
    if (!correctionTarget) return;

    try {
      await api.put(`/measurements/${correctionTarget.id}/correct`, {
        presion_succion_inhg: parseFloat(pSuc),
        presion_descarga_psi: parseFloat(pDesc),
        temperatura_c: parseFloat(temp),
        corriente_a: parseFloat(corr),
        corregido_motivo: motivo,
      });

      setCorrectionTarget(null);
      handleSearch();
    } catch (err: any) {
      setCorrError(err.response?.data?.detail || 'Error al guardar la corrección.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro que desea eliminar permanentemente este registro del historial? Esta acción no se puede deshacer.")) {
      return;
    }
    try {
      await api.delete(`/measurements/${id}`);
      handleSearch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar el registro.');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          HISTORIAL DE REGISTROS DE MONITOREO
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Consulte la trazabilidad histórica. Los registros no se pueden borrar; solo se permite corregir conservando la auditoría.
        </Typography>
      </Box>

      {/* Filter Panel */}
      <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="Filtrar por Fecha"
              InputLabelProps={{ shrink: true }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Filtrar por Bomba"
              value={bombaId}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setBombaId(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">Todas las Bombas...</option>
              {pumps.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#1e293b' }}>{p.codigo} - {p.nombre}</option>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Filtrar por Buque"
              value={buqueId}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setBuqueId(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">Todos los Buques...</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id} style={{ background: '#1e293b' }}>{v.nombre}</option>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Search size={18} />}
              onClick={handleSearch}
              sx={{ py: 1.5 }}
            >
              Buscar Registros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* History Table */}
      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha y Hora</TableCell>
                <TableCell>Bomba</TableCell>
                <TableCell>P. Succión</TableCell>
                <TableCell>P. Descarga</TableCell>
                <TableCell>Temperatura</TableCell>
                <TableCell>Corriente</TableCell>
                <TableCell>Estado / Auditoría</TableCell>
                <TableCell>Técnico Mecánico</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {measurements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {m.fecha_registro} {m.hora_registro}
                  </TableCell>
                  <TableCell sx={{ color: '#63b3ed', fontWeight: 700 }}>{m.bomba?.codigo}</TableCell>
                  <TableCell>{m.presion_succion_inhg} inHg</TableCell>
                  <TableCell>{m.presion_descarga_psi} psi</TableCell>
                  <TableCell sx={{ color: m.temperatura_c > 80 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {m.temperatura_c}°C
                  </TableCell>
                  <TableCell sx={{ color: m.corriente_a > 45 ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                    {m.corriente_a} A
                  </TableCell>
                  <TableCell>
                    {m.is_corrected ? (
                      <Chip label="CORREGIDO" color="warning" size="small" sx={{ fontWeight: 700 }} />
                    ) : (
                      <Chip label="ORIGINAL" color="success" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </TableCell>
                  <TableCell>{m.tecnico_mecanico || m.registrado_por?.full_name}</TableCell>
                  <TableCell align="right" sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit3 size={14} />}
                      onClick={() => openCorrectionModal(m)}
                    >
                      Corregir
                    </Button>
                    {user?.role === 'Administrador' && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Trash2 size={14} />}
                        onClick={() => handleDelete(m.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Correction Dialog */}
      <Dialog open={!!correctionTarget} onClose={() => setCorrectionTarget(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a' } }}>
        <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700 }}>
          Corregir Registro (Se Conserva el Historial)
        </DialogTitle>
        <DialogContent>
          {corrError && <Alert severity="error" sx={{ mb: 2 }}>{corrError}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="P. Succión (inHg)" value={pSuc} onChange={(e) => setPSuc(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="P. Descarga (psi)" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Temperatura (°C)" value={temp} onChange={(e) => setTemp(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Corriente (A)" value={corr} onChange={(e) => setCorr(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Motivo Obligatorio de la Corrección"
                placeholder="Indique la razón del ajuste (ej. Calibración tardía del manómetro)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCorrectionTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCorrection}>Guardar Corrección Auditada</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
