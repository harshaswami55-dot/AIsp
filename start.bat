@echo off
echo ========================================================
echo Starting AI Learning Partner 360 - MBA Business Forecasting
echo Official Syllabus: RV University SOB SB6202 (Dr Veena A)
echo ========================================================
cd /d "%~dp0"
echo Checking for Ollama local AI server...
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    echo Starting Ollama background service...
    start "" /b "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    timeout /t 2 /nobreak >nul
)
echo Starting FastAPI & ARIA Agent Backend on port 8000...
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
