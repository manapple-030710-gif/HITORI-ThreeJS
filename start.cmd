@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 goto run
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
:run
if not exist "node_modules\vite\bin\vite.js" goto missing
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort --open
pause
exit /b
:missing
echo Please install Node.js, then run npm install in this folder.
pause
