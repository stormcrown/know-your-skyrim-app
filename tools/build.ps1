param([switch]$NoData)

# 打包 + 压缩。cmd 里直接串 node 会被这个环境的 node 退出连带掐掉，所以统一从这里跑。

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

Write-Host '停止正在运行的应用…'
Get-Process KnowYourSkyrim -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$nodeArgs = @('tools/package-app.mjs')
if (-not $NoData) { $nodeArgs += '--with-data' }

Write-Host ('打包：node ' + ($nodeArgs -join ' '))
& node @nodeArgs
if ($LASTEXITCODE -ne 0) {
	throw "打包失败，退出码 $LASTEXITCODE"
}

Write-Host '压缩…'
& (Join-Path $PSScriptRoot 'zip-app.ps1')

Write-Host ''
Write-Host '完成。程序：D:\Develop\KnowYourSkyrim'
