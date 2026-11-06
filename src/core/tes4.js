// The on-disk shape of a Skyrim plugin (.esm / .esp / .esl): a TES4 header followed by records and groups.
// Everything here works on raw buffers; the meaning of the fields lives in extract.js.

import zlib from 'node:zlib';

const GROUP = 'GRUP';
export const FLAG_COMPRESSED = 0x00040000;
export const FLAG_LOCALIZED = 0x00000080;

// Group types we care about: the label of these is the form id of the cell their records live in.
const CELL_GROUPS = new Set([6, 8, 9, 10]);
export const GROUP_WORLD_CHILDREN = 1;
export const GROUP_CELL_CHILDREN = 6;
export const GROUP_CELL_PERSISTENT = 8;
export const GROUP_CELL_TEMPORARY = 9;
export const GROUP_CELL_DISTANT = 10;

export class Fields {
	constructor(buffer, start, end) {
		this.map = new Map();
		// The order the fields sit in matters: a quest stage's journal line only means something right after its
		// INDX, an objective's text only right after its QOBJ.
		this.order = [];
		let pos = start;
		while (pos + 6 <= end) {
			const sig = buffer.toString('latin1', pos, pos + 4);
			let size = buffer.readUInt16LE(pos + 4);
			pos += 6;
			if (sig === 'XXXX') {
				if (pos + 4 > end) break;
				size = buffer.readUInt32LE(pos);
				pos += 4;
				continue;
			}
			if (pos + size > end) size = Math.max(0, end - pos);
			const data = buffer.subarray(pos, pos + size);
			this.order.push({ sig, data });
			const list = this.map.get(sig);
			if (list) list.push(data);
			else this.map.set(sig, [data]);
			pos += size;
		}
	}

	has(sig) {
		return this.map.has(sig);
	}

	// First field with this signature, or undefined.
	get(sig) {
		const list = this.map.get(sig);
		return list ? list[0] : undefined;
	}

	all(sig) {
		return this.map.get(sig) || [];
	}

	// First field's data as an unsigned 32 bit number (a form id, a string id, a flag word).
	u32(sig) {
		const b = this.get(sig);
		return b && b.length >= 4 ? b.readUInt32LE(0) : undefined;
	}

	u16(sig) {
		const b = this.get(sig);
		return b && b.length >= 2 ? b.readUInt16LE(0) : undefined;
	}

	u8(sig) {
		const b = this.get(sig);
		return b && b.length >= 1 ? b[0] : undefined;
	}

	f32(sig, offset = 0) {
		const b = this.get(sig);
		return b && b.length >= offset + 4 ? b.readFloatLE(offset) : undefined;
	}

	i32(sig, offset = 0) {
		const b = this.get(sig);
		return b && b.length >= offset + 4 ? b.readInt32LE(offset) : undefined;
	}
}

// Reads the TES4 header record. Returns where the body starts and what the file says about itself.
export function readHeader(buffer) {
	if (buffer.length < 24 || buffer.toString('latin1', 0, 4) !== 'TES4') {
		throw new Error('not a plugin: missing the TES4 header');
	}
	const dataSize = buffer.readUInt32LE(4);
	const flags = buffer.readUInt32LE(8);
	const bodyEnd = 24 + dataSize;
	const fields = new Fields(buffer, 24, Math.min(bodyEnd, buffer.length));
	const hdr = fields.get('HEDR');
	const version = hdr && hdr.length >= 4 ? hdr.readFloatLE(0) : 0;
	const numRecords = hdr && hdr.length >= 8 ? hdr.readUInt32LE(4) : 0;
	const masters = fields.all('MAST').map((b) => {
		const zero = b.indexOf(0);
		return b.toString('latin1', 0, zero === -1 ? b.length : zero);
	});
	const localized = (flags & FLAG_LOCALIZED) !== 0;
	return { version, numRecords, masters, localized, flags, bodyStart: bodyEnd, bodyEnd: bodyEnd };
}

// Walks every record of a plugin body, handing each one to `onRecord`.
// `ctx` carries what the enclosing groups say: the cell a reference sits in, the world it belongs to.
export function walkRecords(buffer, start, end, ctx, onRecord) {
	let pos = start;
	while (pos + 24 <= end) {
		const sig = buffer.toString('latin1', pos, pos + 4);
		if (sig === GROUP) {
			const size = buffer.readUInt32LE(pos + 4);
			if (size < 24 || pos + size > end) break;
			const label = buffer.readUInt32LE(pos + 8);
			const type = buffer.readInt32LE(pos + 12);
			let childCtx = ctx;
			if (CELL_GROUPS.has(type)) {
				if (ctx.cell !== label) childCtx = { ...ctx, cell: label };
			} else if (type === GROUP_WORLD_CHILDREN) {
				childCtx = { ...ctx, world: label, cell: undefined };
			}
			walkRecords(buffer, pos + 24, pos + size, childCtx, onRecord);
			pos += size;
			continue;
		}

		const dataSize = buffer.readUInt32LE(pos + 4);
		const flags = buffer.readUInt32LE(pos + 8);
		const formId = buffer.readUInt32LE(pos + 12);
		const next = pos + 24 + dataSize;
		if (next > end) break;

		let data = buffer;
		let dataStart = pos + 24;
		let dataEnd = next;
		if (flags & FLAG_COMPRESSED) {
			const raw = buffer.readUInt32LE(dataStart);
			const packed = buffer.subarray(dataStart + 4, next);
			data = zlib.inflateSync(packed);
			dataStart = 0;
			dataEnd = data.length;
			if (raw !== data.length) {
				// Not fatal: the declared size is the decompressed one, but some tools write it lazily.
			}
		}

		onRecord({
			sig,
			formId,
			flags,
			fields: new Fields(data, dataStart, dataEnd),
			cell: ctx.cell,
			world: ctx.world
		});
		pos = next;
	}
}

// A quick census of a plugin: how many records of each signature. Used by the spike and by the info page.
export function census(buffer) {
	const counts = new Map();
	const header = readHeader(buffer);
	walkRecords(buffer, header.bodyStart, buffer.length, {}, (r) => {
		counts.set(r.sig, (counts.get(r.sig) || 0) + 1);
	});
	return { header, counts };
}
