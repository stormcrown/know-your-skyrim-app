param([switch]$NoZip)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

$version = (Get-Content (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version
$dist = Join-Path $project 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null

if ($NoZip) {
	'skip zip'
	exit 0
}

$zip = Join-Path $dist ("KnowYourSkyrim-{0}-win-x64.zip" -f $version)
if (Test-Path $zip) { Remove-Item $zip -Force }

$sevenZip = 'E:\Program Files\7-Zip\7z.exe'
if (-not (Test-Path $sevenZip)) { $sevenZip = 'C:\Program Files\7-Zip\7z.exe' }

if (Test-Path $sevenZip) {
	& $sevenZip a -tzip $zip 'D:\Develop\KnowYourSkyrim\*' -bso0 -bsp0 | Out-Null
} else {
	Compress-Archive -Path 'D:\Develop\KnowYourSkyrim\*' -DestinationPath $zip -Force
}

"Zip: $zip"
"Size: {0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
