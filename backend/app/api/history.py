from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Measurement, Operation, Tank, Pump, Vessel, Product, User
from app.schemas.schemas import MeasurementResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/api/history", tags=["Historial de Monitoreo"])

@router.get("", response_model=List[MeasurementResponse])
def search_history(
    fecha: Optional[date] = None,
    buque_id: Optional[int] = None,
    producto_id: Optional[int] = None,
    tanque_id: Optional[int] = None,
    bomba_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
    operacion_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Busca registros en el historial filtrando por:
    Fecha, Buque, Producto, Tanque, Bomba, Usuario y Operación.
    """
    query = db.query(Measurement).join(Operation)

    if fecha:
        query = query.filter(Measurement.fecha_registro == fecha)
    if buque_id:
        query = query.filter(Operation.buque_id == buque_id)
    if producto_id:
        query = query.filter(Operation.producto_id == producto_id)
    if tanque_id:
        query = query.filter(Operation.tanks.any(Tank.id == tanque_id))
    if bomba_id:
        query = query.filter(Measurement.bomba_id == bomba_id)
    if usuario_id:
        query = query.filter(Measurement.registrado_por_id == usuario_id)
    if operacion_id:
        query = query.filter(Measurement.operation_id == operacion_id)

    return query.order_by(Measurement.datetime_registro.desc()).all()
