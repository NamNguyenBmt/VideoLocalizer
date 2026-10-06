@echo off
setlocal
cd /d "%~dp0"

rem --- Chon Python: uu tien venv .\.venv, roi Python 3.11 cua CFlow neu co, roi python he thong ---
set "PY=python"
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
if not exist ".venv\Scripts\python.exe" if exist "E:\AutoSub\CFLOW 1.2.5\CFLOW\resources\vendor\python_base\python.exe" set "PY=E:\AutoSub\CFLOW 1.2.5\CFLOW\resources\vendor\python_base\python.exe"

echo Dung Python: %PY%
"%PY%" server.py
pause
