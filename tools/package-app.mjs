// 把 Electron 应用打包到 D:\Develop\KnowYourSkyrim：直接用 node_modules 里的 electron 发行版，
// 把 src / electron / package.json 放进 resources\app，再配一个清掉 ELECTRON_RUN_AS_NODE 的启动脚本。
//
// 用法：node tools/package-app.mjs [--with-data]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// 这个脚本有时会被 Electron 的 node 跑（ELECTRON_RUN_AS_NODE），asar 钩子会把 .asar 当归档处理，
// 复制发行版里的 default_app.asar 就会报 not found。关掉即可。
process.noAsar = true;

const PROJECT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DIST = path.join(PROJECT, 'node_modules', 'electron', 'dist');
const TARGET = 'D:\\Develop\\KnowYourSkyrim';
const withData = process.argv.includes('--with-data');

const LAUNCHER = `@echo off
cd /d "%~dp0"
rem Clear ELECTRON_RUN_AS_NODE: some Electron hosts inject it and the exe would run as plain node.
set ELECTRON_RUN_AS_NODE=
start "" "%~dp0KnowYourSkyrim.exe"
`;

function copyDir(from, to) {
	fs.mkdirSync(to, { recursive: true });
	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const source = path.join(from, entry.name);
		const target = path.join(to, entry.name);
		if (entry.isDirectory()) copyDir(source, target);
		else fs.copyFileSync(source, target);
	}
}

if (!fs.existsSync(path.join(DIST, 'electron.exe'))) {
	console.error('node_modules 里没有 electron 发行版，先跑 npm install');
	process.exit(1);
}

console.log('清理旧目录', TARGET);
fs.rmSync(TARGET, { recursive: true, force: true });
copyDir(DIST, TARGET);

const exe = path.join(TARGET, 'electron.exe');
const renamed = path.join(TARGET, 'KnowYourSkyrim.exe');
fs.renameSync(exe, renamed);
fs.rmSync(path.join(TARGET, 'resources', 'default_app.asar'), { force: true });

const appDir = path.join(TARGET, 'resources', 'app');
copyDir(path.join(PROJECT, 'src'), path.join(appDir, 'src'));
copyDir(path.join(PROJECT, 'electron'), path.join(appDir, 'electron'));
fs.copyFileSync(path.join(PROJECT, 'package.json'), path.join(appDir, 'package.json'));

fs.mkdirSync(path.join(appDir, 'data'), { recursive: true });
if (withData) {
	const index = path.join(PROJECT, 'data', 'index.sqlite');
	if (fs.existsSync(index)) {
		console.log('复制索引（这个要等一会儿）');
		fs.copyFileSync(index, path.join(appDir, 'data', 'index.sqlite'));
	}
	const config = path.join(PROJECT, 'config.json');
	if (fs.existsSync(config)) fs.copyFileSync(config, path.join(appDir, 'config.json'));
	const art = path.join(PROJECT, 'data', 'bookart');
	if (fs.existsSync(art)) copyDir(art, path.join(appDir, 'data', 'bookart'));
}

fs.writeFileSync(path.join(TARGET, 'start.cmd'), LAUNCHER.replace(/\n/g, '\r\n'), 'ascii');

console.log('打包完成：', TARGET);
console.log('启动：双击', path.join(TARGET, 'start.cmd'));
