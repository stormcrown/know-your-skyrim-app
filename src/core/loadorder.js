// Where the game, the mods and the load order live. Handles a Mod Organizer 2 instance (the usual setup) and a
// plain "Data folder + plugins.txt" install.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PLUGIN_EXT = new Set(['.esm', '.esp', '.esl']);
const ESL_FLAG = 0x00000200;

function readIni(file) {
	const text = fs.readFileSync(file, 'utf8');
	const sections = new Map();
	let current = '';
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith(';') || line.startsWith('#')) continue;
		if (line.startsWith('[') && line.endsWith(']')) {
			current = line.slice(1, -1);
			if (!sections.has(current)) sections.set(current, new Map());
			continue;
		}
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		const value = line.slice(eq + 1).trim();
		if (!sections.has(current)) sections.set(current, new Map());
		sections.get(current).set(key, value);
	}
	return sections;
}

function iniValue(sections, section, key) {
	const map = sections.get(section);
	return map ? map.get(key) : undefined;
}

// MO2 writes paths as @ByteArray(F:\\Games\\...) in the ini; the game path is the interesting one.
function cleanPath(value) {
	if (!value) return undefined;
	let text = value;
	const wrap = /^@ByteArray\((.*)\)$/s.exec(text);
	if (wrap) text = wrap[1];
	text = text.replace(/\\\\/g, '\\').replace(/\\:/g, ':');
	return text;
}

export function detectInstances() {
	const root = path.join(os.homedir(), 'AppData', 'Local', 'ModOrganizer');
	const found = [];
	let names = [];
	try {
		names = fs.readdirSync(root);
	} catch {
		return found;
	}
	for (const name of names) {
		const ini = path.join(root, name, 'ModOrganizer.ini');
		if (!fs.existsSync(ini)) continue;
		let sections;
		try {
			sections = readIni(ini);
		} catch {
			continue;
		}
		const gameName = iniValue(sections, 'General', 'gameName') || '';
		const gamePath = cleanPath(iniValue(sections, 'General', 'gamePath'));
		const baseDir = cleanPath(iniValue(sections, 'Settings', 'base_directory')) || path.join(root, name);
		const profile = cleanPath(iniValue(sections, 'General', 'selected_profile')) || 'Default';
		const stat = fs.statSync(ini);
		found.push({
			kind: 'mo2',
			id: name,
			instanceDir: path.join(root, name),
			ini,
			gameName,
			gamePath,
			baseDir,
			profile,
			mtime: stat.mtimeMs
		});
	}
	return found.sort((a, b) => b.mtime - a.mtime);
}

export function instancesForSkyrim(instances = detectInstances()) {
	return instances.filter((i) => /skyrim/i.test(i.gameName || '') && i.gamePath && fs.existsSync(i.gamePath));
}

function readLines(file) {
	const text = fs.readFileSync(file, 'utf8');
	return text.split(/\r?\n/);
}

// plugins.txt: active plugins marked with *, in load order. Inactive ones stay in the file without the star.
export function readPluginsTxt(file) {
	const out = [];
	if (!fs.existsSync(file)) return out;
	if (fs.statSync(file).isDirectory()) return pluginsFromData(file);
	for (const raw of readLines(file)) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const active = line.startsWith('*');
		const name = active ? line.slice(1).trim() : line;
		if (!name) continue;
		out.push({ name, active });
	}
	return out;
}

// loadorder.txt: every plugin, ticked or not, in load order.
export function readLoadorderTxt(file) {
	const out = [];
	if (!fs.existsSync(file)) return out;
	for (const raw of readLines(file)) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		if (isPluginName(line)) out.push(line);
	}
	return out;
}

// modlist.txt: top of the file is the top of the list; the bottom of the list wins file conflicts, so priority
// grows with the line number.
export function readModlist(file) {
	const out = [];
	if (!fs.existsSync(file)) return out;
	let priority = 0;
	for (const raw of readLines(file)) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const marker = line[0];
		const name = line.slice(1).trim();
		if (marker !== '+' && marker !== '-' && marker !== '*') continue;
		if (!name) continue;
		out.push({ name, enabled: marker !== '-', priority: priority++ });
	}
	return out;
}

function isPluginName(name) {
	return PLUGIN_EXT.has(path.extname(name).toLowerCase());
}

// A plain install keeps plugins.txt under %LOCALAPPDATA%\Skyrim Special Edition; some setups have none at all and
// the masters of Data are the load order.
function resolvePluginsFile(pluginsFile, dataDir) {
	if (fs.existsSync(pluginsFile)) return pluginsFile;
	const local = path.join(os.homedir(), 'AppData', 'Local', 'Skyrim Special Edition', 'plugins.txt');
	if (fs.existsSync(local)) return local;
	const documents = path.join(os.homedir(), 'Documents', 'My Games', 'Skyrim Special Edition', 'plugins.txt');
	if (fs.existsSync(documents)) return documents;
	return dataDir; // the fallback below reads the folder
}

