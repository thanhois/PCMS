@echo off
title Khoi dong toan bo he thong PCMS
cd /d "%~dp0"
echo ========================================================
echo DANG KHOI DONG TOAN BO HE THONG PCMS (BACKEND + FRONTEND)
echo ========================================================

echo 1. Dang mo cua so chay Backend...
start "PCMS Backend" cmd /c "%~dp0start_backend.bat"

echo 2. Dang mo cua so chay Frontend...
start "PCMS Frontend" cmd /c "%~dp0start_frontend.bat"

echo 3. Dang cho he thong khoi dong...
timeout /t 5 >nul
start http://localhost:5173

echo ========================================================
echo HOAN TAT! Cua so Backend va Frontend da duoc khoi dong.
echo Ban co the trai nghiem he thong tai: http://localhost:5173
echo ========================================================
