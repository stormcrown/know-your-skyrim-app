// The page: families on top, a list with pages on the left, the entry on the right, settings on the side.
// No framework, no build.

const FAMILIES = [
	{ key: 'all', label: '全部', types: [], sigs: [] },
	{ key: 'weapon', label: '武器', types: ['item'], sigs: ['WEAP'] },
	{ key: 'armor', label: '护甲', types: ['item'], sigs: ['ARMO'] },
	{ key: 'potion', label: '药水', types: ['item'], sigs: ['ALCH'] },
	{ key: 'ingredient', label: '材料', types: ['item'], sigs: ['INGR'] },
	{ key: 'book', label: '书籍', types: ['item'], sigs: ['BOOK'] },
	{ key: 'scroll', label: '卷轴', types: ['item'], sigs: ['SCRL'] },
	{ key: 'misc', label: '杂物', types: ['item'], sigs: ['MISC', 'KEYM', 'AMMO', 'SLGM'] },
	{ key: 'actor', label: '人物', types: ['actor', 'faction'], sigs: [] },
	{ key: 'quest', label: '任务', types: ['quest'], sigs: [] },
	{ key: 'place', label: '地点', types: ['place', 'world', 'cell'], sigs: [] },
	{ key: 'perk', label: '天赋', types: ['perk'], sigs: [] },
	{ key: 'magic', label: '法术', types: ['spell', 'shout', 'magicEffect', 'enchantment'], sigs: [] },
	{ key: 'craft', label: '配方', types: ['recipe'], sigs: [] },
	{ key: 'keyword', label: '关键词', types: ['keyword'], sigs: [] },
	{ key: 'leveled', label: '等级表', types: ['leveledItem', 'leveledActor'], sigs: [] },
	{ key: 'system', label: '系统', types: [], sigs: [] },
	{ key: 'settings', label: '配置', types: [], sigs: [] }
];

// One chip row per secondary classification; armour is the one with two of them.
const SUB_KINDS = {
	weapon: [
		{ field: 'kind', label: '握法', chips: ['单手', '双手', '弓', '弩', '法杖', '其他'] },
		{
			field: 'flags',
			label: '筛选',
			multi: true,
			chips: [
				{ label: '有附魔', value: 'enchanted' },
				{ label: '无附魔', value: 'plain' },
				{ label: '唯一', value: 'unique' },
				{ label: '魔神器', value: 'artifact' }
			]
		},
		{ type: 'input', field: 'keyword', label: '关键字', placeholder: '按关键词筛，比如 Unique、DaedricArtifact' }
	],
	armor: [
		{ field: 'kind', label: '类型', chips: ['轻甲', '重甲', '服装', '其他'] },
		{ field: 'part', label: '部位', chips: ['头盔', '身体', '手', '脚', '饰品', '盾牌'] },
		{
			field: 'flags',
			label: '筛选',
			multi: true,
			chips: [
				{ label: '有附魔', value: 'enchanted' },
				{ label: '无附魔', value: 'plain' },
				{ label: '唯一', value: 'unique' },
				{ label: '魔神器', value: 'artifact' }
			]
		}
	],
	potion: [{ field: 'kind', label: '效果', chips: ['恢复', '强化', '抗性', '伤害', '功能', '其他'] }],
	ingredient: [
		{ field: 'kind', label: '种类', chips: ['恢复', '强化', '抗性', '伤害', '功能', '其他'] },
		{ type: 'input', field: 'effect', label: '效果搜索', placeholder: '按效果名筛，比如 治疗、抗火' },
		{ type: 'number', field: 'magnitude', label: '强度 ≥', placeholder: '例如 50' }
	],
	scroll: [{ field: 'kind', label: '效果', chips: ['恢复', '强化', '抗性', '伤害', '功能', '其他'] }],
	book: [{ field: 'kind', label: '种类', chips: ['法术书', '技能书', '书籍', '其他'] }],
	misc: [{ field: 'kind', label: '种类', chips: ['杂项', '钥匙', '弹药', '灵魂石'] }],
	actor: [
		{ field: 'kind', label: '性别', chips: ['男', '女'] },
		{
			field: 'tags',
			label: '身份',
			multi: true,
			chips: [
				{ label: '随从', value: 'follower' },
				{ label: '商人', value: 'merchant' },
				{ label: '训练师', value: 'trainer' },
				{ label: '侍卫', value: 'housecarl' },
				{ label: '可结婚', value: 'marriage' }
			]
		}
	],
	quest: [
		{
			field: 'kind',
			label: '来历',
			chips: ['主线', '支线', '内战', '盗贼公会', '黑暗兄弟会', '法师学院', '战友团', '魔神', '黎明守卫', '龙裔', '跑腿', '对话', '其他']
		},
		{
			field: 'questState',
			label: '进度',
			chips: [
				{ label: '已完成', value: 'done' },
				{ label: '进行中', value: 'active' },
				{ label: '未接受', value: 'none' }
			]
		},
		{
			field: 'radiant',
			label: '性质',
			chips: [
				{ label: '随机重复', value: '1' },
				{ label: '普通', value: '0' }
			]
		},
		{ field: 'journal', label: '日记', type: 'toggle', on: 'hide', text: '隐藏没有日记的任务' }
	],
	place: [{ field: 'kind', label: '种类', chips: ['地点', '室内', '室外', '世界'] }],
	perk: [{ field: 'kind', label: '层级', chips: ['单级', '多级'] }],
	magic: [
		{ field: 'kind', label: '种类', chips: ['法术', '疾病', '力量', '次级力量', '能力', '龙吼', '法杖附魔', '魔法效果', '附魔'] }
	],
	craft: [
		{ field: 'kind', label: '工作台', chips: ['锻造', '磨刀石', '熔炉', '制皮', '烹饪', '炼金', '附魔台', '纺织', '珠宝', '木工', '其他'] }
	],
	keyword: [{ field: 'kind', label: '前缀', chips: ['护甲', '武器', '魔法', '商人', '制作', '角色类型', '其他'] }],
	leveled: [{ field: 'kind', label: '种类', chips: ['物品', '角色'] }]
};

// Each page sorts by what that page is actually about.
const SORT_OPTIONS = {
	all: ['name', 'value', 'weight', 'damage', 'armor', 'level', 'edid', 'plugin'],
	weapon: ['name', 'damage', 'speed', 'value', 'weight'],
	armor: ['name', 'armor', 'value', 'weight'],
	potion: ['name', 'value', 'weight'],
	ingredient: ['name', 'effect', 'value', 'weight'],
	book: ['name', 'value', 'weight'],
	scroll: ['name', 'value', 'weight'],
	misc: ['name', 'value', 'weight'],
	actor: ['name', 'level'],
	quest: ['name', 'stages', 'objectives'],
	place: ['name'],
	perk: ['name', 'ranks'],
	magic: ['name', 'cost'],
	craft: ['name', 'materials'],
	keyword: ['name'],
	leveled: ['name', 'entries']
};

const SORT_LABELS = {
	name: '名字',
	value: '价值',
	weight: '重量',
	damage: '伤害',
	armor: '护甲',
	level: '等级',
	cost: '耗魔',
	edid: 'ID',
	plugin: '插件',
	speed: '速度',
	effect: '效果',
	stages: '阶段数',
	ranks: '等级数',
	materials: '材料数',
	entries: '条目数'
};

const THEMES = ['auto', 'light', 'dark', 'github-light', 'github-dark', 'vscode', 'webstorm'];

// The columns the list shows, per page: the numbers that page is about.
const COLUMNS = {
	all: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'type', label: '类型', sort: 'type' },
		{ key: 'kind', label: '分类', sort: 'kind' },
		{ key: 'value', label: '价值', num: true, sort: 'value' },
		{ key: 'plugin', label: '插件', sort: 'plugin' }
	],
	weapon: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'damage', label: '伤害', num: true, sort: 'damage' },
		{ key: 'value', label: '价值', num: true, sort: 'value' },
		{ key: 'weight', label: '重量', num: true, sort: 'weight' },
		{ key: 'ench', label: '附魔', sort: 'enchantment' },
		{ key: 'desc', label: '说明', sort: 'desc' },
		{ key: 'plugin', label: '插件', sort: 'plugin' }
	],
	armor: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'armor', label: '护甲', num: true, sort: 'armor' },
		{ key: 'kind', label: '类型', sort: 'kind' },
		{ key: 'part', label: '部位', sort: 'part' },
		{ key: 'value', label: '价值', num: true, sort: 'value' },
		{ key: 'weight', label: '重量', num: true, sort: 'weight' },
		{ key: 'ench', label: '附魔', sort: 'enchantment' },
		{ key: 'desc', label: '说明', sort: 'desc' },
		{ key: 'plugin', label: '插件', sort: 'plugin' }
	],
	potion: [
		{ key: 'name', label: '名字' },
		{ key: 'kind', label: '效果' },
		{ key: 'effect', label: '首个效果' },
		{ key: 'value', label: '价值', num: true },
		{ key: 'weight', label: '重量', num: true },
		{ key: 'desc', label: '说明', sort: 'desc' }
	],
	ingredient: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'effect1', label: '效果一', sort: 'effect' },
		{ key: 'effect2', label: '效果二', sort: 'effect2' },
		{ key: 'effect3', label: '效果三', sort: 'effect3' },
		{ key: 'effect4', label: '效果四', sort: 'effect4' },
		{ key: 'value', label: '价值', num: true, sort: 'value' },
		{ key: 'weight', label: '重量', num: true, sort: 'weight' }
	],
	scroll: [
		{ key: 'name', label: '名字' },
		{ key: 'kind', label: '效果' },
		{ key: 'value', label: '价值', num: true },
		{ key: 'weight', label: '重量', num: true },
		{ key: 'desc', label: '说明', sort: 'desc' }
	],
	book: [
		{ key: 'name', label: '名字' },
		{ key: 'kind', label: '种类' },
		{ key: 'value', label: '价值', num: true },
		{ key: 'weight', label: '重量', num: true },
		{ key: 'desc', label: '说明', sort: 'desc' }
	],
	misc: [
		{ key: 'name', label: '名字' },
		{ key: 'kind', label: '种类' },
		{ key: 'value', label: '价值', num: true },
		{ key: 'weight', label: '重量', num: true },
		{ key: 'desc', label: '说明', sort: 'desc' }
	],
	actor: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'sex', label: '性别', sort: 'sex' },
		{ key: 'level', label: '等级', num: true, sort: 'level' },
		{ key: 'race', label: '种族', sort: 'race' },
		{ key: 'plugin', label: '插件', sort: 'plugin' }
	],
	quest: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '来历', sort: 'kind' },
		{ key: 'met', label: '进度', sort: 'questState' },
		{ key: 'radiant', label: '性质', sort: 'radiant' },
		{ key: 'plugin', label: '插件', sort: 'plugin' }
	],
	place: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '种类', sort: 'kind' },
		{ key: 'plugin', label: '插件' }
	],
	perk: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '层级', sort: 'kind' },
		{ key: 'plugin', label: '插件' }
	],
	magic: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '种类', sort: 'kind' },
		{ key: 'cost', label: '耗魔', num: true },
		{ key: 'plugin', label: '插件' }
	],
	craft: [
		{ key: 'name', label: '做成' },
		{ key: 'kind', label: '工作台' },
		{ key: 'materials', label: '材料数', num: true, sort: 'materials' },
		{ key: 'plugin', label: '插件' }
	],
	keyword: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '前缀', sort: 'kind' },
		{ key: 'plugin', label: '插件' }
	],
	leveled: [
		{ key: 'name', label: '名字', sort: 'name' },
		{ key: 'kind', label: '种类', sort: 'kind' },
		{ key: 'entries', label: '条目数', num: true, sort: 'entries' }
	]
};


