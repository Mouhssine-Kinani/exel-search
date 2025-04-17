@echo off
echo Starting CENTRELEC Spare Parts Finder...
echo.

:: Check if server is already running on port 3000
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo Backend server already running on port 3000
) else (
    echo Starting backend server on port 3000...
    start cmd /k "cd backend && node server.js"
)

echo.
echo Opening application...
timeout /t 2 > nul
start "" "frontend/index.html"
echo.
echo Done! The application is now running.
echo - Backend: http://localhost:3000
echo - Frontend: frontend/index.html
echo.
