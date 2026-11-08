@echo off
title PCMS Backend (Port 8080)
cd /d "%~dp0"
echo ========================================================
echo DANG KHOI DONG BACKEND PCMS TREN PORT 8080...
echo ========================================================

:: Kiem tra neu port 8080 dang bi chiem boi tien trinh cu thi giai phong
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo [PCMS] Port 8080 dang bi chiem boi PID %%a. Dang giai phong...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 >nul
)

:: Kiem tra dich vu SQL Server tren port 1433
netstat -aon | findstr :1433 >nul 2>&1
if %errorlevel% equ 0 (
    echo [PCMS] Phat hien SQL Server dang hoat dong (Port 1433). Chay voi SQL Server...
    java -jar target\PCMS-1.0-SNAPSHOT.jar
) else (
    echo [PCMS] SQL Server chua khoi dong tren port 1433.
    echo [PCMS] Tu dong chay voi In-Memory DB (co san tai khoan admin, bs, le tan va data mau)!
    echo ========================================================
    java -jar target\PCMS-1.0-SNAPSHOT.jar --spring.datasource.url="jdbc:h2:mem:pcms;DB_CLOSE_DELAY=-1;MODE=MSSQLServer" --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password="" --spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect
)

pause