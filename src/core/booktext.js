// 给书籍做两件事：
//   1) 把正文里的 <Alias=Player> 换成存档里的角色名，<Global=x> 换成全局变量的值；
//   2) 让 <img src='img://...'> 指到解出来的图片上（/bookart/ 静态目录）。

import fs from 'node:fs';
import path from 'node:path';

const MIME = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.dds': 'image/x-dds'
};

export function resolveBookTokens(db, text, playerName) {
	if (!text) return text;
	let out = text;

	// 玩家名：存档里有就用存档的，没有就写成「你」
	out = out.replace(/<Alias=Player>/gi, playerName || '你');

	// 全局变量：查 GLOB 记录，把值写进去；查不到就保留原样
	out = out.replace(/<Global=([A-Za-z0-9_]+)>/g, (whole, name) => {
		try {
			const row = db.prepare("SELECT data FROM entries WHERE sig='GLOB' AND edid = ?").get(name);
			if (!row) return whole;
			const value = JSON.parse(row.data || '{}').value;
			if (value === undefined || value === null) return whole;
			return String(Math.round(value * 1000) / 1000);
		} catch {
			return whole;
		}
	});

	// 其它别名是任务运行时才填的，这里没有信息可填，标成〔名字〕，别让页面露尖括号
	out = out.replace(/<Alias=([A-Za-z0-9_]+)>/g, '〔$1〕');

	return out;
}

export function serveBookArt(req, res, root) {
	const url = new URL(req.url, 'http://127.0.0.1');
	const relative = decodeURIComponent(url.pathname.slice('/bookart/'.length)).replace(/\//g, path.sep);
	const target = path.resolve(root, relative);
	if (!target.startsWith(path.resolve(root))) {
		res.writeHead(403);
		res.end('forbidden');
		return true;
	}
	let data;
	try {
		data = fs.readFileSync(target);
	} catch {
		res.writeHead(404);
		res.end('not found');
		return true;
	}
	res.writeHead(200, {
		'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
		'Cache-Control': 'public, max-age=86400'
	});
	res.end(data);
	return true;
}