const state = {
	family: 'all',
	q: '',
	plugin: '',
	page: 0,
	pageSize: 50,
	sort: 'name',
	met: localStorage.getItem('kys-met') || '',
	kind: '',
	part: '',
	tags: [],
	radiant: '',
	questState: '',
	showQuestConditions: false,
	objectives: '',
	effect: '',
	magnitude: '',
	keyword: '',
	flags: [],
	sortDir: 'asc',
	progress: null,
	hideInternal: localStorage.getItem('kys-hide-internal') !== '0',
	journal: localStorage.getItem('kys-journal') || '',
	sortBy: {},
	sortDirBy: {},
	rows: [],
	total: 0,
	activeFormid: null,
	stats: null,
	config: null,
	saveMeta: null,
	plugins: [],
	comboCursor: -1,
	rebuilding: false,
	pollTimer: null
};

const $ = (id) => document.getElementById(id);
const resultsEl = $('results');
const detailEl = $('detail');

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function hex(value) {
	return String(value || '').toUpperCase();
}

async function api(path, options) {
	const res = await fetch(path, options);
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const error = new Error(body.error || res.statusText);
		error.status = res.status;
		error.body = body;
		throw error;
	}
	return body;
}

/* ---------- theme ---------- */

function currentTheme() {
	const saved = localStorage.getItem('kys-theme');
	return THEMES.includes(saved) ? saved : 'auto';
}

// 书籍页的字体：正文、手写体、标题三档，留空就退回系统衬线
function applyBookStyle(config) {
	const root = document.documentElement;
	const body = (config && config.bookBodyFont) || 'Georgia, "Songti SC", SimSun, serif';
	const hand = (config && config.bookHandFont) || body;
	const title = (config && config.bookTitleFont) || body;
	const size = (config && Number(config.bookFontSize)) || 18;
	root.style.setProperty('--book-body-font', body);
	root.style.setProperty('--book-hand-font', hand);
	root.style.setProperty('--book-title-font', title);
	root.style.setProperty('--book-font-size', size + 'px');
	root.style.setProperty('--book-drop-font', `${hand}, "${body}"`);
}

// 界面语言：auto 跟随系统；中文分简繁；英文走词表（见 i18n.js），数据（名字、书页正文）不翻
const LANGS = ['auto', 'zh-CN', 'zh-TW', 'en'];

function systemLang() {
	const tags = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
	for (const tag of tags) {
		const lower = String(tag).toLowerCase();
		if (lower.startsWith('zh')) return /hant|tw|hk|mo/.test(lower) ? 'zh-TW' : 'zh-CN';
		if (lower.startsWith('en')) return 'en';
	}
	return 'en';
}

function uiLang() {
	const configured = state.config && state.config.uiLang;
	if (!configured || configured === 'auto') return systemLang();
	return LANGS.includes(configured) ? configured : systemLang();
}

function translateText(text) {
	if (!text || !text.trim()) return text;
	const lang = uiLang();
	if (lang === 'zh-TW') return window.toTraditional ? window.toTraditional(text) : text;
	if (lang !== 'en') return text;
	const table = window.KYS_EN || {};
	const trimmed = text.trim();
	if (table[trimmed] !== undefined) return text.replace(trimmed, table[trimmed]);
	for (const [pattern, render] of window.KYS_EN_TEMPLATES || []) {
		const match = trimmed.match(pattern);
		if (match) return text.replace(trimmed, render(match));
	}
	return text;
}

// 这些区域里放的是数据，不能翻
const NO_TRANSLATE = '.book-panel, .longtext, .detail-title, .detail-sub, .link, .check-list, .stats td.v, .quest-stages td.v, .combo-list, .rowlink';

function localize(root) {
	if (!root) return;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		const parent = node.parentElement;
		if (!parent || parent.closest(NO_TRANSLATE)) continue;
		if (node.__kysOriginal === undefined) node.__kysOriginal = node.nodeValue;
		node.nodeValue = translateText(node.__kysOriginal);
	}
	for (const element of root.querySelectorAll('[placeholder], [title]')) {
		if (!element.__kysAttrs) element.__kysAttrs = {};
		for (const attribute of ['placeholder', 'title']) {
			if (!element.hasAttribute(attribute)) continue;
			if (element.__kysAttrs[attribute] === undefined) element.__kysAttrs[attribute] = element.getAttribute(attribute);
			element.setAttribute(attribute, translateText(element.__kysAttrs[attribute]));
		}
	}
}

function refreshLanguage() {
	localize(document.body);
	document.title = uiLang() === 'en' ? 'Know your Skyrim' : 'Know your Skyrim';
}

function applyTheme(theme) {
	const chosen = THEMES.includes(theme) ? theme : 'auto';
	document.documentElement.dataset.theme = chosen;
	$('theme').value = chosen;
}

/* ---------- boot ---------- */

