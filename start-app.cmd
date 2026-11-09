@echo off
cd /d "%~dp0"
rem Clear ELECTRON_RUN_AS_NODE: the Electron host that starts this script injects it,
rem and electron.exe would then run as plain node (no window).
set ELECTRON_RUN_AS_NODE=
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
	echo Electron is missing. Run "npm install" in this folder first.
	pause
	exit /b 1
)
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
