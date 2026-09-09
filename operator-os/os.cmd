@echo off
setlocal
set "HERE=%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  python "%HERE%scripts\os.py" %*
  exit /b %errorlevel%
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%HERE%scripts\os.py" %*
  exit /b %errorlevel%
)
echo Python is not installed, or not on your PATH.
echo Install it from python.org and tick "Add python.exe to PATH", then reopen this window.
exit /b 1