async function boot() {
	applyTheme(currentTheme());

	let config;
	try {
		config = await api('/api/config');
	} catch (err) {
		$('subtitle').textContent = '服务没起来：' + err.message;
		return;
	}
	state.config = config.config;
	state.saveMeta = config.save;
	state.progress = config.progress || null;
	renderSaveChip();
	renderFilters();
	fillSettings(config);

	if (!config.index) {
		$('subtitle').textContent = '还没有索引';
		$('result-count').textContent = '先选实例和配置，再点重建索引';
		openSettings();
		wire();
		return;
	}

	renderSubKinds();
	refreshLanguage();
		await loadStatus().catch((err) => {
		$('subtitle').textContent = err.status === 503 ? '索引正在重建，等一下' : '读索引失败：' + err.message;
	});
	if (state.stats) {
		wire();
		renderFamilies();
	refreshLanguage();
				await search();
		const hash = location.hash.match(/#\/entry\/([0-9a-f]+)/i);
		if (hash) openEntry(hash[1]);
		return;
	}
	wire();
	renderFamilies();
	openSettings();
}

async function loadStatus() {
	const status = await api('/api/status');
	state.stats = status;
	const meta = status.meta || {};
	$('subtitle').textContent = `${meta.profile || '自定义'} · ${status.entries} 条 · ${meta.pluginCount} 个插件 · ${(meta.language || '').toUpperCase()}`;

	const list = await api('/api/plugins');
	state.plugins = list.plugins;
	syncPluginInput();
	return status;
}

/* ---------- the plugin picker ---------- */

function syncPluginInput() {
	const picked = state.plugins?.find((p) => String(p.idx) === String(state.plugin));
	$('plugin-input').value = picked ? picked.name : '';
	$('plugin-clear').hidden = !state.plugin;
}

function openPluginList() {
	$('plugin-list').hidden = false;
	renderPluginList($('plugin-input').value);
}

function closePluginList() {
	$('plugin-list').hidden = true;
	state.comboCursor = -1;
}

function pluginMatches(text) {
	const needle = String(text || '').trim().toLowerCase();
	if (!needle) return state.plugins || [];
	const starts = [];
	const contains = [];
	for (const plugin of state.plugins || []) {
		const hay = plugin.name.toLowerCase();
		if (hay.startsWith(needle)) starts.push(plugin);
		else if (hay.includes(needle) || String(plugin.entries).includes(needle)) contains.push(plugin);
	}
	return [...starts, ...contains];
}

function renderPluginList(text) {
	const list = $('plugin-list');
	list.textContent = '';
	const matches = pluginMatches(text).slice(0, 200);
	if (!matches.length) {
		list.append(el('div', 'nothing', '没有这个插件'));
		return;
	}
	for (const plugin of matches) {
		const option = el('div', 'option');
		if (String(plugin.idx) === String(state.plugin)) option.classList.add('selected');
		option.append(el('span', null, plugin.name));
		option.append(el('span', 'count', String(plugin.entries)));
		option.onmousedown = (event) => {
			event.preventDefault();
			pickPlugin(String(plugin.idx));
		};
		list.append(option);
	}
	const cursor = list.children[state.comboCursor];
	if (cursor) cursor.classList.add('cursor');
}

function pickPlugin(idx) {
	state.plugin = idx || '';
	state.page = 0;
	closePluginList();
	syncPluginInput();
	search();
}

// Arrow keys move through the list, Enter takes the one under the cursor, Esc gives up and restores the label.
function pluginKeydown(event) {
	const list = $('plugin-list');
	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		if (list.hidden) return openPluginList();
		const count = list.querySelectorAll('.option').length;
		if (!count) return;
		state.comboCursor = (state.comboCursor + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
		renderPluginList($('plugin-input').value);
	} else if (event.key === 'Enter') {
		event.preventDefault();
		const options = list.querySelectorAll('.option');
		if (!list.hidden && options.length) {
			const target = options[state.comboCursor >= 0 ? state.comboCursor : 0];
			const name = target.firstChild.textContent;
			const found = (state.plugins || []).find((p) => p.name === name);
			if (found) return pickPlugin(String(found.idx));
		}
		state.q = $('q').value.trim();
		state.page = 0;
		search();
	} else if (event.key === 'Escape') {
		closePluginList();
		syncPluginInput();
		$('plugin-input').blur();
	}
}

function sortOf(family) {
	return state.sortBy[family] || 'name';
}

function dirOf(family) {
	return state.sortDirBy[family] || 'asc';
}

function renderFamilies() {
	const nav = $('families');
	nav.textContent = '';
	const counts = familyCounts();
	for (const family of FAMILIES) {
		const button = el('button');
		button.classList.toggle('active', state.family === family.key);
		button.append(el('span', null, family.label));
		if (counts.has(family.key)) button.append(el('span', 'count', String(counts.get(family.key))));
		button.onclick = () => {
			state.family = family.key;
			state.kind = '';
			state.part = '';
			state.tags = [];
			state.radiant = '';
			state.questState = '';
			state.objectives = '';
			state.effect = '';
			state.magnitude = '';
			state.keyword = '';
			state.flags = [];
			state.met = '';
			state.journal = '';
			state.page = 0;
			renderFamilies();
			renderSubKinds();
						search();
		};
		nav.appendChild(button);
	}
}

// The index counts per record type and signature; fold them into the families the tabs show.
function familyCounts() {
	const byKey = new Map();
	for (const row of state.stats?.byFamily || []) byKey.set(`${row.type}:${row.sig}`, row.n);
	const out = new Map();
	for (const family of FAMILIES) {
		if (family.key === 'all') {
			out.set('all', state.stats?.entries ?? 0);
			continue;
		}
		let sum = 0;
		if (family.sigs.length) {
			for (const sig of family.sigs) sum += byKey.get(`item:${sig}`) || 0;
			for (const type of family.types.filter((t) => t !== 'item')) {
				for (const [key, n] of byKey) if (key.startsWith(type + ':')) sum += n;
			}
		} else {
			for (const type of family.types) {
				for (const [key, n] of byKey) if (key.startsWith(type + ':')) sum += n;
			}
		}
		out.set(family.key, sum);
	}
	return out;
}

function renderSaveChip() {
	const chip = $('save-chip');
	const save = state.saveMeta;
	if (!save || save.error || !save.playerName) {
		chip.hidden = true;
		return;
	}
	chip.hidden = false;
	chip.textContent = `${save.playerName} Lv${save.playerLevel} · ${save.playerLocation || ''} · ${save.mtimeText || ''}`;
	chip.title = save.fileName || '';
}

/* ---------- list ---------- */

function familyOf(key) {
	return FAMILIES.find((f) => f.key === key) || FAMILIES[0];
}

// The settings card is a real DOM element with real handlers; when another page renders, park it back on <body>
// hidden, instead of letting the detail pane throw it away.
function detachSettingsCard() {
	const card = $('settings-card');
	if (card && card.parentElement === detailEl) {
		card.hidden = true;
		document.body.append(card);
	}
}

function setWide(on) {
	document.body.classList.toggle('wide-page', on);
}

async function search() {
	detachSettingsCard();
	if (state.family === 'settings') {
		setWide(true);
		resultsEl.textContent = '';
		$('empty-state').hidden = true;
		$('result-count').textContent = '配置在右边';
		$('page-info').textContent = '';
		await renderSettingsPage();
		return;
	}
	if (state.family === 'system') {
		setWide(true);
		resultsEl.textContent = '';
		$('empty-state').hidden = true;
		$('result-count').textContent = '系统详情在右边';
		$('page-info').textContent = '';
		renderSystem();
		return;
	}
	setWide(false);
	const family = familyOf(state.family);
	const params = new URLSearchParams({
		q: state.q,
		sort: sortOf(state.family),
		sortDir: dirOf(state.family),
		limit: state.pageSize,
		offset: state.page * state.pageSize
	});
	if (family.types.length) params.set('types', family.types.join(','));
	if (family.sigs.length) params.set('sigs', family.sigs.join(','));
	if (state.plugin) params.set('plugin', state.plugin);
	params.set('hideInternal', state.hideInternal ? '1' : '0');
	if (state.met) params.set('met', state.met);
	if (state.kind) params.set('kind', state.kind);
	if (state.part) params.set('part', state.part);
	if (state.tags.length) params.set('tags', state.tags.join(','));
	if (state.radiant) params.set('radiant', state.radiant);
	if (state.journal) params.set('journal', state.journal);
	if (state.questState) params.set('questState', state.questState);
	if (state.objectives) params.set('objectives', state.objectives);
	if (state.effect) params.set('effect', state.effect);
	if (state.flags.length) params.set('flags', state.flags.join(','));
	if (state.keyword) params.set('keyword', state.keyword);
	if (state.magnitude !== '' && state.magnitude !== null && state.magnitude !== undefined) params.set('magnitude', state.magnitude);

	let result;
	try {
		result = await api('/api/search?' + params.toString());
	} catch (err) {
		$('result-count').textContent = err.status === 503 ? '正在重建索引…' : '出错了：' + err.message;
		return;
	}
	state.rows = result.rows;
	state.total = result.total;
	renderRows();
	refreshLanguage();
	renderPager();
	$('save-chip').hidden = !(state.saveMeta && state.saveMeta.playerName);
	renderSaveChip();
}

function renderSubKinds() {
	const box = $('subkinds');
	box.textContent = '';
	let lines = SUB_KINDS[state.family] || [];
	// the save's progress chips only make sense once a save has been read
	if (state.family === 'quest' && !state.progress) lines = lines.filter((line) => line.field !== 'questState');
	if (!lines.length) {
		box.hidden = true;
		return;
	}
	box.hidden = false;
	const empty = (field) => (Array.isArray(state[field]) ? state[field].length === 0 : !state[field]);
	for (const line of lines) {
		const row = el('div', 'line');
		row.append(el('span', 'label', line.label));
		if (line.type === 'number') {
			const input = el('input');
			input.type = 'number';
			input.className = 'subkinds-input narrow';
			input.placeholder = line.placeholder || '';
			input.value = state[line.field] || '';
			let timer = null;
			input.oninput = () => {
				clearTimeout(timer);
				timer = setTimeout(() => {
					state[line.field] = input.value === '' ? '' : input.value;
					state.page = 0;
					search();
				}, 320);
			};
			row.append(input);
			box.append(row);
			continue;
		}
		if (line.type === 'input') {
			const input = el('input');
			input.type = 'search';
			input.className = 'subkinds-input';
			input.placeholder = line.placeholder || '';
			input.value = state[line.field] || '';
			let timer = null;
			input.oninput = () => {
				clearTimeout(timer);
				timer = setTimeout(() => {
					state[line.field] = input.value.trim();
					state.page = 0;
					search();
				}, 280);
			};
			row.append(input);
			box.append(row);
			continue;
		}
		if (line.type === 'toggle') {
			const on = Boolean(state[line.field]);
			const button = el('button', on ? 'on' : '', `${on ? '✓' : '✕'} ${line.text}`);
			button.onclick = () => {
				state[line.field] = on ? '' : '1';
				localStorage.setItem('kys-journal', state[line.field]);
				state.page = 0;
				renderSubKinds();
				search();
			};
			row.append(button);
			box.append(row);
			continue;
		}
		const all = el('button', empty(line.field) ? 'on' : '', '全部');
		all.onclick = () => {
			state[line.field] = line.multi ? [] : '';
			state.page = 0;
			renderSubKinds();
			search();
		};
		row.append(all);
		for (const chip of line.chips) {
			const label = typeof chip === 'string' ? chip : chip.label;
			const value = typeof chip === 'string' ? chip : chip.value;
			const on = line.multi ? state[line.field].includes(value) : state[line.field] === value;
			const button = el('button', on ? 'on' : '', label);
			button.onclick = () => {
				if (line.multi) {
					const list = new Set(state[line.field]);
					if (list.has(value)) list.delete(value);
					else list.add(value);
					state[line.field] = [...list];
				} else {
					state[line.field] = state[line.field] === value ? '' : value;
				}
				state.page = 0;
				renderSubKinds();
				search();
			};
			row.append(button);
		}
		box.append(row);
	}
}

function renderFilters() {
	const internal = $('toggle-internal');
	internal.classList.toggle('on', state.hideInternal);
	internal.textContent = `${state.hideInternal ? '✓' : '✕'} 隐藏内部数据`;
}

function renderRows() {
	const results = resultsEl;
	const columns = COLUMNS[state.family] || COLUMNS.all;
	results.textContent = '';

	const table = el('table', 'grid');
	const thead = el('thead');
	const headRow = el('tr');
	const activeSort = sortOf(state.family);
	for (const column of columns) {
		const th = el('th', column.num ? 'num' : '');
		if (column.key === 'name') th.classList.add('name-col');
		const sortKey = column.sort || column.key;
		const button = el('button', 'sort-button', column.label);
		const active = sortKey === activeSort;
		if (active) button.classList.add('on');
		button.append(el('span', 'arrow', active ? (dirOf(state.family) === 'asc' ? '▲' : '▼') : '⇅'));
		button.title = active ? '再点一下切换正序 / 逆序' : '按这一列排序';
		button.onclick = (event) => {
			event.stopPropagation();
			if (active) {
				state.sortDirBy[state.family] = dirOf(state.family) === 'asc' ? 'desc' : 'asc';
			} else {
				state.sortBy[state.family] = sortKey;
				state.sortDirBy[state.family] = 'asc';
			}
			state.page = 0;
			search();
		};
		th.append(button);
		headRow.append(th);
	}
	thead.append(headRow);
	table.append(thead);

	const tbody = el('tbody');
	for (const row of state.rows) {
		const tr = el('tr');
		tr.dataset.formid = String(row.formid);
		if (row.formid === state.activeFormid) tr.classList.add('active');
		for (const column of columns) {
			const td = el('td', column.num ? 'num' : '');
			if (column.key === 'name') {
				td.classList.add('name-col');
				td.append(el('span', null, row.name || `（无名 ${row.type}）`));
				if (row.type === 'quest' && row.questState === 'done') td.append(el('span', 'tag met-tag', '已完成'));
				else if (row.type === 'quest' && row.met) td.append(el('span', 'tag', '进行中'));
				if (row.type === 'quest' && !row.journal) td.append(el('span', 'tag hidden-tag', '无日记'));
				if (row.internal) td.append(el('span', 'tag hidden-tag', row.hiddenReason || '内部'));
			} else {
				td.textContent = cellValue(row, column.key);
				if (column.key === 'met' && row.met) td.classList.add('ok');
				if (column.key === 'radiant' && row.radiant) td.classList.add('dim');
			}
			tr.append(td);
		}
		tr.onclick = () => openEntry(row.formid);
		tbody.append(tr);
	}
	table.append(tbody);
	results.append(table);

	const empty = $('empty-state');
	empty.hidden = state.rows.length > 0;
	if (!empty.hidden && state.total === 0) {
		empty.textContent =
			state.hideInternal && (state.family === 'keyword' || !state.q)
				? '这一栏被「隐藏内部数据」挡掉了：里面的名字大多是编辑器名。关掉上面的开关再看。'
				: '没有匹配的东西，换个词试试。';
	}
	$('result-count').textContent = state.total ? `共 ${state.total} 条` : '一条也没有';
}

function cellValue(row, key) {
	const data = row.data || {};
	switch (key) {
		case 'type':
			return sigLabel(row);
		case 'kind':
			return row.kind || '';
		case 'part':
			return row.part || '';
		case 'value':
			return data.value ?? '';
		case 'weight':
			return data.weight ?? '';
		case 'damage':
			return data.damage ?? '';
		case 'armor':
			return data.armor ?? '';
		case 'speed':
			return data.speed ?? '';
		case 'level':
			return data.level ?? '';
		case 'cost':
			return data.cost ?? '';
		case 'stages':
			return (data.stages || []).length || '';
		case 'materials':
			return (data.ingredients || []).length || '';
		case 'entries':
			return (data.entries || []).length || '';
		case 'ranks':
			return data.rankCount ?? '';
		case 'sex':
			return data.female ? '女' : '男';
		case 'race':
			return row.raceName || '';
		case 'effect':
			return row.firstEffect || '';
		case 'objectives':
			return (data.objectives || []).length || '';
		case 'effect1':
		case 'effect2':
		case 'effect3':
		case 'effect4': {
			const index = Number(key.slice(-1)) - 1;
			let names = [];
			try {
				names = JSON.parse(row.effects || '[]');
			} catch {
				names = [];
			}
			return names[index] || '';
		}
		case 'ench':
			return row.enchantName || '—';
		case 'desc':
			return data.description || '';
		case 'met':
			if (!state.progress) return '';
			return row.questState === 'done' ? '已完成' : row.met ? '进行中' : '未接受';
		case 'radiant':
			return row.radiant ? '随机' : '';
		case 'plugin':
			return row.pluginName || '';
		default:
			return '';
	}
}

function renderPager() {
	const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
	state.page = Math.min(state.page, pages - 1);
	$('page-info').textContent = `第 ${state.page + 1} / ${pages} 页`;
	$('first').disabled = state.page === 0;
	$('prev').disabled = state.page === 0;
	$('next').disabled = state.page >= pages - 1;
	$('last').disabled = state.page >= pages - 1;
}

function goPage(page) {
	const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
	state.page = Math.max(0, Math.min(page, pages - 1));
	search();
	$('results').parentElement.scrollTop = 0;
}

function sigLabel(row) {
	if (row.type === 'item') return row.sig;
	const map = {
		actor: 'NPC',
		faction: '派系',
		quest: '任务',
		place: '地点',
		cell: '房间',
		world: '世界',
		perk: '天赋',
		spell: '法术',
		shout: '龙吼',
		magicEffect: '效果',
		enchantment: '附魔',
		recipe: '配方',
		keyword: '关键词',
		leveledItem: '等级表',
		leveledActor: '等级表',
		container: '容器'
	};
	return map[row.type] || row.type;
}

function statLine(row) {
	const data = row.data || {};
	if (row.type === 'item') {
		const bits = [];
		if (row.sig === 'WEAP' && data.damage) bits.push(`伤害 ${data.damage}`);
		if (row.sig === 'ARMO' && data.armor) bits.push(`护甲 ${data.armor}`);
		if (data.value) bits.push(`${data.value} 金`);
		if (data.weight) bits.push(`${data.weight} 重`);
		return bits.join(' · ');
	}
	if (row.type === 'actor') return [data.essential ? '不死' : '', data.level ? `等级 ${data.level}` : ''].filter(Boolean).join(' · ');
	return '';
}

/* ---------- settings ---------- */

function fillSettings(config) {
	const instanceSelect = $('instance');
	instanceSelect.textContent = '';
	for (const instance of config.instances) {
		const option = new Option(`${instance.id}${instance.exists ? '' : '（游戏目录不在）'}`, instance.id);
		instanceSelect.append(option);
	}
	instanceSelect.value = config.config.instanceId || '';

	fillProfiles(config.profiles, config.config.profile);
	fillSaves(config.saves, config.config.saveFile);
	$('language').value = config.config.language || 'chinese';
	$('ui-lang').value = LANGS.includes(config.config.uiLang) ? config.config.uiLang : 'auto';
	fillBookSettings(config.config);
	applyBookStyle(config.config);
	renderSaveInfo(config.save);
	renderProgress(config.progress);
	renderRebuildState(config.rebuild);
}

function fillBookSettings(config) {
	$('book-body-font').value = config.bookBodyFont || '';
	$('book-hand-font').value = config.bookHandFont || '';
	$('book-title-font').value = config.bookTitleFont || '';
	$('book-font-size').value = config.bookFontSize || 18;
}

function readBookSettings() {
	return {
		bookBodyFont: $('book-body-font').value.trim(),
		bookHandFont: $('book-hand-font').value.trim(),
		bookTitleFont: $('book-title-font').value.trim(),
		bookFontSize: Number($('book-font-size').value) || 18
	};
}

function fillProfiles(profiles, selected) {
	const select = $('profile');
	select.textContent = '';
	for (const name of profiles) select.append(new Option(name, name));
	if (selected && !profiles.includes(selected)) select.append(new Option(selected, selected));
	select.value = selected || profiles[0] || '';
}

function fillSaves(saves, selected) {
	const select = $('save');
	select.textContent = '';
	select.append(new Option('不读存档', ''));
	for (const save of saves) {
		const label = `${save.label.kind} · ${save.label.when || ''} · Lv${save.label.level || '?'} · ${(save.size / 1024 / 1024).toFixed(1)}MB`;
		const option = new Option(label, save.file);
		option.title = save.name;
		select.append(option);
	}
	if (selected && !saves.some((s) => s.file === selected)) select.append(new Option('当前存档（已不在这台机器上）', selected));
	select.value = selected || '';
}

function renderProgress(progress) {
	const box = $('progress-info');
	if (!box) return;
	box.hidden = !progress;
	if (!progress) return;
	box.textContent = '';
	const rows = [
		['存档任务进度', `${progress.quests} 条任务有记录`],
		['存档里的插件数', progress.pluginCount],
		['读到的时间', new Date(progress.parsedAt).toLocaleString('zh-CN', { hour12: false })]
	];
	for (const [key, value] of rows) {
		const row = el('div', 'row');
		row.append(el('span', null, key));
		row.append(el('span', null, String(value ?? '')));
		box.append(row);
	}
}

function renderSaveInfo(save) {
	const box = $('save-info');
	if (!save) {
		box.hidden = true;
		return;
	}
	box.hidden = false;
	box.textContent = '';
	if (save.error) {
		box.append(el('div', 'row', '读不出来：' + save.error));
		return;
	}
	const rows = [
		['角色', save.playerName],
		['等级', save.playerLevel],
		['位置', save.playerLocation],
		['游戏内日期', save.gameTime],
		['种族', save.playerRace],
		['存于', save.mtimeText],
		['文件', save.fileName]
	];
	for (const [key, value] of rows) {
		const row = el('div', 'row');
		row.append(el('span', null, key));
		row.append(el('span', null, String(value ?? '')));
		box.append(row);
	}
}

function renderRebuildState(rebuild) {
	if (!rebuild) return;
	state.rebuilding = Boolean(rebuild.running);
	$('rebuild').disabled = state.rebuilding;
	$('progress-wrap').hidden = !state.rebuilding && !rebuild.error && !rebuild.ms;
	if (rebuild.error) {
		$('progress-text').textContent = '失败：' + rebuild.error;
		$('progress-text').className = 'warn';
		return;
	}
	const percent = rebuild.total ? Math.round((rebuild.index / rebuild.total) * 100) : 0;
	$('progress-bar').style.width = percent + '%';
	$('progress-text').className = 'dim';
	if (rebuild.running) {
		$('progress-text').textContent = `[${rebuild.index}/${rebuild.total}] ${rebuild.current} · ${rebuild.entries} 条`;
	} else if (rebuild.ms) {
		$('progress-text').textContent = `完成：${rebuild.total} 个插件，${rebuild.entries} 条，${(rebuild.ms / 1000).toFixed(1)} 秒`;
	}
}

async function renderSettingsPage() {
	const card = $('settings-card');
	card.hidden = false;
	if (card.parentElement !== detailEl) {
		detailEl.textContent = '';
		detailEl.append(el('h2', 'detail-title', '配置'));
		detailEl.append(el('div', 'detail-sub', '换加载顺序、换存档、重建索引——都在这一页'));
		detailEl.append(card);
	}
	try {
		const config = await api('/api/config');
		state.config = config.config;
		state.saveMeta = config.save;
		state.progress = config.progress || null;
		fillSettings(config);
	} catch (err) {
		$('rebuild-hint').textContent = '读配置失败：' + err.message;
	}
}

function openSettings() {
	state.family = 'settings';
	state.kind = '';
	state.part = '';
	state.tags = [];
	state.radiant = '';
	state.questState = '';
	state.objectives = '';
	state.effect = '';
	state.page = 0;
	renderFamilies();
	renderSubKinds();
	search();
}

function closeSettings() {
	state.family = 'all';
	renderFamilies();
	renderSubKinds();
	search();
}

async function postConfig(patch) {
	const result = await api('/api/config', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(patch)
	});
	state.config = result.config;
	state.saveMeta = result.save ?? state.saveMeta;
	fillProfiles(result.profiles, result.config.profile);
	fillSaves(result.saves, result.config.saveFile);
	$('rebuild-hint').textContent = result.needsRebuild ? '数据源变了，点「重建索引」' : '';
	return result;
}

