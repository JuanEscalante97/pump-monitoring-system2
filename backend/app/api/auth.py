from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import LoginRequest, Token, UserResponse, UserCreate
from app.models.models import User
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

@router.post("/login", response_model=Token)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit_action(
            db, None, "LOGIN_FAILED", "User", None, 
            ip_address=get_client_ip(request), detalles=f"Intento fallido para usuario: {login_data.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    # Record last access timestamp
    user.fecha_ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Log successful audit
    log_audit_action(
        db, user, "LOGIN_SUCCESS", "User", user.id,
        ip_address=get_client_ip(request), detalles=f"Inicio de sesión exitoso"
    )

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
