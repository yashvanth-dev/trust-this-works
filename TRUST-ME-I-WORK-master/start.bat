@echo off
echo Starting SIH25022 Train Scheduler...
echo.

cd /d "%~dp0"

echo Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo Starting FastAPI Backend...
start cmd /k "cd backend && python -m uvicorn api.main:app --reload"

echo Starting Vite Frontend...
start cmd /k "cd frontend && npm run dev"

echo Waiting for servers to start...
timeout /t 5 /nobreak > nul

echo Opening browser...
start http://localhost:5173

echo Both servers are running in separate windows.
echo You can close this window now.
exit
