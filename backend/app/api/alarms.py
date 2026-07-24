from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import AlarmThreshold, AlarmEvent, User
from app.schemas.schemas import AlarmThresholdCreate, AlarmThresholdResponse, AlarmEventResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/alarms", tags=["Alarmas y Umbrales"])

@router.get("/thresholds", response_model=List[AlarmThresholdResponse])
def get_alarm_thresholds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AlarmThreshold).all()

@router.post("/thresholds", response_model=AlarmThresholdResponse)
def create_or_update_threshold(
    request: Request,
    thresh_in: AlarmThresholdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(AlarmThreshold).filter(
        AlarmThreshold.bomba_id == thresh_in.bomba_id
    ).first()

    if existing:
        for key, val in thresh_in.model_dump().items():
            setattr(existing, key, val)
        thresh = existing
    else:
        thresh = AlarmThreshold(**thresh_in.model_dump())
        db.add(thresh)

    db.commit()
    db.refresh(thresh)

    log_audit_action(
        db, current_user, "UPDATE_ALARM_THRESHOLD", "AlarmThreshold", thresh.id,
        get_client_ip(request), f"Umbral configurado: TempMax={thresh.temp_max_c}°C, CorrienteMax={thresh.corriente_max_a}A"
    )

    return thresh

@router.get("/events", response_model=List[AlarmEventResponse])
def get_alarm_events(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AlarmEvent)
    if estado:
        query = query.filter(AlarmEvent.estado == estado)
    return query.order_by(AlarmEvent.fecha_hora.desc()).all()

@router.put("/events/{event_id}/acknowledge", response_model=AlarmEventResponse)
def acknowledge_alarm_event(
    request: Request,
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(AlarmEvent).filter(AlarmEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento de alarma no encontrado")

    event.estado = "Reconocida"
    db.commit()
    db.refresh(event)

    log_audit_action(
        db, current_user, "ACKNOWLEDGE_ALARM", "AlarmEvent", event.id,
        get_client_ip(request), f"Alarma reconocida: {event.tipo_alarma} en bomba ID {event.bomba_id}"
    )

    return event
