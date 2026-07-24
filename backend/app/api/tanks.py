from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Tank, User
from app.schemas.schemas import TankCreate, TankResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/tanks", tags=["Catálogo - Tanques"])

@router.get("", response_model=List[TankResponse])
def get_tanks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Tank).order_by(Tank.codigo.asc()).all()

@router.post("", response_model=TankResponse, status_code=status.HTTP_201_CREATED)
def create_tank(request: Request, tank_in: TankCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Tank).filter(Tank.codigo == tank_in.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un tanque con el código {tank_in.codigo}")
    
    tank = Tank(**tank_in.model_dump())
    db.add(tank)
    db.commit()
    db.refresh(tank)

    log_audit_action(db, current_user, "CREATE_TANK", "Tank", tank.id, get_client_ip(request), f"Tanque creado: {tank.codigo}")
    return tank

@router.put("/{tank_id}", response_model=TankResponse)
def update_tank(request: Request, tank_id: int, tank_in: TankCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tank = db.query(Tank).filter(Tank.id == tank_id).first()
    if not tank:
        raise HTTPException(status_code=404, detail="Tanque no encontrado")
    
    for key, val in tank_in.model_dump().items():
        setattr(tank, key, val)
        
    db.commit()
    db.refresh(tank)
    log_audit_action(db, current_user, "UPDATE_TANK", "Tank", tank.id, get_client_ip(request), f"Tanque actualizado: {tank.codigo}")
    return tank

@router.delete("/{tank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tank(request: Request, tank_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tank = db.query(Tank).filter(Tank.id == tank_id).first()
    if not tank:
        raise HTTPException(status_code=404, detail="Tanque no encontrado")
    
    try:
        db.delete(tank)
        db.commit()
        log_audit_action(db, current_user, "DELETE_TANK", "Tank", tank_id, get_client_ip(request), f"Tanque eliminado: {tank.codigo}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el tanque porque tiene operaciones asociadas.")
