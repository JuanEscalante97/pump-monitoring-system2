from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Pump, User
from app.schemas.schemas import PumpCreate, PumpResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/pumps", tags=["Catálogo - Bombas"])

@router.get("", response_model=List[PumpResponse])
def get_pumps(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Pump).order_by(Pump.codigo.asc()).all()

@router.post("", response_model=PumpResponse, status_code=status.HTTP_201_CREATED)
def create_pump(request: Request, pump_in: PumpCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Pump).filter(Pump.codigo == pump_in.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una bomba con el código {pump_in.codigo}")
    
    pump_data = pump_in.model_dump()
    if not pump_data.get("nombre"):
        pump_data["nombre"] = f"Bomba {pump_in.codigo}"

    pump = Pump(**pump_data)
    db.add(pump)
    db.commit()
    db.refresh(pump)


    log_audit_action(db, current_user, "CREATE_PUMP", "Pump", pump.id, get_client_ip(request), f"Bomba creada: {pump.codigo}")
    return pump

@router.put("/{pump_id}", response_model=PumpResponse)
def update_pump(request: Request, pump_id: int, pump_in: PumpCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Bomba no encontrada")
    
    for key, val in pump_in.model_dump().items():
        setattr(pump, key, val)
        
    db.commit()
    db.refresh(pump)
    log_audit_action(db, current_user, "UPDATE_PUMP", "Pump", pump.id, get_client_ip(request), f"Bomba actualizada: {pump.codigo}")
    return pump

@router.delete("/{pump_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pump(request: Request, pump_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Bomba no encontrada")
    
    try:
        db.delete(pump)
        db.commit()
        log_audit_action(db, current_user, "DELETE_PUMP", "Pump", pump_id, get_client_ip(request), f"Bomba eliminada: {pump.codigo}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar la bomba porque tiene operaciones, mediciones o alarmas asociadas.")

