from datetime import datetime, time, timedelta
from sqlalchemy.orm import Session
from app.models.models import Operation, ScheduledInspection

def generate_hourly_inspections(db: Session, operation: Operation):
    """
    Genera automáticamente las inspecciones programadas cada hora desde la hora de inicio
    de la operación hasta el final del turno (o hasta 12 horas si está activa).
    """
    start_time = operation.hora_inicio
    # Convert time to datetime for iteration
    today = operation.fecha
    start_dt = datetime.combine(today, start_time)
    
    # Generate 12 hourly slots by default or until 23:00
    current_slot = start_dt + timedelta(hours=1) # First inspection 1 hour after start
    
    slots = []
    for _ in range(12): # Up to 12 inspection slots per operation shift
        slot_time = current_slot.time()
        existing = db.query(ScheduledInspection).filter(
            ScheduledInspection.operation_id == operation.id,
            ScheduledInspection.hora_programada == slot_time
        ).first()
        
        if not existing:
            inspection = ScheduledInspection(
                operation_id=operation.id,
                hora_programada=slot_time,
                estado="Pendiente",
                retraso_minutos=0
            )
            db.add(inspection)
            slots.append(inspection)
        current_slot += timedelta(hours=1)
        
    db.commit()
    return slots

def update_inspection_on_measurement(db: Session, operation_id: int, current_dt: datetime):
    """
    Encuentra la inspección pendiente más cercana y la actualiza con la hora real y el retraso en minutos.
    """
    current_time = current_dt.time()
    
    # Find pending inspection for this operation
    inspections = db.query(ScheduledInspection).filter(
        ScheduledInspection.operation_id == operation_id,
        ScheduledInspection.estado == "Pendiente"
    ).order_by(ScheduledInspection.hora_programada.asc()).all()
    
    if not inspections:
        return None

    # Pick the first pending inspection
    target_inspection = inspections[0]
    
    # Calculate delay
    target_dt = datetime.combine(current_dt.date(), target_inspection.hora_programada)
    diff_minutes = int((current_dt - target_dt).total_seconds() / 60)
    
    target_inspection.hora_real = current_dt
    if diff_minutes <= 15:  # Tolerance window 15 mins
        target_inspection.estado = "A tiempo"
        target_inspection.retraso_minutos = max(0, diff_minutes)
    else:
        target_inspection.estado = "Retrasado"
        target_inspection.retraso_minutos = diff_minutes

    db.commit()
    db.refresh(target_inspection)
    return target_inspection