async function pickSave(saveFile) {
	const result = await api('/api/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ saveFile })
	});
	state.config = result.config;
	state.saveMeta = result.save;
	state.progress = result.progress || null;
	renderSaveInfo(result.save);
	renderProgress(result.progress);
	renderSaveChip();
	renderFilters();
}

async function rebuild() {
	$('rebuild').disabled = true;
	$('rebuild-hint').textContent = '';
	try {
		await api('/api/rebuild', { method: 'POST' });
	} catch (err) {
		$('rebuild-hint').textContent = err.message;
		$('rebuild').disabled = false;
		return;
	}
	pollRebuild();
}

function pollRebuild() {
	clearTimeout(state.pollTimer);
	state.pollTimer = setTimeout(async () => {
		let result;
		try {
			result = await api('/api/rebuild');
		} catch {
			return pollRebuild();
		}
		renderRebuildState(result.rebuild);
		if (result.rebuild.running) return pollRebuild();

		state.rebuilding = false;
		$('rebuild').disabled = false;
		if (!result.rebuild.error) {
			try {
				await loadStatus();
				renderFamilies();
				state.page = 0;
				await search();
				$('rebuild-hint').textContent = '索引已更新';
			} catch (err) {
				$('rebuild-hint').textContent = '索引好了，但读状态失败：' + err.message;
			}
		}
	}, 700);
}

