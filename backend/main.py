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

    # Limpieza única programada: Eliminar operación activa (OP-001 o abiertas en pruebas) una única vez
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS system_patches (patch_id VARCHAR(50) PRIMARY KEY, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
            res = conn.execute(text("SELECT patch_id FROM system_patches WHERE patch_id = 'cleanup_op_001_v1'")).fetchone()
            if not res:
                logger.info("Ejecutando limpieza única de operación abierta OP-001 y operaciones activas pegadas...")
                conn.execute(text("DELETE FROM scheduled_inspections WHERE operation_id IN (SELECT id FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001')"))
                conn.execute(text("DELETE FROM alarm_events WHERE operacion_id IN (SELECT id FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001')"))
                conn.execute(text("DELETE FROM measurements WHERE operation_id IN (SELECT id FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001')"))
                try:
                    conn.execute(text("DELETE FROM operation_tanks WHERE operation_id IN (SELECT id FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001')"))
                    conn.execute(text("DELETE FROM operation_pumps WHERE operation_id IN (SELECT id FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001')"))
                except Exception:
                    pass
                conn.execute(text("DELETE FROM operations WHERE estado = 'Activa' OR codigo_operacion = 'OP-001'"))
                conn.execute(text("INSERT INTO system_patches (patch_id) VALUES ('cleanup_op_001_v1')"))
                conn.commit()
                logger.info("Limpieza única completada con éxito. Operación abierta eliminada.")
    except Exception as e:
        logger.error(f"Error en limpieza de operación abierta: {e}")

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
