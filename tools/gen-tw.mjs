// 用 OpenCC 的简繁字表，生成只包含我们界面用到的字（几百个）的转换表，别把整张表塞进前端。
// 用法：node tools/gen-tw.mjs

import fs from 'node:fs';

const table = fs.readFileSync('data/_st.txt', 'utf8');
const chars = fs.readFileSync('data/_zh_chars.txt', 'utf8');

const map = new Map();
for (const line of table.split('\n')) {
	if (!line || line.startsWith('#')) continue;
	const [key, values] = line.split('\t');
	if (!key || key.length !== 1 || !values) continue;
	const first = values.trim().split(' ')[0];
	if (first && first !== key) map.set(key, first);
}

// 词级例外：一个字在不同的词里要转不同形，先把这些词整体换掉
const words = {
	制作: '製作',
	制皮: '製皮',
	系统: '系統',
	后台: '後台',
	里面: '裡面',
	头发: '頭髮',
	干: '幹'
};

const pairs = [];
for (const ch of chars) {
	if (map.has(ch)) pairs.push(ch + map.get(ch));
}
// 按两字一组拼成字符串，节省体积
let out = '';
for (const pair of pairs) out += pair;

const file = `// 界面用的简→繁对照（由 OpenCC 的 STCharacters.txt 里抽出我们实际用到的字）。
// 键是简体字，值是繁体字；词级例外在 WORD_TW 里先替换。
// 重新生成：node tools/gen-tw.mjs

window.KYS_TW_PAIRS = ${JSON.stringify(out)};

window.KYS_TW_WORDS = ${JSON.stringify(words)};

window.toTraditional = function toTraditional(text) {
	if (!text) return text;
	let result = text;
	for (const [from, to] of Object.entries(window.KYS_TW_WORDS || {})) {
		if (result.includes(from)) result = result.split(from).join(to);
	}
	const pairs = window.KYS_TW_PAIRS || '';
	const table = (window.__kysTwCache ||= (() => {
		const cache = new Map();
		for (let i = 0; i + 1 < pairs.length; i += 2) cache.set(pairs[i], pairs[i + 1]);
		return cache;
	})());
	let converted = '';
	for (const ch of result) converted += table.get(ch) || ch;
	return converted;
};
`;

fs.writeFileSync('src/web/i18n-tw.js', file);
console.log('生成', pairs.length, '个字对');
