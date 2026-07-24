import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Paper, Typography, Grid } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface ChartsProps {
  data: {
    labels: string[];
    temperatura: number[];
    corriente: number[];
    presion_succion: number[];
    presion_descarga: number[];
  };
}

export const HistoryCharts: React.FC<ChartsProps> = ({ data }) => {
  if (!data || !data.labels) return null;

  const commonOptions = {

    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: { family: 'Inter', size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: '#1e293b' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: '#1e293b' },
      },
    },
  };

  // 1. Temperature Chart Data
  const tempChartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Temperatura del Motor (°C)',
        data: data.temperatura,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  // 2. Current Chart Data
  const currChartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Corriente del Motor (A)',
        data: data.corriente,
        borderColor: '#00b4d8',
        backgroundColor: 'rgba(0, 180, 216, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  // 3. Discharge & Suction Pressure Chart Data
  const pressureChartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Presión de Descarga (psi)',
        data: data.presion_descarga,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Presión de Succión (inHg)',
        data: data.presion_succion,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
            Evolución de Temperatura de Motor (°C)
          </Typography>
          <Box sx={{ height: 260 }}>
            <Line options={commonOptions} data={tempChartData} />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
            Evolución de Corriente Eléctrica (A)
          </Typography>
          <Box sx={{ height: 260 }}>
            <Line options={commonOptions} data={currChartData} />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
            Perfiles de Presión (Succión vs Descarga)
          </Typography>
          <Box sx={{ height: 280 }}>
            <Line options={commonOptions} data={pressureChartData} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