/* ---------- wiring ---------- */

function wire() {
	let timer = null;
	$('q').addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			state.q = $('q').value.trim();
			state.page = 0;
			search();
		}, 220);
	});
	$('q').addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			clearTimeout(timer);
			state.q = $('q').value.trim();
			state.page = 0;
			search();
		}
	});
	$('plugin-input').addEventListener('input', () => {
		state.comboCursor = -1;
		openPluginList();
	});
	$('plugin-input').addEventListener('focus', openPluginList);
	$('plugin-input').addEventListener('keydown', pluginKeydown);
	$('plugin-input').addEventListener('blur', () => {
		setTimeout(() => {
			closePluginList();
			syncPluginInput();
		}, 120);
	});
	$('plugin-clear').addEventListener('mousedown', (event) => {
		event.preventDefault();
		pickPlugin('');
	});
	$('pageSize').addEventListener('change', () => {
		state.pageSize = Number($('pageSize').value) || 50;
		state.page = 0;
		search();
	});
	$('first').onclick = () => goPage(0);
	$('prev').onclick = () => goPage(state.page - 1);
	$('next').onclick = () => goPage(state.page + 1);
	$('last').onclick = () => goPage(Math.ceil(state.total / state.pageSize) - 1);
	$('theme').addEventListener('change', () => {
		const theme = $('theme').value;
		localStorage.setItem('kys-theme', theme);
		applyTheme(theme);
	});
	$('settings').onclick = openSettings;
	$('instance').addEventListener('change', async () => {
		const instanceId = $('instance').value;
		const result = await postConfig({ instanceId, profile: '' });
		// An instance without a chosen profile would index whichever one MO2 has selected last; make it explicit.
		if (result.profiles.length && !result.config.profile) await postConfig({ profile: result.profiles[0] });
	});
	$('profile').addEventListener('change', () => postConfig({ profile: $('profile').value }));
	$('language').addEventListener('change', () => postConfig({ language: $('language').value }));
	$('save').addEventListener('change', () => pickSave($('save').value));
	$('ui-lang').addEventListener('change', async () => {
		state.config = { ...(state.config || {}), uiLang: $('ui-lang').value };
		await postConfig({ uiLang: $('ui-lang').value });
		refreshLanguage();
	});
	for (const id of ['book-body-font', 'book-hand-font', 'book-title-font', 'book-font-size']) {
		const input = $(id);
		input.addEventListener('change', async () => {
			const patch = readBookSettings();
			applyBookStyle(patch);
			await postConfig(patch);
		});
	}
	$('rebuild').addEventListener('click', rebuild);
	$('toggle-internal').addEventListener('click', () => {
		state.hideInternal = !state.hideInternal;
		localStorage.setItem('kys-hide-internal', state.hideInternal ? '1' : '0');
		state.page = 0;
		renderFilters();
		search();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === '/' && document.activeElement !== $('q')) {
			event.preventDefault();
			$('q').focus();
			$('q').select();
		}
		if (event.key === 'Escape') {
			if (document.activeElement === $('q')) {
				$('q').value = '';
				state.q = '';
				state.page = 0;
				search();
			}
		}
	});
	window.addEventListener('hashchange', () => {
		const hash = location.hash.match(/#\/(?:entry)\/([0-9a-f]+)/i);
		if (hash) openEntry(hash[1]);
	});
}

/* ---------- system ---------- */

async function renderSystem() {
	detailEl.textContent = '';
	let system;
	try {
		system = await api('/api/system');
	} catch (err) {
		detailEl.append(el('div', 'empty', err.status === 503 ? '还没有索引，先重建一次。' : '读不到系统信息：' + err.message));
		return;
	}
	detailEl.append(el('h2', 'detail-title', '系统详情'));
	detailEl.append(el('div', 'detail-sub', system.gamePath || '（游戏目录不明）'));

	const section = (title, open = false) => {
		const box = document.createElement('details');
		box.className = 'sys-section';
		box.open = open;
		const summary = document.createElement('summary');
		summary.append(el('span', null, title));
		box.append(summary);
		detailEl.append(box);
		return { box, summary };
	};

	const versions = system.versions || {};
	{
		const { box } = section('版本', true);
		box.append(
			statsTable([
				['SkyrimSE.exe', versions.game?.fileVersion || '读不到'],
				['SKSE', versions.skse?.fileVersion || '读不到'],
				['CreationKit', versions.creationKit?.fileVersion || '读不到'],
				['Address Library', (versions.addressLibrary || []).join(', ') || '没有']
			])
		);
	}

	const meta = system.meta || {};
	{
		const { box } = section('索引');
		box.append(
			statsTable([
				['配置', meta.profile || ''],
				['完整插件', meta.fullPlugins || ''],
				['轻量插件', meta.lightPlugins || ''],
				['记录', meta.entryCount || ''],
				['字符串语言', meta.language || ''],
				['建索引时间', meta.builtAt ? new Date(meta.builtAt).toLocaleString('zh-CN', { hour12: false }) : '']
			])
		);
	}

	{
		const checks = system.checks || [];
		const errors = checks.filter((check) => check.level === 'error').length;
		const warns = checks.filter((check) => check.level === 'warn').length;
		const { box, summary } = section(`兼容性检查（错误 ${errors} · 警告 ${warns} · 共 ${checks.length} 项）`, true);
		if (!checks.length) box.append(el('div', 'dim', '没有发现问题。'));
		for (const check of checks) {
			const item = el('div', 'check check-' + check.level);
			const title = el('div', 'check-title');
			title.append(el('span', 'check-level', { error: '错误', warn: '警告', info: '提示' }[check.level] || check.level));
			title.append(el('span', null, check.title));
			item.append(title);
			if (check.detail) item.append(el('div', 'dim', check.detail));
			if (check.list?.length) {
				const list = el('div', 'check-list');
				for (const entry of check.list.slice(0, 60)) list.append(el('span', 'chip plain', entry));
				if (check.list.length > 60) list.append(el('span', 'dim', `…还有 ${check.list.length - 60} 项`));
				item.append(list);
			}
			box.append(item);
		}
	}

	{
		const plugins = system.sksePlugins || [];
		const { box } = section(`SKSE 插件（${plugins.length} 个）`);
		if (!plugins.length) box.append(el('div', 'dim', '没有 SKSE 插件。'));
		else {
			const table = el('table', 'stats');
			const head = el('tr');
			head.append(el('th', null, '插件'));
			head.append(el('th', null, '版本'));
			head.append(el('th', null, '配套 ini'));
			head.append(el('th', null, '来自'));
			table.append(head);
			for (const plugin of plugins) {
				const tr = el('tr');
				tr.append(el('td', 'v', plugin.name));
				tr.append(el('td', 'k', plugin.fileVersion || '—'));
				tr.append(el('td', 'k', plugin.ini ? '有' : '—'));
				tr.append(el('td', 'k', plugin.from || ''));
				table.append(tr);
			}
			box.append(table);
		}
	}

	{
		const broken = (system.plugins || []).filter((plugin) => plugin.error || plugin.entries === 0);
		const { box } = section(`解析有问题的插件（${broken.length} 个）`);
		if (!broken.length) box.append(el('div', 'dim', '全部插件都读出来了。'));
		else {
			const table = el('table', 'stats');
			for (const plugin of broken.slice(0, 120)) {
				const tr = el('tr');
				tr.append(el('td', 'v', plugin.name));
				tr.append(el('td', 'k', plugin.error || '0 条记录'));
				table.append(tr);
			}
			box.append(table);
			if (broken.length > 120) box.append(el('div', 'dim', `…还有 ${broken.length - 120} 个`));
		}
	}

	{
		const { box } = section('检测报告');
		const download = el('a', 'chip', '下载 know-your-skyrim-report.txt');
		download.href = '/api/system/report';
		download.setAttribute('download', 'know-your-skyrim-report.txt');
		box.append(download);
		box.append(el('div', 'dim', '纯文本，可以直接丢给网页版 AI 接着分析。'));
	}
}

