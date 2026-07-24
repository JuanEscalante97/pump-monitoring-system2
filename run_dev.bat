@echo off
echo ====================================================================
echo  SISTEMA WEB DE MONITOREO DE CONDICION DE BOMBAS DE TRANSFERENCIA
echo ====================================================================
echo.

echo 1. Instalando dependencias de Backend...
cd backend
pip install -r requirements.txt

echo 2. Sembrando datos de prueba en la Base de Datos...
python scripts/seed_data.py

echo 3. Iniciando servidor FastAPI Backend (http://localhost:8000)...
start "FastAPI Backend" cmd /k "python -m uvicorn main:app --reload --port 8000"


cd ..\frontend
echo 4. Instalando dependencias de Frontend...
npm install

echo 5. Iniciando servidor Vite Frontend (http://localhost:5173)...
start "Vite Frontend" cmd /k "npm run dev"

cd ..
echo.
echo ====================================================================
echo ¡SISTEMA INICIADO EXITOSAMENTE!
echo Frontend UI: http://localhost:5173
echo Swagger Docs: http://localhost:8000/docs
echo ====================================================================
