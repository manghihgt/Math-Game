@echo off
cd /d "C:\Users\mangz\Downloads\gg\server"
echo ========================================
echo   MATH MASTER SERVER - STARTING...
echo ========================================
echo.
echo [1/2] Installing dependencies...
cmd /c "npm install"
echo.
echo [2/2] Starting server...
echo.
echo >>> SERVER IS RUNNING! <<<
echo >>> OPEN YOUR BROWSER AND GO TO: http://localhost:5000 <<<
echo.
echo Tip: If you want to play with friends on the same WiFi,
echo find your IP (type ipconfig) and tell them to visit http://YOUR-IP:5000
echo.
echo ========================================
start http://localhost:5000
node index.js
pause
