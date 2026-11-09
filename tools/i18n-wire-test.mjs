// 检查 wire() 有没有中途抛错、语言下拉的 change 事件有没有挂上。
import fs from 'node:fs';
import vm from 'node:vm';

function makeEl(tag = 'div') {
	const el = {
		tagName: tag,
		children: [],
		style: {},
		dataset: {},
		listeners: {},
		classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove(...c) { c.forEach((x) => this._s.delete(x)); }, toggle(c, on) { if (on === undefined ? !this._s.has(c) : on) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
		append(...nodes) { nodes.forEach((n) => this.children.push(n)); },
		appendChild(n) { this.children.push(n); return n; },
		setAttribute() {},
		getAttribute() { return null; },
		hasAttribute() { return false; },
		addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler); },
		querySelectorAll() { return []; },
		focus() {},
		blur() {},
		select() {},
		title: '',
		hidden: false,
		value: '',
		textContent: '',
		onclick: null
	};
	return el;
}

const elements = new Map();
const document = {
	body: makeEl('body'),
	documentElement: makeEl('html'),
	title: '',
	activeElement: null,
	getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl()); return elements.get(id); },
	createElement(tag) { return makeEl(tag); },
	createTextNode(text) { return { nodeValue: text, parentElement: null }; },
	createTreeWalker() { return { nextNode: () => null }; },
	addEventListener() {},
	querySelectorAll() { return []; }
};
document.documentElement.style = { setProperty() {} };
elements.set('theme', Object.assign(makeEl('select'), { value: 'auto' }));

const payloads = {
	'/api/config': { config: { instanceId: '', profile: '', language: 'chinese', uiLang: 'zh', saveFile: '', port: 4820 }, instances: [], profiles: [], saves: [], save: null, progress: null, index: { profile: 'p' }, rebuild: { running: false } },
	'/api/status': { meta: { profile: 'p', pluginCount: 1, language: 'chinese' }, entries: 3, byType: [], byFamily: [{ type: 'item', sig: 'WEAP', n: 3 }] },
	'/api/plugins': { plugins: [{ idx: 0, name: 'Skyrim.esm', entries: 3 }] },
	'/api/rebuild': { rebuild: { running: false } }
};

const errors = [];
const sandbox = {
	console: { log: () => {}, error: (...args) => errors.push(args.join(' ')), warn: () => {} },
	setTimeout, clearTimeout, setInterval, clearInterval,
	fetch: async (url) => {
		const key = String(url).split('?')[0];
		const body = payloads[key] || (key.startsWith('/api/search') ? { total: 1, rows: [] } : { error: 'stub' });
		return { ok: true, status: 200, json: async () => body };
	},
	document,
	window: { addEventListener() {}, location: { hash: '' }, KYS_EN: {} },
	location: { hash: '' },
	history: { replaceState() {} },
	localStorage: { getItem: () => null, setItem() {} },
	navigator: { clipboard: { writeText() {} } },
	URLSearchParams,
	Option: function (text, value) { return { text, value }; },
	NodeFilter: { SHOW_TEXT: 4 },
	Intl, Math, Date, JSON, Object, Array, Map, Set, Number, String, Boolean, RegExp, Error, Promise
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/web/i18n.js', 'utf8'), sandbox);
try {
	vm.runInContext(fs.readFileSync('src/web/app.js', 'utf8'), sandbox, { filename: 'app.js' });
} catch (err) {
	errors.push('同步抛出: ' + err.stack);
}
await new Promise((r) => setTimeout(r, 1500));
console.log('字幕:', JSON.stringify(elements.get('subtitle')?.textContent));
const lang = elements.get('ui-lang');
console.log('ui-lang 上挂的 change 监听:', (lang.listeners.change || []).length);
console.log('console.error 次数:', errors.length);
if (errors.length) console.log(errors.slice(0, 3).join('\n---\n'));
