// 把书里 <img src='img://...'> 引用的图片从官方贴图包里解出来，放到 data/bookart/。
// 路径统一小写、反斜杠，方便网页按 img:// 路径直接查。

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readBsa } from './bsa.js';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
const GAME_DATA = 'F:\\Games\\Skyrim Special Edition\\Data';
const OUT = path.join(ROOT, 'data', 'bookart');

const db = new DatabaseSync(path.join(ROOT, 'data', 'index.sqlite'), { readOnly: true });
const wanted = new Set();
for (const row of db.prepare("SELECT text FROM entries WHERE sig='BOOK' AND text LIKE '%img://%'").all()) {
	for (const match of row.text.matchAll(/img:\/\/([^'")\s>]+)/gi)) {
		const normalized = match[1].replace(/\//g, '\\').toLowerCase();
		wanted.add(normalized);
	}
}
console.log('引用的图片：', wanted.size);

// 官方包里找一遍，再找 MO2 的 mod 包（书的插图很多是 mod 带的）
const archives = [];
for (const name of fs.readdirSync(GAME_DATA)) {
	if (/\.bsa$/i.test(name)) archives.push(path.join(GAME_DATA, name));
}
const MODS = 'H:\\MOFiles\\AllSkyrimSEMod\\mods';
if (fs.existsSync(MODS)) {
	for (const mod of fs.readdirSync(MODS)) {
		const modDir = path.join(MODS, mod);
		let names = [];
		try {
			names = fs.readdirSync(modDir);
		} catch {
			continue;
		}
		for (const name of names) if (/\.bsa$/i.test(name)) archives.push(path.join(modDir, name));
	}
}
console.log('要扫的包：', archives.length);

const index = new Map(); // 小写路径 -> { bsa, entry }
for (const archive of archives) {
	try {
		const bsa = readBsa(archive, { lazy: true });
		for (const entry of bsa.entries) {
			const key = entry.path.replace(/\//g, '\\').toLowerCase();
			if (!index.has(key)) index.set(key, { bsa, entry });
		}
	} catch (err) {
		console.log('跳过', path.basename(archive), err.message);
	}
}

let written = 0;
const missing = [];
const failed = [];
fs.mkdirSync(OUT, { recursive: true });
for (const wantedPath of wanted) {
	const hit = index.get(wantedPath);
	if (!hit) {
		missing.push(wantedPath);
		continue;
	}
	const target = path.join(OUT, wantedPath.replace(/\\/g, path.sep));
	try {
		const data = hit.bsa.read(hit.entry);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, data);
		written += 1;
	} catch (err) {
		failed.push(`${wantedPath}（${path.basename(hit.bsa.file)}）：${err.message}`);
	}
}
console.log(`解出 ${written} 张，缺 ${missing.length} 张`);
if (missing.length) console.log('缺的例子：', missing.slice(0, 8).join('\n'));
if (failed.length) console.log('解压失败的：', failed.slice(0, 6).join('\n'));
