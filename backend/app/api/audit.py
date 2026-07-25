from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Auditoría"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    usuario_id: Optional[int] = None,
    entidad: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if usuario_id:
        query = query.filter(AuditLog.usuario_id == usuario_id)
    if entidad:
        query = query.filter(AuditLog.entidad == entidad)

    return query.order_by(AuditLog.fecha_hora.desc()).limit(200).all()

@router.delete("/{log_id}", status_code=204)
def delete_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException
    if current_user.role != "Administrador":
        raise HTTPException(status_code=403, detail="Permisos insuficientes para eliminar logs")
        
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
        
    db.delete(log)
    db.commit()
    return None

from pydantic import BaseModel

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.post("/bulk-delete", status_code=204)
def bulk_delete_audit_logs(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException
    if current_user.role != "Administrador":
        raise HTTPException(status_code=403, detail="Permisos insuficientes para eliminar logs")
        
    db.query(AuditLog).filter(AuditLog.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    return None
