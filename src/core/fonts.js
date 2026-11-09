// 列出系统里所有字体族。
//
// 注意编码：Windows PowerShell 5.1 默认按控制台代码页（中文机器是 GBK）往管道写，
// 直接当 UTF-8 读，中文/日文字体名就成乱码了。所以命令里先强制 OutputEncoding 为 UTF-8。
// 注册表那条退路也一样：不用 reg.exe（它按 ANSI 输出），改用 PowerShell 读注册表，统一编码。

import { execFileSync } from 'node:child_process';

let cache = null;

function powershell(script) {
	const full = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' + script;
	const exe = process.env.KYS_POWERSHELL || 'powershell.exe';
	return execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command', full], {
		encoding: 'utf8',
		windowsHide: true,
		timeout: 25000,
		maxBuffer: 8 * 1024 * 1024
	});
}

function fromDotNet() {
	const out = powershell(
		'Add-Type -AssemblyName System.Drawing; (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }'
	);
	return out
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

function fromRegistry() {
	const out = powershell(
		[
			"$paths = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts', 'HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';",
			'$names = @();',
			'foreach ($p in $paths) {',
			'  if (Test-Path $p) {',
			'    $names += (Get-Item $p).Property | ForEach-Object { $_ }',
			'  }',
			'}',
			'$names'
		].join(' ')
	);
	const names = new Set();
	for (const raw of out.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		const name = line
			.replace(/\s*\((TrueType|OpenType|Type 1|All res|Variable)\)\s*$/i, '')
			.replace(/\s*&\s*.*$/, '')
			.replace(/\.(ttf|otf|ttc|fon|fnt)$/i, '')
			.trim();
		if (!name) continue;
		names.add(name);
	}
	return [...names];
}

export function systemFonts() {
	if (cache) return cache;
	let fonts = [];
	try {
		fonts = fromDotNet();
	} catch {
		fonts = [];
	}
	if (!fonts.length) {
		try {
			fonts = fromRegistry();
		} catch {
			fonts = [];
		}
	}
	fonts = [...new Set(fonts)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
	cache = fonts;
	return fonts;
}
