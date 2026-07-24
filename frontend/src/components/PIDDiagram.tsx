import React from 'react';
import { Box, Paper, Typography, Chip, Button, Tooltip, Grid } from '@mui/material';
import { Database as TankIcon, Gauge, Ship, ArrowRight, Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { PIDProcessData, PumpLatestStatus } from '../types';

interface PIDDiagramProps {
  data: PIDProcessData | null;
  onSelectPump: (pumpId: number) => void;
}

export const PIDDiagram: React.FC<PIDDiagramProps> = ({ data, onSelectPump }) => {
  if (!data) return null;

  const activeOp = data.active_operation;
  const isOpActive = !!activeOp;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title & Status Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'Chakra Petch' }}>
              PANEL DE CONTROL - LÍNEA DE EMBARQUE
            </Typography>
            <Chip
              label={isOpActive ? `OPERACIÓN ACTIVA: ${activeOp.codigo_operacion}` : 'SIN OPERACIÓN ACTIVA'}
              color={isOpActive ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Monitoreo en tiempo real de Tanques, Bombas Centrífugas y Buque Tanquero. Haga clic en una bomba para registrar lectura.
          </Typography>
        </Box>

        {activeOp && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>PRODUCTO TRANSFERIDO</Typography>
              <Typography variant="subtitle2" sx={{ color: '#00b4d8', fontWeight: 700 }}>
                {data.product?.nombre || 'Aceite Vegetal'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>BUQUE EN PUERTO</Typography>
              <Typography variant="subtitle2" sx={{ color: '#38bdf8', fontWeight: 700 }}>
                {data.vessel?.nombre || 'N/A'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Flow Canvas Grid */}
      <Grid container spacing={3} alignItems="center">
        {/* STEP 1: TANKS AREA */}
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>
              1. TANQUES DE ALMACENAMIENTO
            </Typography>
            {(data.tanks || []).map((tank) => {
              const isUsedInOp = activeOp?.tanks?.some((t) => t.id === tank.id);
              return (
                <Paper
                  key={tank.id}
                  sx={{
                    p: 2,
                    backgroundColor: isUsedInOp ? 'rgba(49, 130, 206, 0.12)' : '#1e293b',
                    border: isUsedInOp ? '2px solid #3182ce' : '1px solid #334155',
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TankIcon size={28} color={isUsedInOp ? '#63b3ed' : '#64748b'} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                        {tank.codigo}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Cap: {tank.capacidad_m3 ? tank.capacidad_m3.toLocaleString() : 0} m³
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={isUsedInOp ? 'EN ENVIÓ' : tank.estado}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: isUsedInOp ? '#3182ce' : '#334155',
                      color: '#ffffff',
                    }}
                  />
                </Paper>
              );
            })}
          </Box>
        </Grid>

        {/* PIPELINE CONNECTOR 1 */}
        <Grid item xs={12} md={1} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 4,
                backgroundColor: isOpActive ? '#00b4d8' : '#334155',
                boxShadow: isOpActive ? '0 0 10px #00b4d8' : 'none',
              }}
            />
            <ArrowRight size={20} color={isOpActive ? '#00b4d8' : '#334155'} />
          </Box>
        </Grid>

        {/* STEP 2: PUMPS AREA */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 1, mb: 2 }}>
            2. BOMBAS CENTRÍFUGAS DE EMBARQUE
          </Typography>
          <Grid container spacing={2}>
            {(data.pumps_status || []).map(({ pump, last_measurement, status_indicator, active_alarms_count }) => {
              const isAssigned = activeOp?.pumps?.some((p) => p.id === pump.id);


              let statusBg = 'rgba(16, 185, 129, 0.1)';
              let statusBorder = '#10b981';
              let statusIcon = <CheckCircle2 size={18} color="#10b981" />;
              let statusText = '🟢 NORMAL';

              if (status_indicator === 'ALARM') {
                statusBg = 'rgba(239, 68, 68, 0.2)';
                statusBorder = '#ef4444';
                statusIcon = <AlertTriangle size={18} color="#ef4444" />;
                statusText = '🔴 ALARMA CRÍTICA';
              } else if (status_indicator === 'WARNING') {
                statusBg = 'rgba(245, 158, 11, 0.15)';
                statusBorder = '#f59e0b';
                statusIcon = <AlertTriangle size={18} color="#f59e0b" />;
                statusText = '🟡 ADVERTENCIA';
              }

              return (
                <Grid item xs={12} key={pump.id}>
                  <Paper
                    onClick={() => isAssigned && onSelectPump(pump.id)}
                    sx={{
                      p: 2,
                      backgroundColor: statusBg,
                      border: `2px solid ${isAssigned ? statusBorder : '#334155'}`,
                      borderRadius: 2.5,
                      cursor: isAssigned ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      '&:hover': isAssigned ? { transform: 'translateY(-2px)', boxShadow: `0 4px 15px ${statusBorder}44` } : {},
                      opacity: isAssigned ? 1 : 0.6,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 2,
                            backgroundColor: '#0f172a',
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          <Gauge size={22} color={statusBorder} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, lineHeight: 1.1 }}>
                            {pump.codigo} - {pump.nombre}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {pump.marca} {pump.modelo} | {pump.potencia_kw} kW ({pump.motor_info})
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={statusIcon}
                        label={isAssigned ? statusText : 'INACTIVA'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: `1px solid ${statusBorder}`,
                        }}
                      />
                    </Box>

                    {/* Telemetry metrics bar */}
                    {last_measurement ? (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 1,
                          mt: 1.5,
                          p: 1,
                          borderRadius: 1.5,
                          backgroundColor: '#0b0f19',
                          border: '1px solid #1e293b',
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>TEMP MOTOR</Typography>
                          <Typography variant="body2" sx={{ color: last_measurement.temperatura_c > 80 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                            {last_measurement.temperatura_c}°C
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>CORRIENTE</Typography>
                          <Typography variant="body2" sx={{ color: last_measurement.corriente_a > 45 ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                            {last_measurement.corriente_a} A
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>P. SUCCIÓN</Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700 }}>
                            {last_measurement.presion_succion_inhg} inHg
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>P. DESCARGA</Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700 }}>
                            {last_measurement.presion_descarga_psi} psi
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1, fontStyle: 'italic' }}>
                        Sin lecturas registradas aún en esta operación.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Grid>

        {/* PIPELINE CONNECTOR 2 */}
        <Grid item xs={12} md={1} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 4,
                backgroundColor: isOpActive ? '#00b4d8' : '#334155',
                boxShadow: isOpActive ? '0 0 10px #00b4d8' : 'none',
              }}
            />
            <ArrowRight size={20} color={isOpActive ? '#00b4d8' : '#334155'} />
          </Box>
        </Grid>

        {/* STEP 3: VESSEL DESTINATION */}
        <Grid item xs={12} md={2}>
          <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 1, mb: 2 }}>
            3. DESTINO (BUQUE)
          </Typography>
          <Paper
            sx={{
              p: 2.5,
              backgroundColor: isOpActive ? 'rgba(56, 189, 248, 0.1)' : '#1e293b',
              border: isOpActive ? '2px solid #38bdf8' : '1px solid #334155',
              borderRadius: 2.5,
              textAlign: 'center',
            }}
          >
            <Ship size={36} color={isOpActive ? '#38bdf8' : '#64748b'} />
            <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mt: 1 }}>
              {data.vessel?.nombre || 'Sin Asignar'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
              {data.vessel?.empresa || 'Empresa Naviera'}
            </Typography>
            <Chip
              label={isOpActive ? 'RECIBIENDO RECURSO' : 'ESPERANDO AMARRE'}
              color={isOpActive ? 'info' : 'default'}
              size="small"
              sx={{ mt: 1.5, fontWeight: 700 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};