function pluginsFromData(dataDir) {
	const order = ['skyrim.esm', 'update.esm', 'dawnguard.esm', 'hearthfires.esm', 'dragonborn.esm'];
	const names = [];
	let files = [];
	try {
		files = fs.readdirSync(dataDir).filter(isPluginName);
	} catch {
		return [];
	}
	const lower = new Map(files.map((name) => [name.toLowerCase(), name]));
	for (const name of order) if (lower.has(name)) names.push({ name: lower.get(name), active: true });
	const rest = files
		.filter((name) => !order.includes(name.toLowerCase()))
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
	for (const name of rest) names.push({ name, active: true });
	return names;
}

// For every enabled mod with a plugin file, which file it holds. Built once per index run.
function scanModsForPlugins(modsDir, mods) {
	const map = new Map(); // lower case file name -> [{dir, priority}]
	let scanned = 0;
	for (const mod of mods) {
		if (!mod.enabled) continue;
		const dir = path.join(modsDir, mod.name);
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		scanned++;
		for (const entry of entries) {
			if (!entry.isFile() || !isPluginName(entry.name)) continue;
			const key = entry.name.toLowerCase();
			const list = map.get(key) || [];
			list.push({ dir, file: path.join(dir, entry.name), priority: mod.priority });
			map.set(key, list);
		}
	}
	return { map, scanned };
}

function pickBestModFile(list) {
	if (!list || !list.length) return null;
	return list.reduce((best, item) => (item.priority > best.priority ? item : best), list[0]);
}

function readHeaderInfo(file) {
	const fd = fs.openSync(file, 'r');
	try {
		const head = Buffer.alloc(64);
		const read = fs.readSync(fd, head, 0, 64, 0);
		if (read < 24) return null;
		const flags = head.readUInt32LE(8);
		const dataSize = head.readUInt32LE(4);
		const buf = Buffer.alloc(24 + dataSize);
		fs.readSync(fd, buf, 0, buf.length, 0);
		const localized = (flags & 0x00000080) !== 0;
		const light = (flags & ESL_FLAG) !== 0 || path.extname(file).toLowerCase() === '.esl';
		// walk the header fields for MAST entries
		const masters = [];
		let pos = 24;
		const end = Math.min(24 + dataSize, buf.length);
		while (pos + 6 <= end) {
			const sig = buf.toString('latin1', pos, pos + 4);
			let size = buf.readUInt16LE(pos + 4);
			pos += 6;
			if (sig === 'XXXX') {
				size = buf.readUInt32LE(pos);
				pos += 4;
				continue;
			}
			if (pos + size > end) break;
			if (sig === 'MAST') {
				const zero = buf.indexOf(0, pos);
				masters.push(buf.toString('latin1', pos, zero === -1 || zero > pos + size ? pos + size : zero));
			}
			pos += size;
		}
		return { masters, localized, light, flags };
	} finally {
		fs.closeSync(fd);
	}
}

// The whole picture: every active plugin with the file it comes from, numbered the way the game numbers it.
// The enabled mods of a profile, in priority order (the last one wins a conflict).
export function profileMods(instanceId, profile) {
	const instance = detectInstances().find((item) => item.id === instanceId);
	if (!instance) return { modsDir: '', mods: [] };
	const base = instance.baseDir || instance.instanceDir;
	const modsDir = path.join(base, 'mods');
	const chosen = profile || instance.profile || 'Default';
	const mods = readModlist(path.join(base, 'profiles', chosen, 'modlist.txt'));
	return { modsDir, mods };
}