/* ---------- detail ---------- */

async function openEntry(formid) {
	let entry;
	// formid 有时是数字（列表里），有时是十六进制字符串（链接、地址栏），统一成 8 位十六进制
	const key =
		typeof formid === 'number' ? formid.toString(16).toUpperCase().padStart(8, '0') : String(formid).toUpperCase();
	try {
		entry = await api('/api/entry/' + encodeURIComponent(key));
	} catch (err) {
		detailEl.textContent = '';
		detailEl.append(el('div', 'empty', '读不到这一条：' + err.message));
		return;
	}
	state.activeFormid = entry.formid;
	state.lastEntry = entry;
	for (const li of resultsEl.children) li.classList.toggle('active', li.dataset.formid === String(entry.formid));
	history.replaceState(null, '', `#/entry/${entry.hex}`);
	renderDetail(entry);
}

function refName(entry, id) {
	if (!id) return null;
	const ref = entry.refs?.[String(id)];
	return ref ? ref.name || ref.edid || hex(ref.hex) : null;
}

function renderDetail(entry) {
	detailEl.textContent = '';
	detailEl.append(el('h2', 'detail-title', entry.name || `（无名 ${entry.type}）`));

	const sub = el('div', 'detail-sub');
	const hexSpan = el('span', 'hex', entry.hex);
	hexSpan.title = '点一下复制';
	hexSpan.onclick = () => {
		navigator.clipboard?.writeText(entry.hex);
		hexSpan.textContent = entry.hex + ' ✓';
		setTimeout(() => (hexSpan.textContent = entry.hex), 900);
	};
	sub.append(hexSpan);
	sub.append(el('span', 'sep', '|'));
	sub.append(el('span', null, sigLabel(entry) + (entry.edid ? ' · ' + entry.edid : '')));
	if (entry.pluginName) {
		sub.append(el('span', 'sep', '|'));
		sub.append(el('span', null, entry.pluginName));
	}
	if (entry.internal) {
		sub.append(el('span', 'sep', '|'));
		sub.append(el('span', 'hidden-tag', `内部：${entry.hiddenReason || '游戏不显示'}`));
	}
	if (entry.type === 'quest' && !entry.journal) {
		sub.append(el('span', 'sep', '|'));
		sub.append(el('span', 'hidden-tag', '游戏日记里没有这一条'));
	}
	detailEl.append(sub);

	if (entry.type === 'item') {
		const add = el('span', 'chip plain', '复制 player.additem');
		add.onclick = () => {
			const command = `player.additem ${entry.hex} 1`;
			navigator.clipboard?.writeText(command);
			add.textContent = command;
			setTimeout(() => (add.textContent = '复制 player.additem'), 1200);
		};
		detailEl.append(add);
	}

	const chips = el('div', 'chips');
	for (const keyword of entry.data.keywords || []) {
		const name = refName(entry, keyword);
		if (!name) continue;
		const chip = el('span', 'chip', name);
		chip.onclick = () => {
			$('q').value = '#' + name;
			state.q = '#' + name;
			state.page = 0;
			search();
		};
		chips.append(chip);
	}
	if (chips.children.length) detailEl.append(chips);

	const section = (title) => {
		detailEl.append(el('h3', null, title));
	};

	if (entry.type === 'item') renderItem(entry, section);
	if (entry.type === 'actor') renderActor(entry, section);
	if (entry.type === 'quest') renderQuest(entry, section);
	if (entry.type === 'recipe') renderRecipe(entry, section);
	if (entry.type === 'place' || entry.type === 'cell' || entry.type === 'world') renderPlace(entry, section);
	if (entry.type === 'perk') renderPerk(entry, section);
	if (entry.type === 'spell' || entry.type === 'shout') renderSpell(entry, section);
	if (entry.type === 'leveledItem' || entry.type === 'leveledActor') renderLeveled(entry, section);

	if (entry.sig === 'BOOK') {
		renderBook(entry, section);
	} else if (entry.text && entry.type !== 'quest') {
		section('长文本');
		detailEl.append(el('div', 'longtext', entry.text));
	}

	renderLinks(entry, section);
	renderBacklinks(entry, section);
	renderPlacements(entry, section);
	refreshLanguage();
}

function statsTable(rows) {
	const table = el('table', 'stats');
	for (const [key, value] of rows) {
		if (value === undefined || value === null || value === '' || value === 0) continue;
		const tr = el('tr');
		tr.append(el('td', 'k', key));
		tr.append(el('td', 'v', String(value)));
		table.append(tr);
	}
	return table;
}

function renderItem(entry, section) {
	const data = entry.data;
	section('数据');
	detailEl.append(
		statsTable([
			['价值', data.value],
			['重量', data.weight],
			['伤害', data.damage],
			['护甲', data.armor],
			['部位', data.slot],
			['类别', data.armorClass],
			['速度', data.speed],
			['暴击', data.critDamage],
			['充能', data.enchantCharge],
			['容量', data.capacity],
			['教学', data.teaches],
			['附魔', data.enchantment ? refName(entry, data.enchantment) : ''],
			['说明', data.description || '']
		])
	);
	renderEffects(entry, section);
}

function renderEffects(entry, section) {
	const effects = (entry.data.effects || []).filter((e) => e && e.effect);
	if (!effects.length) return;
	section('效果');
	const list = el('ul', 'effects');
	for (const effect of effects) {
		const li = el('li');
		li.append(el('span', null, refName(entry, effect.effect) || '（未知效果）'));
		const bits = [];
		if (effect.magnitude) bits.push(`强度 ${effect.magnitude}`);
		if (effect.duration) bits.push(`${effect.duration} 秒`);
		if (effect.area) bits.push(`范围 ${effect.area}`);
		if (bits.length) li.append(el('span', 'mag', '　' + bits.join(' · ')));
		list.append(li);
	}
	detailEl.append(list);
}

function renderActor(entry, section) {
	const data = entry.data;
	section('人物');
	detailEl.append(
		statsTable([
			['种族', refName(entry, data.race)],
			['职业', refName(entry, data.class)],
			['等级', data.level],
			['不死', data.essential ? '是（杀不死）' : ''],
			['受保护', data.protected ? '是（只有你能杀）' : ''],
			['独一', data.unique ? '是' : ''],
			['性别', data.female ? '女' : '男'],
			['犯罪派系', refName(entry, data.crimeFaction)]
		])
	);

	const factions = (data.factions || []).filter((f) => f.faction);
	if (factions.length) {
		section('派系');
		const table = el('table', 'stats');
		for (const faction of factions) {
			const tr = el('tr');
			const cell = el('td', 'v');
			const link = el('span', 'rowlink', refName(entry, faction.faction) || hex(faction.faction.toString(16)));
			link.onclick = () => openEntry(faction.faction);
			cell.append(link);
			tr.append(cell);
			tr.append(el('td', 'k', faction.rank ? `等级 ${faction.rank}` : ''));
			table.append(tr);
		}
		detailEl.append(table);
	}

	const inventory = (data.inventory || []).filter((i) => i.item);
	if (inventory.length) {
		section('身上带着');
		const table = el('table', 'stats');
		for (const item of inventory) {
			const tr = el('tr');
			const cell = el('td', 'v');
			const link = el('span', 'rowlink', refName(entry, item.item) || hex(item.item.toString(16)));
			link.onclick = () => openEntry(item.item);
			cell.append(link);
			tr.append(cell);
			tr.append(el('td', 'k', item.count > 1 ? `×${item.count}` : ''));
			table.append(tr);
		}
		detailEl.append(table);
	}
}

