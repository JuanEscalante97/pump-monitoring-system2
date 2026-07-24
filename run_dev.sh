#!/usr/bin/env bash

echo "===================================================================="
echo " SISTEMA WEB DE MONITOREO DE CONDICION DE BOMBAS DE TRANSFERENCIA"
echo "===================================================================="
echo ""

echo "1. Instalando dependencias de Backend..."
cd backend
pip install -r requirements.txt

echo "2. Sembrando datos de prueba..."
python scripts/seed_data.py

echo "3. Iniciando FastAPI Backend (http://localhost:8000)..."
uvicorn main:app --reload --port 8000 &

cd ../frontend
echo "4. Instalando dependencias de Frontend..."
npm install

echo "5. Iniciando Vite Frontend (http://localhost:5173)..."
npm run dev
