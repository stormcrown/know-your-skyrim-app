// Bethesda BSA reader (Skyrim SE v105, and v104). No dependencies.
//
// 关键点（UESP 的 Skyrim:Archive File Format）：
//   - v105 的文件夹记录是 24 字节：hash u64 / count u32 / 保留 u32 / offset u32 / 保留 u32
//   - 这个 offset 存的是「实际偏移 + totalFileNameLength」，要减回去才是真的位置
//   - 每个文件夹的实际位置开始是它的名字（bzstring），紧跟着这个文件夹的文件记录
//   - 文件记录 16 字节：hash u64 / size u32 / offset u32；size 的第 30 位是「压缩开关反了」
//   - 大包动辄一两 G，元数据只读开头一段，文件数据按偏移现读

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MAGIC = 0x00415342; // 'BSA\0'

function readBzString(buffer, cursor) {
	const length = buffer[cursor];
	let name = buffer.toString('latin1', cursor + 1, cursor + 1 + length);
	if (name.endsWith('\0')) name = name.slice(0, -1);
	const next = cursor + 1 + length + (buffer[cursor + 1 + length] === 0 ? 1 : 0);
	return { value: name, next };
}

export function readBsa(file, { lazy = true } = {}) {
	const size = fs.statSync(file).size;
	const headSize = Math.min(size, 32 * 1024 * 1024);
	const head = Buffer.allocUnsafe(headSize);
	const handle = fs.openSync(file, 'r');
	fs.readSync(handle, head, 0, headSize, 0);

	if (head.readUInt32LE(0) !== MAGIC) throw new Error(`${path.basename(file)} 不是 BSA 文件`);

	const version = head.readUInt32LE(4);
	const folderOffset = head.readUInt32LE(8);
	const archiveFlags = head.readUInt32LE(12);
	const folderCount = head.readUInt32LE(16);
	const fileNameLength = head.readUInt32LE(28);
	const compressedByDefault = (archiveFlags & 0x4) !== 0;
	const folderRecordSize = version >= 105 ? 24 : 16;

	const folders = [];
	for (let i = 0; i < folderCount; i += 1) {
		const base = folderOffset + i * folderRecordSize;
		folders.push({
			hash: head.readBigUInt64LE(base),
			count: head.readUInt32LE(base + 8),
			offset: head.readUInt32LE(base + folderRecordSize - 8) - fileNameLength
		});
	}

	const entries = [];
	for (const folder of folders) {
		let cursor = folder.offset;
		const read = readBzString(head, cursor);
		folder.name = read.value;
		cursor = read.next;
		for (let i = 0; i < folder.count; i += 1) {
			const hash = head.readBigUInt64LE(cursor);
			let entrySize = head.readUInt32LE(cursor + 8);
			const offset = head.readUInt32LE(cursor + 12);
			cursor += 16;
			const inverted = (entrySize & 0x40000000) !== 0;
			entrySize &= 0x3fffffff;
			const compressed = inverted ? !compressedByDefault : compressedByDefault;
			entries.push({ folder: folder.name, size: entrySize, offset, hash, compressed });
		}
	}

	// 文件名表：最后一块文件记录之后
	let cursor = 0;
	for (const folder of folders) {
		const read = readBzString(head, folder.offset);
		cursor = Math.max(cursor, read.next + folder.count * 16);
	}
	for (const entry of entries) {
		const end = head.indexOf(0, cursor);
		if (end < 0) throw new Error(`${path.basename(file)} 的文件名表超出读取范围`);
		entry.name = head.toString('latin1', cursor, end);
		entry.path = `${entry.folder}\\${entry.name}`;
		cursor = end + 1;
	}

	const readRange = (offset, length) => {
		const chunk = Buffer.allocUnsafe(length);
		fs.readSync(handle, chunk, 0, length, offset);
		return chunk;
	};

	return {
		file,
		version,
		folderCount,
		fileCount: entries.length,
		archiveFlags,
		entries,
		read(entry) {
			// 有些包（archiveFlags 第 9 位）在每个数据块前面塞了一份完整路径；size 只算数据本身，不含这份路径
			let skip = 0;
			if (archiveFlags & 0x100) {
				const peek = readRange(entry.offset, Math.min(entry.size + 512, 512));
				const length = peek[0];
				skip = 1 + length + (peek[1 + length] === 0 ? 1 : 0);
			}
			const raw = readRange(entry.offset + skip, entry.size);
			if (!entry.compressed) return raw;
			if (version >= 105) {
				const originalSize = raw.readUInt32LE(0);
				return lz4Block(raw.subarray(4), originalSize);
			}
			return zlib.inflateSync(raw);
		},
		close() {
			fs.closeSync(handle);
		}
	};
}

// LZ4 块格式（Skyrim SE 的 BSA 用这个，和存档里一样）
export function lz4Block(input, size) {
	const output = Buffer.alloc(size);
	let ip = 0;
	let op = 0;
	while (ip < input.length) {
		const token = input[ip];
		ip += 1;
		let literals = token >> 4;
		if (literals === 15) {
			while (ip < input.length) {
				const extra = input[ip];
				ip += 1;
				literals += extra;
				if (extra !== 255) break;
			}
		}
		const literalEnd = Math.min(ip + literals, input.length);
		input.copy(output, op, ip, literalEnd);
		ip = literalEnd;
		op += literals;
		if (ip + 2 > input.length || op >= size) break;
		const offset = input.readUInt16LE(ip);
		ip += 2;
		let match = token & 0x0f;
		if (match === 15) {
			while (ip < input.length) {
				const extra = input[ip];
				ip += 1;
				match += extra;
				if (extra !== 255) break;
			}
		}
		match += 4;
		for (let i = 0; i < match && op < size; i += 1) {
			output[op] = output[op - offset];
			op += 1;
		}
	}
	return output.subarray(0, op);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
	const [command, archive, pattern, outDir] = process.argv.slice(2);
	if (!command || !archive) {
		console.log('用法：node tools/bsa.js list <文件.bsa> [过滤正则]');
		console.log('      node tools/bsa.js extract <文件.bsa> <过滤正则> <输出目录>');
		process.exit(0);
	}
	const bsa = readBsa(archive);
	const filter = pattern ? new RegExp(pattern, 'i') : null;
	const matched = bsa.entries.filter((entry) => !filter || filter.test(entry.path));
	if (command === 'list') {
		for (const entry of matched) console.log(`${entry.size}\t${entry.path}`);
		console.log(`共 ${matched.length} / ${bsa.fileCount} 个文件，版本 ${bsa.version}`);
	} else if (command === 'extract') {
		if (!outDir) {
			console.error('要指定输出目录');
			process.exit(1);
		}
		for (const entry of matched) {
			const target = path.join(outDir, entry.path.replace(/\\/g, path.sep));
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.writeFileSync(target, bsa.read(entry));
		}
		console.log(`解出 ${matched.length} 个文件到 ${outDir}`);
	} else {
		console.error(`不认识的命令：${command}`);
		process.exit(1);
	}
	bsa.close();
}