function renderQuest(entry, section) {
	const data = entry.data || {};
	const stages = data.stages || [];
	const progress = entry.progress || null;
	const doneAt = new Map((progress?.stages || []).map((stage) => [stage.stage, stage.done]));
	const startStage = stages.length ? stages.reduce((low, stage) => (stage.index < low.index ? stage : low), stages[0]) : null;
	const startConditions = [...(data.conditions || []), ...(startStage?.conditions || [])];

	const stateLabel = progress ? { done: '已完成', active: '进行中' }[progress.state] || '进行中' : '未接受';
	section('阶段 · 目标 · 日记');

	const summary = el('div', 'quest-summary');
	const badge = el('span', progress && progress.state === 'done' ? 'met-tag tag' : 'tag', stateLabel);
	summary.append(badge);
	if (progress) {
		summary.append(el('span', 'ok', `　走过 ${progress.doneStages} / ${progress.stageCount} 个阶段`));
		if (progress.currentStage !== null && progress.currentStage !== undefined) {
			summary.append(el('span', 'dim', `　最远到阶段 ${progress.currentStage}`));
		}
	} else if (state.progress) {
		summary.append(el('span', 'dim', '　存档里没有这条任务的记录——还没碰过。'));
	}

	// The start conditions are behind a button: they are what a player wants when the quest will not start, and
	// noise the rest of the time. Stage-level conditions are not shown at all.
	const showStart = Boolean(state.showQuestConditions);
	const conditionButton = el('button', 'chip', showStart ? '收起开始条件' : `显示开始条件${startStage ? '（阶段 ' + startStage.index + '）' : ''}`);
	conditionButton.onclick = () => {
		state.showQuestConditions = !showStart;
		if (state.lastEntry) renderDetail(state.lastEntry);
	};
	summary.append(conditionButton);
	detailEl.append(summary);

	if (showStart) {
		const box = el('div', 'quest-conditions');
		if (!startConditions.length) box.append(el('div', 'dim', '这条任务的开始阶段没写条件。'));
		else {
			const list = el('ul', 'effects');
			for (const condition of startConditions) list.append(el('li', null, condition.text || '（条件）'));
			box.append(list);
		}
		detailEl.append(box);
	}

	const objectivesAt = new Map();
	for (const objective of data.objectives || []) {
		const list = objectivesAt.get(objective.index) || [];
		list.push(objective);
		objectivesAt.set(objective.index, list);
	}

	if (!stages.length) {
		detailEl.append(el('div', 'dim', '这条任务没有阶段记录。'));
	} else {
		const table = el('table', 'stats quest-stages');
		const headRow = el('tr');
		headRow.append(el('th', null, '阶段'));
		headRow.append(el('th', null, '目标'));
		headRow.append(el('th', null, '日记'));
		if (progress) headRow.append(el('th', null, '你'));
		table.append(headRow);

		for (const stage of stages) {
			const tr = el('tr');
			if (progress && doneAt.get(stage.index)) tr.classList.add('done');
			if (progress && stage.index === progress.currentStage) tr.classList.add('current');

			const stageCell = el('td', 'k stage-no');
			stageCell.append(el('span', null, String(stage.index)));
			if (stage.complete) stageCell.append(el('span', 'tag met-tag', '完成'));
			if (stage.fail) stageCell.append(el('span', 'tag hidden-tag', '失败'));
			tr.append(stageCell);

			const objectiveCell = el('td', 'v multiline');
			const here = objectivesAt.get(stage.index) || [];
			const lines = [];
			for (const objective of here) {
				lines.push(`[${objective.index}] ${objective.text || '（未写文字）'}`);
				for (const condition of objective.conditions || []) lines.push('　条件：' + (condition.text || '（条件）'));
			}
			objectiveCell.textContent = lines.join('\n');
			tr.append(objectiveCell);

			const logCell = el('td', 'v multiline journal');
			const log = stage.log && stage.log.trim() ? stage.log : '';
			logCell.textContent = log || '（这一阶段没有日记）';
			if (!log) logCell.classList.add('dim');
			tr.append(logCell);

			if (progress) tr.append(el('td', doneAt.get(stage.index) ? 'ok' : 'dim', doneAt.get(stage.index) ? '走过 ✓' : '没走过'));
			table.append(tr);
		}
		detailEl.append(table);

		const orphans = [...objectivesAt.entries()].filter(([index]) => !stages.some((stage) => stage.index === index));
		if (orphans.length) {
			const box = el('div', 'quest-objectives');
			box.append(el('div', 'dim', '没有对应阶段的目标'));
			const list = el('ul', 'effects');
			for (const [, objectives] of orphans) {
				for (const objective of objectives) list.append(el('li', null, `[${objective.index}] ${objective.text || '（未写文字）'}`));
			}
			box.append(list);
			detailEl.append(box);
		}
	}

	const chainButton = el('button', 'chip plain', '显示任务链');
	const chainBox = el('div', 'quest-chain');
	chainBox.hidden = true;
	chainButton.onclick = async () => {
		if (!chainBox.hidden) {
			chainBox.hidden = true;
			chainButton.textContent = '显示任务链';
			return;
		}
		chainButton.textContent = '收起任务链';
		chainBox.hidden = false;
		chainBox.textContent = '读任务链…';
		try {
			const chain = await api('/api/chain/' + entry.hex);
			renderChain(chain, entry, chainBox);
		} catch (err) {
			chainBox.textContent = '读不到任务链：' + err.message;
		}
	};
	section('前后任务');
	detailEl.append(chainButton);
	detailEl.append(chainBox);
}

// 一本书：按游戏里那套标记（<font face='$HandwrittenFont' size='23'>、<b>、<br>）排成一页纸，
// 标题居中、首字放大，底下留一个「原始文本」开关，方便核对原文。
const BOOK_FONTS = {
	$handwrittenfont: 'hw',
	$printedfont: 'printed',
	$magescriptfont: 'mage',
	$skyrimbooks: 'books'
};

