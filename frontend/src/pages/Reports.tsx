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
  IconButton,
  Checkbox,
} from '@mui/material';
import { FileText, FileSpreadsheet, Download, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Operation } from '../types';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadOperations = () => {
    api.get('/operations').then((res) => {
      setOperations(res.data);
      setSelectedIds([]);
    });
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error downloading file', error);
      alert('No se pudo descargar el archivo. Verifique sus permisos.');
    }
  };

  const handleDownloadPDF = (opId: number, opCode: string) => {
    downloadFile(`/reports/operation/${opId}/pdf`, `Reporte_${opCode}.pdf`);
  };

  const handleDownloadExcel = (opId: number, opCode: string) => {
    downloadFile(`/reports/operation/${opId}/excel`, `Reporte_${opCode}.xlsx`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('ATENCIÓN: ¿Está seguro que desea eliminar esta operación y TODAS sus lecturas de monitoreo asociadas? Esta acción es irreversible y elimina tanto el reporte como todos los datos de medición.')) {
      try {
        await api.delete(`/operations/${id}`);
        loadOperations();
      } catch (err) {
        console.error('Error al eliminar operación', err);
        alert('Error al eliminar el reporte.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`ATENCIÓN: ¿Está seguro que desea eliminar ${selectedIds.length} operaciones y TODAS sus lecturas de monitoreo asociadas? Esta acción es irreversible.`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/operations/${id}`)));
      loadOperations();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar operaciones.');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(operations.map(op => op.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            CENTRO DE EMISIÓN DE REPORTES TÉCNICOS
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Exporte informes consolidados en formato PDF institucional o libro de cálculo Excel para análisis de mantenimiento.
          </Typography>
        </Box>
        {user?.role === 'Administrador' && selectedIds.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Trash2 size={18} />}
            onClick={handleBulkDelete}
          >
            Eliminar ({selectedIds.length})
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role === 'Administrador' && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < operations.length}
                      checked={operations.length > 0 && selectedIds.length === operations.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
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
              {operations.map((op) => {
                const isSelected = selectedIds.includes(op.id);
                return (
                  <TableRow key={op.id} selected={isSelected}>
                    {user?.role === 'Administrador' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isSelected}
                          onChange={() => handleSelectOne(op.id)}
                        />
                      </TableCell>
                    )}
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
                      {user?.role === 'Administrador' && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(op.id)}>
                          <Trash2 size={18} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
