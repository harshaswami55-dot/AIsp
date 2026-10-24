@echo off
title AI Learning Partner 360 - 24/7 Server
echo =====================================================================
echo  AI LEARNING PARTNER 360 - MBA BUSINESS FORECASTING (SB6202)
echo  "From AI that gives answers to AI that builds forecasters"
echo =====================================================================
echo.
echo Starting FastAPI statistical forecasting engine...
start /b python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
timeout /t 3 >nul

echo Starting Cloudflare Public Tunnel for instant Mobile Access...
start cloudflared.exe tunnel --url http://localhost:8000

echo.
echo =====================================================================
echo  MOBILE ACCESS LINKS (OPEN ON ANY PHONE 24/7):
echo  1. On Local Wi-Fi:      http://192.168.0.108:8000/
echo  2. On Mobile 4G/5G/Any: Check the Cloudflare window for https:// URL
echo =====================================================================
echo Server is running 24/7. Keep this window open.
pause
