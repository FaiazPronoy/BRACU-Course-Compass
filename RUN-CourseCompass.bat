@echo off
title Course Compass - launcher
cd /d "%~dp0"

echo ==========================================
echo   BRACU COURSE COMPASS
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node not found. Install Node 20+ from nodejs.org, then run this again.
  pause
  exit /b 1
)

echo [1/5] Checking MongoDB on 127.0.0.1:27017 ...
powershell -NoProfile -Command "if ((Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }"
if errorlevel 1 goto :nomongo
echo       MongoDB is up.

cd /d "%~dp0server"

if exist "node_modules\" goto :srvdeps
echo [2/5] Installing server packages. First time takes a few minutes ...
call npm install
:srvdeps

if exist ".env" goto :envready
echo [3/5] Writing server\.env ...
set "SECRET="
for /f %%i in ('node -p "require('crypto').randomBytes(32).toString('hex')"') do set "SECRET=%%i"
if not defined SECRET set "SECRET=change_me_a_long_random_value_please"
> ".env" echo NODE_ENV=development
>> ".env" echo PORT=3000
>> ".env" echo DATABASE_URL=mongodb://127.0.0.1:27017/coursecompass
>> ".env" echo JWT_ACCESS_SECRET=%SECRET%
>> ".env" echo JWT_ACCESS_EXPIRES_IN=7d
>> ".env" echo SUPER_ADMIN_EMAIL=admin@bracu.ac.bd
>> ".env" echo SUPER_ADMIN_PASSWORD=Admin@1234
goto :envdone
:envready
echo [3/5] server\.env already there.
:envdone
echo [4/5] Loading demo data if the database is empty ...
call npm run seed -- --if-empty

cd /d "%~dp0client"
if exist "node_modules\" goto :clidone
echo       Installing client packages ...
call npm install
:clidone

echo [5/5] Starting server and client in their own windows ...
cd /d "%~dp0server"
start "Course Compass - SERVER (3000)" cmd /k "npm run start:dev"
cd /d "%~dp0client"
start "Course Compass - CLIENT (5173)" cmd /k "npm run dev"

echo.
echo   Open  http://localhost:5173
echo.
echo   Admin     admin@bracu.ac.bd     /  Admin@1234
echo   Student   ayesha@g.bracu.ac.bd  /  Student@123
echo.
echo   Two windows opened. Close them to stop the app.
echo.
timeout /t 15 /nobreak >nul
start "" http://localhost:5173
pause
exit /b 0

:nomongo
echo.
echo [X] Nothing is listening on port 27017, so MongoDB is not running.
echo.
echo     Install MongoDB Community Server for Windows once:
echo       https://www.mongodb.com/try/download/community
echo     Tick "Install MongoDB as a Service" during setup, then it
echo     starts by itself every time you boot.
echo.
echo     Already installed? Open cmd as Administrator and run:  net start MongoDB
echo.
pause
exit /b 1
