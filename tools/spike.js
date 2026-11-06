// Spike: look at a real plugin and print what the parser sees. Not part of the app.
import fs from 'node:fs';
import path from 'node:path';
import { readHeader, walkRecords } from '../src/core/tes4.js';
import { loadPluginStrings } from '../src/core/strings.js';

const file = process.argv[2];
const language = process.argv[3] || 'chinese';
const stringsDir = process.argv[4] || path.join(path.dirname(path.dirname(file)), 'Data', 'Strings');
const buffer = fs.readFileSync(file);
const header = readHeader(buffer);
console.log(`file: ${path.basename(file)}  version=${header.version}  records=${header.numRecords}  localized=${header.localized}  masters=${header.masters.length}`);
console.log(`masters: ${header.masters.slice(0, 6).join(', ')}${header.masters.length > 6 ? ' ...' : ''}`);

const strings = loadPluginStrings(stringsDir, path.basename(file), language);
console.log(`strings loaded: ${strings.isEmpty ? 'none' : Object.keys(strings.tables).map((k) => `${k}=${strings.tables[k].size}`).join(' ')}`);

const counts = new Map();
const wanted = new Set(['WEAP', 'ARMO', 'ALCH', 'INGR', 'BOOK', 'MISC', 'AMMO', 'KEYM', 'SLGM', 'SCRL', 'NPC_', 'QUST', 'PERK', 'SPEL', 'SHOU', 'MGEF', 'ENCH', 'FACT', 'COBJ', 'KYWD', 'LCTN', 'CELL', 'REFR', 'RACE', 'LVLI', 'CONT', 'FLST', 'MESG']);
const samples = new Map();
const started = Date.now();

walkRecords(buffer, header.bodyStart, buffer.length, {}, (r) => {
	counts.set(r.sig, (counts.get(r.sig) || 0) + 1);
	if (wanted.has(r.sig)) {
		const list = samples.get(r.sig) || [];
		if (list.length < 2) {
			list.push(r);
			samples.set(r.sig, list);
		}
	}
});

const elapsed = ((Date.now() - started) / 1000).toFixed(2);
console.log(`walked in ${elapsed}s`);
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('top signatures: ' + top.map(([s, n]) => `${s}=${n}`).join(' '));

for (const [sig, list] of samples) {
	for (const record of list) {
		const parts = [];
		for (const [fieldSig, values] of record.fields.map) {
			const size = values[0] ? values[0].length : 0;
			parts.push(values.length > 1 ? `${fieldSig}x${values.length}` : `${fieldSig}:${size}`);
		}
		let name = '';
		const full = record.fields.get('FULL');
		if (full) {
			if (full.length === 4) {
				const id = full.readUInt32LE(0);
				name = ` [str ${id} -> ${JSON.stringify(strings.lookup('STRINGS', id))}]`;
			} else {
				const zero = full.indexOf(0);
				name = ` [raw ${JSON.stringify(full.toString('utf8', 0, zero === -1 ? full.length : zero).slice(0, 40))}]`;
			}
		}
		console.log(`${sig} ${record.formId.toString(16).padStart(8, '0')}${name} | ${parts.join(' ')}`);
	}
}
