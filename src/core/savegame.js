// A Skyrim SE save file, read for the things the app can show beside the load order: who the character is, when
// and where it was saved.
//
// Only the header is read. Quest progress lives in the compressed change-form block, whose per-record layout is
// not documented anywhere I trust, and a wrong guess would show wrong stages — so the app does not guess.

import fs from 'node:fs';
import path from 'node:path';

const MAGIC = 'TESV_SAVEGAME';

class Reader {
	constructor(buffer, offset = 0) {
		this.buffer = buffer;
		this.pos = offset;
	}

	u8() {
		return this.buffer[this.pos++];
	}

	u16() {
		const v = this.buffer.readUInt16LE(this.pos);
		this.pos += 2;
		return v;
	}

	u32() {
		const v = this.buffer.readUInt32LE(this.pos);
		this.pos += 4;
		return v;
	}

	f32() {
		const v = this.buffer.readFloatLE(this.pos);
		this.pos += 4;
		return v;
	}

	// Skyrim SE keeps save strings as a u16 byte length followed by UTF-8.
	str() {
		const length = this.u16();
		const text = this.buffer.toString('utf8', this.pos, this.pos + length);
		this.pos += length;
		return text;
	}
}

export function readSaveFile(file) {
	const buffer = fs.readFileSync(file);
	if (buffer.length < 64 || buffer.toString('latin1', 0, MAGIC.length) !== MAGIC) {
		throw new Error('不是上古卷轴存档（没有 TESV_SAVEGAME 头）');
	}

	const reader = new Reader(buffer, MAGIC.length);
	const headerSize = reader.u32();
	const version = reader.u32();
	const saveNumber = reader.u32();
	const playerName = reader.str();
	const playerLevel = reader.u32();
	const playerLocation = reader.str();
	const gameTime = reader.str();
	const playerRace = reader.str();
	const playerSex = reader.u16();

	return {
		file,
		fileName: path.basename(file),
		headerSize,
		version,
		saveNumber,
		playerName,
		playerLevel,
		playerLocation,
		gameTime,
		playerRace,
		playerSex: playerSex === 1 ? '女' : '男',
		mtime: fs.statSync(file).mtimeMs,
		mtimeText: new Date(fs.statSync(file).mtimeMs).toLocaleString('zh-CN', { hour12: false })
	};
}

// The saves a profile can see: the profile's own folder if Mod Organizer keeps saves per profile, then the
// Documents folder the game writes to.
export function listSaves({ profileSavesDir, documentsSavesDir } = {}) {
	const dirs = [profileSavesDir, documentsSavesDir].filter(Boolean);
	const found = [];
	for (const dir of dirs) {
		let names = [];
		try {
			names = fs.readdirSync(dir);
		} catch {
			continue;
		}
		for (const name of names) {
			if (!name.toLowerCase().endsWith('.ess')) continue;
			const file = path.join(dir, name);
			let stat;
			try {
				stat = fs.statSync(file);
			} catch {
				continue;
			}
			found.push({ file, name, dir, size: stat.size, mtime: stat.mtimeMs, label: describeSaveName(name) });
		}
	}
	return found.sort((a, b) => b.mtime - a.mtime);
}

// Save names look like: Save731_82ADEBEC_0_<name hex>_<location>_<time>_<date>_<level>_1.ess
function describeSaveName(name) {
	const base = name.replace(/\.ess$/i, '');
	const parts = base.split('_');
	const kind = parts[0] || base;
	const tail = parts[parts.length - 3] || '';
	const level = parts[parts.length - 2] || '';
	const when =
		tail.length === 14 ? `${tail.slice(0, 4)}-${tail.slice(4, 6)}-${tail.slice(6, 8)} ${tail.slice(8, 10)}:${tail.slice(10, 12)}` : '';
	return { kind, when, level };
}
