@echo off
:: Tu dong xin quyen Administrator neu chua co
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [PCMS] Dang yeu cau quyen Administrator de bat SQL Server...
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /B
)

echo ========================================================
echo DANG KHOI DONG DICH VU SQL SERVER CHO DU AN PCMS...
echo ========================================================
net start "MSSQL$DONGNVHE"
net start "MSSQL$SQLEXPRESSSSSS"
net start SQLBrowser
echo ========================================================
echo HOAN TAT! DICH VU SQL SERVER DA HOAT DONG!
echo ========================================================
timeout /t 3
