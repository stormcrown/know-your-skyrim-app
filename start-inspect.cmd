@echo off
cd /d "%~dp0"
rem Main-process debugging: waits for a debugger on 9229 before running.
set ELECTRON_RUN_AS_NODE=
"%~dp0node_modules\electron\dist\electron.exe" --inspect-brk=9229 "%~dp0"
