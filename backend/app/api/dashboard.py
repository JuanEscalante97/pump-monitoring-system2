from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.models import Operation, Measurement, ScheduledInspection, Pump, AlarmEvent, OperationPause, Tank, Product, Vessel, AlarmThreshold
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

    # Scheduled inspections
    inspecciones_pendientes = db.query(ScheduledInspection).filter(ScheduledInspection.estado == "Pendiente").count()
    inspecciones_atrasadas = db.query(ScheduledInspection).filter(ScheduledInspection.estado == "Retrasado").count()

    # Measurements today
    today_measurements = db.query(Measurement).filter(Measurement.fecha_registro == today).all()
    total_mediciones_hoy = len(today_measurements)

    tiempo_restante_horas = None
    hora_inicio_op = None
    hora_fin_estimada = None
    is_paused = False
    bombas_trabajando = 0

    if active_op:
        pausas_general = db.query(OperationPause).filter(OperationPause.operation_id == active_op.id).all()
        for p in pausas_general:
            if p.fin_corte is None:
                is_paused = True

        if not is_paused:
            try:
                latest_op_m = db.query(Measurement).filter(Measurement.operation_id == active_op.id).order_by(Measurement.datetime_registro.desc()).first()
                if latest_op_m and latest_op_m.datetime_registro:
                    import datetime as dt_mod
                    if isinstance(latest_op_m.datetime_registro, str):
                        dt_reg = dt_mod.datetime.fromisoformat(latest_op_m.datetime_registro.replace('Z', '+00:00'))
                    else:
                        dt_reg = latest_op_m.datetime_registro
                    cutoff_time = dt_reg - timedelta(minutes=5)
                    bombas_trabajando = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(
                        Measurement.operation_id == active_op.id,
                        Measurement.datetime_registro >= cutoff_time
                    ).distinct().count()
            except Exception as e:
                print(f"Error calculando bombas_trabajando: {e}")
                bombas_trabajando = 0

        active_measurements = db.query(Measurement).filter(Measurement.operation_id == active_op.id).all()
        total_mediciones = len(active_measurements)
        if total_mediciones > 0:
            temps = [m.temperatura_c for m in active_measurements if m.temperatura_c is not None]
            corrs = [m.corriente_a for m in active_measurements if m.corriente_a is not None]
            p_sucs = [m.presion_succion_inhg for m in active_measurements if m.presion_succion_inhg is not None]
            p_descs = [m.presion_descarga_psi for m in active_measurements if m.presion_descarga_psi is not None]
            
            temp_prom = sum(temps) / len(temps) if temps else 0.0
            corr_prom = sum(corrs) / len(corrs) if corrs else 0.0
            p_suc_prom = sum(p_sucs) / len(p_sucs) if p_sucs else 0.0
            p_desc_prom = sum(p_descs) / len(p_descs) if p_descs else 0.0
        else:
            temp_prom = corr_prom = p_suc_prom = p_desc_prom = 0.0

        # Calcular ETA Dinámico
        try:
            dynamic_pumps = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(Measurement.operation_id == active_op.id).distinct().all()
            dynamic_tanks = db.query(Tank).join(Measurement, Tank.id == Measurement.tanque_id).filter(Measurement.operation_id == active_op.id).distinct().all()
            
            caudal_total = sum((p.caudal_nominal_m3h or 0) for p in dynamic_pumps)
            capacidad_total = sum((t.capacidad_m3 or 0) for t in dynamic_tanks)
            
            if caudal_total > 0 and capacidad_total > 0:
                # 1. Obtener Hora de Inicio
                hora_inicio = active_op.hora_inicio or datetime.min.time()
                inicio_dt = datetime.combine(active_op.fecha, hora_inicio).replace(tzinfo=tz_peru)
                hora_inicio_op = inicio_dt.strftime("%H:%M")
                
                # 2. Calcular Tiempo Transcurrido (Descontando Pausas)
                now_dt = datetime.now(tz_peru)
                
                pausas = db.query(OperationPause).filter(OperationPause.operation_id == active_op.id).all()
                tiempo_pausa_segundos = 0
                for p in pausas:
                    inicio = p.inicio_corte.astimezone(tz_peru) if p.inicio_corte.tzinfo else p.inicio_corte.replace(tzinfo=tz_peru)
                    if p.fin_corte:
                        fin = p.fin_corte.astimezone(tz_peru) if p.fin_corte.tzinfo else p.fin_corte.replace(tzinfo=tz_peru)
                    else:
                        fin = now_dt
                    tiempo_pausa_segundos += max(0, (fin - inicio).total_seconds())

                horas_transcurridas = ((now_dt - inicio_dt).total_seconds() - tiempo_pausa_segundos) / 3600.0
                if horas_transcurridas < 0:
                    horas_transcurridas = 0
                    
                # 3. Calcular Volumen Restante
                volumen_bombeado = horas_transcurridas * caudal_total
                volumen_restante = capacidad_total - volumen_bombeado
                if volumen_restante < 0:
                    volumen_restante = 0
                    
                # 4. Calcular Tiempo Restante y Hora de Fin
                tiempo_restante = volumen_restante / caudal_total
                tiempo_restante_horas = round(tiempo_restante, 2)
                
                if is_paused:
                    hora_fin_estimada = "-"
                    tiempo_restante_horas = None
                else:
                    fin_dt = now_dt + timedelta(hours=tiempo_restante)
                    hora_fin_estimada = fin_dt.strftime("%H:%M")
        except Exception as e:
            print(f"Error calculando ETA: {e}")
            tiempo_restante_horas = None
            hora_inicio_op = None
            hora_fin_estimada = None
    else:
        total_mediciones = 0
        temp_prom = corr_prom = p_suc_prom = p_desc_prom = 0.0

    return DashboardKPIs(
        operaciones_activas=operaciones_activas,
        bombas_trabajando=bombas_trabajando,
        inspecciones_pendientes=inspecciones_pendientes,
        inspecciones_atrasadas=inspecciones_atrasadas,
        temperatura_promedio=round(temp_prom, 1),
        corriente_promedio=round(corr_prom, 1),
        presion_succion_promedio=round(p_suc_prom, 1),
        presion_descarga_promedio=round(p_desc_prom, 1),
        total_mediciones_hoy=total_mediciones_hoy,
        tiempo_restante_horas=tiempo_restante_horas,
        hora_inicio_op=hora_inicio_op,
        hora_fin_estimada=hora_fin_estimada,
        is_paused=is_paused
    )

