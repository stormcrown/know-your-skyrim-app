// 验证 loadSystemFonts 会不会把系统字体填进三个下拉框。
import fs from 'node:fs';
import vm from 'node:vm';

function makeEl(tag = 'div') {
	const el = {
		tagName: tag, children: [], style: {}, dataset: {}, listeners: {},
		classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove(...c) { c.forEach((x) => this._s.delete(x)); }, toggle(c, on) { if (on === undefined ? !this._s.has(c) : on) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
		append(...nodes) { nodes.forEach((n) => this.children.push(n)); },
		appendChild(n) { this.children.push(n); return n; },
		setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
		addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler); },
		querySelectorAll() { return []; },
		focus() {}, blur() {}, select() {},
		title: '', hidden: false, value: '', textContent: '', onclick: null
	};
	return el;
}

const elements = new Map();
const document = {
	body: makeEl('body'), documentElement: makeEl('html'), title: '', activeElement: null,
	getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl()); return elements.get(id); },
	createElement(tag) { return makeEl(tag); },
	createTextNode(text) { return { nodeValue: text, parentElement: null }; },
	createTreeWalker() { return { nextNode: () => null }; },
	addEventListener() {}, querySelectorAll() { return []; }
};
document.documentElement.style = { setProperty() {} };
elements.set('theme', Object.assign(makeEl('select'), { value: 'auto' }));
for (const id of ['book-body-font', 'book-hand-font', 'book-title-font']) elements.set(id, makeEl('select'));

const payloads = {
	'/api/config': { config: { uiLang: 'zh-CN', bookBodyFont: '', bookHandFont: '', bookTitleFont: '' }, instances: [], profiles: [], saves: [], save: null, progress: null, index: { profile: 'p' }, rebuild: { running: false } },
	'/api/status': { meta: { profile: 'p', pluginCount: 1, language: 'chinese' }, entries: 3, byType: [], byFamily: [{ type: 'item', sig: 'WEAP', n: 3 }] },
	'/api/plugins': { plugins: [] },
	'/api/fonts': { fonts: ['Arial', 'SimSun', '微软雅黑'] },
	'/api/rebuild': { rebuild: { running: false } }
};

const errors = [];
const sandbox = {
	console: { log: () => {}, error: (...a) => errors.push(a.join(' ')), warn: () => {} },
	setTimeout, clearTimeout, setInterval, clearInterval,
	fetch: async (url) => {
		const key = String(url).split('?')[0];
		const body = payloads[key] || (key.startsWith('/api/search') ? { total: 0, rows: [] } : {});
		return { ok: true, status: 200, json: async () => body };
	},
	document, window: { addEventListener() {}, location: { hash: '' }, KYS_EN: {} },
	location: { hash: '' }, history: { replaceState() {} }, localStorage: { getItem: () => null, setItem() {} },
	navigator: { language: 'zh-CN', languages: ['zh-CN'], clipboard: { writeText() {} } },
	URLSearchParams, Option: function (t, v) { return { text: t, value: v }; },
	NodeFilter: { SHOW_TEXT: 4 }, Intl, Math, Date, JSON, Object, Array, Map, Set, Number, String, Boolean, RegExp, Error, Promise
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/web/i18n.js', 'utf8'), sandbox);
try {
	vm.runInContext(fs.readFileSync('src/web/app.js', 'utf8'), sandbox, { filename: 'app.js' });
} catch (err) {
	errors.push('sync: ' + err.stack);
}
process.on('unhandledRejection', (err) => errors.push('reject: ' + (err && err.stack)));
await new Promise((r) => setTimeout(r, 1500));
console.log('state.config:', vm.runInContext('JSON.stringify(state && state.config)', sandbox));
console.log('loadSystemFonts 存在:', vm.runInContext('typeof loadSystemFonts', sandbox));
console.log('手动调用:', await vm.runInContext('loadSystemFonts().then(() => "ok").catch((e) => "err: " + e.message)', sandbox));
const select = elements.get('book-body-font');
console.log('子元素:', select.children.length, '第一个 value:', JSON.stringify(select.children[0] && select.children[0].value));
console.log('控制台错误:', errors.slice(0, 2).join(' | ') || '无');
