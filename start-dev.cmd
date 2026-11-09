@echo off
cd /d "%~dp0"
rem Clear ELECTRON_RUN_AS_NODE or Electron will run as plain node (no window, no breakpoints).
set ELECTRON_RUN_AS_NODE=
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
	echo Electron is missing. Run "npm install" in this folder first.
	exit /b 1
)
rem Dev mode gets its own browser profile so it can run beside the packaged app.
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0" --dev --user-data-dir="%~dp0data\electron-dev-profile"
