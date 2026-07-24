from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Vessel, User
from app.schemas.schemas import VesselCreate, VesselResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/vessels", tags=["Catálogo - Buques"])

@router.get("", response_model=List[VesselResponse])
def get_vessels(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Vessel).order_by(Vessel.nombre.asc()).all()

@router.post("", response_model=VesselResponse, status_code=status.HTTP_201_CREATED)
def create_vessel(request: Request, vessel_in: VesselCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Vessel).filter(Vessel.nombre == vessel_in.nombre).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un buque con el nombre {vessel_in.nombre}")
    
    vessel_data = vessel_in.model_dump()
    if not vessel_data.get("empresa"):
        vessel_data["empresa"] = "Genérica"

    vessel = Vessel(**vessel_data)
    db.add(vessel)
    db.commit()
    db.refresh(vessel)


    log_audit_action(db, current_user, "CREATE_VESSEL", "Vessel", vessel.id, get_client_ip(request), f"Buque creado: {vessel.nombre}")
    return vessel

@router.put("/{vessel_id}", response_model=VesselResponse)
def update_vessel(request: Request, vessel_id: int, vessel_in: VesselCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Buque no encontrado")
    
    for key, val in vessel_in.model_dump().items():
        setattr(vessel, key, val)
        
    db.commit()
    db.refresh(vessel)
    log_audit_action(db, current_user, "UPDATE_VESSEL", "Vessel", vessel.id, get_client_ip(request), f"Buque actualizado: {vessel.nombre}")
    return vessel

@router.delete("/{vessel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vessel(request: Request, vessel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Buque no encontrado")
    
    try:
        db.delete(vessel)
        db.commit()
        log_audit_action(db, current_user, "DELETE_VESSEL", "Vessel", vessel_id, get_client_ip(request), f"Buque eliminado: {vessel.nombre}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el buque porque tiene operaciones asociadas.")
