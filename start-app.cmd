@echo off
cd /d "%~dp0"
rem Clear ELECTRON_RUN_AS_NODE: the DSH/Electron host injects it, and electron.exe then runs as plain node.
set ELECTRON_RUN_AS_NODE=
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
	echo Electron 没装好：先在这个目录跑 npm install
	pause
	exit /b 1
)
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
