@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem Lam video tu kich ban: tao giong (Edge-TTS, can mang) -> render Remotion -> out\video.mp4
rem   lam-video.bat                         dung kichban\hoi-thi-sach-2026.json
rem   lam-video.bat kichban\khac.json       dung kich ban khac
set "KB=%~1"
if "%KB%"=="" set "KB=kichban\hoi-thi-sach-2026.json"

rem --- Chon Python giong run.bat ---
set "PY=python"
if exist "..\.venv\Scripts\python.exe" set "PY=..\.venv\Scripts\python.exe"
if not exist "..\.venv\Scripts\python.exe" if exist "E:\AutoSub\CFLOW 1.2.5\CFLOW\resources\vendor\python_base\python.exe" set "PY=E:\AutoSub\CFLOW 1.2.5\CFLOW\resources\vendor\python_base\python.exe"

where node >nul 2>nul || (echo [LOI] Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai. & pause & exit /b 1)

if not exist "node_modules" (
  echo === [1/3] Cai thu vien Remotion (chi lan dau, vai phut^) ===
  call npm install || (echo [LOI] npm install that bai & pause & exit /b 1)
)

echo === [2/3] Tao giong doc + timeline tu %KB% ===
"%PY%" ..\scripts\script_to_voice.py "%KB%" --copy-to public || (echo [LOI] Tao giong that bai - kiem tra mang roi chay lai, cau da tao duoc se duoc giu & pause & exit /b 1)

echo === [3/3] Render video (FHD, mat khoang 30-90 phut tuy may^) ===
call npx remotion render Main out\video.mp4 || (echo [LOI] Render that bai & pause & exit /b 1)

echo.
echo XONG: %cd%\out\video.mp4
start "" "out"
pause
