import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
  TableContainer,
} from '@mui/material';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import { api } from '../api/client';
import { Operation } from '../types';

export const Reports: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);

  useEffect(() => {
    api.get('/operations').then((res) => setOperations(res.data));
  }, []);

  const handleDownloadPDF = (opId: number, opCode: string) => {
    window.open(`${api.defaults.baseURL}/reports/operation/${opId}/pdf`, '_blank');
  };

  const handleDownloadExcel = (opId: number, opCode: string) => {
    window.open(`${api.defaults.baseURL}/reports/operation/${opId}/excel`, '_blank');
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          CENTRO DE EMISIÓN DE REPORTES TÉCNICOS
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Exporte informes consolidados en formato PDF institucional o libro de cálculo Excel para análisis de mantenimiento.
        </Typography>
      </Box>

      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código Operación</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Buque Destino</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Tanques / Bombas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Exportar Informe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#63b3ed' }}>{op.codigo_operacion}</TableCell>
                  <TableCell>{op.fecha}</TableCell>
                  <TableCell>{op.buque?.nombre}</TableCell>
                  <TableCell>{op.producto?.nombre}</TableCell>
                  <TableCell>
                    {op.tanks.map((t) => t.codigo).join(', ')} | {op.pumps.map((p) => p.codigo).join(', ')}
                  </TableCell>
                  <TableCell>
                    <Chip label={op.estado} color={op.estado === 'Activa' ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<FileText size={14} />}
                        onClick={() => handleDownloadPDF(op.id, op.codigo_operacion)}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<FileSpreadsheet size={14} />}
                        onClick={() => handleDownloadExcel(op.id, op.codigo_operacion)}
                      >
                        Excel
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
