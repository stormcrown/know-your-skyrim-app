// Checks the built index against numbers that are known from the game itself.
import { DatabaseSync } from 'node:sqlite';
import { getEntry, search } from '../src/core/query.js';

const db = new DatabaseSync(process.argv[2] || 'data/test.sqlite', { readOnly: true });
let failures = 0;

function check(label, actual, expected) {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures++;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : '  != ' + JSON.stringify(expected)}`);
}

function byName(name, type) {
	const rows = search(db, { q: '', types: type ? [type] : [], limit: 500 }).rows;
	return rows;
}

function findEntry(edid) {
	const raw = db.prepare('SELECT formid FROM entries WHERE edid = ? LIMIT 1').get(edid);
	if (!raw) return null;
	return getEntry(db, raw.formid);
}

console.log('--- counts ---');
for (const row of db.prepare('SELECT type, COUNT(*) n FROM entries GROUP BY type ORDER BY n DESC').all()) {
	console.log(`  ${row.type.padEnd(14)} ${row.n}`);
}

console.log('--- weapons and armour ---');
const sword = findEntry('IronSword');
check('IronSword 有名字', /铁|Iron/.test(sword?.name || ''), true);
check('IronSword value/weight/damage', [sword.data.value, sword.data.weight, sword.data.damage], [25, 9, 7]);
const cuirass = findEntry('ArmorIronCuirass');
check('ArmorIronCuirass value/weight/armor', [cuirass.data.value, cuirass.data.weight, cuirass.data.armor], [125, 30, 25]);
check('ArmorIronCuirass slot', cuirass.data.slot, '身体');

console.log('--- people ---');
const belethor = findEntry('Belethor');
check('Belethor name', belethor?.name, '贝莱托尔');
check('Belethor factions', belethor?.data.factions.length, 6);
check('Belethor inventory', belethor?.data.inventory.length, 3);
console.log('  race ref:', belethor?.data.race?.toString(16), ' class ref:', belethor?.data.class?.toString(16));

console.log('--- quests ---');
const mq101 = findEntry('MQ101');
check('MQ101 有名字', (mq101?.name || '').length > 0, true);
check('MQ101 has stages', (mq101?.data.stages.length || 0) > 3, true);
check('MQ101 first stage has log', Boolean(mq101?.data.stages.find((s) => s.log)?.log), true);
check('MQ101 objectives', (mq101?.data.objectives.length || 0) > 0, true);
console.log('  stage sample:', JSON.stringify(mq101?.data.stages.slice(0, 3)));

console.log('--- recipes ---');
const recipeRows = db.prepare("SELECT formid FROM entries WHERE type='recipe' LIMIT 1").get();
if (recipeRows) {
	const recipe = getEntry(db, recipeRows.formid);
	console.log('  recipe:', recipe.name || recipe.edid, 'creates', recipe.data.created, 'ingredients', recipe.data.ingredients.length, 'links', recipe.links.map((l) => l.rel + ':' + l.name).join(','));
}

console.log('--- places ---');
const whiterun = db.prepare("SELECT formid FROM entries WHERE type='place' AND name LIKE '%白漫%' LIMIT 3").all();
console.log('  白漫 places:', whiterun.length);

console.log('--- search ---');
const hits = search(db, { q: '铁剑', limit: 5 });
check('search 铁剑 hits', hits.total > 0, true);
const keywordHits = search(db, { q: '#ArmorMaterialDaedric', limit: 5 });
check('search by keyword', keywordHits.total > 0, true);
const effectHits = search(db, { q: '$强化锻造', limit: 5 });
console.log('  $强化锻造 total:', effectHits.total);

console.log('--- empty names ---');
console.log('  unnamed entries:', db.prepare("SELECT COUNT(*) n FROM entries WHERE name = ''").get().n);
console.log(failures ? `\n${failures} 处不对` : '\n全部通过');
process.exit(failures ? 1 : 0);


