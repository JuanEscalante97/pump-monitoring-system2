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