// img://Textures/Interface/Books/Illuminated_Letters/A_letter.png → /bookart/textures/interface/books/illuminated_letters/a_letter.png
function bookImageSource(source) {
	const raw = (source || '').replace(/^img:\/\//i, '');
	if (!raw) return '';
	return '/bookart/' + raw.replace(/\\/g, '/').toLowerCase();
}

function bookFontClass(face) {
	if (!face) return '';
	const key = face.trim().toLowerCase();
	return BOOK_FONTS[key] || '';
}

// 把带标记的正文变成一串节点；遇到不认识的标签就当文字留着，不吞内容
function renderBookText(text) {
	const normalized = text.replace(/\r\n?/g, '\n');
	const tokens = normalized
		.split(/(<\/?(?:font|b|i|u|p|br)[^>]*>|\[pagebreak\])/i)
		.filter((part) => part !== '');
	const root = document.createDocumentFragment();
	const stack = [{ node: root, align: '' }];

	const current = () => stack[stack.length - 1];

	for (const token of tokens) {
		if (/^\[pagebreak\]$/i.test(token)) {
			const divider = document.createElement('div');
			divider.className = 'book-pagebreak';
			current().node.append(divider);
			continue;
		}
	if (/^<img\b/i.test(token)) {
			const source = (token.match(/src\s*=\s*['"]([^'"]+)/i) || [])[1] || '';
			const image = document.createElement('img');
			image.className = 'book-inline-img';
			image.alt = '';
			const mapped = bookImageSource(source);
			if (mapped) {
				image.src = mapped;
				if (/illuminated_letters/i.test(source)) image.classList.add('letter');
				else image.classList.add('art');
			} else image.classList.add('book-inline-img-missing');
			current().node.append(image);
			continue;
		}

		const match = token.match(/^<(\/?)(font|b|i|u|p|br)([^>]*)>$/i);
		if (!match) {
			// 普通文字：按段落切开
			const pieces = token.split('\n');
			pieces.forEach((piece, index) => {
				if (index > 0) {
					const top = current();
					top.node.append(document.createElement('br'));
				}
				if (piece) {
					const textNode = document.createTextNode(piece);
					current().node.append(textNode);
				}
			});
			continue;
		}

		const closing = match[1] === '/';
		const tag = match[2].toLowerCase();
		const attrs = match[3] || '';

		if (tag === 'br') {
			current().node.append(document.createElement('br'));
			continue;
		}

		if (tag === 'b' || tag === 'i' || tag === 'u') {
			if (closing) {
				if (stack.length > 1) stack.pop();
				continue;
			}
			const element = document.createElement('strong');
			element.className = 'book-' + tag;
			current().node.append(element);
			stack.push({ node: element, align: current().align });
			continue;
		}

		if (tag === 'p') {
			if (closing) {
				if (stack.length > 1) stack.pop();
				continue;
			}
			const element = document.createElement('div');
			element.className = 'book-p';
			const align = (attrs.match(/align\s*=\s*['"]?(\w+)/i) || [])[1];
			if (align) element.style.textAlign = align;
			current().node.append(element);
			stack.push({ node: element, align: align || '' });
			continue;
		}

		if (tag === 'font') {
			if (closing) {
				if (stack.length > 1) stack.pop();
				continue;
			}
			const face = (attrs.match(/face\s*=\s*['"]([^'"]+)/i) || [])[1] || '';
			const size = Number((attrs.match(/size\s*=\s*['"]?(\d+)/i) || [])[1]) || 0;
			const element = document.createElement('span');
			const fontClass = bookFontClass(face);
			if (fontClass) element.className = 'book-font ' + fontClass;
			if (size) element.style.fontSize = (size / 23).toFixed(3) + 'em';
			current().node.append(element);
			stack.push({ node: element, align: current().align });
			continue;
		}
	}

	return root;
}

function renderBook(entry, section) {
	section('书页');
	const text = entry.text || '';
	const handwritten = /日记|日志|便条|信|note|journal|letter|diary/i.test(entry.name || entry.edid || '');
	const panel = el('div', 'book-panel' + (handwritten ? ' book-hand' : ''));
	const page = el('div', 'book-page');
	page.append(el('h3', 'book-title', entry.name || '（无名书）'));

	const body = el('div', 'book-body');
	if (!text.trim()) {
		body.append(el('div', 'dim', '这本书没有正文。'));
	} else {
		body.append(renderBookText(text));
	}
	page.append(body);
	panel.append(page);
	detailEl.append(panel);

	const raw = document.createElement('details');
	raw.className = 'book-raw';
	const summary = document.createElement('summary');
	summary.textContent = '原始文本（带游戏标记）';
	raw.append(summary);
	const pre = el('div', 'longtext raw', entry.rawText || text);
	raw.append(pre);
	detailEl.append(raw);
}

function renderRecipe(entry, section) {
	const data = entry.data;
	section('配方');
	detailEl.append(statsTable([['做成', refName(entry, data.created)], ['数量', data.count], ['工作台', refName(entry, data.workbench)]]));
	const ingredients = (data.ingredients || []).filter((item) => item.item);
	if (ingredients.length) {
		const table = el('table', 'stats');
		for (const item of ingredients) {
			const tr = el('tr');
			const cell = el('td', 'v');
			const link = el('span', 'rowlink', refName(entry, item.item) || hex(item.item.toString(16)));
			link.onclick = () => openEntry(item.item);
			cell.append(link);
			tr.append(cell);
			tr.append(el('td', 'k', item.count > 1 ? `×${item.count}` : ''));
			table.append(tr);
		}
		detailEl.append(table);
	}
}

function renderPlace(entry, section) {
	const data = entry.data;
	section('地点');
	detailEl.append(
		statsTable([
			['上级', data.parent ? refName(entry, data.parent) : ''],
			['所在世界', data.world ? refName(entry, data.world) : ''],
			['室内', data.interior ? '是' : ''],
			['网格', data.gridX || data.gridY ? `${data.gridX}, ${data.gridY}` : '']
		])
	);
}

function renderPerk(entry, section) {
	const data = entry.data;
	section('天赋');
	detailEl.append(statsTable([['等级数', data.rankCount], ['下一级', data.next ? refName(entry, data.next) : ''], ['前置', data.parent ? refName(entry, data.parent) : '']]));
}

function renderSpell(entry, section) {
	section('法术');
	detailEl.append(statsTable([['耗魔', entry.data.cost]]));
	const commands = el('div', 'chips');
	if (entry.type === 'spell') {
		for (const [label, command] of [
			['复制 player.addspell', `player.addspell ${entry.hex}`],
			['复制 player.removespell', `player.removespell ${entry.hex}`]
		]) {
			const chip = el('span', 'chip', label);
			chip.title = command;
			chip.onclick = () => {
				navigator.clipboard?.writeText(command);
				const old = chip.textContent;
				chip.textContent = command;
				setTimeout(() => (chip.textContent = old), 1200);
			};
			commands.append(chip);
		}
	} else {
		commands.append(el('span', 'chip plain', '龙吼不能用 addspell，要在游戏里念'));
	}
	detailEl.append(commands);
	renderEffects(entry, section);
}

function renderLeveled(entry, section) {
	const entries = (entry.data.entries || []).filter((item) => item.item);
	if (!entries.length) return;
	section('条目');
	const table = el('table', 'stats');
	for (const item of entries) {
		const tr = el('tr');
		const cell = el('td', 'v');
		const link = el('span', 'rowlink', refName(entry, item.item) || hex(item.item.toString(16)));
		link.onclick = () => openEntry(item.item);
		cell.append(link);
		tr.append(cell);
		tr.append(el('td', 'k', `等级 ${item.level}${item.count > 1 ? ' ×' + item.count : ''}`));
		table.append(tr);
	}
	detailEl.append(table);
}

const HIDE_REL = new Set(['keyword', 'world', 'parent', 'next', 'nextQuest', 'aliasQuest']);

function renderLinks(entry, section) {
	const links = (entry.links || []).filter((link) => !HIDE_REL.has(link.rel) && link.rel !== 'effect');
	if (!links.length) return;
	const groups = new Map();
	for (const link of links) {
		const list = groups.get(link.title) || [];
		list.push(link);
		groups.set(link.title, list);
	}
	section('相关');
	for (const [title, list] of groups) {
		const group = el('div', 'group');
		group.append(el('div', 'dim', title));
		const box = el('div', 'links');
		for (const link of list) {
			const node = el('span', 'link');
			node.append(el('span', null, link.name || link.edid || hex(link.hex)));
			node.append(el('span', 't', ' ' + link.hex));
			node.onclick = () => openEntry(link.formid);
			box.append(node);
		}
		group.append(box);
		detailEl.append(group);
	}
}

function renderBacklinks(entry, section) {
	const links = (entry.backlinks || []).filter((link) => link.rel !== 'keyword' && link.rel !== 'aliasQuest');
	if (!links.length) return;
	section('谁引用了它');
	const groups = new Map();
	for (const link of links) {
		const list = groups.get(link.rel) || [];
		list.push(link);
		groups.set(link.rel, list);
	}
	for (const [rel, list] of groups) {
		const group = el('div', 'group');
		group.append(el('div', 'dim', relLabel(rel)));
		const box = el('div', 'links');
		for (const link of list.slice(0, 60)) {
			const node = el('span', 'link');
			node.append(el('span', null, link.name || link.edid || hex(link.hex)));
			node.onclick = () => openEntry(link.formid);
			box.append(node);
		}
		if (list.length > 60) box.append(el('span', 'dim', `…还有 ${list.length - 60} 个`));
		group.append(box);
		detailEl.append(group);
	}
}

function relLabel(rel) {
	const map = {
		recipe: '由它合成',
		ingredient: '被用作材料',
		faction: '派系成员',
		carries: '随身携带',
		contains: '放在容器里',
		effect: '效果用在',
		enchantment: '附魔用在',
		keyword: '同一关键词',
		teaches: '出自',
		next: '进阶到',
		parent: '下级',
		nextQuest: '任务链',
		aliasQuest: '别名引用'
	};
	return map[rel] || rel;
}

function renderPlacements(entry, section) {
	const placements = entry.placements || [];
	if (!placements.length) return;
	section(`摆在哪（${placements.length} 处）`);
	const table = el('table', 'stats');
	for (const place of placements.slice(0, 80)) {
		const tr = el('tr');
		const cell = el('td', 'v');
		if (place.cell) {
			const link = el('span', 'rowlink', place.name);
			link.onclick = () => openEntry(place.cell);
			cell.append(link);
		} else {
			cell.append(el('span', null, place.name));
		}
		tr.append(cell);
		tr.append(el('td', 'k', place.count > 1 ? `×${place.count}` : ''));
		table.append(tr);
	}
	detailEl.append(table);
	if (placements.length > 80) detailEl.append(el('div', 'dim', `…还有 ${placements.length - 80} 处`));
}

function renderChain(chain, entry, box) {
	box.textContent = '';
	const nodes = new Map(chain.nodes.map((node) => [node.formid, node]));
	const nextOf = new Map();
	const prevOf = new Map();
	const aliasOf = new Map();
	const push = (map, key, value) => {
		const list = map.get(key) || [];
		list.push(value);
		map.set(key, list);
	};

	for (const edge of chain.edges) {
		if (edge.rel === 'next') push(nextOf, edge.from, edge.to);
		else if (edge.rel === 'prev') push(prevOf, edge.to, edge.from);
		else if (edge.rel === 'alias') {
			push(aliasOf, edge.from, edge.to);
			push(aliasOf, edge.to, edge.from);
		}
	}

	const line = (node, indent, cls) => {
		const wrap = el('div', 'chain-line ' + (cls || ''));
		wrap.style.paddingLeft = indent * 18 + 'px';
		const link = el('span', 'link', node.name || node.edid || node.hex);
		link.append(el('span', 't', ' ' + node.hex));
		link.onclick = () => openEntry(node.formid);
		wrap.append(link);
		box.append(wrap);
	};

	const walk = (formid, direction, depth, seen) => {
		if (depth > 3) return;
		const map = direction === 'next' ? nextOf : prevOf;
		for (const other of map.get(formid) || []) {
			if (seen.has(other)) continue;
			seen.add(other);
			const node = nodes.get(other);
			if (!node) continue;
			line(node, depth, direction);
			walk(other, direction, depth + 1, seen);
		}
	};

	const root = nodes.get(entry.formid);
	box.append(el('div', 'dim', '本任务'));
	if (root) line(root, 0, 'root');

	const before = prevOf.get(entry.formid) || [];
	const after = nextOf.get(entry.formid) || [];
	box.append(el('div', 'dim', '前置任务'));
	if (!before.length) box.append(el('div', 'dim chain-empty', '没有记录在案的前置任务'));
	else walk(entry.formid, 'prev', 0, new Set([entry.formid]));
	box.append(el('div', 'dim', '后续任务'));
	if (!after.length) box.append(el('div', 'dim chain-empty', '没有记录在案的后续任务'));
	else walk(entry.formid, 'next', 0, new Set([entry.formid]));

	const aliases = (aliasOf.get(entry.formid) || []).filter((id) => id !== entry.formid);
	if (aliases.length) {
		box.append(el('div', 'dim', '别名引用（从别的任务复制别名）'));
		for (const id of aliases) {
			const node = nodes.get(id);
			if (node) line(node, 0, 'alias');
		}
	}
	if (!before.length && !after.length && !aliases.length) {
		box.append(el('div', 'dim chain-empty', '这条任务在记录里没有前后任务，也没有别名引用。'));
	}
}

// If anything at all breaks, say so on the page instead of leaving it blank.
window.addEventListener('error', (event) => {
	const sub = document.getElementById('subtitle');
	if (sub) sub.textContent = '脚本出错：' + (event.message || '未知错误');
});
window.addEventListener('unhandledrejection', (event) => {
	const sub = document.getElementById('subtitle');
	if (sub) sub.textContent = '请求出错：' + (event.reason && event.reason.message ? event.reason.message : String(event.reason));
});

boot().catch((err) => {
	const sub = document.getElementById('subtitle');
	if (sub) sub.textContent = '出错了：' + err.message;
	console.error(err);
});
