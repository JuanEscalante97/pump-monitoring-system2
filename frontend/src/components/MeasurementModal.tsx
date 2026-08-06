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
import { Pump, Tank, AlarmThreshold } from '../types';

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
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [bombaId, setBombaId] = useState<number>(selectedPumpId || 0);
  const [tanqueId, setTanqueId] = useState<number | ''>('');
  const [presionSuccion, setPresionSuccion] = useState<string>('4.5');
  const [presionDescarga, setPresionDescarga] = useState<string>('85.0');
  const [temperatura, setTemperatura] = useState<string>('68.0');
  const [temperaturaBomba, setTemperaturaBomba] = useState<string>('64.0');
  const [corriente, setCorriente] = useState<string>('36.0');
  const [observaciones, setObservaciones] = useState<string>('');
  const [shareText, setShareText] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [alarmWarning, setAlarmWarning] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, tRes, thRes] = await Promise.all([
          api.get('/pumps'),
          api.get('/tanks'),
          api.get('/alarms/thresholds')
        ]);
        setPumps(pRes.data);
        setTanks(tRes.data);
        setThresholds(thRes.data);
        
        if (open) {
          if (selectedPumpId) setBombaId(selectedPumpId);
          setTanqueId('');
          setPresionSuccion('');
          setPresionDescarga('');
          setTemperatura('');
          setTemperaturaBomba('');
          setCorriente('');
          setObservaciones('');
          setError(null);
          setSaveSuccess(false);
          setShareText(null);
          setAlarmWarning(null);
        }
      } catch (err) {
        console.error('Error fetching data', err);
      }
    };
    if (open) fetchData();
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
        tanque_id: tanqueId === '' ? null : Number(tanqueId),
        presion_succion_inhg: presionSuccion.trim() === '' || isNaN(parseFloat(presionSuccion)) ? null : parseFloat(presionSuccion),
        presion_descarga_psi: parseFloat(presionDescarga),
        temperatura_c: parseFloat(temperatura),
        temperatura_bomba_c: temperaturaBomba.trim() === '' || isNaN(parseFloat(temperaturaBomba)) ? null : parseFloat(temperaturaBomba),
        corriente_a: parseFloat(corriente),
        observaciones,
      };

      const res = await api.post('/measurements', payload);

      const tempVal = parseFloat(temperatura);
      const tempBombaVal = parseFloat(temperaturaBomba);
      const currVal = parseFloat(corriente);
      const pSucVal = parseFloat(presionSuccion);
      const pDescVal = parseFloat(presionDescarga);

      let pumpThreshold = thresholds.find(t => t.bomba_id === Number(bombaId) && t.is_active);
      if (!pumpThreshold) {
        pumpThreshold = thresholds.find(t => t.bomba_id === null && t.is_active);
      }

      const tempMax = pumpThreshold?.temp_max_c ?? 80.0;
      const currMax = pumpThreshold?.corriente_max_a ?? 45.0;
      const pSucMin = pumpThreshold?.presion_suc_min_inhg ?? -10.0;
      const pSucMax = pumpThreshold?.presion_suc_max_inhg ?? 30.0;
      const pDescMin = pumpThreshold?.presion_desc_min_psi ?? 20.0;
      const pDescMax = pumpThreshold?.presion_desc_max_psi ?? 150.0;

      let isAlarm = false;
      if (tempVal > tempMax || (tempBombaVal && tempBombaVal > tempMax) || currVal > currMax) {
        isAlarm = true;
      }
      if (!isNaN(pSucVal) && (pSucVal < pSucMin || pSucVal > pSucMax)) {
        isAlarm = true;
      }
      if (!isNaN(pDescVal) && (pDescVal < pDescMin || pDescVal > pDescMax)) {
        isAlarm = true;
      }

      if (isAlarm) {
        setAlarmWarning('¡ADVERTENCIA DE SEGURIDAD! La lectura fue registrada pero ha sobrepasado los límites de alarma configurados.');
      } else {
        setSaveSuccess(true);
      }

      const selBomba = pumps.find(p => p.id === Number(bombaId));
      const selTanque = tanks.find(t => t.id === Number(tanqueId));
      const bombaStr = selBomba?.codigo || '-';
      const tanqueStr = selTanque?.codigo ? ` | "${selTanque.codigo}"` : '';
      const pSuccStr = presionSuccion.trim() === '' || isNaN(parseFloat(presionSuccion)) ? 'N/A' : `${presionSuccion} inHg`;
      const tempBombaStr = temperaturaBomba.trim() === '' || isNaN(parseFloat(temperaturaBomba)) ? 'N/A' : `${temperaturaBomba} °C`;

      const repText = `Reporte de Embarque\n\n` +
        `Bomba: ${bombaStr}${tanqueStr}\n` +
        `P. Descarga: ${presionDescarga} PSI | P. Succión: ${pSuccStr}\n` +
        `Temp Motor : ${temperatura} °C | Temp Bomba : ${tempBombaStr} | Corriente: ${corriente} A`;

      setShareText(repText);
      onSuccess();
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

      {shareText ? (
        <DialogContent sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 700, mb: 1.5 }}>
            Medición Registrada Exitosamente
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            Comparta inmediatamente este registro oficial por WhatsApp:
          </Typography>
          <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#1e293b', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem', color: '#f8fafc', whiteSpace: 'pre-wrap', border: '1px solid #334155', borderRadius: 2 }}>
            {shareText}
          </Paper>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                window.open(url, '_blank');
              }}
              sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#1ebe5d' }, fontWeight: 700, px: 3, textTransform: 'none' }}
            >
              Compartir en WhatsApp
            </Button>
            <Button variant="outlined" onClick={onClose} color="inherit" size="large" sx={{ px: 3, textTransform: 'none' }}>
              Cerrar
            </Button>
          </Box>
        </DialogContent>
      ) : (
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
            {/* Tank Selection */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Tanque Asociado (Opcional)"
                InputLabelProps={{ shrink: true }}
                value={tanqueId}
                onChange={(e) => setTanqueId(e.target.value === '' ? '' : Number(e.target.value))}
                SelectProps={{ native: true }}
              >
                <option value="" disabled>Seleccione un tanque...</option>
                <option value="">Ninguno</option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>{t.codigo}</option>
                ))}
              </TextField>
            </Grid>
            {/* Pump Selection */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Bomba Inspeccionada"
                InputLabelProps={{ shrink: true }}
                value={bombaId === 0 ? '' : bombaId}
                onChange={(e) => setBombaId(Number(e.target.value))}
                SelectProps={{ native: true }}
                required
              >
                <option value="" disabled>Seleccione una bomba...</option>
                {pumps.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo}</option>
                ))}
              </TextField>
            </Grid>

            {/* Suction Pressure */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: '0.1' }}
                label="Presión de Succión (Opcional)"
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
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Temp. Motor"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                }}
                error={parseFloat(temperatura) > 80}
              />
            </Grid>

            {/* Pump Temperature */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: '0.1' }}
                label="Temp. Bomba"
                value={temperaturaBomba}
                onChange={(e) => setTemperaturaBomba(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                }}
                error={parseFloat(temperaturaBomba) > 80}
              />
            </Grid>

            {/* Motor Current */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                inputProps={{ step: '0.1' }}
                label="Corriente Motor"
                value={corriente}
                onChange={(e) => setCorriente(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">A</InputAdornment>,
                }}
                error={parseFloat(corriente) > 45}
              />
            </Grid>

            {/* Observations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observaciones del Inspector"
                placeholder="Indique ruido inusual, fuga leve, condición del sello mecánico, etc."
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
      )}
    </Dialog>
  );
};
