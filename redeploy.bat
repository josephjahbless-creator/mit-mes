@echo off
echo ========================================
echo  MIT M&E System - Redeploy
echo ========================================

echo [1/3] Building frontend...
cd /d D:\MIT\mit-mes\frontend
call npm run build
if %errorlevel% neq 0 ( echo Build failed! && pause && exit /b 1 )

echo [2/3] Restarting backend with updated env...
pm2 restart mit-mes --update-env

echo [3/3] Done!
echo.
echo System running at:
echo   HTTPS : https://192.168.0.126:5443
echo   HTTP  : http://192.168.0.126:5000  (redirects to HTTPS)
echo.
pm2 status
pause
