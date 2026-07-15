@echo off
title Family Finance Doc Vault - Stop Services
echo ===================================================
echo   Family Finance Doc Vault - Stopping Services
echo ===================================================
echo.

echo Stopping Database (PostgreSQL)...
docker compose down
if %ERRORLEVEL% neq 0 (
    echo.
    echo [WARNING] Failed to stop Docker containers.
    echo Please make sure Docker Desktop is running.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo Database stopped successfully.
echo.
echo ===================================================
echo   Services stopped.
echo ===================================================
ping 127.0.0.1 -n 4 > NUL
exit
