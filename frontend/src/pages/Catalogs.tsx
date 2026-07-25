import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
} from '@mui/material';
import { Database, Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Pump, Tank, Product, Vessel, AlarmThreshold } from '../types';

export const Catalogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);

  // Dialog States
  const [modalType, setModalType] = useState<'pump' | 'tank' | 'product' | 'vessel' | null>(null);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadAll = async () => {
    try {
      const [pRes, tRes, prRes, vRes, thRes] = await Promise.all([
        api.get('/pumps'),
        api.get('/tanks'),
        api.get('/products'),
        api.get('/vessels'),
        api.get('/alarms/thresholds'),
      ]);
      setPumps(pRes.data);
      setTanks(tRes.data);
      setProducts(prRes.data);
      setVessels(vRes.data);
      setThresholds(thRes.data);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        if (modalType === 'pump') {
          const res = await api.put(`/pumps/${editingId}`, formData);
          await saveThreshold(res.data.id, formData);
        }
        else if (modalType === 'tank') await api.put(`/tanks/${editingId}`, formData);
        else if (modalType === 'product') await api.put(`/products/${editingId}`, formData);
        else if (modalType === 'vessel') await api.put(`/vessels/${editingId}`, formData);
      } else {
        if (modalType === 'pump') {
          const res = await api.post('/pumps', formData);
          await saveThreshold(res.data.id, formData);
        }
        else if (modalType === 'tank') await api.post('/tanks', formData);
        else if (modalType === 'product') await api.post('/products', formData);
        else if (modalType === 'vessel') await api.post('/vessels', formData);
      }

      setModalType(null);
      setFormData({});
      setEditingId(null);
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al guardar elemento del catálogo.');
    }
  };

  const saveThreshold = async (pumpId: number, data: any) => {
    try {
      await api.post('/alarms/thresholds', {
        bomba_id: pumpId,
        temp_max_c: parseFloat(data.temp_max_c || '80.0'),
        corriente_max_a: parseFloat(data.corriente_max_a || '45.0'),
        presion_suc_min_inhg: parseFloat(data.presion_suc_min_inhg || '-10.0'),
        presion_suc_max_inhg: parseFloat(data.presion_suc_max_inhg || '30.0'),
        presion_desc_min_psi: parseFloat(data.presion_desc_min_psi || '20.0'),
        presion_desc_max_psi: parseFloat(data.presion_desc_max_psi || '150.0'),
        is_active: true,
      });
    } catch (err) {
      console.error('Error saving threshold', err);
    }
  };

  const handleEdit = (type: 'pump' | 'tank' | 'product' | 'vessel', item: any) => {
    setModalType(type);
    setEditingId(item.id);
    let data = { ...item };
    if (type === 'pump') {
      const th = thresholds.find(t => t.bomba_id === item.id);
      if (th) {
        data.temp_max_c = th.temp_max_c;
        data.corriente_max_a = th.corriente_max_a;
        data.presion_suc_min_inhg = th.presion_suc_min_inhg;
        data.presion_suc_max_inhg = th.presion_suc_max_inhg;
        data.presion_desc_min_psi = th.presion_desc_min_psi;
        data.presion_desc_max_psi = th.presion_desc_max_psi;
      } else {
        const globalTh = thresholds.find(t => t.bomba_id === null);
        if (globalTh) {
          data.temp_max_c = globalTh.temp_max_c;
          data.corriente_max_a = globalTh.corriente_max_a;
          data.presion_suc_min_inhg = globalTh.presion_suc_min_inhg;
          data.presion_suc_max_inhg = globalTh.presion_suc_max_inhg;
          data.presion_desc_min_psi = globalTh.presion_desc_min_psi;
          data.presion_desc_max_psi = globalTh.presion_desc_max_psi;
        }
      }
    }
    setFormData(data);
  };

  const handleDelete = async (type: 'pump' | 'tank' | 'product' | 'vessel', id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este elemento?')) return;
    try {
      if (type === 'pump') await api.delete(`/pumps/${id}`);
      else if (type === 'tank') await api.delete(`/tanks/${id}`);
      else if (type === 'product') await api.delete(`/products/${id}`);
      else if (type === 'vessel') await api.delete(`/vessels/${id}`);
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar elemento del catálogo.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            ADMINISTRACIÓN DE CATÁLOGOS BASE
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Gestione Bombas, Tanques, Productos y Buques del sistema.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => {
            let data: any = {};
            if (activeTab === 0) {
              setModalType('pump');
              const globalTh = thresholds.find(t => t.bomba_id === null);
              if (globalTh) {
                data.temp_max_c = globalTh.temp_max_c;
                data.corriente_max_a = globalTh.corriente_max_a;
                data.presion_suc_min_inhg = globalTh.presion_suc_min_inhg;
                data.presion_suc_max_inhg = globalTh.presion_suc_max_inhg;
                data.presion_desc_min_psi = globalTh.presion_desc_min_psi;
                data.presion_desc_max_psi = globalTh.presion_desc_max_psi;
              }
            }
            if (activeTab === 1) setModalType('tank');
            if (activeTab === 2) setModalType('product');
            if (activeTab === 3) setModalType('vessel');
            setFormData(data);
          }}
        >
          Agregar Nuevo
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ backgroundColor: '#0f172a', borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{ borderBottom: '1px solid #1e293b' }}
        >
          <Tab label="BOMBAS CENTRÍFUGAS" sx={{ fontWeight: 700 }} />
          <Tab label="TANQUES DE ALMACENAMIENTO" sx={{ fontWeight: 700 }} />
          <Tab label="PRODUCTOS (ACEITE/ETANOL)" sx={{ fontWeight: 700 }} />
          <Tab label="BUQUES TANQUEROS" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* TAB 0: BOMBAS */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Marca / Modelo</TableCell>
                <TableCell>Caudal (m³/h)</TableCell>
                <TableCell>Motor (HP / Info)</TableCell>
                <TableCell>Potencia (kW)</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pumps.map((p) => (
                <TableRow key={p.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#63b3ed' }}>{p.codigo}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.marca} {p.modelo}</TableCell>
                  <TableCell>{p.caudal_nominal_m3h} m³/h</TableCell>
                  <TableCell>{p.motor_info}</TableCell>
                  <TableCell>{p.potencia_kw} kW</TableCell>
                  <TableCell>
                    <Chip label={p.estado} color={p.estado === 'En Operacion' ? 'primary' : 'success'} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit('pump', p)} color="primary">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('pump', p.id)} color="error">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 1: TANQUES */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Producto Asignado</TableCell>
                <TableCell>Capacidad (m³)</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tanks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#63b3ed' }}>{t.codigo}</TableCell>
                  <TableCell>{t.producto?.nombre}</TableCell>
                  <TableCell>{t.capacidad_m3.toLocaleString()} m³</TableCell>
                  <TableCell><Chip label={t.estado} size="small" /></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit('tank', t)} color="primary">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('tank', t.id)} color="error">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 2: PRODUCTOS */}
      {activeTab === 2 && (
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre Producto</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Densidad (g/cm³)</TableCell>
                <TableCell>Viscosidad (cSt)</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#00b4d8' }}>{pr.nombre}</TableCell>
                  <TableCell>{pr.descripcion}</TableCell>
                  <TableCell>{pr.densidad || '-'}</TableCell>
                  <TableCell>{pr.viscosidad || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit('product', pr)} color="primary">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('product', pr.id)} color="error">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 3: BUQUES */}
      {activeTab === 3 && (
        <Paper sx={{ p: 2.5, backgroundColor: '#0f172a', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre del Buque</TableCell>
                <TableCell>Nombre del Buque</TableCell>
                <TableCell>Empresa Naviera</TableCell>
                <TableCell>Observaciones</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vessels.map((v) => (
                <TableRow key={v.id}>
                  <TableCell sx={{ fontWeight: 700, color: '#38bdf8' }}>{v.nombre}</TableCell>
                  <TableCell>{v.empresa}</TableCell>
                  <TableCell>{v.observaciones || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit('vessel', v)} color="primary">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete('vessel', v.id)} color="error">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dynamic Creation Dialog */}
      <Dialog open={!!modalType} onClose={() => setModalType(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a' } }}>
        <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700 }}>
          {modalType === 'pump' && (editingId ? 'Editar Bomba Centrífuga' : 'Agregar Nueva Bomba Centrífuga')}
          {modalType === 'tank' && (editingId ? 'Editar Tanque' : 'Agregar Nuevo Tanque')}
          {modalType === 'product' && (editingId ? 'Editar Producto' : 'Agregar Nuevo Producto')}
          {modalType === 'vessel' && (editingId ? 'Editar Buque' : 'Agregar Nuevo Buque')}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent>
            <Grid container spacing={2}>
              {modalType === 'pump' && (
                <>
                  <Grid item xs={6}><TextField fullWidth required label="TAG / Código (OBLIGATORIO - Ej. B101)" value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Nombre (Opcional)" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Marca (Opcional)" value={formData.marca || ''} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Modelo (Opcional)" value={formData.modelo || ''} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Caudal m³/h (Opcional)" value={formData.caudal_nominal_m3h || ''} onChange={(e) => setFormData({ ...formData, caudal_nominal_m3h: e.target.value ? parseFloat(e.target.value) : 0 })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Potencia kW (Opcional)" value={formData.potencia_kw || ''} onChange={(e) => setFormData({ ...formData, potencia_kw: e.target.value ? parseFloat(e.target.value) : 0 })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Motor Info (Opcional - Ej. 75 HP 440V)" value={formData.motor_info || ''} onChange={(e) => setFormData({ ...formData, motor_info: e.target.value })} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: '#ef4444', fontWeight: 700, mt: 2, mb: 1 }}>Configuración de Límites de Alarma para esta Bomba</Typography>
                  </Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Temp. Máxima Motor (°C)" value={formData.temp_max_c || '80.0'} onChange={(e) => setFormData({ ...formData, temp_max_c: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Corriente Máxima (A)" value={formData.corriente_max_a || '45.0'} onChange={(e) => setFormData({ ...formData, corriente_max_a: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Presión Succión Máx (inHg)" value={formData.presion_suc_max_inhg || '30.0'} onChange={(e) => setFormData({ ...formData, presion_suc_max_inhg: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Presión Succión Mín (inHg)" value={formData.presion_suc_min_inhg || '-10.0'} onChange={(e) => setFormData({ ...formData, presion_suc_min_inhg: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Presión Descarga Máx (psi)" value={formData.presion_desc_max_psi || '150.0'} onChange={(e) => setFormData({ ...formData, presion_desc_max_psi: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Presión Descarga Mín (psi)" value={formData.presion_desc_min_psi || '20.0'} onChange={(e) => setFormData({ ...formData, presion_desc_min_psi: e.target.value })} /></Grid>
                </>
              )}

              {modalType === 'tank' && (
                <>
                  <Grid item xs={6}><TextField fullWidth required label="TAG / Código Tanque (OBLIGATORIO - Ej. TK3)" value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Capacidad m³ (Opcional)" value={formData.capacidad_m3 || ''} onChange={(e) => setFormData({ ...formData, capacidad_m3: e.target.value ? parseFloat(e.target.value) : 1000 })} /></Grid>
                  <Grid item xs={12}>
                    <TextField select fullWidth label="Producto Asignado (Opcional)" InputLabelProps={{ shrink: true }} value={formData.producto_id || ''} onChange={(e) => setFormData({ ...formData, producto_id: e.target.value ? Number(e.target.value) : null })} SelectProps={{ native: true }}>
                      <option value="">Seleccionar Producto (Opcional)...</option>
                      {products.map((p) => <option key={p.id} value={p.id} style={{ background: '#1e293b' }}>{p.nombre}</option>)}
                    </TextField>
                  </Grid>
                </>
              )}

              {modalType === 'product' && (
                <>
                  <Grid item xs={12}><TextField fullWidth required label="Nombre Producto (OBLIGATORIO - Ej. Aceite Vegetal)" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Densidad (Opcional)" value={formData.densidad || ''} onChange={(e) => setFormData({ ...formData, densidad: e.target.value ? parseFloat(e.target.value) : null })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth type="number" label="Viscosidad (Opcional)" value={formData.viscosidad || ''} onChange={(e) => setFormData({ ...formData, viscosidad: e.target.value ? parseFloat(e.target.value) : null })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Descripción (Opcional)" value={formData.descripcion || ''} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} /></Grid>
                </>
              )}

              {modalType === 'vessel' && (
                <>
                  <Grid item xs={6}><TextField fullWidth required label="Nombre del Buque (OBLIGATORIO)" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Empresa Naviera (Opcional)" value={formData.empresa || ''} onChange={(e) => setFormData({ ...formData, empresa: e.target.value })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Observaciones (Opcional)" value={formData.observaciones || ''} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} /></Grid>
                </>
              )}

            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalType(null)}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar En Catálogo</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
