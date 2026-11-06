// Quest progress out of a save file.
//
// The save compresses everything after the header: LZ4 block format in SE (compression type 2), zlib in older
// saves (type 1). Inside sits the change-form list; a quest is in it once the game has touched it, and its stages
// come as a run of {int16 stage, uint8 status}. The list is walked by reading each form's lengths, and every stage
// found is checked against the stages the plugin actually defines — a wrong offset almost never survives that,
// so the numbers shown are the save's own and not a guess.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MAGIC = 'TESV_SAVEGAME';
const FORM_QUST = 8;
const QUEST_STAGES_FLAG = 0x80000000;
const QUEST_FLAGS_FLAG = 0x00000002;
const QUEST_SCRIPT_DELAY_FLAG = 0x00000004;
const FORM_FLAGS_FLAG = 0x00000001;

export function lz4Block(src, outLength) {
	const dst = Buffer.allocUnsafe(outLength);
	let ip = 0;
	let op = 0;
	while (ip < src.length) {
		const token = src[ip++];
		let literals = token >>> 4;
		if (literals === 15) {
			let b;
			do {
				b = src[ip++];
				literals += b;
			} while (b === 255);
		}
		src.copy(dst, op, ip, ip + literals);
		ip += literals;
		op += literals;
		if (ip >= src.length) break;
		const offset = src[ip] | (src[ip + 1] << 8);
		ip += 2;
		let match = token & 0x0f;
		if (match === 15) {
			let b;
			do {
				b = src[ip++];
				match += b;
			} while (b === 255);
		}
		match += 4;
		let from = op - offset;
		if (from < 0) throw new Error('LZ4 数据损坏（回溯越界）');
		for (let i = 0; i < match; i++) dst[op++] = dst[from++];
	}
	return dst.subarray(0, op);
}

function str16(buffer, at) {
	const length = buffer.readUInt16LE(at);
	const text = buffer.toString('utf8', at + 2, at + 2 + length);
	return [text, at + 2 + length];
}

// Header + plugin lists + the decompressed body.
export function readSaveContent(buffer) {
	if (buffer.toString('latin1', 0, MAGIC.length) !== MAGIC) throw new Error('不是上古卷轴存档');
	let at = MAGIC.length;
	const headerSize = buffer.readUInt32LE(at);
	const version = buffer.readUInt32LE(at + 4);
	const saveNumber = buffer.readUInt32LE(at + 8);
	at += 12;
	const [playerName, afterName] = str16(buffer, at);
	const playerLevel = buffer.readUInt32LE(afterName);
	const [playerLocation, afterLocation] = str16(buffer, afterName + 4);
	const [gameTime, afterTime] = str16(buffer, afterLocation);
	const [playerRace, afterRace] = str16(buffer, afterTime);
	const playerSex = buffer.readUInt16LE(afterRace);
	const afterSex = afterRace + 2;
	const playerCurExp = buffer.readFloatLE(afterSex);
	const playerLvlUpExp = buffer.readFloatLE(afterSex + 4);
	// filetime u64, then the screenshot size and the compression type
	const shotWidth = buffer.readUInt32LE(afterSex + 16);
	const shotHeight = buffer.readUInt32LE(afterSex + 20);
	const compressionType = buffer.readUInt16LE(afterSex + 24);

	const screenshotEnd = MAGIC.length + 4 + headerSize + shotWidth * shotHeight * 4;
	const uncompressedLength = buffer.readUInt32LE(screenshotEnd);
	const compressedLength = buffer.readUInt32LE(screenshotEnd + 4);
	const payloadStart = screenshotEnd + 8;

	let content;
	if (compressionType === 2) {
		content = lz4Block(buffer.subarray(payloadStart, payloadStart + compressedLength), uncompressedLength);
	} else if (compressionType === 1) {
		content = zlib.inflateSync(buffer.subarray(payloadStart, payloadStart + compressedLength));
	} else {
		content = buffer.subarray(payloadStart, payloadStart + uncompressedLength);
	}

	// formVersion, plugin info, light plugin info
	let cur = 0;
	const formVersion = content[cur++];
	const pluginInfoSize = content.readUInt32LE(cur);
	cur += 4;
	const pluginCount = content[cur++];
	const plugins = [];
	for (let i = 0; i < pluginCount; i++) {
		const [name, next] = str16(content, cur);
		plugins.push(name);
		cur = next;
	}
	const lightCount = content.readUInt16LE(cur);
	cur += 2;
	const lightPlugins = [];
	for (let i = 0; i < lightCount; i++) {
		const [name, next] = str16(content, cur);
		lightPlugins.push(name);
		cur = next;
	}

	return {
		content,
		formVersion,
		pluginInfoSize,
		plugins,
		lightPlugins,
		header: { version, saveNumber, playerName, playerLevel, playerLocation, gameTime, playerRace, playerSex, playerCurExp, playerLvlUpExp, compressionType, shotWidth, shotHeight }
	};
}

function readFormIdArray(content, offset) {
	const count = content.readUInt32LE(offset);
	const array = new Uint32Array(count);
	for (let i = 0; i < count; i++) array[i] = content.readUInt32LE(offset + 4 + i * 4);
	return array;
}

