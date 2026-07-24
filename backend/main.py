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

# Create database tables automatically on startup
@app.on_event("startup")
def startup_db():
    logger.info("Inicializando tablas en la base de datos PostgreSQL...")
    Base.metadata.create_all(bind=engine)
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
