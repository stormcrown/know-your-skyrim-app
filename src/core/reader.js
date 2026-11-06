// Little-endian cursor over a Buffer, plus the small binary helpers the plugin parser needs.

export class Cursor {
	constructor(buffer, start = 0, end = buffer.length) {
		this.buffer = buffer;
		this.pos = start;
		this.end = end;
	}

	get remaining() {
		return this.end - this.pos;
	}

	require(n) {
		if (this.pos + n > this.end) {
			throw new RangeError(`read past end: want ${n} at ${this.pos}, end ${this.end}`);
		}
	}

	u8() {
		this.require(1);
		return this.buffer[this.pos++];
	}

	i8() {
		this.require(1);
		const v = this.buffer.readInt8(this.pos);
		this.pos += 1;
		return v;
	}

	u16() {
		this.require(2);
		const v = this.buffer.readUInt16LE(this.pos);
		this.pos += 2;
		return v;
	}

	i16() {
		this.require(2);
		const v = this.buffer.readInt16LE(this.pos);
		this.pos += 2;
		return v;
	}

	u32() {
		this.require(4);
		const v = this.buffer.readUInt32LE(this.pos);
		this.pos += 4;
		return v;
	}

	i32() {
		this.require(4);
		const v = this.buffer.readInt32LE(this.pos);
		this.pos += 4;
		return v;
	}

	u64() {
		this.require(8);
		const v = this.buffer.readBigUInt64LE(this.pos);
		this.pos += 8;
		return v;
	}

	f32() {
		this.require(4);
		const v = this.buffer.readFloatLE(this.pos);
		this.pos += 4;
		return v;
	}

	sig() {
		this.require(4);
		const v = this.buffer.toString('latin1', this.pos, this.pos + 4);
		this.pos += 4;
		return v;
	}

	bytes(n) {
		this.require(n);
		const v = this.buffer.subarray(this.pos, this.pos + n);
		this.pos += n;
		return v;
	}

	// A null terminated string in the game's own (usually windows-1252) bytes; utf8 also lands fine for ASCII.
	zstring(limit = this.end) {
		const from = this.pos;
		let i = from;
		while (i < limit && this.buffer[i] !== 0) i++;
		const v = this.buffer.toString('utf8', from, i);
		this.pos = Math.min(i + 1, limit);
		return v;
	}

	skip(n) {
		this.require(n);
		this.pos += n;
	}
}

export function latin1(buffer) {
	return buffer.toString('latin1');
}

// Text out of a fixed length string field, cut at the first null.
export function fixedString(buffer) {
	const zero = buffer.indexOf(0);
	return buffer.toString('utf8', 0, zero === -1 ? buffer.length : zero);
}