function vsval(content, at) {
	const b = content[at];
	const kind = b & 3;
	if (kind === 0) return [b >>> 2, at + 1];
	if (kind === 1) return [content.readUInt16LE(at) >>> 2, at + 2];
	if (kind === 2) return [(content.readUInt32LE(at) & 0xffffff) >>> 2, at + 3];
	return [content.readUInt32LE(at) >>> 2, at + 4];
}

// A quest is "met" once its change form exists. The stage numbers are checked against the stages the plugins give,
// so an offset that only looks like a quest change form is thrown away.
export function readQuestProgress(saveFile, questStages) {
	const buffer = fs.readFileSync(saveFile);
	const parsed = readSaveContent(buffer);
	const content = parsed.content;

	// The file location table sits right after the two plugin lists, before the tables it points into. Its offsets
	// are relative to the uncompressed image (header + screenshot + content), so shift them back into `content`.
	const headerImageStart = MAGIC.length + 4 + 88 + 4 * parsed.header.shotWidth * parsed.header.shotHeight + 8;
	const tableAt = (() => {
		let at = 1 + 4 + 1;
		for (const name of parsed.plugins) at += 2 + Buffer.byteLength(name);
		at += 2;
		for (const name of parsed.lightPlugins) at += 2 + Buffer.byteLength(name);
		return at;
	})();
	const table = [];
	for (let i = 0; i < 25; i++) table.push(content.readUInt32LE(tableAt + i * 4));
	const shift = (value) => (value >= headerImageStart ? value - headerImageStart : value);
	const formIDArrayOffset = shift(table[0]);
	const formIDArray = readFormIdArray(content, formIDArrayOffset);

	const resolve = (kind, formID) => {
		if (kind === 1) return formID >>> 0;
		if (kind === 0) {
			if (formID === 0) return 0;
			const index = formID - 1;
			return index < formIDArray.length ? formIDArray[index] >>> 0 : 0;
		}
		return (0xff000000 | formID) >>> 0;
	};

	const found = new Map();
	const limit = content.length - 32;
	for (let p = 0; p < limit; p++) {
		const typeByte = content[p + 7];
		if ((typeByte & 0x3f) !== FORM_QUST) continue;
		const b0 = content[p];
		const kind = b0 >>> 6;
		if (kind !== 0 && kind !== 1) continue;
		const formID = ((b0 & 0x3f) << 16) | (content[p + 1] << 8) | content[p + 2];
		const quest = questStages.get(resolve(kind, formID));
		if (!quest) continue;

		const changeFlags = content.readUInt32LE(p + 3);
		if ((changeFlags & 0xff) === 0 && changeFlags !== 0) continue;
		const sizeKind = typeByte >>> 6;
		if (sizeKind === 3) continue;
		const version = content[p + 8];
		if (version !== 78 && version !== 74 && version !== 64 && version !== 57) continue;

		let at = p + 9;
		const readLength = () => {
			if (sizeKind === 0) return content[at++];
			if (sizeKind === 1) {
				const v = content.readUInt16LE(at);
				at += 2;
				return v;
			}
			const v = content.readUInt32LE(at);
			at += 4;
			return v;
		};
		const length = readLength();
		const unpacked = readLength();
		if (!length || at + length > content.length || length > 0x100000) continue;
		const dataEnd = at + length;
		let cursor = at;

		if (changeFlags & FORM_FLAGS_FLAG) cursor += 6;
		if (changeFlags & QUEST_FLAGS_FLAG) cursor += 2;
		if (changeFlags & QUEST_SCRIPT_DELAY_FLAG) cursor += 4;
		if (cursor > dataEnd) continue;

		const stages = [];
		if (changeFlags & QUEST_STAGES_FLAG) {
			const [count, afterCount] = vsval(content, cursor);
			if (count > 400 || afterCount + count * 3 > dataEnd) continue;
			let c = afterCount;
			let allKnown = true;
			for (let i = 0; i < count; i++) {
				const stage = content.readInt16LE(c);
				const status = content[c + 2];
				c += 3;
				if (!quest.stages.has(stage)) {
					allKnown = false;
					break;
				}
				stages.push({ stage, done: status !== 0 });
			}
			if (!allKnown) continue;
		}

		const previous = found.get(quest.formid);
		if (!previous || stages.length > previous.stages.length) {
			found.set(quest.formid, {
				formid: quest.formid,
				name: quest.name,
				changeFlags,
				version,
				compressed: unpacked !== 0,
				stages
			});
		}
	}

	return {
		file: saveFile,
		fileName: path.basename(saveFile),
		parsedAt: Date.now(),
		formVersion: parsed.formVersion,
		pluginCount: parsed.plugins.length + parsed.lightPlugins.length,
		header: parsed.header,
		quests: [...found.values()].map((quest) => ({
			...quest,
			currentStage: quest.stages.length ? Math.max(...quest.stages.map((s) => s.stage)) : null,
			doneStages: quest.stages.filter((s) => s.done).length
		}))
	};
}
