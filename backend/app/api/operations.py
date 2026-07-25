from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Operation, Tank, Pump, Vessel, Product, User, ScheduledInspection, Measurement
from app.schemas.schemas import OperationCreate, OperationResponse, TankResponse, PumpResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip
from datetime import timedelta, timezone
from app.services.inspection_service import generate_hourly_inspections

router = APIRouter(prefix="/api/operations", tags=["Operaciones de Bombeo"])

@router.get("", response_model=List[OperationResponse])
def list_operations(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Operation)
    if estado:
        query = query.filter(Operation.estado == estado)
    operations = query.order_by(Operation.created_at.desc()).all()

    # Dynamically inject tanks and pumps based on measurements (since we decoupled them from operation creation)
    results = []
    for op in operations:
        op_dict = OperationResponse.model_validate(op).model_dump()
        dynamic_tanks = db.query(Tank).join(Measurement, Tank.id == Measurement.tanque_id).filter(Measurement.operation_id == op.id).distinct().all()
        dynamic_pumps = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(Measurement.operation_id == op.id).distinct().all()
        all_tanks = {t.id: t for t in (list(op.tanks) + dynamic_tanks)}.values()
        all_pumps = {p.id: p for p in (list(op.pumps) + dynamic_pumps)}.values()
        op_dict["tanks"] = [TankResponse.model_validate(t).model_dump() for t in all_tanks]
        op_dict["pumps"] = [PumpResponse.model_validate(p).model_dump() for p in all_pumps]
        results.append(op_dict)
        
    return results

@router.get("/migrate-codes")
def migrate_op_codes(db: Session = Depends(get_db)):
    operations = db.query(Operation).order_by(Operation.created_at.asc()).all()
    for idx, op in enumerate(operations):
        op.codigo_operacion = f"OP-{(idx + 1):03d}"
    db.commit()
    return {"message": f"Migrated {len(operations)} operations"}

@router.get("/active", response_model=Optional[OperationResponse])
def get_active_operation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna la operación actualmente activa (si existe)."""
    op = db.query(Operation).filter(Operation.estado == "Activa").order_by(Operation.created_at.desc()).first()
    if not op:
        return None
    
    op_dict = OperationResponse.model_validate(op).model_dump()
    dynamic_tanks = db.query(Tank).join(Measurement, Tank.id == Measurement.tanque_id).filter(Measurement.operation_id == op.id).distinct().all()
    dynamic_pumps = db.query(Pump).join(Measurement, Pump.id == Measurement.bomba_id).filter(Measurement.operation_id == op.id).distinct().all()
    all_tanks = {t.id: t for t in (list(op.tanks) + dynamic_tanks)}.values()
    all_pumps = {p.id: p for p in (list(op.pumps) + dynamic_pumps)}.values()
    op_dict["tanks"] = [TankResponse.model_validate(t).model_dump() for t in all_tanks]
    op_dict["pumps"] = [PumpResponse.model_validate(p).model_dump() for p in all_pumps]
    return op_dict

@router.post("", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def create_operation(
    request: Request,
    op_in: OperationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Rule 1: Only ONE active operation at a time!
    active_op = db.query(Operation).filter(Operation.estado == "Activa").first()
    if active_op:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una operación activa ({active_op.codigo_operacion}). Debe finalizarla antes de iniciar una nueva."
        )

    # Validations for tanks/pumps removed to allow flexible operations
    # Validate entities exist
    buque = db.query(Vessel).filter(Vessel.id == op_in.buque_id).first()
    if not buque:
        raise HTTPException(status_code=404, detail="Buque no encontrado")
        
    producto = db.query(Product).filter(Product.id == op_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    tanks = db.query(Tank).filter(Tank.id.in_(op_in.tank_ids)).all()
    pumps = db.query(Pump).filter(Pump.id.in_(op_in.pump_ids)).all()

    tz_peru = timezone(timedelta(hours=-5))
    now_dt = datetime.now(tz_peru).replace(tzinfo=None)
    
    # Generate global short OP Code without collisions after deletions
    next_num = db.query(Operation).count() + 1
    while True:
        codigo_op = f"OP-{next_num:03d}"
        if not db.query(Operation).filter(Operation.codigo_operacion == codigo_op).first():
            break
        next_num += 1

    operation = Operation(
        codigo_operacion=codigo_op,
        fecha=now_dt.date(),
        buque_id=op_in.buque_id,
        producto_id=op_in.producto_id,
        responsable_id=current_user.id,
        hora_inicio=now_dt.time(),
        estado="Activa",
        observaciones=op_in.observaciones,
        tanks=tanks,
        pumps=pumps
    )

    db.add(operation)
    db.commit()
    db.refresh(operation)

    # Automatic hourly scheduled inspection slots are no longer bound to specific pumps at start
    # but the slots are bound to the operation itself.

    # Generate automatic hourly scheduled inspection slots
    generate_hourly_inspections(db, operation)

    log_audit_action(
        db, current_user, "CREATE_OPERATION", "Operation", operation.id,
        get_client_ip(request), f"Operación iniciada: {codigo_op} con {len(pumps)} bombas y {len(tanks)} tanques"
    )

    return operation

@router.put("/{operation_id}/finish", response_model=OperationResponse)
def finish_operation(
    request: Request,
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación no encontrada")
    if operation.estado == "Finalizada":
        raise HTTPException(status_code=400, detail="La operación ya se encuentra finalizada")

    now_time = datetime.now().time()
    operation.hora_fin = now_time
    operation.estado = "Finalizada"

    # Reset pump states back to "Operativa"
    for p in operation.pumps:
        p.estado = "Operativa"

    db.commit()
    db.refresh(operation)

    log_audit_action(
        db, current_user, "FINISH_OPERATION", "Operation", operation.id,
        get_client_ip(request), f"Operación finalizada: {operation.codigo_operacion} a las {now_time}"
    )

    return operation

@router.delete("/{operation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operation(
    operation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Administrador":
        raise HTTPException(status_code=403, detail="Permisos insuficientes para eliminar operaciones")
        
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación no encontrada")
        
    codigo = operation.codigo_operacion
    
    # Reset pump states if it was active
    if operation.estado != "Finalizada":
        for p in operation.pumps:
            p.estado = "Operativa"
            
    # Explicitly delete related records to prevent SQLite orphaned records reusing IDs
    from app.models.models import Measurement, AlarmEvent, ScheduledInspection
    db.query(Measurement).filter(Measurement.operation_id == operation_id).delete(synchronize_session=False)
    db.query(AlarmEvent).filter(AlarmEvent.operacion_id == operation_id).delete(synchronize_session=False)
    db.query(ScheduledInspection).filter(ScheduledInspection.operation_id == operation_id).delete(synchronize_session=False)
    
    db.delete(operation)
    db.commit()

    log_audit_action(
        db, current_user, "DELETE_OPERATION", "Operation", operation_id,
        get_client_ip(request), f"Operación eliminada: {codigo}"
    )
    return None
