export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  fecha_ultimo_acceso?: string;
  created_at: string;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion?: string;
  densidad?: number;
  viscosidad?: number;
  created_at: string;
}

export interface Tank {
  id: number;
  codigo: string;
  producto_id: number;
  capacidad_m3: number;
  estado: string;
  producto?: Product;
}

export interface Pump {
  id: number;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  caudal_nominal_m3h: number;
  motor_info: string;
  potencia_kw: number;
  estado: string;
}

export interface Vessel {
  id: number;
  nombre: string;
  empresa: string;
  observaciones?: string;
}

export interface ScheduledInspection {
  id: number;
  operation_id: number;
  hora_programada: string;
  hora_real?: string;
  estado: 'Pendiente' | 'A tiempo' | 'Retrasado';
  retraso_minutos: number;
}

export interface Operation {
  id: number;
  codigo_operacion: string;
  fecha: string;
  buque_id: number;
  producto_id: number;
  responsable_id: number;
  hora_inicio: string;
  hora_fin?: string;
  estado: 'Activa' | 'Finalizada';
  observaciones?: string;
  buque?: Vessel;
  producto?: Product;
  responsable?: User;
  tanks: Tank[];
  pumps: Pump[];
  scheduled_inspections: ScheduledInspection[];
}

export interface Measurement {
  id: number;
  operation_id: number;
  bomba_id: number;
  inspection_id?: number;
  presion_succion_inhg: number;
  presion_descarga_psi: number;
  temperatura_c: number;
  corriente_a: number;
  tecnico_mecanico?: string;
  observaciones?: string;
  registrado_por_id: number;
  fecha_registro: string;
  hora_registro: string;
  datetime_registro: string;
  is_corrected: boolean;
  corregido_motivo?: string;
  bomba?: Pump;
  registrado_por?: User;
}

export interface AlarmEvent {
  id: number;
  measurement_id?: number;
  bomba_id: number;
  operacion_id: number;
  tipo_alarma: string;
  nivel: 'WARNING' | 'ALARM';
  mensaje: string;
  valor_registrado: number;
  limite_umbral: number;
  estado: 'Activa' | 'Reconocida';
  fecha_hora: string;
  bomba?: Pump;
}

export interface AlarmThreshold {
  id: number;
  bomba_id?: number;
  temp_max_c: number;
  corriente_max_a: number;
  presion_suc_min_inhg: number;
  presion_suc_max_inhg: number;
  presion_desc_min_psi: number;
  presion_desc_max_psi: number;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  usuario_id?: number;
  username: string;
  accion: string;
  entidad: string;
  entidad_id?: number;
  ip_address?: string;
  detalles?: string;
  fecha_hora: string;
}

export interface DashboardKPIs {
  operaciones_activas: number;
  bombas_trabajando: number;
  inspecciones_pendientes: number;
  inspecciones_atrasadas: number;
  temperatura_promedio: number;
  corriente_promedio: number;
  presion_succion_promedio: number;
  presion_descarga_promedio: number;
  total_mediciones_hoy: number;
}

export interface PumpLatestStatus {
  pump: Pump;
  last_measurement?: Measurement;
  status_indicator: 'NORMAL' | 'WARNING' | 'ALARM';
  active_alarms_count: number;
}

export interface PIDProcessData {
  active_operation?: Operation;
  tanks: Tank[];
  pumps_status: PumpLatestStatus[];
  vessel?: Vessel;
  product?: Product;
}
