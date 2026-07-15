@echo off
title Family Finance Doc Vault Launcher
echo ===================================================
echo   Family Finance Doc Vault - Auto Launcher
echo ===================================================
echo.

:: 1. Start database via Docker Compose
echo [1/3] Starting Database (PostgreSQL)...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo.
    echo [WARNING] Failed to start Docker containers. 
    echo Please make sure Docker Desktop is running and try again.
    echo.
    pause
    exit /b %ERRORLEVEL%
)
echo Database started successfully.
echo.

:: 2. Start Backend in a new window
echo [2/3] Starting Backend Server (Spring Boot)...
start "Vault Backend (Port 8080)" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"
echo Backend launch command triggered in a separate window.
echo.

:: 3. Start Frontend in a new window
echo [3/3] Starting Frontend Dev Server (Vite)...
start "Vault Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Frontend launch command triggered in a separate window.
echo.

:: 4. Launch browser after a short delay
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 6 > NUL
echo Opening browser...
start http://localhost:5173

echo.
echo ===================================================
echo   All services have been launched!
echo   You can close this window.
echo ===================================================
ping 127.0.0.1 -n 4 > NUL
exit
