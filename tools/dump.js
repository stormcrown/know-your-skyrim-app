// Look one record up by editor id or form id and print everything it holds.
// node tools/dump.js <plugin> <signature> <edid-or-formid> [language]
import fs from 'node:fs';
import path from 'node:path';
import { readHeader, walkRecords } from '../src/core/tes4.js';
import { loadPluginStrings } from '../src/core/strings.js';

const [file, sig, key, language = 'chinese'] = process.argv.slice(2);
const buffer = fs.readFileSync(file);
const header = readHeader(buffer);
const stringsDir = path.join(path.dirname(path.dirname(file)), 'Data', 'Strings');
const strings = loadPluginStrings(stringsDir, path.basename(file), language);

const edids = new Map();
const hits = [];
walkRecords(buffer, header.bodyStart, buffer.length, {}, (r) => {
	const edidField = r.fields.get('EDID');
	if (edidField) {
		const zero = edidField.indexOf(0);
		edids.set(r.formId, edidField.toString('utf8', 0, zero === -1 ? edidField.length : zero));
	}
	if (r.sig === sig) {
		const id = key.startsWith('0x') ? parseInt(key.slice(2), 16) : null;
		const edid = edids.get(r.formId) ?? (edidField ? edidField.toString('utf8', 0, edidField.indexOf(0) >>> 0) : '');
		if (id !== null ? r.formId === id : edidField && edid.toLowerCase() === key.toLowerCase()) {
			hits.push({ ...r, edid });
		}
	}
});

if (!hits.length) {
	console.log(`no ${sig} matching ${key}`);
	process.exit(1);
}

const describe = (data) => {
	const parts = [];
	for (let i = 0; i < data.length; i += 4) {
		parts.push(data.length - i >= 4 ? data.readUInt32LE(i).toString(16).padStart(8, '0') : data.subarray(i).toString('hex'));
	}
	return parts.join(' ');
};

for (const r of hits) {
	console.log(`\n=== ${r.sig} ${r.formId.toString(16).padStart(8, '0')} ${r.edid} flags=0x${r.flags.toString(16)} cell=${r.cell?.toString(16) ?? ''} ===`);
	for (const [fieldSig, values] of r.fields.map) {
		values.forEach((data, index) => {
			let text = '';
			if (data.length === 4) {
				const id = data.readUInt32LE(0);
				const str = strings.lookup('STRINGS', id);
				if (str) text = `str->${JSON.stringify(str)}`;
				const target = edids.get(id);
				if (target) text = `form->${target}`;
			}
			console.log(`${fieldSig}${values.length > 1 ? `[${index}]` : ''} len=${data.length} ${text} | ${describe(data)}`);
		});
	}
}
