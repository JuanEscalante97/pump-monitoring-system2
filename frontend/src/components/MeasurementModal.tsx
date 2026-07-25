import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Alert,
  InputAdornment,
  Paper,
} from '@mui/material';

import { Activity, Clock, ShieldAlert, Check } from 'lucide-react';
import { api } from '../api/client';
import { Pump } from '../types';

interface MeasurementModalProps {
  open: boolean;
  onClose: () => void;
  operationId: number;
  selectedPumpId?: number;
  onSuccess: () => void;
}

export const MeasurementModal: React.FC<MeasurementModalProps> = ({
  open,
  onClose,
  operationId,
  selectedPumpId,
  onSuccess,
}) => {
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [bombaId, setBombaId] = useState<number>(selectedPumpId || 0);
  const [presionSuccion, setPresionSuccion] = useState<string>('4.5');
  const [presionDescarga, setPresionDescarga] = useState<string>('85.0');
  const [temperatura, setTemperatura] = useState<string>('68.0');
  const [corriente, setCorriente] = useState<string>('36.0');
  const [tecnicoMecanico, setTecnicoMecanico] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [alarmWarning, setAlarmWarning] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchPumps = async () => {
      try {
        const res = await api.get('/pumps');
        setPumps(res.data);
        if (selectedPumpId) setBombaId(selectedPumpId);
        else if (res.data.length > 0 && !bombaId) setBombaId(res.data[0].id);
      } catch (err) {
        console.error('Error fetching pumps', err);
      }
    };
    if (open) fetchPumps();
  }, [open, selectedPumpId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlarmWarning(null);
    setSaveSuccess(false);
    setLoading(true);

    try {
      const payload = {
        operation_id: operationId,
        bomba_id: Number(bombaId),
        presion_succion_inhg: parseFloat(presionSuccion),
        presion_descarga_psi: parseFloat(presionDescarga),
        temperatura_c: parseFloat(temperatura),
        corriente_a: parseFloat(corriente),
        tecnico_mecanico: tecnicoMecanico,
        observaciones,
      };

      const res = await api.post('/measurements', payload);

      // Check if threshold exceeded
      const tempVal = parseFloat(temperatura);
      const currVal = parseFloat(corriente);
      if (tempVal > 80.0 || currVal > 45.0) {
        setAlarmWarning('¡ADVERTENCIA DE SEGURIDAD! La lectura fue registrada pero ha sobrepasado los límites de alarma (Temp > 80°C o Corriente > 45 A).');
      } else {
        setSaveSuccess(true);
      }

      onSuccess();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar la medición de condición.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a', border: '1px solid #334155' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #1e293b' }}>
        <Activity color="#3182ce" size={24} />
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          Registro de Monitoreo de Condición de Bomba
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {alarmWarning && <Alert severity="warning" sx={{ mb: 2 }}>{alarmWarning}</Alert>}
          {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>Registro hecho exitosamente.</Alert>}

          {/* Automatic Server Clock Notice */}
          <Paper sx={{ p: 1.5, mb: 3, backgroundColor: 'rgba(49, 130, 206, 0.1)', border: '1px dashed #3182ce', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Clock size={18} color="#63b3ed" />
              <Typography variant="caption" sx={{ color: '#63b3ed', fontWeight: 700 }}>
                REGISTRO DE FECHA Y HORA AUTOMÁTICO
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5, fontSize: '0.82rem' }}>
              La fecha y hora exacta se registrarán automáticamente utilizando el reloj oficial del servidor.
            </Typography>
          </Paper>

          <Grid container spacing={2}>
            {/* Técnico Mecánico */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Técnico Mecánico"
                value={tecnicoMecanico}
                onChange={(e) => setTecnicoMecanico(e.target.value)}
                required
                sx={{ mb: 1 }}
              />
            </Grid>
            {/* Pump Selection */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Bomba Asignada a la Operación"
                value={bombaId}
                onChange={(e) => setBombaId(Number(e.target.value))}
                SelectProps={{ native: true }}
                sx={{ mb: 1 }}
              >
                {pumps.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: '#1e293b', color: '#fff' }}>
                    {p.codigo} - {p.nombre} ({p.marca} {p.modelo})
                  </option>
                ))}
              </TextField>
            </Grid>

            {/* Suction Pressure */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Presión de Succión"
                value={presionSuccion}
                onChange={(e) => setPresionSuccion(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">inHg</InputAdornment>,
                }}
              />
            </Grid>

            {/* Discharge Pressure */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Presión de Descarga"
                value={presionDescarga}
                onChange={(e) => setPresionDescarga(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">psi</InputAdornment>,
                }}
              />
            </Grid>

            {/* Motor Temperature */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Temperatura del Motor"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                }}
                error={parseFloat(temperatura) > 80}
                helperText={parseFloat(temperatura) > 80 ? 'Límite de alarma excede 80°C' : ''}
              />
            </Grid>

            {/* Motor Current */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Corriente del Motor"
                value={corriente}
                onChange={(e) => setCorriente(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">A</InputAdornment>,
                }}
                error={parseFloat(corriente) > 45}
                helperText={parseFloat(corriente) > 45 ? 'Límite de alarma excede 45 A' : ''}
              />
            </Grid>

            {/* Observations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observaciones del Inspector"
                placeholder="Indique ruído inusual, fuga leve, condición del sello, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #1e293b' }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={<Check size={18} />}>
            {loading ? 'Guardando...' : 'Guardar Medición'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
