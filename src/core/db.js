// The index: one SQLite file holding everything the app reads. Nothing else is ever written.

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openIndex(file) {
	const dir = path.dirname(file);
	fs.mkdirSync(dir, { recursive: true });
	const db = new DatabaseSync(file);
	db.exec('PRAGMA journal_mode = WAL');
	db.exec('PRAGMA synchronous = OFF');
	db.exec('PRAGMA temp_store = MEMORY');
	return db;
}

export function createSchema(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

		CREATE TABLE IF NOT EXISTS plugins (
			idx INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			source TEXT,
			masters TEXT,
			light INTEGER,
			entries INTEGER DEFAULT 0,
			error TEXT DEFAULT ''
		);

		CREATE TABLE IF NOT EXISTS entries (
			formid INTEGER PRIMARY KEY,
			sig TEXT NOT NULL,
			type TEXT NOT NULL,
			name TEXT NOT NULL DEFAULT '',
			edid TEXT NOT NULL DEFAULT '',
			plugin INTEGER NOT NULL,
			text TEXT NOT NULL DEFAULT '',
			data TEXT NOT NULL DEFAULT '{}',
			internal INTEGER NOT NULL DEFAULT 0,
			hidden_reason TEXT NOT NULL DEFAULT '',
			journal INTEGER NOT NULL DEFAULT 1,
			placed INTEGER NOT NULL DEFAULT 0,
			kind TEXT NOT NULL DEFAULT '',
			part TEXT NOT NULL DEFAULT '',
			radiant INTEGER NOT NULL DEFAULT 0,
			effects TEXT NOT NULL DEFAULT ''
		);
		CREATE INDEX IF NOT EXISTS entries_type ON entries(type);
		CREATE INDEX IF NOT EXISTS entries_name ON entries(name);
		CREATE INDEX IF NOT EXISTS entries_plugin ON entries(plugin);
		CREATE INDEX IF NOT EXISTS entries_internal ON entries(internal);
		CREATE INDEX IF NOT EXISTS entries_kind ON entries(kind);

		CREATE TABLE IF NOT EXISTS links (
			src INTEGER NOT NULL,
			dst INTEGER NOT NULL,
			rel TEXT NOT NULL,
			PRIMARY KEY (src, dst, rel)
		) WITHOUT ROWID;
		CREATE INDEX IF NOT EXISTS links_dst ON links(dst, rel);

		CREATE TABLE IF NOT EXISTS placements (
			ref INTEGER PRIMARY KEY,
			base INTEGER NOT NULL,
			cell INTEGER,
			world INTEGER,
			count INTEGER DEFAULT 1
		);
		CREATE INDEX IF NOT EXISTS placements_base ON placements(base);
	`);

	// Filled from the picked save file rather than from the load order; wiped by a rebuild and refilled after.
	createSaveTables(db);
}

export function createSaveTables(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS save_progress (
			quest INTEGER PRIMARY KEY,
			current_stage INTEGER,
			done_stages INTEGER DEFAULT 0,
			stage_count INTEGER DEFAULT 0,
			state TEXT NOT NULL DEFAULT '',
			stages TEXT NOT NULL DEFAULT '[]'
		);
	`);
}

export function writeMeta(db, values) {
	const stmt = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
	for (const [key, value] of Object.entries(values)) stmt.run(key, String(value));
}

export function readMeta(db) {
	const out = {};
	for (const row of db.prepare('SELECT key, value FROM meta').all()) out[row.key] = row.value;
	return out;
}

export function indexExists(file) {
	return fs.existsSync(file);
}
