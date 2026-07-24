from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Time, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

# Association Tables for Operation N:M relationships
operation_tanks = Table(
    'operation_tanks',
    Base.metadata,
    Column('operation_id', Integer, ForeignKey('operations.id', ondelete='CASCADE'), primary_key=True),
    Column('tank_id', Integer, ForeignKey('tanks.id', ondelete='RESTRICT'), primary_key=True)
)

operation_pumps = Table(
    'operation_pumps',
    Base.metadata,
    Column('operation_id', Integer, ForeignKey('operations.id', ondelete='CASCADE'), primary_key=True),
    Column('pump_id', Integer, ForeignKey('pumps.id', ondelete='RESTRICT'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default="Mantenimiento", nullable=False)  # Mantenimiento, Supervisor, Operador, Administrador
    is_active = Column(Boolean, default=True)
    fecha_ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    operations_responsable = relationship("Operation", back_populates="responsable")
    measurements = relationship("Measurement", back_populates="registrado_por")
    audit_logs = relationship("AuditLog", back_populates="user")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)  # Aceite Vegetal, Etanol, etc.
    descripcion = Column(Text, nullable=True)
    densidad = Column(Float, nullable=True)  # g/cm3 o kg/m3
    viscosidad = Column(Float, nullable=True)  # cSt
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tanks = relationship("Tank", back_populates="producto")
    operations = relationship("Operation", back_populates="producto")

class Tank(Base):
    __tablename__ = "tanks"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)  # TK3, TK4, TK5
    producto_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    capacidad_m3 = Column(Float, nullable=True, default=1000.0)
    estado = Column(String(30), default="Disponible")  # Disponible, En Uso, Mantenimiento
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    producto = relationship("Product", back_populates="tanks")
    operations = relationship("Operation", secondary=operation_tanks, back_populates="tanks")

class Pump(Base):
    __tablename__ = "pumps"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, index=True, nullable=False)  # B101, B102, B103
    nombre = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True, default="Genérica")
    modelo = Column(String(100), nullable=True, default="N/A")
    caudal_nominal_m3h = Column(Float, nullable=True, default=0.0)
    motor_info = Column(String(100), nullable=True, default="N/A")
    potencia_kw = Column(Float, nullable=True, default=0.0)
    estado = Column(String(30), default="Operativa")  # Operativa, En Operacion, Mantenimiento, Inactiva
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    # Relationships
    operations = relationship("Operation", secondary=operation_pumps, back_populates="pumps")
    measurements = relationship("Measurement", back_populates="bomba")
    thresholds = relationship("AlarmThreshold", back_populates="bomba")
    alarm_events = relationship("AlarmEvent", back_populates="bomba")

class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)
    empresa = Column(String(100), nullable=True, default="Genérica")
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    # Relationships
    operations = relationship("Operation", back_populates="buque")

class AlarmThreshold(Base):
    __tablename__ = "alarm_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    bomba_id = Column(Integer, ForeignKey("pumps.id"), nullable=True)  # Nullable for global threshold
    temp_max_c = Column(Float, default=80.0, nullable=False)
    corriente_max_a = Column(Float, default=45.0, nullable=False)
    presion_suc_min_inhg = Column(Float, default=-10.0, nullable=False)
    presion_suc_max_inhg = Column(Float, default=30.0, nullable=False)
    presion_desc_min_psi = Column(Float, default=20.0, nullable=False)
    presion_desc_max_psi = Column(Float, default=150.0, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    bomba = relationship("Pump", back_populates="thresholds")

class Operation(Base):
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True)
    codigo_operacion = Column(String(30), unique=True, index=True, nullable=False)
    fecha = Column(Date, nullable=False)
    buque_id = Column(Integer, ForeignKey("vessels.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    responsable_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=True)
    estado = Column(String(20), default="Activa", index=True, nullable=False)  # Activa, Finalizada
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    buque = relationship("Vessel", back_populates="operations")
    producto = relationship("Product", back_populates="operations")
    responsable = relationship("User", back_populates="operations_responsable")
    tanks = relationship("Tank", secondary=operation_tanks, back_populates="operations")
    pumps = relationship("Pump", secondary=operation_pumps, back_populates="operations")
    scheduled_inspections = relationship("ScheduledInspection", back_populates="operation", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="operation", cascade="all, delete-orphan")
    alarm_events = relationship("AlarmEvent", back_populates="operacion")

class ScheduledInspection(Base):
    __tablename__ = "scheduled_inspections"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=False)
    hora_programada = Column(Time, nullable=False)
    hora_real = Column(DateTime(timezone=True), nullable=True)
    estado = Column(String(30), default="Pendiente", nullable=False)  # Pendiente, A tiempo, Retrasado
    retraso_minutos = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    operation = relationship("Operation", back_populates="scheduled_inspections")
    measurements = relationship("Measurement", back_populates="scheduled_inspection")

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id"), nullable=False)
    bomba_id = Column(Integer, ForeignKey("pumps.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("scheduled_inspections.id"), nullable=True)
    presion_succion_inhg = Column(Float, nullable=False)
    presion_descarga_psi = Column(Float, nullable=False)
    temperatura_c = Column(Float, nullable=False)
    corriente_a = Column(Float, nullable=False)
    observaciones = Column(Text, nullable=True)
    registrado_por_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tecnico_mecanico = Column(String(100), nullable=True)
    fecha_registro = Column(Date, nullable=False)
    hora_registro = Column(Time, nullable=False)
    datetime_registro = Column(DateTime(timezone=True), nullable=False)
    is_corrected = Column(Boolean, default=False, nullable=False)
    corregido_motivo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    operation = relationship("Operation", back_populates="measurements")
    bomba = relationship("Pump", back_populates="measurements")
    scheduled_inspection = relationship("ScheduledInspection", back_populates="measurements")
    registrado_por = relationship("User", back_populates="measurements")
    alarm_events = relationship("AlarmEvent", back_populates="measurement")

class AlarmEvent(Base):
    __tablename__ = "alarm_events"

    id = Column(Integer, primary_key=True, index=True)
    measurement_id = Column(Integer, ForeignKey("measurements.id"), nullable=True)
    bomba_id = Column(Integer, ForeignKey("pumps.id"), nullable=False)
    operacion_id = Column(Integer, ForeignKey("operations.id"), nullable=False)
    tipo_alarma = Column(String(50), nullable=False)  # Alta Temperatura, Alta Corriente, Presión Fuera de Rango
    nivel = Column(String(20), default="ALARM", nullable=False)  # WARNING, ALARM
    mensaje = Column(Text, nullable=False)
    valor_registrado = Column(Float, nullable=False)
    limite_umbral = Column(Float, nullable=False)
    estado = Column(String(20), default="Activa", nullable=False)  # Activa, Reconocida
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    measurement = relationship("Measurement", back_populates="alarm_events")
    bomba = relationship("Pump", back_populates="alarm_events")
    operacion = relationship("Operation", back_populates="alarm_events")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=False)
    accion = Column(String(100), nullable=False)
    entidad = Column(String(50), nullable=False)
    entidad_id = Column(Integer, nullable=True)
    ip_address = Column(String(50), nullable=True)
    detalles = Column(Text, nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
