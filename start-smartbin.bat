@echo off
rem ============================================================
rem  SmartBin local stack launcher
rem  Starts (if not already running):
rem    1. XAMPP MariaDB   - port 3307  (app database lives here)
rem    2. Node API server - port 3000
rem    3. Vite dev server - port 5173
rem
rem  NOTE: XAMPP MariaDB must stay on port 3307 because the
rem  standalone MySQL80 Windows service owns 3306. The app's
rem  server/.env points at DB_PORT=3307. If XAMPP's setup_xampp.bat
rem  is ever re-run, check that bin/my.ini still says port=3307.
rem ============================================================

set PROJECT=C:\xampp\htdocs\smartbin

rem ---- 1. MariaDB (database on port 3307) ----
netstat -ano | findstr /R /C:":3307 .*LISTENING" >nul 2>&1
if errorlevel 1 echo [smartbin] starting MariaDB on 3307... & start "smartbin-mariadb" /MIN "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone

rem ---- 2. API server (port 3000) ----
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if errorlevel 1 echo [smartbin] starting API on 3000... & start "smartbin-api" /MIN cmd /c "cd /d %PROJECT%\server && node src\index.js >> storage\logs\api-server.log 2>&1"

rem ---- 3. Frontend dev server (port 5173) ----
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if errorlevel 1 echo [smartbin] starting Vite on 5173... & start "smartbin-client" /MIN cmd /c "cd /d %PROJECT%\client && npx vite --port 5173 --strictPort >> %PROJECT%\server\storage\logs\vite.log 2>&1"

exit /b 0
