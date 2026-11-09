// What the app remembers between runs: which Mod Organizer instance, which profile, which save to read.
// Lives in config.json next to package.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const CONFIG_FILE = path.join(ROOT, 'config.json');
export const DATA_DIR = path.join(ROOT, 'data');
export const DB_FILE = path.join(DATA_DIR, 'index.sqlite');

const DEFAULTS = {
	instanceId: '',
	profile: '',
	language: 'chinese',
	// 界面语言：zh / en，默认中文
	uiLang: 'zh',
	saveFile: '',
	port: 4820,
	// 书籍阅读页的排版：留空就用系统默认，手写体和花体可以单独指定
	bookBodyFont: '',
	bookHandFont: '',
	bookTitleFont: '',
	bookFontSize: 18
};

export function loadConfig() {
	try {
		const text = fs.readFileSync(CONFIG_FILE, 'utf8');
		return { ...DEFAULTS, ...JSON.parse(text) };
	} catch {
		return { ...DEFAULTS };
	}
}

export function saveConfig(patch) {
	const clean = {};
	for (const [key, value] of Object.entries(patch || {})) {
		if (value !== undefined) clean[key] = value;
	}
	const next = { ...loadConfig(), ...clean };
	fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
	return next;
}
