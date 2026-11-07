@echo off
title PCMS Backend (SQL Server Port 8080)
cd /d "%~dp0"
echo ========================================================
echo DANG KHOI DONG BACKEND PCMS TREN PORT 8080 (SQL Server)...
echo Neu bi loi ket noi DB, hay click phai vao start_sql.bat
echo chon "Run as administrator" de bat dich vu SQL Server!
echo ========================================================
java -jar target\PCMS-1.0-SNAPSHOT.jar
pause
