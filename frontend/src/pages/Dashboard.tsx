import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Activity,
  Workflow,
  Clock,
  Thermometer,
  Zap,
  Gauge,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardKPIs, PIDProcessData } from '../types';
import { PIDDiagram } from '../components/PIDDiagram';
import { HistoryCharts } from '../components/Charts';
import { MeasurementModal } from '../components/MeasurementModal';

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [pidData, setPidData] = useState<PIDProcessData | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPumpId, setSelectedPumpId] = useState<number | undefined>(undefined);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setErrorMsg(null);
      const [kpiRes, pidRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/pid-diagram'),
      ]);

      setKpis(kpiRes.data);
      setPidData(pidRes.data);

      if (pidRes.data.active_operation) {
        const chartRes = await api.get(`/dashboard/charts?operation_id=${pidRes.data.active_operation.id}`);
        setChartData(chartRes.data);
      } else {
        setChartData(null);
      }
    } catch (err: any) {
      console.error('Error al cargar datos del dashboard:', err);
      setErrorMsg(err.response?.data?.detail || 'No se pudieron sincronizar algunos datos en vivo del backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);


  const handleOpenModal = (pumpId?: number) => {
    setSelectedPumpId(pumpId);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box>
      {errorMsg && <Alert severity="warning" sx={{ mb: 3 }}>{errorMsg}</Alert>}
      {/* Top Banner & Quick Actions */}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            PANEL DE CONTROL
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, lineHeight: 1.3 }}>
            Terminal de Líquidos Tramarsa - Ilo | Monitoreo en tiempo real de condición de bombas de embarque.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={loadDashboardData}
            sx={{ borderColor: '#334155', color: '#cbd5e1' }}
          >
            Actualizar
          </Button>

          {pidData?.active_operation ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlusCircle size={18} />}
              onClick={() => handleOpenModal()}
            >
              Registrar Medición
            </Button>
          ) : (
            <Button variant="contained" color="warning" href="/operations">
              Iniciar Nueva Operación
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Active Operations */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3, borderLeft: '4px solid #3182ce' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>OPERACIONES ACTIVAS</Typography>
              <Workflow size={20} color="#3182ce" />
            </Box>
            <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mt: 1 }}>
              {kpis?.operaciones_activas || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#00b4d8', fontWeight: 600 }}>
              {kpis?.bombas_trabajando || 0} Bombas Reportadas
            </Typography>
          </Paper>
        </Grid>

        {/* Card 3: Avg Temp */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3, borderLeft: '4px solid #ef4444' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>TEMP PROMEDIO MOTOR</Typography>
              <Thermometer size={20} color="#ef4444" />
            </Box>
            <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mt: 1 }}>
              {kpis?.operaciones_activas && kpis.operaciones_activas > 0 ? (kpis?.temperatura_promedio || 0) : 0}°C
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Límite Máximo: 80.0°C
            </Typography>
          </Paper>
        </Grid>

        {/* Card 4: Avg Current */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3, borderLeft: '4px solid #10b981' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>CORRIENTE PROMEDIO</Typography>
              <Zap size={20} color="#10b981" />
            </Box>
            <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mt: 1 }}>
              {kpis?.operaciones_activas && kpis.operaciones_activas > 0 ? (kpis?.corriente_promedio || 0) : 0} A
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Límite Máximo: 45.0 A
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Interactive P&ID Synoptic View */}
      <Box sx={{ mb: 4 }}>
        <PIDDiagram data={pidData} onSelectPump={(pumpId) => handleOpenModal(pumpId)} />
      </Box>

      {/* Historical Performance Charts */}
      {pidData?.active_operation && chartData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2, fontFamily: 'Chakra Petch' }}>
            TENDENCIAS DE CONDICIÓN EN TIEMPO REAL
          </Typography>
          <HistoryCharts data={chartData} />
        </Box>
      )}

      {/* Measurement Modal */}
      {pidData?.active_operation && (
        <MeasurementModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          operationId={pidData.active_operation.id}
          selectedPumpId={selectedPumpId}
          onSuccess={loadDashboardData}
        />
      )}
    </Box>
  );
};
