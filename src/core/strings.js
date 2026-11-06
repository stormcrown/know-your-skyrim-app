// The .STRINGS / .DLSTRINGS / .ILSTRINGS tables. A localized plugin keeps its names, book texts and dialogue
// lines in these files as string ids; the record holds only the id.

import fs from 'node:fs';
import path from 'node:path';

const KINDS = ['STRINGS', 'DLSTRINGS', 'ILSTRINGS'];

export class StringTable {
	constructor() {
		this.ids = new Map();
	}

	static empty() {
		return new StringTable();
	}

	static fromFile(file, utf16) {
		const buffer = fs.readFileSync(file);
		const table = new StringTable();
		if (buffer.length < 8) return table;
		const count = buffer.readUInt32LE(0);
		const dataStart = 8 + count * 8;
		if (dataStart > buffer.length) return table;
		for (let i = 0; i < count; i++) {
			const base = 8 + i * 8;
			const id = buffer.readUInt32LE(base);
			const offset = buffer.readUInt32LE(base + 4);
			const at = dataStart + offset;
			let end;
			if (utf16) {
				if (at + 2 > buffer.length) continue;
				const length = buffer.readUInt16LE(at);
				end = Math.min(at + 2 + length, buffer.length);
				table.ids.set(id, buffer.toString('utf8', at + 2, end));
			} else {
				const zero = buffer.indexOf(0, at);
				end = zero === -1 ? buffer.length : zero;
				table.ids.set(id, buffer.toString('utf8', at, end));
			}
		}
		return table;
	}

	get(id) {
		return this.ids.get(id) ?? null;
	}

	get size() {
		return this.ids.size;
	}
}

// The three tables of one plugin, by kind. Missing files simply leave an empty table.
export class PluginStrings {
	constructor(tables = {}) {
		this.tables = tables;
	}

	static empty() {
		return new PluginStrings({});
	}

	lookup(kind, id) {
		const table = this.tables[kind];
		return table ? table.get(id) : null;
	}

	get isEmpty() {
		return Object.keys(this.tables).length === 0;
	}
}

const fileCache = new Map();

// Data\Strings\<stem>_<language>.<kind>, matched without caring about case: the files come in every case there is.
export function loadPluginStrings(stringsDir, pluginFileName, language, log) {
	if (!stringsDir) return PluginStrings.empty();
	const stem = pluginFileName.replace(/\.(esp|esm|esl)$/i, '');
	const cacheKey = `${stringsDir}|${stem}|${language}`;
	if (fileCache.has(cacheKey)) return fileCache.get(cacheKey);

	const tables = {};
	let listing = null;
	try {
		listing = fs.readdirSync(stringsDir);
	} catch {
		return PluginStrings.empty();
	}
	const byLower = new Map(listing.map((name) => [name.toLowerCase(), name]));
	for (const kind of KINDS) {
		const wanted = `${stem}_${language}.${kind}`.toLowerCase();
		const actual = byLower.get(wanted);
		if (!actual) continue;
		try {
			tables[kind] = StringTable.fromFile(path.join(stringsDir, actual), kind === 'DLSTRINGS');
		} catch (err) {
			log?.(`strings unreadable: ${actual}: ${err.message}`);
		}
	}
	const result = new PluginStrings(tables);
	fileCache.set(cacheKey, result);
	return result;
}

export function clearStringsCache() {
	fileCache.clear();
}
