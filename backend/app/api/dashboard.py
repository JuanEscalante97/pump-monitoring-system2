from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.models import Operation, Measurement, ScheduledInspection, Pump, AlarmEvent, Tank, Product, Vessel, AlarmThreshold
from app.schemas.schemas import (
    DashboardKPIs, PIDProcessData, PumpLatestStatus, PumpResponse,
    MeasurementResponse, OperationResponse, TankResponse, VesselResponse, ProductResponse
)

from app.core.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analítica"])

@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tz_peru = timezone(timedelta(hours=-5))
    today = datetime.now(tz_peru).date()

    # Active operations
    operaciones_activas = db.query(Operation).filter(Operation.estado == "Activa").count()

    # Active working pumps
    active_op = db.query(Operation).filter(Operation.estado == "Activa").first()
    if active_op:
        bombas_trabajando = db.query(Pump).join(Measurement).filter(Measurement.operation_id == active_op.id).distinct().count()
    else:
        bombas_trabajando = 0

    # Scheduled inspections
    inspecciones_pendientes = db.query(ScheduledInspection).filter(ScheduledInspection.estado == "Pendiente").count()
    inspecciones_atrasadas = db.query(ScheduledInspection).filter(ScheduledInspection.estado == "Retrasado").count()

    # Measurements today
    today_measurements = db.query(Measurement).filter(Measurement.fecha_registro == today).all()
    total_mediciones_hoy = len(today_measurements)

    if active_op:
        active_measurements = db.query(Measurement).filter(Measurement.operation_id == active_op.id).all()
        total_mediciones = len(active_measurements)
        if total_mediciones > 0:
            temp_prom = sum(m.temperatura_c for m in active_measurements) / total_mediciones
            corr_prom = sum(m.corriente_a for m in active_measurements) / total_mediciones
            p_suc_prom = sum(m.presion_succion_inhg for m in active_measurements) / total_mediciones
            p_desc_prom = sum(m.presion_descarga_psi for m in active_measurements) / total_mediciones
        else:
            temp_prom, corr_prom, p_suc_prom, p_desc_prom = 0.0, 0.0, 0.0, 0.0
    else:
        temp_prom, corr_prom, p_suc_prom, p_desc_prom = 0.0, 0.0, 0.0, 0.0

    return DashboardKPIs(
        operaciones_activas=operaciones_activas,
        bombas_trabajando=bombas_trabajando,
        inspecciones_pendientes=inspecciones_pendientes,
        inspecciones_atrasadas=inspecciones_atrasadas,
        temperatura_promedio=round(temp_prom, 1),
        corriente_promedio=round(corr_prom, 1),
        presion_succion_promedio=round(p_suc_prom, 1),
        presion_descarga_promedio=round(p_desc_prom, 1),
        total_mediciones_hoy=total_mediciones_hoy
    )

@router.get("/pid-diagram", response_model=PIDProcessData)
def get_pid_diagram_data(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    active_op = db.query(Operation).filter(Operation.estado == "Activa").first()
    
    if active_op:
        # PUMPS: Distinct pumps that have measurements in this active operation
        pumps_list = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(Measurement.operation_id == active_op.id).distinct().all()
        
        # TANKS: Distinct tanks that have measurements in this active operation
        tanks_list = db.query(Tank).join(Measurement, Tank.id == Measurement.tanque_id).filter(Measurement.operation_id == active_op.id).distinct().all()
    else:
        pumps_list = []
        tanks_list = []

    pumps_status = []
    for p in pumps_list:
        # Get latest measurement
        last_m = db.query(Measurement).filter(
            Measurement.bomba_id == p.id
        ).order_by(Measurement.datetime_registro.desc()).first()

        # Determine status indicator (🟢 NORMAL, 🟡 WARNING, 🔴 ALARM)
        status_ind = "NORMAL"
        active_alarms_count = db.query(AlarmEvent).filter(
            AlarmEvent.bomba_id == p.id,
            AlarmEvent.estado == "Activa"
        ).count()

        if active_alarms_count > 0:
            status_ind = "ALARM"
        elif last_m and (last_m.temperatura_c > 75.0 or last_m.corriente_a > 40.0):
            status_ind = "WARNING"

        pumps_status.append(PumpLatestStatus(
            pump=PumpResponse.model_validate(p),
            last_measurement=MeasurementResponse.model_validate(last_m) if last_m else None,
            status_indicator=status_ind,
            active_alarms_count=active_alarms_count
        ))

    return PIDProcessData(
        active_operation=OperationResponse.model_validate(active_op) if active_op else None,
        tanks=[TankResponse.model_validate(t) for t in tanks_list],
        pumps_status=pumps_status,
        vessel=VesselResponse.model_validate(active_op.buque) if (active_op and active_op.buque) else None,
        product=ProductResponse.model_validate(active_op.producto) if (active_op and active_op.producto) else None
    )


@router.get("/charts")
def get_chart_data(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    operation_id: Optional[int] = None,
    bomba_id: Optional[int] = None,
    producto_id: Optional[int] = None,
    buque_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retorna datos de series de tiempo para gráficos de Succión, Descarga, Temp y Corriente.
    Soporta filtros por Rango de Fecha, Operación, Bomba, Producto y Buque.
    """
    query = db.query(Measurement).join(Operation)

    if operation_id:
        query = query.filter(Measurement.operation_id == operation_id)
    if bomba_id:
        query = query.filter(Measurement.bomba_id == bomba_id)
    if producto_id:
        query = query.filter(Operation.producto_id == producto_id)
    if buque_id:
        query = query.filter(Operation.buque_id == buque_id)
    if start_date:
        query = query.filter(Measurement.fecha_registro >= start_date)
    if end_date:
        query = query.filter(Measurement.fecha_registro <= end_date)

    measurements = query.order_by(Measurement.datetime_registro.asc()).all()

    labels = []
    temp_series = []
    curr_series = []
    p_suc_series = []
    p_desc_series = []

    def round_time_to_nearest_hour(t):
        if t.minute >= 30:
            next_hour = (t.hour + 1) % 24
            return f"{next_hour:02d}:00"
        return f"{t.hour:02d}:00"

    for m in measurements:
        bomba_code = m.bomba.codigo if m.bomba else f"Bomba {m.bomba_id}"
        rounded_time = round_time_to_nearest_hour(m.hora_registro)
        labels.append(f"{rounded_time} ({bomba_code})")
        temp_series.append(m.temperatura_c)
        curr_series.append(m.corriente_a)
        p_suc_series.append(m.presion_succion_inhg)
        p_desc_series.append(m.presion_descarga_psi)

    return {
        "labels": labels,
        "temperatura": temp_series,
        "corriente": curr_series,
        "presion_succion": p_suc_series,
        "presion_descarga": p_desc_series,
        "count": len(measurements)
    }
