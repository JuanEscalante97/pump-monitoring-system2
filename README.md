# Sistema Web de Monitoreo de Condición de Bombas de Transferencia

![Pump Monitoring System](https://img.shields.io/badge/FastAPI-0.104.0-009688.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)

Aplicación web profesional de grado corporativo desarrollada para registrar el monitoreo de condición en tiempo real de bombas centrífugas utilizadas durante la transferencia de **aceite vegetal** y **etanol** desde tanques de almacenamiento hacia buques tanqueros.

El sistema reemplaza por completo los registros manuales en papel, centraliza la información en una base de datos PostgreSQL normalizada y ofrece diagramas sinópticos P&ID interactivos, gráficos históricos, reportes ejecutivos en PDF/Excel y bitácora de auditoría inalterable.

---

## 🚀 Características Principales

1. **Diagrama Sinóptico P&ID Interactivo de la Planta**:
   - Visualización dinámica del flujo: **Tanques de Origen** -> **Bombas Centrífugas** -> **Buque Tanquero**.
   - Indicadores de estado LED en tiempo real: 🟢 **NORMAL**, 🟡 **ADVERTENCIA**, 🔴 **ALARMA CRÍTICA**.
   - Registro de lectura rápido haciendo clic directamente sobre la bomba asignada.

2. **Estampa de Tiempo Automática (Reloj del Servidor)**:
   - **Regla estricta**: El usuario **NO** ingresa fecha ni hora manualmente.
   - El backend FastAPI registra automáticamente la fecha, hora exacta y usuario inspector mediante el reloj del servidor.

3. **Operaciones de Bombeo e Inspecciones Programadas**:
   - Bloqueo estricto: **No se pueden registrar mediciones si no existe una Operación Activa**.
   - Permite seleccionar hasta un **máximo de 3 bombas** por operación.
   - Generación automática de slots de inspección horaria desde la hora de inicio de la operación.
   - Cálculo automático del retraso en minutos y estado (`A tiempo` / `Retrasado`).

4. **Límites Editables de Alarma y Alertas Visuales**:
   - Umbrales configurables (Ejemplo: Temperatura Motor > 80°C, Corriente Motor > 45 A).
   - Generación automática de `AlarmEvent` con banner rojo de advertencia y registro en historial.

5. **Reportes Profesionales (PDF & Excel)**:
   - Exportación de la operación completa a **PDF** corporativo mediante `ReportLab` (con membrete y espacio para firma del responsable).
   - Exportación a **Excel** (`.xlsx`) estructurado mediante `openpyxl`.

6. **Auditoría e Historial Inalterable**:
   - Búsqueda avanzada por Fecha, Buque, Producto, Tanque, Bomba, Usuario y Operación.
   - **No se permite borrado de registros**. Solo corrección de mediciones conservando la trazabilidad previa en la bitácora `audit_logs`.

---

## 🛠️ Tecnología y Arquitectura

```
PumpMonitoringSystem/
├── backend/                  # API REST FastAPI + Python 3.11
│   ├── app/
│   │   ├── api/              # Endpoints (auth, pumps, tanks, operations, measurements, etc.)
│   │   ├── core/             # Configuración, JWT, Hashing, Middleware de Auditoría
│   │   ├── database/         # Conexión SQLAlchemy PostgreSQL
│   │   ├── models/           # Modelos ORM Normalizados
│   │   ├── schemas/          # DTOs y Validación Pydantic
│   │   ├── services/         # Inspecciones, Alarmas, Reportes PDF (ReportLab) y Excel (OpenPyXL)
│   │   └── future_modules/   # Conectores preparados para Modbus TCP/PLC, MTBF/MTTR y Predicción IA
│   ├── main.py               # Punto de entrada FastAPI
│   └── scripts/seed_data.py  # Script de datos de prueba
├── frontend/                 # React 18 + TypeScript + Vite + Material UI
│   ├── src/
│   │   ├── components/       # Diagrama P&ID, Modal de Medición, Gráficos Chart.js
│   │   ├── pages/            # Dashboard, Operaciones, Monitoreo, Historial, Catálogos, Alarmas, Reportes
│   │   ├── context/          # AuthContext (JWT)
│   │   └── theme/            # Tema Industrial Oscuro (MUI v5)
├── database/                 # SQL Script de inicialización
├── .vscode/                  # Launch y Tasks de depuración para VS Code
├── docker-compose.yml        # Orquestación Docker (PostgreSQL, Backend, Frontend)
└── README.md
```

---

## 💻 Desarrollar y Ejecutar desde Visual Studio Code

Todo el proyecto está listo para ser abierto, editado y ejecutado directamente desde **Visual Studio Code**.

### Opción A: Ejecución Local Directa

#### 1. Backend (FastAPI + Python)

```bash
cd backend
pip install -r requirements.txt
python scripts/seed_data.py
uvicorn main:app --reload --port 8000
```

- Documentación OpenAPI Swagger: `http://localhost:8000/docs`

#### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

- Interfaz Web de la Aplicación: `http://localhost:5173`

---

### Opción B: Ejecución Unificada con Docker Compose

Para desplegar todo el sistema (PostgreSQL + FastAPI + React Nginx) con un solo comando:

```bash
docker compose up --build
```

El script de inicialización cargará automáticamente los datos de prueba iniciales.

- **Frontend App**: `http://localhost:5173` o `http://localhost:80`
- **Backend API Docs**: `http://localhost:8000/docs`

---

---

## 🔮 Funciones Futuras (Preparadas en Código)

El backend incluye el módulo `app/future_modules/` con contratos e interfaces listas para integrar:

1. **Lectura Automática de PLC (Modbus TCP / OPC UA)** (`plc_modbus.py`): Adquisición en línea de telemetría sin intervención humana.
2. **Indicadores de Confiabilidad MTBF y MTTR** (`reliability_mtbf.py`): Cálculo de horas acumuladas de operación, tiempo medio entre fallas y disponibilidad.
3. **Mantenimiento Predictivo con IA** (`predictive_ai.py`): Estimación de RUL (Remaining Useful Life) basado en análisis de degradación de temperatura y corriente.
4. **Alertas Multicanal (Email & WhatsApp)** (`alert_dispatcher.py`): Despachador de notificaciones ante desviaciones críticas.

---

## 📄 Licencia

Desarrollado para la gestión y monitoreo de condición de bombas de transferencia de terminales de aceite vegetal y etanol.