@router.get("/pid-diagram", response_model=PIDProcessData)
def get_pid_diagram_data(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    active_op = db.query(Operation).filter(Operation.estado == "Activa").first()
    
    if active_op:
        # Obtain the absolute latest measurement for the entire operation
        latest_op_m = db.query(Measurement).filter(
            Measurement.operation_id == active_op.id
        ).order_by(Measurement.datetime_registro.desc()).first()

        pausas_general = db.query(OperationPause).filter(OperationPause.operation_id == active_op.id).all()
        is_paused = any(p.fin_corte is None for p in pausas_general)

        if latest_op_m and not is_paused:
            from datetime import timedelta
            # Threshold: Show only pumps that have been registered in the last batch (within 5 minutes of the absolute latest measurement)
            cutoff_time = latest_op_m.datetime_registro - timedelta(minutes=5)
            
            pumps_list = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(
                Measurement.operation_id == active_op.id,
                Measurement.datetime_registro >= cutoff_time
            ).distinct().all()
        else:
            # No measurements yet, show no active pumps
            pumps_list = []
    else:
        pumps_list = []

    pumps_status = []
    active_tank_ids = set()

    for p in pumps_list:
        # Get latest measurement
        last_m = db.query(Measurement).filter(
            Measurement.bomba_id == p.id
        ).order_by(Measurement.datetime_registro.desc()).first()

        if last_m and last_m.tanque_id:
            active_tank_ids.add(last_m.tanque_id)

        # Determine status indicator (🟢 NORMAL, 🟡 WARNING, 🔴 ALARM)
        status_ind = "NORMAL"
        active_alarms = db.query(AlarmEvent).filter(
            AlarmEvent.bomba_id == p.id,
            AlarmEvent.estado == "Activa"
        ).all()

        active_alarms_count = len(active_alarms)
        if active_alarms_count > 0:
            if any(a.nivel == "ALARM" for a in active_alarms):
                status_ind = "ALARM"
            else:
                status_ind = "WARNING"

        pumps_status.append(PumpLatestStatus(
            pump=PumpResponse.model_validate(p),
            last_measurement=MeasurementResponse.model_validate(last_m) if last_m else None,
            status_indicator=status_ind,
            active_alarms_count=active_alarms_count
        ))

    if active_tank_ids:
        tanks_list = db.query(Tank).filter(Tank.id.in_(active_tank_ids)).all()
    else:
        tanks_list = []

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

    pumps_data = {}

    def round_time_to_nearest_hour(t):
        if t.minute >= 30:
            next_hour = (t.hour + 1) % 24
            return f"{next_hour:02d}:00"
        return f"{t.hour:02d}:00"

    for m in measurements:
        bomba_code = m.bomba.codigo if m.bomba else f"Bomba {m.bomba_id}"
        if bomba_code not in pumps_data:
            pumps_data[bomba_code] = {
                "labels": [],
                "temperatura": [],
                "corriente": [],
                "presion_succion": [],
                "presion_descarga": []
            }
        
        if not m.hora_registro:
            continue
            
        rounded_time = round_time_to_nearest_hour(m.hora_registro)
        # Avoid duplicate labels for the same hour by checking the last label
        if not pumps_data[bomba_code]["labels"] or pumps_data[bomba_code]["labels"][-1] != rounded_time:
            pumps_data[bomba_code]["labels"].append(rounded_time)
            pumps_data[bomba_code]["temperatura"].append(m.temperatura_c)
            pumps_data[bomba_code]["corriente"].append(m.corriente_a)
            pumps_data[bomba_code]["presion_succion"].append(m.presion_succion_inhg)
            pumps_data[bomba_code]["presion_descarga"].append(m.presion_descarga_psi)

    return {
        "pumps": pumps_data,
        "count": len(measurements)
    }
