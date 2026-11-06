// Builds the index: load order -> every plugin parsed once -> entries, links and placements in SQLite.

import fs from 'node:fs';
import { readHeader, walkRecords } from './tes4.js';
import { loadPluginStrings } from './strings.js';
import { Extractor } from './extract.js';
import { createSchema, openIndex, writeMeta } from './db.js';

export const INDEX_VERSION = 3;

export function buildIndex({ loadOrder, dbFile, onProgress = () => {}, only = null }) {
	try {
		if (fs.existsSync(dbFile)) fs.rmSync(dbFile);
	} catch (err) {
		if (err.code === 'EPERM' || err.code === 'EBUSY') {
			throw new Error('索引文件还被占着：先把正在跑的服务关掉（node src/cli.js serve 那个窗口），再重建。');
		}
		throw err;
	}
	for (const suffix of ['-wal', '-shm']) {
		try {
			if (fs.existsSync(dbFile + suffix)) fs.rmSync(dbFile + suffix);
		} catch {
			// a read-only client still holding it: the build replaces the main file anyway
		}
	}

	const db = openIndex(dbFile);
	createSchema(db);

	const insertPlugin = db.prepare('INSERT OR REPLACE INTO plugins (idx, name, source, masters, light) VALUES (?, ?, ?, ?, ?)');
	// A later plugin overrides a record; when its override has no name or text of its own (plenty do) the words
	// the earlier plugin gave stay, so the Chinese name of a Skyrim item survives an English patch of its numbers.
	const insertEntry = db.prepare(
		`INSERT INTO entries (formid, sig, type, name, edid, plugin, text, data, internal, hidden_reason, journal, kind, part, radiant)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(formid) DO UPDATE SET
			sig = excluded.sig,
			type = excluded.type,
			name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE entries.name END,
			edid = CASE WHEN excluded.edid <> '' THEN excluded.edid ELSE entries.edid END,
			plugin = excluded.plugin,
			text = CASE WHEN excluded.text <> '' THEN excluded.text ELSE entries.text END,
			data = excluded.data,
			internal = excluded.internal,
			hidden_reason = excluded.hidden_reason,
			journal = excluded.journal,
			kind = excluded.kind,
			part = excluded.part,
			radiant = excluded.radiant`
	);
	const insertLink = db.prepare('INSERT OR IGNORE INTO links (src, dst, rel) VALUES (?, ?, ?)');
	const insertPlacement = db.prepare('INSERT OR REPLACE INTO placements (ref, base, cell, world, count) VALUES (?, ?, ?, ?, ?)');
	const updatePluginCount = db.prepare('UPDATE plugins SET entries = ? WHERE idx = ?');

	const started = Date.now();
	let totalEntries = 0;
	const perPlugin = [];

	const plugins = only ? loadOrder.plugins.filter(only) : loadOrder.plugins;

	for (let i = 0; i < plugins.length; i++) {
		const plugin = plugins[i];
		const pluginStart = Date.now();
		let buffer;
		try {
			buffer = fs.readFileSync(plugin.file);
		} catch (err) {
			onProgress({ phase: 'plugin', index: i, total: plugins.length, name: plugin.name, error: err.message });
			continue;
		}

		let header;
		try {
			header = readHeader(buffer);
		} catch (err) {
			onProgress({ phase: 'plugin', index: i, total: plugins.length, name: plugin.name, error: '不是插件：' + err.message });
			continue;
		}

		// The loader's numbering: masters first (as offsets into the load order), then this file's own records.
		const extractorFor = {
			index: plugin.index,
			lightIndex: plugin.lightIndex,
			light: plugin.light,
			masters: plugin.masterLoads
		};

		const strings = loadPluginStrings(loadOrder.stringsDir, plugin.name, header.localized ? loadOrder.language : 'english');
		let count = 0;

		const extractor = new Extractor({
			plugin: extractorFor,
			strings,
			onEntry(entry) {
				insertEntry.run(
					entry.formid >>> 0,
					entry.sig,
					entry.type,
					entry.name || '',
					entry.edid || '',
					plugin.position,
					entry.text || '',
					JSON.stringify(entry.data || {}),
					entry.internal ? 1 : 0,
					entry.hiddenReason || '',
					entry.journal ? 1 : 0,
					entry.kind || '',
					entry.part || '',
					entry.radiant ? 1 : 0
				);
				count++;
			},
			onLink(src, dst, rel) {
				if (!src || !dst) return;
				insertLink.run(src >>> 0, dst >>> 0, rel);
			},
			onPlacement(base, ref, cell, world, count_) {
				if (!base) return;
				insertPlacement.run(ref >>> 0, base >>> 0, cell || 0, world || 0, count_ || 1);
			},
			onContainer(container, cell, items) {
				for (const item of items) {
					insertLink.run(container >>> 0, item.item >>> 0, 'contains');
				}
			}
		});

		db.exec('BEGIN');
		let recordErrors = 0;
		try {
			insertPlugin.run(plugin.position, plugin.name, plugin.source, plugin.masters.join('|'), plugin.light ? 1 : 0);

			walkRecords(buffer, header.bodyStart, buffer.length, {}, (record) => {
				// A cheap guard: only hand over the signatures that have an extractor.
				if (!KNOWN_SIGS.has(record.sig)) return;
				try {
					extractor.handle(record);
				} catch (err) {
					// One odd record (a mod with a broken subrecord, an unknown layout) shouldn't cost the plugin.
					recordErrors++;
					if (recordErrors <= 3) {
						onProgress({ phase: 'record', index: i, total: plugins.length, name: plugin.name, error: `${record.sig} ${record.formId.toString(16)}: ${err.message}` });
					}
				}
			});
			updatePluginCount.run(count, plugin.position);
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			onProgress({ phase: 'plugin', index: i, total: plugins.length, name: plugin.name, error: err.message });
			continue;
		}

		totalEntries += count;
		perPlugin.push({ name: plugin.name, entries: count, ms: Date.now() - pluginStart });
		onProgress({
			phase: 'plugin',
			index: i,
			total: plugins.length,
			name: plugin.name,
			entries: count,
			total_entries: totalEntries,
			ms: Date.now() - pluginStart
		});
	}

	// Recipes have no name of their own; name them after the thing they make so search can find them.
	// Keywords are known by their editor id: that is what the #keyword search and the chips show.
	// Each runs on its own: a recipe whose created item is missing would otherwise take the keyword pass with it.
	try {
		db.exec(`UPDATE entries SET name = COALESCE('配方：' || (
			SELECT n.name FROM entries n WHERE n.formid = CAST(json_extract(entries.data, '$.created') AS INTEGER)
		), '配方') WHERE type = 'recipe' AND name = ''`);
	} catch {
		// json1 missing on an ancient build: recipes just stay nameless
	}
	try {
		db.exec(`UPDATE entries SET name = edid WHERE type = 'keyword' AND name = '' AND edid != ''`);
	} catch {
		// an older SQLite without the update syntax: names stay empty, search still knows the editor id
	}

	// A potion, an ingredient and a scroll have no type of their own beyond their effects: the first effect decides.
	try {
		const effectKind = (edid) => {
			const text = String(edid || '');
			if (/Restore|Regen/i.test(text)) return '恢复';
			if (/Fortify/i.test(text)) return '强化';
			if (/Resist/i.test(text)) return '抗性';
			if (/Damage|Poison|Weakness|Ravage|Absorb/i.test(text)) return '伤害';
			if (/Invisib|Light|Muffle|Waterbreath|Telekinesis|Detect|Soul/i.test(text)) return '功能';
			return '其他';
		};
		const rows = db
			.prepare(`SELECT e.formid AS formid,
				(SELECT m.edid FROM links l JOIN entries m ON m.formid = l.dst WHERE l.src = e.formid AND l.rel = 'effect' LIMIT 1) AS edid
				FROM entries e WHERE e.sig IN ('ALCH', 'INGR', 'SCRL') AND e.kind = ''`)
			.all();
		const update = db.prepare('UPDATE entries SET kind = ? WHERE formid = ?');
		db.exec('BEGIN');
		for (const row of rows) update.run(effectKind(row.edid), row.formid);
		db.exec('COMMIT');
	} catch {
		// without this the potions simply keep an empty kind and stay under "全部"
	}

	// A recipe is known by the station it is made at.
	try {
		const station = (name, edid) => {
			const text = `${name || ''} ${edid || ''}`;
			if (/sharpen|grind|whet/i.test(text)) return '磨刀石';
			if (/armor ?table|forge|anvil|smith/i.test(text)) return '锻造';
			if (/cook|oven|spit|pot|butter ?churn/i.test(text)) return '烹饪';
			if (/alchemy|lab/i.test(text)) return '炼金';
			if (/enchant|staff|imbue|soul ?gem/i.test(text)) return '附魔台';
			if (/smelt/i.test(text)) return '熔炉';
			if (/tan|leather|hide/i.test(text)) return '制皮';
			if (/loom|weav|sew/i.test(text)) return '纺织';
			if (/gem|jewel/i.test(text)) return '珠宝';
			if (/carpenter|wood|saw/i.test(text)) return '木工';
			return '其他';
		};
		const rows = db
			.prepare(`SELECT e.formid AS formid,
				(SELECT m.name FROM links l JOIN entries m ON m.formid = l.dst WHERE l.src = e.formid AND l.rel = 'keyword' LIMIT 1) AS name,
				(SELECT m.edid FROM links l JOIN entries m ON m.formid = l.dst WHERE l.src = e.formid AND l.rel = 'keyword' LIMIT 1) AS edid
				FROM entries e WHERE e.type = 'recipe' AND e.kind = ''`)
			.all();
		const update = db.prepare('UPDATE entries SET kind = ? WHERE formid = ?');
		db.exec('BEGIN');
		for (const row of rows) update.run(station(row.name, row.edid), row.formid);
		db.exec('COMMIT');
	} catch {
		// same: recipes keep an empty kind
	}

	// The effect names an item carries, in the order the record lists them: four for an ingredient.
	try {
		const nameOf = db.prepare('SELECT name FROM entries WHERE formid = ?');
		const rows = db.prepare("SELECT formid, data FROM entries WHERE json_array_length(json_extract(data, '$.effects')) > 0").all();
		const update = db.prepare('UPDATE entries SET effects = ? WHERE formid = ?');
		db.exec('BEGIN');
		for (const row of rows) {
			let data = {};
			try {
				data = JSON.parse(row.data);
			} catch {
				data = {};
			}
			const names = (data.effects || [])
				.map((effect) => {
					const found = nameOf.get(effect.effect);
					return found && found.name ? found.name : '';
				})
				.filter(Boolean);
			update.run(JSON.stringify(names), row.formid);
		}
		db.exec('COMMIT');
	} catch {
		// no effect names then; the columns stay empty
	}

	// A recipe is as visible as the thing it makes: a nameless blade hides its recipe too, a real sword doesn't.
	try {
		db.exec(`UPDATE entries SET
			internal = COALESCE((SELECT n.internal FROM entries n WHERE n.formid = CAST(json_extract(entries.data, '$.created') AS INTEGER)), 0),
			hidden_reason = CASE WHEN COALESCE((SELECT n.internal FROM entries n WHERE n.formid = CAST(json_extract(entries.data, '$.created') AS INTEGER)), 0) = 1
				THEN '做出来的东西本身不显示' ELSE '' END
			WHERE type = 'recipe'`);
	} catch {
		// recipes keep whatever the name rules said
	}

	// Who actually stands somewhere in the world. A person the game never places, and no leveled list hands out,
	// is a voice behind a dialogue line rather than someone you can walk up to.
	try {
		db.exec(`UPDATE entries SET placed = 1 WHERE formid IN (SELECT DISTINCT base FROM placements)`);
		db.exec(`UPDATE entries SET internal = 1, hidden_reason = '从未摆放在世界里'
			WHERE type = 'actor' AND internal = 0 AND placed = 0
			AND formid NOT IN (SELECT dst FROM links WHERE rel = 'leveled')`);
	} catch {
		// the placement pass is a nicety; without it nothing else changes
	}

	// Everything the load order held may have been overridden by a later plugin; the table is what the app shows.
	const finalCount = db.prepare('SELECT COUNT(*) n FROM entries').get().n;

	writeMeta(db, {
		indexVersion: INDEX_VERSION,
		gamePath: loadOrder.gamePath,
		dataDir: loadOrder.dataDir,
		profile: loadOrder.profile || '',
		language: loadOrder.language,
		builtAt: new Date().toISOString(),
		pluginCount: loadOrder.plugins.length,
		entryCount: finalCount,
		modCount: loadOrder.modCount || 0,
		buildMs: Date.now() - started
	});

	db.exec('ANALYZE');
	db.exec('PRAGMA optimize');
	db.close();

	return { entries: totalEntries, plugins: loadOrder.plugins.length, ms: Date.now() - started, perPlugin };
}

const KNOWN_SIGS = new Set([
	'WEAP', 'ARMO', 'ALCH', 'INGR', 'BOOK', 'MISC', 'KEYM', 'AMMO', 'SLGM', 'SCRL',
	'NPC_', 'QUST', 'LCTN', 'WRLD', 'CELL', 'PERK', 'SPEL', 'SHOU', 'MGEF', 'ENCH',
	'FACT', 'COBJ', 'KYWD', 'LVLI', 'LVLN', 'CONT', 'REFR', 'ACHR', 'CLAS', 'RACE'
]);

