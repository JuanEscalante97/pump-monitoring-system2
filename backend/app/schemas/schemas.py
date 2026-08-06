from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, time

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str = "Mantenimiento"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    fecha_ultimo_acceso: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None

# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    densidad: Optional[float] = None
    viscosidad: Optional[float] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- TANK SCHEMAS ---
class TankBase(BaseModel):
    codigo: str
    producto_id: Optional[int] = None
    capacidad_m3: Optional[float] = 1000.0
    estado: str = "Disponible"

class TankCreate(TankBase):
    pass

class TankResponse(TankBase):
    id: int
    created_at: datetime
    producto: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# --- PUMP SCHEMAS ---
class PumpBase(BaseModel):
    codigo: str
    nombre: Optional[str] = None
    marca: Optional[str] = "Genérica"
    modelo: Optional[str] = "N/A"
    caudal_nominal_m3h: Optional[float] = 0.0
    motor_info: Optional[str] = "N/A"
    potencia_kw: Optional[float] = 0.0
    estado: str = "Operativa"


class PumpCreate(PumpBase):
    pass

class PumpResponse(PumpBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- VESSEL SCHEMAS ---
class VesselBase(BaseModel):
    nombre: str
    empresa: Optional[str] = "Genérica"
    observaciones: Optional[str] = None


class VesselCreate(VesselBase):
    pass

class VesselResponse(VesselBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- ALARM THRESHOLD SCHEMAS ---
class AlarmThresholdBase(BaseModel):
    bomba_id: Optional[int] = None
    temp_max_c: float = 80.0
    corriente_max_a: float = 45.0
    presion_suc_min_inhg: float = -10.0
    presion_suc_max_inhg: float = 30.0
    presion_desc_min_psi: float = 20.0
    presion_desc_max_psi: float = 150.0
    is_active: bool = True

class AlarmThresholdCreate(AlarmThresholdBase):
    pass

class AlarmThresholdResponse(AlarmThresholdBase):
    id: int

    class Config:
        from_attributes = True

# --- OPERATION SCHEMAS ---
class OperationCreate(BaseModel):
    buque_id: int
    producto_id: int
    tank_ids: List[int] = []
    pump_ids: List[int] = []
    observaciones: Optional[str] = None

class ScheduledInspectionResponse(BaseModel):
    id: int
    operation_id: int
    hora_programada: time
    hora_real: Optional[datetime] = None
    estado: str
    retraso_minutos: int

    class Config:
        from_attributes = True

class OperationResponse(BaseModel):
    id: int
    codigo_operacion: str
    fecha: date
    buque_id: int
    producto_id: int
    responsable_id: int
    hora_inicio: time
    hora_fin: Optional[time] = None
    fecha_fin: Optional[date] = None
    estado: str
    observaciones: Optional[str] = None
    created_at: datetime
    buque: Optional[VesselResponse] = None
    producto: Optional[ProductResponse] = None
    responsable: Optional[UserResponse] = None
    tanks: List[TankResponse] = []
    pumps: List[PumpResponse] = []
    scheduled_inspections: List[ScheduledInspectionResponse] = []

    class Config:
        from_attributes = True

# --- MEASUREMENT SCHEMAS ---
# Client DOES NOT send date or time! Server automatically sets them.
class MeasurementBase(BaseModel):
    bomba_id: int
    tanque_id: Optional[int] = None
    presion_succion_inhg: Optional[float] = None
    presion_descarga_psi: float
    temperatura_c: float
    temperatura_bomba_c: Optional[float] = None
    corriente_a: float
    observaciones: Optional[str] = None
    tecnico_mecanico: Optional[str] = None

class MeasurementCreate(MeasurementBase):
    operation_id: int

class MeasurementBulkItem(MeasurementBase):
    pass

class MeasurementBulkCreate(BaseModel):
    operation_id: int
    measurements: List[MeasurementBulkItem]

class MeasurementCorrection(BaseModel):
    presion_succion_inhg: Optional[float] = None
    presion_descarga_psi: float
    temperatura_c: float
    temperatura_bomba_c: Optional[float] = None
    corriente_a: float
    corregido_motivo: str

class MeasurementResponse(MeasurementBase):
    id: int
    operation_id: int
    inspection_id: Optional[int] = None
    registrado_por_id: int
    fecha_registro: date
    hora_registro: time
    datetime_registro: datetime
    is_corrected: bool
    corregido_motivo: Optional[str] = None
    bomba: Optional[PumpResponse] = None
    tanque: Optional[TankResponse] = None
    registrado_por: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- ALARM EVENT SCHEMAS ---
class AlarmEventResponse(BaseModel):
    id: int
    measurement_id: Optional[int] = None
    bomba_id: int
    operacion_id: int
    tipo_alarma: str
    nivel: str
    mensaje: str
    valor_registrado: float
    limite_umbral: float
    estado: str
    fecha_hora: datetime
    bomba: Optional[PumpResponse] = None

    class Config:
        from_attributes = True

# --- AUDIT LOG SCHEMAS ---
class AuditLogResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    username: str
    accion: str
    entidad: str
    entidad_id: Optional[int] = None
    ip_address: Optional[str] = None
    detalles: Optional[str] = None
    fecha_hora: datetime

    class Config:
        from_attributes = True

# --- DASHBOARD & ANALYTICS SCHEMAS ---
class DashboardKPIs(BaseModel):
    operaciones_activas: int
    bombas_trabajando: int
    inspecciones_pendientes: int
    inspecciones_atrasadas: int
    temperatura_promedio: float
    corriente_promedio: float
    presion_succion_promedio: float
    presion_descarga_promedio: float
    total_mediciones_hoy: int
    tiempo_restante_horas: Optional[float] = None
    hora_inicio_op: Optional[str] = None
    hora_fin_estimada: Optional[str] = None

class PumpLatestStatus(BaseModel):
    pump: PumpResponse
    last_measurement: Optional[MeasurementResponse] = None
    status_indicator: str  # NORMAL (🟢), WARNING (🟡), ALARM (🔴)
    active_alarms_count: int

class PIDProcessData(BaseModel):
    active_operation: Optional[OperationResponse] = None
    tanks: List[TankResponse] = []
    pumps_status: List[PumpLatestStatus] = []
    vessel: Optional[VesselResponse] = None
    product: Optional[ProductResponse] = None
