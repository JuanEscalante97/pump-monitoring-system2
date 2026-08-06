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
import { useTheme } from '@mui/material/styles';
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
    pumps: {
      [key: string]: {
        labels: string[];
        temperatura: number[];
        corriente: number[];
        presion_succion: number[];
        presion_descarga: number[];
      }
    }
  };
}

export const HistoryCharts: React.FC<ChartsProps> = ({ data }) => {
  const theme = useTheme();

  if (!data || !data.pumps || Object.keys(data.pumps).length === 0) return null;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme.palette.text.secondary,
          font: { family: 'Inter', size: 12 },
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { color: theme.palette.divider },
      },
      y: {
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { color: theme.palette.divider },
      },
    },
  };

  return (
    <Box>
      {Object.entries(data.pumps).map(([pumpName, pumpData]) => (
        <Box key={pumpName} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: '#38bdf8', mb: 2, fontWeight: 700, fontFamily: 'Chakra Petch' }}>
            Tendencias: {pumpName}
          </Typography>
          <Grid container spacing={3}>
            {/* Temperature */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 250, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  <Line 
                    data={{
                      labels: pumpData.labels,
                      datasets: [{
                        label: 'Temp. Motor (°C)',
                        data: pumpData.temperatura,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                      }]
                    }} 
                    options={commonOptions} 
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Current */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 250, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  <Line 
                    data={{
                      labels: pumpData.labels,
                      datasets: [{
                        label: 'Corriente (A)',
                        data: pumpData.corriente,
                        borderColor: '#00b4d8',
                        backgroundColor: 'rgba(0, 180, 216, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                      }]
                    }} 
                    options={commonOptions} 
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Suction Pressure */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 250, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  <Line 
                    data={{
                      labels: pumpData.labels,
                      datasets: [{
                        label: 'P. Succión (inHg)',
                        data: pumpData.presion_succion,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                      }]
                    }} 
                    options={commonOptions} 
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Discharge Pressure */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 250, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  <Line 
                    data={{
                      labels: pumpData.labels,
                      datasets: [{
                        label: 'P. Descarga (PSI)',
                        data: pumpData.presion_descarga,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                      }]
                    }} 
                    options={commonOptions} 
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
};
