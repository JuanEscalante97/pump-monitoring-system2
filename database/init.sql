-- Script SQL de inicialización inicial para PostgreSQL
-- Sistema Web de Monitoreo de Condición de Bombas de Transferencia

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- La creación automática de tablas se gestiona mediante SQLAlchemy y Alembic
-- Este archivo permite asegurar la existencia de esquema y extensiones requeridas.

SELECT 'Database initialized successfully' AS status;
