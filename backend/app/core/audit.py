from fastapi import Request
from sqlalchemy.orm import Session
from app.models.models import AuditLog, User
from typing import Optional

def log_audit_action(
    db: Session,
    user: Optional[User],
    accion: str,
    entidad: str,
    entidad_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    detalles: Optional[str] = None
):
    """
    Registra automáticamente una acción de usuario o sistema en la tabla audit_logs.
    """
    user_id = user.id if user else None
    username = user.username if user else "SISTEMA"

    audit_entry = AuditLog(
        usuario_id=user_id,
        username=username,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        ip_address=ip_address,
        detalles=detalles
    )
    db.add(audit_entry)
    db.commit()

def get_client_ip(request: Request) -> str:
    if request.headers.get("x-forwarded-for"):
        return request.headers.get("x-forwarded-for").split(",")[0]
    return request.client.host if request.client else "127.0.0.1"
