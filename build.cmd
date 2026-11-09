@echo off
cd /d "%~dp0"

rem One-click build:
rem   build.cmd          package + copy index/config/book art + zip into dist\
rem   build.cmd /nodata  package only (fast, no 287MB index copy)
rem
rem The real work is in tools\build.ps1: running node directly from a .cmd in some
rem Electron-based shells kills the batch when node exits.

if /i "%~1"=="/nodata" (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build.ps1" -NoData
) else if /i "%~1"=="/noda" (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build.ps1" -NoData
) else (
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build.ps1"
)
