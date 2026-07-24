from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Measurement, Operation, Pump, User
from app.schemas.schemas import MeasurementCreate, MeasurementCorrection, MeasurementResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip
from app.services.inspection_service import update_inspection_on_measurement
from app.services.alarm_service import evaluate_measurement_alarms

router = APIRouter(prefix="/api/measurements", tags=["Registro de Monitoreo"])

@router.get("", response_model=List[MeasurementResponse])
def list_measurements(
    operation_id: Optional[int] = None,
    bomba_id: Optional[int] = None,
    fecha: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Measurement)
    if operation_id:
        query = query.filter(Measurement.operation_id == operation_id)
    if bomba_id:
        query = query.filter(Measurement.bomba_id == bomba_id)
    if fecha:
        query = query.filter(Measurement.fecha_registro == fecha)
        
    return query.order_by(Measurement.datetime_registro.desc()).all()

@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
def create_measurement(
    request: Request,
    m_in: MeasurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Rule 1: Must have an ACTIVE operation!
    operation = db.query(Operation).filter(Operation.id == m_in.operation_id).first()
    if not operation or operation.estado != "Activa":
        raise HTTPException(
            status_code=400,
            detail="No se pueden registrar mediciones si no existe una operación activa."
        )

    # Rule 2: Show/Allow ONLY pumps belonging to the active operation!
    op_pump_ids = [p.id for p in operation.pumps]
    if m_in.bomba_id not in op_pump_ids:
        raise HTTPException(
            status_code=400,
            detail="La bomba seleccionada no pertenece a la operación activa."
        )

    # Automatic Server Date and Time capture
    now_dt = datetime.now()

    # Update scheduled inspection status and calculate delay automatically
    inspection = update_inspection_on_measurement(db, operation.id, now_dt)

    measurement = Measurement(
        operation_id=operation.id,
        bomba_id=m_in.bomba_id,
        inspection_id=inspection.id if inspection else None,
        presion_succion_inhg=m_in.presion_succion_inhg,
        presion_descarga_psi=m_in.presion_descarga_psi,
        temperatura_c=m_in.temperatura_c,
        corriente_a=m_in.corriente_a,
        observaciones=m_in.observaciones,
        registrado_por_id=current_user.id,
        fecha_registro=now_dt.date(),
        hora_registro=now_dt.time(),
        datetime_registro=now_dt,
        is_corrected=False
    )

    db.add(measurement)
    db.commit()
    db.refresh(measurement)

    # Evaluate against thresholds & generate AlarmEvents if necessary
    alarms = evaluate_measurement_alarms(db, measurement)

    log_audit_action(
        db, current_user, "CREATE_MEASUREMENT", "Measurement", measurement.id,
        get_client_ip(request), 
        f"Medición registrada para bomba ID {measurement.bomba_id}: Temp={measurement.temperatura_c}°C, Corriente={measurement.corriente_a}A, Alertas={len(alarms)}"
    )

    return measurement

@router.put("/{measurement_id}/correct", response_model=MeasurementResponse)
def correct_measurement(
    request: Request,
    measurement_id: int,
    corr_in: MeasurementCorrection,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permite corregir una medición conservando el historial y registrando la auditoría.
    NO elimina el registro original.
    """
    measurement = db.query(Measurement).filter(Measurement.id == measurement_id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Medición no encontrada")

    prev_info = (
        f"Anterior: Succión={measurement.presion_succion_inhg}, Descarga={measurement.presion_descarga_psi}, "
        f"Temp={measurement.temperatura_c}, Corriente={measurement.corriente_a}"
    )

    # Update values
    measurement.presion_succion_inhg = corr_in.presion_succion_inhg
    measurement.presion_descarga_psi = corr_in.presion_descarga_psi
    measurement.temperatura_c = corr_in.temperatura_c
    measurement.corriente_a = corr_in.corriente_a
    measurement.is_corrected = True
    measurement.corregido_motivo = corr_in.corregido_motivo

    db.commit()
    db.refresh(measurement)

    # Re-evaluate alarms
    evaluate_measurement_alarms(db, measurement)

    log_audit_action(
        db, current_user, "CORRECT_MEASUREMENT", "Measurement", measurement.id,
        get_client_ip(request), 
        f"Medición corregida por {current_user.username}. Motivo: {corr_in.corregido_motivo}. {prev_info}"
    )

    return measurement
