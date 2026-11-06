// Reads the index. Everything the web UI asks for ends up here.

const TYPE_FAMILIES = {
	item: 'item',
	actor: 'actor',
	quest: 'quest',
	place: 'place',
	world: 'place',
	cell: 'place',
	perk: 'perk',
	spell: 'magic',
	shout: 'magic',
	magicEffect: 'magic',
	enchantment: 'magic',
	recipe: 'craft',
	faction: 'actor',
	keyword: 'misc',
	leveledItem: 'misc',
	leveledActor: 'misc',
	container: 'misc'
};

const SIG_FAMILIES = {
	WEAP: 'weapon',
	ARMO: 'armor',
	ALCH: 'potion',
	INGR: 'ingredient',
	BOOK: 'book',
	SCRL: 'scroll',
	MISC: 'misc',
	KEYM: 'key',
	AMMO: 'ammo',
	SLGM: 'soulgem'
};

export function familyOf(row) {
	if (row.type === 'item') return SIG_FAMILIES[row.sig] || 'misc';
	return TYPE_FAMILIES[row.type] || 'misc';
}

// "@mod" picks a plugin, "#keyword" a keyword, "$effect" a magic effect, "-" leaves a word out.
export function parseQuery(text) {
	const terms = [];
	const re = /@("([^"]+)"|\S+)|#("([^"]+)"|\S+)|\$("([^"]+)"|\S+)|("([^"]+)"|\S+)/g;
	let match;
	const source = String(text || '');
	while ((match = re.exec(source))) {
		const raw = match[0];
		if (raw.startsWith('@')) terms.push({ kind: 'plugin', value: match[2] ?? match[1].slice(1) });
		else if (raw.startsWith('#')) terms.push({ kind: 'keyword', value: match[4] ?? match[3].slice(1) });
		else if (raw.startsWith('$')) terms.push({ kind: 'effect', value: match[6] ?? match[5].slice(1) });
		else terms.push({ kind: 'text', value: match[8] ?? match[7] });
	}
	// A leading minus on any term negates it.
	return terms.map((term) => {
		if (term.value.startsWith('-') && term.value.length > 1) return { ...term, value: term.value.slice(1), negated: true };
		return term;
	});
}

function like(value) {
	return `%${String(value).replace(/[%_]/g, (c) => '\\' + c)}%`;
}

