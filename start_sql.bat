@echo off
echo ========================================================
echo DANG KHOI DONG DICH VU SQL SERVER CHO DU AN PCMS...
echo ========================================================
net start "MSSQL$DONGNVHE"
net start "MSSQL$SQLEXPRESSSSSS"
net start SQLBrowser
echo ========================================================
echo HOAN TAT! BAN CO THE DONG CUA SO NAY.
echo ========================================================
timeout /t 3
