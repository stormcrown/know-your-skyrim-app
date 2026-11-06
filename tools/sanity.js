// Sanity pass over a real load order index: counts, light plugin ids, names, search speed.
import { DatabaseSync } from 'node:sqlite';
import { search, getEntry } from '../src/core/query.js';

const db = new DatabaseSync(process.argv[2] || 'data/index.sqlite', { readOnly: true });
let failures = 0;
const check = (label, actual, expected) => {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures++;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ' != ' + JSON.stringify(expected)}`);
};

const meta = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
console.log('meta:', meta.profile, '| plugins', meta.pluginCount, '| entries', meta.entryCount, '| built', meta.builtAt);

const counts = db.prepare('SELECT type, COUNT(*) n FROM entries GROUP BY type ORDER BY n DESC').all();
console.log('types:', counts.map((r) => `${r.type}=${r.n}`).join(' '));

check('plugins rows', db.prepare('SELECT COUNT(*) n FROM plugins').get().n, Number(meta.pluginCount));
check('every entry points at a plugin row', db.prepare('SELECT COUNT(*) n FROM entries e LEFT JOIN plugins p ON p.idx = e.plugin WHERE p.idx IS NULL').get().n, 0);
check('light ids in the 0xFE slot', db.prepare('SELECT COUNT(*) n FROM entries WHERE ((formid >> 24) & 255) = 254').get().n > 1000, true);
check('no negative form ids', db.prepare('SELECT COUNT(*) n FROM entries WHERE formid < 0').get().n, 0);
check('entries without name', db.prepare("SELECT COUNT(*) n FROM entries WHERE name = ''").get().n < 200000, true);
check('named keywords', db.prepare("SELECT COUNT(*) n FROM entries WHERE type='keyword' AND name <> ''").get().n > 1000, true);
check('books with text', db.prepare("SELECT COUNT(*) n FROM entries WHERE sig='BOOK' AND length(text) > 40").get().n > 1000, true);
check('named recipes', db.prepare("SELECT COUNT(*) n FROM entries WHERE type='recipe' AND name LIKE '配方%'").get().n > 1000, true);

const iron = getEntry(db, 0x00012eb7);
console.log('铁制剑:', iron?.name, iron?.hex, 'value', iron?.data.value, 'damage', iron?.data.damage, 'weight', iron?.data.weight);
check('IronSword has damage 7 or a number', typeof iron?.data.damage, 'number');
check('IronSword recipes', (iron?.links || []).some((l) => l.rel === 'recipe'), true);
check('IronSword placements', (iron?.placements || []).length > 0, true);

const quest = db.prepare("SELECT formid, name FROM entries WHERE type='quest' AND edid='MQ101'").get();
check('MQ101 exists', Boolean(quest), true);
const full = getEntry(db, quest.formid);
check('MQ101 stages', (full.data.stages || []).filter((s) => s.log).length > 0, true);

// A keyword that actually has entries hanging off it in this load order.
const popular = db
	.prepare("SELECT k.edid FROM links l JOIN entries k ON k.formid = l.dst WHERE l.rel = 'keyword' AND k.name <> '' GROUP BY k.formid ORDER BY COUNT(*) DESC LIMIT 1")
	.get();
console.log('most used keyword:', popular?.edid);

for (const q of ['铁', '龙', '$强化锻造', '@skyrim 弓', popular ? '#' + popular.edid : '#ArmorHeavy']) {
	const started = Date.now();
	const result = search(db, { q, limit: 50 });
	console.log(`search ${JSON.stringify(q)} -> ${result.total} hits, ${Date.now() - started} ms`);
	check(`search ${q} finds something`, result.total > 0, true);
}

console.log(failures ? `\n${failures} 处不对` : '\n全部通过');
process.exit(failures ? 1 : 0);
