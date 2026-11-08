@echo off
title PCMS Frontend (Vite Port 5173)
cd /d "%~dp0\frontend"
echo ========================================================
echo DANG KHOI DONG PCMS FRONTEND (Vite React)...
echo ========================================================

:: Giai phong port 5173 neu bi chiem boi tien trinh cu
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [PCMS] Port 5173 dang bi chiem boi PID %%a. Dang giai phong...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 >nul
)

call npm run dev -- --host 127.0.0.1 --port 5173
pause
