import React, { useState } from 'react';
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
import { Box, Paper, Typography, Grid, Tabs, Tab } from '@mui/material';

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
  
  const pumpNames = Object.keys(data?.pumps || {});
  const [activeTab, setActiveTab] = useState(0);

  if (!data || !data.pumps || pumpNames.length === 0) return null;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const selectedPumpName = pumpNames[activeTab];
  const pumpData = data.pumps[selectedPumpName];

  if (!pumpData) return null;

  const getOptions = (yTitle: string, y1Title: string): any => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme.palette.text.secondary,
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { color: theme.palette.divider },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: yTitle,
          color: theme.palette.text.secondary,
          font: { size: 11, weight: 'bold' }
        },
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { color: theme.palette.divider },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: y1Title,
          color: theme.palette.text.secondary,
          font: { size: 11, weight: 'bold' }
        },
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { drawOnChartArea: false }, // avoid grid lines overlapping
      },
    },
  });

  const getStats = (arr: number[]) => {
    if (!arr || arr.length === 0) return { max: '-', min: '-' };
    const validArr = arr.filter(v => v !== null && v !== undefined);
    if (validArr.length === 0) return { max: '-', min: '-' };
    return { max: Math.max(...validArr).toFixed(1), min: Math.min(...validArr).toFixed(1) };
  };

  const corrStats = getStats(pumpData.corriente);
  const tempStats = getStats(pumpData.temperatura);
  const descStats = getStats(pumpData.presion_descarga);
  const sucStats = getStats(pumpData.presion_succion);

  return (
    <Box sx={{ mt: 2 }}>
      {pumpNames.length > 1 && (
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            mb: 3, 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, fontFamily: 'Chakra Petch', fontSize: '1rem' }
          }}
        >
          {pumpNames.map((name, idx) => (
            <Tab key={name} label={`BOMBA ${name}`} />
          ))}
        </Tabs>
      )}

      {/* Título de sección si solo hay 1 bomba y no hay Tabs */}
      {pumpNames.length === 1 && (
        <Typography variant="h6" sx={{ color: theme.palette.primary.main, mb: 3, fontWeight: 700, fontFamily: 'Chakra Petch' }}>
          TENDENCIAS: {selectedPumpName}
        </Typography>
      )}

      <Grid container spacing={3}>
        {/* Gráfico 1: Corriente vs Temperatura */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Esfuerzo Eléctrico vs Calentamiento Térmico
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', gap: 2 }}>
                <span><b>Corriente:</b> Mín {corrStats.min}A | Máx {corrStats.max}A</span>
                <span><b>Temperatura:</b> Mín {tempStats.min}°C | Máx {tempStats.max}°C</span>
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <Line 
                data={{
                  labels: pumpData.labels,
                  datasets: [
                    {
                      label: 'Corriente (A)',
                      data: pumpData.corriente,
                      borderColor: theme.palette.info.main,
                      backgroundColor: 'transparent',
                      yAxisID: 'y',
                      tension: 0.3,
                      pointRadius: 4,
                      borderWidth: 2,
                    },
                    {
                      label: 'Temperatura (°C)',
                      data: pumpData.temperatura,
                      borderColor: theme.palette.error.main,
                      backgroundColor: 'transparent',
                      yAxisID: 'y1',
                      tension: 0.3,
                      pointRadius: 4,
                      borderWidth: 2,
                      borderDash: [5, 5],
                    }
                  ]
                }} 
                options={getOptions('Corriente (A)', 'Temperatura (°C)')} 
              />
            </Box>
          </Paper>
        </Grid>

        {/* Gráfico 2: Presión Descarga vs Succión */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 3, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Dinámica de Fluidos (Presiones)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', gap: 2 }}>
                <span><b>P. Descarga:</b> Mín {descStats.min} PSI | Máx {descStats.max} PSI</span>
                <span><b>P. Succión:</b> Mín {sucStats.min} inHg | Máx {sucStats.max} inHg</span>
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <Line 
                data={{
                  labels: pumpData.labels,
                  datasets: [
                    {
                      label: 'P. Descarga (PSI)',
                      data: pumpData.presion_descarga,
                      borderColor: theme.palette.success.main,
                      backgroundColor: 'transparent',
                      yAxisID: 'y',
                      tension: 0.3,
                      pointRadius: 4,
                      borderWidth: 2,
                    },
                    {
                      label: 'P. Succión (inHg)',
                      data: pumpData.presion_succion,
                      borderColor: theme.palette.warning.main,
                      backgroundColor: 'transparent',
                      yAxisID: 'y1',
                      tension: 0.3,
                      pointRadius: 4,
                      borderWidth: 2,
                      borderDash: [5, 5],
                    }
                  ]
                }} 
                options={getOptions('Descarga (PSI)', 'Succión (inHg)')} 
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
