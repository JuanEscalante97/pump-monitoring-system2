import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine

# Import all routers
from app.api import (
    auth,
    pumps,
    tanks,
    products,
    vessels,
    operations,
    measurements,
    dashboard,
    reports,
    history,
    audit,
    alarms
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pump_monitoring")

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistema Web de Monitoreo de Condición de Bombas de Transferencia (Aceite Vegetal y Etanol)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text

# Create database tables automatically on startup
@app.on_event("startup")
def startup_db():
    logger.info("Inicializando tablas y verificando esquema en la base de datos...")
    Base.metadata.create_all(bind=engine)
    
    # Parche seguro columna por columna en transacciones aisladas (evita "transaction aborted" en PostgreSQL)
    columns_to_check = [
        ("measurements", "tanque_id", "INTEGER REFERENCES tanks(id)"),
        ("measurements", "tecnico_mecanico", "VARCHAR(100)"),
        ("measurements", "is_corrected", "BOOLEAN DEFAULT FALSE"),
        ("measurements", "corregido_motivo", "TEXT"),
        ("alarm_events", "measurement_id", "INTEGER REFERENCES measurements(id)"),
    ]
    
    for table, col, col_type in columns_to_check:
        try:
            with engine.connect() as conn:
                is_sqlite = "sqlite" in str(engine.url).lower()
                sql = f"ALTER TABLE {table} ADD COLUMN {col} {col_type}" if is_sqlite else f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"
                conn.execute(text(sql))
                conn.commit()
        except Exception as e:
            pass
            
    # Limpiar registros huérfanos de manera independiente
    try:
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM measurements WHERE operation_id NOT IN (SELECT id FROM operations)"))
            conn.execute(text("DELETE FROM alarm_events WHERE operacion_id NOT IN (SELECT id FROM operations)"))
            conn.commit()
            logger.info("Registros huérfanos limpiados exitosamente.")
    except Exception as e:
        logger.error(f"Error limpiando huérfanos: {e}")

    # Limpieza garantizada vía ORM de SQLAlchemy para evitar bloqueos de transacción en PostgreSQL (Render)
    try:
        from app.database.session import SessionLocal
        from app.models.models import Operation, Measurement, AlarmEvent, ScheduledInspection
        db = SessionLocal()
        try:
            # Eliminar cualquier operación abierta en estado "Activa" o que sea "OP-001" para liberar el sistema
            stuck_ops = db.query(Operation).filter((Operation.estado == "Activa") | (Operation.codigo_operacion == "OP-001")).all()
            for op in stuck_ops:
                logger.info(f"Eliminando operación pegada: {op.codigo_operacion} (ID: {op.id})")
                db.query(Measurement).filter(Measurement.operation_id == op.id).delete(synchronize_session=False)
                db.query(AlarmEvent).filter(AlarmEvent.operacion_id == op.id).delete(synchronize_session=False)
                db.query(ScheduledInspection).filter(ScheduledInspection.operation_id == op.id).delete(synchronize_session=False)
                db.delete(op)
            db.commit()
            logger.info(f"Limpieza ORM completada con éxito: {len(stuck_ops)} operaciones abiertas eliminadas.")
        except Exception as e_orm:
            db.rollback()
            logger.error(f"Error en limpieza ORM: {e_orm}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error en inicialización de sesión de limpieza: {e}")

    logger.info("Tablas creadas/verificadas exitosamente.")

# Register APIRouters
app.include_router(auth.router)
app.include_router(pumps.router)
app.include_router(tanks.router)
app.include_router(products.router)
app.include_router(vessels.router)
app.include_router(operations.router)
app.include_router(measurements.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(history.router)
app.include_router(audit.router)
app.include_router(alarms.router)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "system": settings.APP_NAME,
        "status": "ONLINE",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
