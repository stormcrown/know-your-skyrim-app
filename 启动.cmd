@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
	echo 没找到 node，先装个 Node.js 22.5 以上。
	pause
	exit /b 1
)
if not exist "data\index.sqlite" (
	echo 第一次用，先把 load order 读一遍建索引，一千多个插件要几分钟。
	node src\cli.js index
	if errorlevel 1 (
		pause
		exit /b 1
	)
)
node src\cli.js serve
pause