export function search(
	db,
	{ q = '', types = [], sigs = [], plugin = '', limit = 100, offset = 0, sort = 'name', hideInternal = true, hideNoJournal = false, met = '', kind = '', part = '', tags = [], radiant = '', journal = '', effect = '', magnitude = null, flags = [], keyword = '', sortDir = 'asc' } = {}
) {
	const where = [];
	const params = [];

	const terms = parseQuery(q);
	for (const term of terms) {
		if (term.kind === 'text') {
			const clause = `(e.name LIKE ? ESCAPE '\\' OR e.text LIKE ? ESCAPE '\\' OR e.edid LIKE ? ESCAPE '\\')`;
			where.push(term.negated ? `NOT ${clause}` : clause);
			const value = like(term.value);
			params.push(value, value, value);
		} else if (term.kind === 'plugin') {
			const clause = `e.plugin IN (SELECT idx FROM plugins WHERE name LIKE ? ESCAPE '\\' OR source LIKE ? ESCAPE '\\')`;
			where.push(term.negated ? `NOT ${clause}` : clause);
			params.push(like(term.value), like(term.value));
		} else if (term.kind === 'keyword') {
			const clause = `EXISTS (SELECT 1 FROM links l JOIN entries k ON k.formid = l.dst
				WHERE l.src = e.formid AND l.rel = 'keyword' AND (k.name LIKE ? ESCAPE '\\' OR k.edid LIKE ? ESCAPE '\\'))`;
			where.push(term.negated ? `NOT ${clause}` : clause);
			params.push(like(term.value), like(term.value));
		} else if (term.kind === 'effect') {
			const clause = `EXISTS (SELECT 1 FROM links l JOIN entries m ON m.formid = l.dst
				WHERE l.src = e.formid AND l.rel = 'effect' AND (m.name LIKE ? ESCAPE '\\' OR m.edid LIKE ? ESCAPE '\\'))`;
			where.push(term.negated ? `NOT ${clause}` : clause);
			params.push(like(term.value), like(term.value));
		}
	}

	if (types.length) {
		where.push(`e.type IN (${types.map(() => '?').join(',')})`);
		params.push(...types);
	}
	if (sigs.length) {
		where.push(`e.sig IN (${sigs.map(() => '?').join(',')})`);
		params.push(...sigs);
	}
	if (plugin) {
		where.push('e.plugin = ?');
		params.push(Number(plugin));
	}
	// What no player was meant to see, and the quests with no journal line: both off unless asked for.
	if (hideInternal) where.push('e.internal = 0');
	if (hideNoJournal) where.push("(e.type <> 'quest' OR e.journal = 1)");
	// The save's side: quests the character has touched, or the ones they never have.
	if (kind) {
		where.push('e.kind = ?');
		params.push(kind);
	}
	if (part) {
		where.push('e.part = ?');
		params.push(part);
	}
	// The tags a person can wear: follower, merchant, trainer, housecarl, marriageable (any of them matches).
	if (tags.length) {
		const clauses = [];
		for (const tag of tags) {
			if (tag === 'follower') {
				clauses.push(`EXISTS (SELECT 1 FROM links l JOIN entries f ON f.formid = l.dst WHERE l.src = e.formid AND l.rel = 'faction'
					AND (f.edid LIKE '%PotentialFollower%' OR f.edid LIKE '%FollowerFaction%'))`);
			} else if (tag === 'merchant') {
				clauses.push(`EXISTS (SELECT 1 FROM entries c WHERE c.formid = CAST(json_extract(e.data, '$.class') AS INTEGER) AND c.edid LIKE 'Vendor%')`);
			} else if (tag === 'trainer') {
				clauses.push(`EXISTS (SELECT 1 FROM entries c WHERE c.formid = CAST(json_extract(e.data, '$.class') AS INTEGER) AND c.edid LIKE 'Trainer%')`);
			} else if (tag === 'housecarl') {
				clauses.push(`EXISTS (SELECT 1 FROM links l JOIN entries f ON f.formid = l.dst WHERE l.src = e.formid AND l.rel = 'faction' AND f.edid LIKE '%PlayerHousecarl%')`);
			} else if (tag === 'marriage') {
				clauses.push(`EXISTS (SELECT 1 FROM links l JOIN entries f ON f.formid = l.dst WHERE l.src = e.formid AND l.rel = 'faction' AND f.edid LIKE '%PotentialMarriage%')`);
			}
		}
		if (clauses.length) where.push("(e.type = 'actor' AND (" + clauses.join(' OR ') + '))');
	}
	// Gear filters: enchanted or not, one of a kind, a Daedric artifact.
	if (flags.includes('enchanted')) where.push("CAST(json_extract(e.data, '$.enchantment') AS INTEGER) > 0");
	if (flags.includes('plain')) where.push("COALESCE(CAST(json_extract(e.data, '$.enchantment') AS INTEGER), 0) = 0");
	if (flags.includes('artifact')) {
		where.push("EXISTS (SELECT 1 FROM links l JOIN entries k ON k.formid = l.dst WHERE l.src = e.formid AND l.rel = 'keyword' AND k.edid = 'DaedricArtifact')");
	}
	if (flags.includes('unique')) {
		// One of a kind: exactly one of it lies in the world, no recipe makes another, no leveled list hands it out.
		where.push("(SELECT COUNT(*) FROM placements p WHERE p.base = e.formid) = 1");
		where.push("NOT EXISTS (SELECT 1 FROM links l WHERE l.dst = e.formid AND l.rel = 'recipe')");
		where.push("NOT EXISTS (SELECT 1 FROM links l WHERE l.dst = e.formid AND l.rel = 'leveled')");
	}
	if (keyword) {
		where.push("EXISTS (SELECT 1 FROM links l JOIN entries k ON k.formid = l.dst WHERE l.src = e.formid AND l.rel = 'keyword' AND (LOWER(k.edid) LIKE ? OR LOWER(k.name) LIKE ?))");
		const like = '%' + String(keyword).toLowerCase() + '%';
		params.push(like, like);
	}
	if (magnitude !== null && magnitude !== '' && !Number.isNaN(Number(magnitude))) {
		where.push("EXISTS (SELECT 1 FROM json_each(json_extract(e.data, '$.effects')) je WHERE CAST(json_extract(je.value, '$.magnitude') AS REAL) >= ?)");
		params.push(Number(magnitude));
	}
	if (effect) {
		where.push("e.effects LIKE ? ESCAPE '\\'");
		params.push('%' + String(effect).replace(/[%_]/g, (c) => '\\' + c) + '%');
	}
	if (journal === '1') where.push("e.type = 'quest' AND e.journal = 1");
	else if (journal === '0') where.push("e.type = 'quest' AND e.journal = 0");
	if (radiant === '1') where.push('e.radiant = 1');
	else if (radiant === '0') where.push('e.radiant = 0');

	if (met === 'met') {
		where.push("e.type = 'quest' AND EXISTS (SELECT 1 FROM save_progress sp WHERE sp.quest = e.formid)");
	} else if (met === 'unmet') {
		where.push("e.type = 'quest' AND NOT EXISTS (SELECT 1 FROM save_progress sp WHERE sp.quest = e.formid)");
	}

	const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
	const SORT_FIELDS = {
		name: 'e.name COLLATE NOCASE',
		edid: 'e.edid COLLATE NOCASE',
		value: "CAST(json_extract(e.data, '$.value') AS REAL)",
		weight: "CAST(json_extract(e.data, '$.weight') AS REAL)",
		damage: "CAST(json_extract(e.data, '$.damage') AS REAL)",
		armor: "CAST(json_extract(e.data, '$.armor') AS REAL)",
		level: "CAST(json_extract(e.data, '$.level') AS REAL)",
		cost: "CAST(json_extract(e.data, '$.cost') AS REAL)",
		speed: "CAST(json_extract(e.data, '$.speed') AS REAL)",
		stages: "json_array_length(json_extract(e.data, '$.stages'))",
		ranks: "CAST(json_extract(e.data, '$.rankCount') AS REAL)",
		materials: "json_array_length(json_extract(e.data, '$.ingredients'))",
		entries: "json_array_length(json_extract(e.data, '$.entries'))",
		effect: 'e.effects COLLATE NOCASE',
		effect1: "json_extract(e.effects, '$[0]') COLLATE NOCASE",
		effect2: "json_extract(e.effects, '$[1]') COLLATE NOCASE",
		effect3: "json_extract(e.effects, '$[2]') COLLATE NOCASE",
		effect4: "json_extract(e.effects, '$[3]') COLLATE NOCASE",
		type: "e.type || '|' || e.sig",
		desc: "COALESCE(json_extract(e.data, '$.description'), '') COLLATE NOCASE",
		sex: "CAST(json_extract(e.data, '$.female') AS INTEGER)",
		kind: 'e.kind COLLATE NOCASE',
		part: 'e.part COLLATE NOCASE',
		radiant: 'e.radiant',
		journal: 'e.journal',
		met: 'EXISTS (SELECT 1 FROM save_progress sp WHERE sp.quest = e.formid)',
		race: "(SELECT r.name FROM entries r WHERE r.formid = CAST(json_extract(e.data, '$.race') AS INTEGER)) COLLATE NOCASE",
		enchantment: "(SELECT m.name FROM entries m WHERE m.formid = CAST(json_extract(e.data, '$.enchantment') AS INTEGER)) COLLATE NOCASE",
		plugin: 'p.name COLLATE NOCASE'
	};
	const direction = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
	const orderSql = `ORDER BY (e.name = '') ASC, ${SORT_FIELDS[sort] || SORT_FIELDS.name} ${direction}`;

	const rows = db
		.prepare(`SELECT e.formid, e.sig, e.type, e.name, e.edid, e.plugin, e.data, e.internal, e.hidden_reason, e.journal, e.kind, e.part, e.radiant, e.effects, EXISTS (SELECT 1 FROM save_progress sp WHERE sp.quest = e.formid) AS met, p.name AS pluginName,
			(SELECT m.name FROM entries m WHERE m.formid = CAST(json_extract(e.data, '$.enchantment') AS INTEGER)) AS enchantName,
			(SELECT r.name FROM entries r WHERE r.formid = CAST(json_extract(e.data, '$.race') AS INTEGER)) AS raceName,
			(SELECT m.name FROM links l JOIN entries m ON m.formid = l.dst WHERE l.src = e.formid AND l.rel = 'effect' LIMIT 1) AS firstEffect
			FROM entries e LEFT JOIN plugins p ON p.idx = e.plugin
			${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
		.all(...params, Math.min(Number(limit) || 100, 500), Number(offset) || 0);

	const total = db.prepare(`SELECT COUNT(*) AS n FROM entries e ${whereSql}`).get(...params).n;

	return {
		total,
		offset: Number(offset) || 0,
		limit: Number(limit) || 100,
		rows: rows.map((row) => ({
			formid: row.formid,
			hex: hexId(row.formid),
			sig: row.sig,
			type: row.type,
			family: familyOf(row),
			name: row.name,
			edid: row.edid,
			plugin: row.plugin,
			pluginName: row.pluginName,
			internal: row.internal,
			hiddenReason: row.hidden_reason,
			journal: row.journal,
			kind: row.kind,
			part: row.part,
			radiant: Boolean(row.radiant),
			raceName: row.raceName || '',
			firstEffect: row.firstEffect || '',
			enchantName: row.enchantName || '',
			effects: row.effects || '',
			met: Boolean(row.met),
			data: safeJson(row.data)
		}))
	};
}

const REL_TITLES = {
	recipe: '合成配方',
	ingredient: '材料',
	created: '做成',
	faction: '派系',
	carries: '携带',
	contains: '箱中之物',
	effect: '效果',
	enchantment: '附魔',
	keyword: '关键词',
	parent: '上级',
	next: '下一级',
	world: '所在世界',
	teaches: '教'
};

export function getEntry(db, formid, hex) {
	let id = formid;
	if (!id && hex) id = parseInt(hex, 16);
	if (!id) return null;
	const row = db
		.prepare(`SELECT e.formid, e.sig, e.type, e.name, e.edid, e.plugin, e.text, e.data, e.internal, e.hidden_reason, e.journal, e.kind, e.part, e.radiant, p.name AS pluginName
			FROM entries e LEFT JOIN plugins p ON p.idx = e.plugin WHERE e.formid = ?`)
		.get(id);
	if (!row) return null;

	const out = [];
	for (const link of db
		.prepare(`SELECT l.rel, e.formid, e.name, e.type, e.sig FROM links l JOIN entries e ON e.formid = l.dst WHERE l.src = ?`)
		.all(id)) {
		out.push({ rel: link.rel, title: REL_TITLES[link.rel] || link.rel, formid: link.formid, hex: hexId(link.formid), name: link.name, type: link.type, sig: link.sig });
	}
	const incoming = [];
	for (const link of db
		.prepare(`SELECT l.rel, e.formid, e.name, e.type, e.sig FROM links l JOIN entries e ON e.formid = l.src WHERE l.dst = ?`)
		.all(id)) {
		incoming.push({ rel: link.rel, title: REL_TITLES[link.rel] || link.rel, formid: link.formid, hex: hexId(link.formid), name: link.name, type: link.type, sig: link.sig });
	}

	const placements = db
		.prepare(`SELECT p.count AS count, e.name AS cellName, e.formid AS cell, w.name AS worldName
			FROM placements p LEFT JOIN entries e ON e.formid = p.cell LEFT JOIN entries w ON w.formid = p.world
			WHERE p.base = ? LIMIT 200`)
		.all(id)
		.map((p) => ({ count: p.count, cell: p.cell, name: p.cellName || p.worldName || '（无名地点）' }));

	const base = {
		formid: row.formid,
		hex: hexId(row.formid),
		canonical: hexId(row.formid),
		sig: row.sig,
		type: row.type,
		family: familyOf(row),
		name: row.name,
		edid: row.edid,
		plugin: row.plugin,
		pluginName: row.pluginName,
		internal: row.internal,
		hiddenReason: row.hidden_reason,
		journal: row.journal,
		kind: row.kind,
		part: row.part,
		radiant: Boolean(row.radiant),
		text: row.text,
		data: safeJson(row.data),
		links: out,
		backlinks: incoming,
		placements
	};
	base.refs = resolveRefs(db, base.data, [...out, ...incoming]);

	// What the picked save says about this entry, when there is anything to say.
	if (base.type === 'quest') {
		const progress = db
			.prepare('SELECT current_stage, done_stages, stage_count, stages FROM save_progress WHERE quest = ?')
			.get(base.formid);
		base.met = Boolean(progress);
		if (progress) {
			let stages = [];
			try {
				stages = JSON.parse(progress.stages);
			} catch {
				stages = [];
			}
			base.progress = {
				currentStage: progress.current_stage,
				doneStages: progress.done_stages,
				stageCount: progress.stage_count,
				stages
			};
		}
	}
	return base;
}

// Which numbers inside `data` are form ids worth putting a name beside in the UI.
const SINGLE_REFS = new Set([
	'race', 'class', 'enchantment', 'onType', 'slot', 'crimeFaction', 'voice', 'parent', 'parentWorld',
	'next', 'created', 'workbench', 'world', 'owner', 'teachesForm'
]);
const ARRAY_REFS = new Set(['keywords', 'factions', 'inventory', 'ingredients', 'items', 'effects', 'entries', 'relations']);

function resolveRefs(db, data, links) {
	const ids = new Set();
	for (const [key, value] of Object.entries(data || {})) {
		if (SINGLE_REFS.has(key) && typeof value === 'number' && value > 0) ids.add(value);
		if (ARRAY_REFS.has(key) && Array.isArray(value)) {
			for (const item of value) {
				if (typeof item === 'number' && item > 0) ids.add(item);
				else if (item && typeof item === 'object') {
					for (const [k, v] of Object.entries(item)) {
						if ((k === 'item' || k === 'effect' || k === 'faction') && typeof v === 'number' && v > 0) ids.add(v);
					}
				}
			}
		}
	}
	for (const link of links || []) ids.add(link.formid);
	ids.delete(0);
	if (!ids.size) return {};

	const placeholders = [...ids].map(() => '?').join(',');
	const refs = {};
	for (const row of db.prepare(`SELECT formid, name, type, sig, edid FROM entries WHERE formid IN (${placeholders})`).all(...ids)) {
		refs[String(row.formid)] = { hex: hexId(row.formid), name: row.name, type: row.type, sig: row.sig, edid: row.edid };
	}
	return refs;
}

export function plugins(db) {
	return db.prepare('SELECT idx, name, source, light, entries FROM plugins ORDER BY idx').all();
}

export function stats(db) {
	const meta = {};
	for (const row of db.prepare('SELECT key, value FROM meta').all()) meta[row.key] = row.value;
	const byType = db.prepare('SELECT type, COUNT(*) AS n FROM entries GROUP BY type ORDER BY n DESC').all();
	const byFamily = db
		.prepare(`SELECT type, sig, COUNT(*) AS n FROM entries GROUP BY type, sig`)
		.all()
		.sort((a, b) => b.n - a.n);
	return {
		meta,
		entries: byType.reduce((sum, row) => sum + row.n, 0),
		byType,
		byFamily
	};
}

export function hexId(formid) {
	return (formid >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function safeJson(text) {
	try {
		return JSON.parse(text || '{}');
	} catch {
		return {};
	}
}

export { TYPE_FAMILIES, SIG_FAMILIES };
