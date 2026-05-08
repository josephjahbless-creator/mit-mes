@echo off
:: MIT M&E System — PM2 Auto-Start Script
:: This script is called by Windows Task Scheduler on every boot

cd /d "D:\MIT\mit-mes\backend"

:: Wait 15 seconds for the network/postgres to be ready
timeout /t 15 /nobreak >nul

:: Resurrect PM2 saved processes
"C:\Users\josep\AppData\Roaming\npm\pm2.cmd" resurrect

:: If resurrect failed (first run), start fresh
"C:\Users\josep\AppData\Roaming\npm\pm2.cmd" start src/app.js --name mit-mes --interpreter node 2>nul

exit /b 0
