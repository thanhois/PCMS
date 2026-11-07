@echo off
title PCMS Backend (Che do Test Nhanh - In-Memory DB)
echo ========================================================
echo KHOI DONG PCMS BACKEND (CHE DO TEST NHANH IN-MEMORY H2)
echo Khong can bat SQL Server, du lieu mau duoc seed tu dong!
echo ========================================================
cd /d "%~dp0"
java -jar target\PCMS-1.0-SNAPSHOT.jar --spring.datasource.url="jdbc:h2:mem:pcms;DB_CLOSE_DELAY=-1;MODE=MSSQLServer" --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password="" --spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect
pause