export function resolveLoadOrder({ instance, gamePath, profile, language } = {}) {
	let dataDir;
	let pluginsFile;
	let mods = [];
	let modsDir;
	let profilesDir;
	let actualProfile = profile;

	if (instance) {
		const base = instance.baseDir || instance.instanceDir;
		dataDir = path.join(instance.gamePath, 'Data');
		profilesDir = path.join(base, 'profiles');
		modsDir = path.join(base, 'mods');
		actualProfile = profile || instance.profile || 'Default';
		pluginsFile = path.join(profilesDir, actualProfile, 'plugins.txt');
		const modlistFile = path.join(profilesDir, actualProfile, 'modlist.txt');
		mods = readModlist(modlistFile);
	} else {
		if (!gamePath) throw new Error('没有游戏目录，也没有 Mod Organizer 实例');
		dataDir = path.join(gamePath, 'Data');
		pluginsFile = path.join(gamePath, 'plugins.txt');
	}

	const candidates = [
		pluginsFile,
		path.join(os.homedir(), 'AppData', 'Local', 'Skyrim Special Edition', 'plugins.txt'),
		path.join(os.homedir(), 'Documents', 'My Games', 'Skyrim Special Edition', 'plugins.txt')
	];
	let listed = [];
	let usedPluginsFile = pluginsFile;
	for (const candidate of candidates) {
		const found = readPluginsTxt(candidate);
		if (found.length) {
			listed = found;
			usedPluginsFile = candidate;
			break;
		}
	}
	if (!listed.length) {
		listed = pluginsFromData(dataDir);
		usedPluginsFile = dataDir;
	}
	if (!listed.length) throw new Error(`读不到插件列表：${pluginsFile}`);

	// The order lives in loadorder.txt; plugins.txt only says which ones are ticked, and it leaves the game's own
	// masters out (Skyrim.esm, the DLC) and sorts however the last tool felt like sorting.
	const loadorderFile = path.join(path.dirname(usedPluginsFile), 'loadorder.txt');
	let order = [];
	if (usedPluginsFile !== dataDir) order = readLoadorderTxt(loadorderFile);

	const active = new Set(listed.filter((item) => item.active).map((item) => item.name.toLowerCase()));
	for (const baseMaster of ['skyrim.esm', 'update.esm', 'dawnguard.esm', 'hearthfires.esm', 'dragonborn.esm']) active.add(baseMaster);

	const ordered = [];
	const seen = new Set();
	for (const name of order) {
		const key = name.toLowerCase();
		if (!active.has(key) || seen.has(key)) continue;
		seen.add(key);
		ordered.push({ name, active: true });
	}
	for (const item of listed) {
		const key = item.name.toLowerCase();
		if (!item.active || seen.has(key)) continue;
		seen.add(key);
		ordered.push(item);
	}
	const finalList = ordered.length ? ordered : listed;

	const scan = modsDir ? scanModsForPlugins(modsDir, mods) : { map: new Map(), scanned: 0 };
	const resolved = [];
	const missing = [];

	let fullIndex = 0;
	let lightIndex = 0;
	for (const item of finalList) {
		if (!item.active) continue;
		const key = item.name.toLowerCase();
		let file = null;
		let source = '';
		const fromMod = pickBestModFile(scan.map.get(key));
		if (fromMod) {
			file = fromMod.file;
			source = path.basename(fromMod.dir);
		} else {
			const direct = path.join(dataDir, item.name);
			if (fs.existsSync(direct)) {
				file = direct;
				source = 'Data';
			}
		}
		if (!file) {
			missing.push(item.name);
			continue;
		}
		const header = readHeaderInfo(file);
		if (!header) {
			missing.push(item.name);
			continue;
		}
		const plugin = {
			name: item.name,
			file,
			source,
			position: resolved.length, // its row in the load order, unique even for light plugins
			masters: header.masters,
			localized: header.localized,
			light: header.light,
			index: 0,
			lightIndex: 0
		};
		if (header.light) {
			plugin.lightIndex = lightIndex++;
			plugin.index = -1;
		} else {
			plugin.index = fullIndex++;
		}
		resolved.push(plugin);
	}

	// A plugin's masters are named; the id mapping needs their load order numbers.
	const byName = new Map(resolved.map((p) => [p.name.toLowerCase(), p]));
	for (const plugin of resolved) {
		plugin.masterIndices = plugin.masters.map((master) => {
			const found = byName.get(master.toLowerCase());
			return found ? found.index : -1;
		});
		plugin.masterLoads = plugin.masters.map((master) => {
			const found = byName.get(master.toLowerCase());
			if (!found) return -1;
			// A light master has no slot of its own: all light plugins share 0xfe.
			return found.light ? (0xfe000000 | (found.lightIndex << 12)) >>> 0 : ((found.index << 24) >>> 0);
		});
	}

	// A plugin file that sits in more than one enabled mod: the last one wins, but the others are worth naming.
	const duplicates = [];
	for (const [name, list] of scan.map) {
		if (list.length > 1) duplicates.push(list[0].file.split(/[\\/]/g).slice(-2).join('/') + '（' + list.length + ' 份）');
	}

	return {
		dataDir,
		gamePath: gamePath || (instance && instance.gamePath),
		stringsDir: path.join(dataDir, 'Strings'),
		profile: actualProfile,
		language: language || 'chinese',
		plugins: resolved,
		missing,
		modCount: mods.filter((m) => m.enabled).length,
		allPlugins: order.length ? order : listed.map((item) => item.name),
		duplicates,
		pluginsFile: usedPluginsFile
	};
}
