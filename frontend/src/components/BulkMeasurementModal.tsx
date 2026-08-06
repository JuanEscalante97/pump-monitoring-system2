import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Box, Typography, Alert, InputAdornment, Paper,
  Chip, IconButton
} from '@mui/material';
import { Activity, Trash2, CheckCircle, Save, Share2 } from 'lucide-react';
import { api } from '../api/client';
import { Pump, Tank } from '../types';

interface BulkMeasurementModalProps {
  open: boolean;
  onClose: () => void;
  operationId: number;
  initialPumpId?: number;
  onSuccess: () => void;
}

interface FormState {
  tanqueId: number | '';
  presionSuccion: string;
  presionDescarga: string;
  temperatura: string;
  temperaturaBomba: string;
  corriente: string;
  observaciones: string;
}

const defaultFormState = (): FormState => ({
  tanqueId: '',
  presionSuccion: '',
  presionDescarga: '',
  temperatura: '',
  temperaturaBomba: '',
  corriente: '',
  observaciones: ''
});

export const BulkMeasurementModal: React.FC<BulkMeasurementModalProps> = ({
  open, onClose, operationId, initialPumpId, onSuccess
}) => {
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  
  const [selectedPumpIds, setSelectedPumpIds] = useState<number[]>([]);
  const [formsData, setFormsData] = useState<Record<number, FormState>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareText, setShareText] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api.get('/pumps'),
          api.get('/tanks')
        ]);
        setPumps(pRes.data);
        setTanks(tRes.data);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };
    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialPumpId && !selectedPumpIds.includes(initialPumpId)) {
        setSelectedPumpIds([initialPumpId]);
        setFormsData({ [initialPumpId]: defaultFormState() });
      } else {
        setSelectedPumpIds([]);
        setFormsData({});
      }
      setSaveSuccess(false);
      setShareText(null);
      setError(null);
    }
  }, [open, initialPumpId]);

  const togglePump = (pumpId: number) => {
    if (selectedPumpIds.includes(pumpId)) {
      setSelectedPumpIds(prev => prev.filter(id => id !== pumpId));
      setFormsData(prev => {
        const newData = { ...prev };
        delete newData[pumpId];
        return newData;
      });
    } else {
      setSelectedPumpIds(prev => [...prev, pumpId]);
      setFormsData(prev => ({ ...prev, [pumpId]: defaultFormState() }));
    }
  };

  const updateForm = (pumpId: number, field: keyof FormState, value: any) => {
    setFormsData(prev => ({
      ...prev,
      [pumpId]: { ...prev[pumpId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (selectedPumpIds.length === 0) {
      setError("Seleccione al menos una bomba para registrar.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const measurements = selectedPumpIds.map(pid => {
        const fd = formsData[pid];
        return {
          bomba_id: pid,
          tanque_id: fd.tanqueId === '' ? null : Number(fd.tanqueId),
          presion_succion_inhg: fd.presionSuccion.trim() === '' || isNaN(parseFloat(fd.presionSuccion)) ? null : parseFloat(fd.presionSuccion),
          presion_descarga_psi: parseFloat(fd.presionDescarga),
          temperatura_c: parseFloat(fd.temperatura),
          temperatura_bomba_c: fd.temperaturaBomba.trim() === '' || isNaN(parseFloat(fd.temperaturaBomba)) ? null : parseFloat(fd.temperaturaBomba),
          corriente_a: parseFloat(fd.corriente),
          observaciones: fd.observaciones || null,
        };
      });

      await api.post('/measurements/bulk', {
        operation_id: operationId,
        measurements
      });

      let text = `Reporte de Embarque\n\n`;
      selectedPumpIds.forEach(pid => {
        const fd = formsData[pid];
        const p = pumps.find(x => x.id === pid);
        const t = tanks.find(x => x.id === fd.tanqueId);
        const bStr = p?.codigo || '-';
        const tStr = t ? ` | "${t.codigo}"` : '';
        const pSuc = fd.presionSuccion.trim() === '' ? 'N/A' : `${fd.presionSuccion} inHg`;
        const tBom = fd.temperaturaBomba.trim() === '' ? 'N/A' : `${fd.temperaturaBomba} °C`;
        text += `Bomba: ${bStr}${tStr}\n`;
        text += `P. Descarga: ${fd.presionDescarga} PSI | P. Succión: ${pSuc}\n`;
        text += `Temp Motor: ${fd.temperatura} °C | Temp Bomba: ${tBom} | Corriente: ${fd.corriente} A\n\n`;
      });

      setShareText(text.trim());
      setSaveSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al registrar lote de mediciones.");
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (shareText) {
      const text = encodeURIComponent(shareText);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  if (saveSuccess) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a', border: '1px solid #10b981' } }}>
        <DialogContent sx={{ textAlign: 'center', py: 5 }}>
          <CheckCircle color="#10b981" size={64} style={{ marginBottom: 16 }} />
          <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>¡Registros Exitosos!</Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4 }}>
            Se han guardado correctamente {selectedPumpIds.length} mediciones.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Button variant="contained" onClick={handleShareWhatsApp} startIcon={<Share2 size={20} />} sx={{ backgroundColor: '#25D366', color: 'white', '&:hover': { backgroundColor: '#1da851' }, px: 4, py: 1.5, borderRadius: 2 }}>
              Compartir Resumen en WhatsApp
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ color: '#94a3b8', borderColor: '#334155', px: 4 }}>
              Cerrar
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a', border: '1px solid #334155' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #1e293b' }}>
        <Activity color="#3182ce" size={24} />
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          Registro Masivo de Condición
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>1. SELECCIONE LAS BOMBAS A REGISTRAR AHORA</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {pumps.map(p => {
              const isSelected = selectedPumpIds.includes(p.id);
              return (
                <Chip key={p.id} label={p.codigo} onClick={() => togglePump(p.id)} color={isSelected ? "primary" : "default"} variant={isSelected ? "filled" : "outlined"} sx={{ fontWeight: 700, px: 1, py: 2, borderRadius: 2, color: isSelected ? '#fff' : '#94a3b8', borderColor: isSelected ? 'transparent' : '#334155' }} />
              );
            })}
          </Box>
        </Box>

        {selectedPumpIds.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, border: '1px dashed #334155', borderRadius: 2 }}>
            <Typography variant="body1" sx={{ color: '#64748b' }}>Haga clic en una o más bombas arriba para habilitar sus campos.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedPumpIds.map((pid, idx) => {
              const pump = pumps.find(x => x.id === pid);
              const fd = formsData[pid];
              return (
                <Paper key={pid} sx={{ p: 2, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid #334155' }}>
                    <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      {idx + 1}. Bomba: {pump?.codigo}
                    </Typography>
                    <IconButton size="small" onClick={() => togglePump(pid)} sx={{ color: '#ef4444' }}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField select fullWidth size="small" label="Tanque Destino" InputLabelProps={{ shrink: true }} value={fd.tanqueId} onChange={(e) => updateForm(pid, 'tanqueId', e.target.value === '' ? '' : Number(e.target.value))} SelectProps={{ native: true }}>
                        <option value="" disabled>Seleccione...</option>
                        <option value="">Ninguno</option>
                        {tanks.map(t => <option key={t.id} value={t.id}>{t.codigo}</option>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField fullWidth size="small" type="number" inputProps={{ step: '0.1' }} label="P. Succión" value={fd.presionSuccion} onChange={(e) => updateForm(pid, 'presionSuccion', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">inHg</InputAdornment> }} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField fullWidth size="small" required type="number" inputProps={{ step: '0.1' }} label="P. Descarga" value={fd.presionDescarga} onChange={(e) => updateForm(pid, 'presionDescarga', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">psi</InputAdornment> }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" required type="number" inputProps={{ step: '0.1' }} label="Temp. Motor" value={fd.temperatura} onChange={(e) => updateForm(pid, 'temperatura', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" type="number" inputProps={{ step: '0.1' }} label="Temp. Bomba" value={fd.temperaturaBomba} onChange={(e) => updateForm(pid, 'temperaturaBomba', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" required type="number" inputProps={{ step: '0.1' }} label="Corriente" value={fd.corriente} onChange={(e) => updateForm(pid, 'corriente', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">A</InputAdornment> }} />
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid #1e293b' }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || selectedPumpIds.length === 0} startIcon={<Save size={18} />} sx={{ backgroundColor: '#3182ce', '&:hover': { backgroundColor: '#2b6cb0' } }}>
          {loading ? 'Guardando...' : `Guardar ${selectedPumpIds.length} Registro(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
