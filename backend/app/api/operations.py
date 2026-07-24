from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Operation, Tank, Pump, Vessel, Product, User, ScheduledInspection
from app.schemas.schemas import OperationCreate, OperationResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip
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
    return query.order_by(Operation.created_at.desc()).all()

@router.get("/active", response_model=Optional[OperationResponse])
def get_active_operation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna la operación actualmente activa (si existe)."""
    return db.query(Operation).filter(Operation.estado == "Activa").order_by(Operation.created_at.desc()).first()

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

    # Rule 2: Maximum 3 pumps!
    if len(op_in.pump_ids) > 3 or len(op_in.pump_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="Debe seleccionar entre 1 y hasta máximo 3 bombas para la operación."
        )

    if len(op_in.tank_ids) == 0 or len(op_in.tank_ids) > 3:
        raise HTTPException(status_code=400, detail="Debe seleccionar entre 1 y máximo 3 tanques de origen.")


    # Validate entities exist
    buque = db.query(Vessel).filter(Vessel.id == op_in.buque_id).first()
    if not buque:
        raise HTTPException(status_code=404, detail="Buque no encontrado")
        
    producto = db.query(Product).filter(Product.id == op_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    tanks = db.query(Tank).filter(Tank.id.in_(op_in.tank_ids)).all()
    pumps = db.query(Pump).filter(Pump.id.in_(op_in.pump_ids)).all()

    now_dt = datetime.now()
    codigo_op = f"OP-{now_dt.strftime('%Y%m%d')}-{now_dt.strftime('%H%M%S')}"

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

    # Update pump states to "En Operacion"
    for p in pumps:
        p.estado = "En Operacion"
    db.commit()

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
