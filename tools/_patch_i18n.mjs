// 给前端加多语言：默认中文，切换英文时把界面文字翻掉（数据不动）。
// 用法：node tools/_patch_i18n.mjs

import fs from 'node:fs';

const file = 'src/web/app.js';
let js = fs.readFileSync(file, 'utf8');

// 1) 语言状态 + 翻译函数
if (!js.includes('function uiLang()')) {
	js = js.replace(
		'function applyTheme(theme) {',
		`// 界面语言：中文原句 → 英文词条（见 i18n.js），数据（名字、书页正文）不翻
function uiLang() {
	return state.config && state.config.uiLang === 'en' ? 'en' : 'zh';
}

function translateText(text) {
	if (uiLang() !== 'en' || !text || !text.trim()) return text;
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
	if (!root || uiLang() !== 'en') return;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		const parent = node.parentElement;
		if (!parent || parent.closest(NO_TRANSLATE)) continue;
		const next = translateText(node.nodeValue);
		if (next !== node.nodeValue) node.nodeValue = next;
	}
	for (const element of root.querySelectorAll('[placeholder], [title]')) {
		for (const attribute of ['placeholder', 'title']) {
			const value = element.getAttribute(attribute);
			if (!value) continue;
			const next = translateText(value);
			if (next !== value) element.setAttribute(attribute, next);
		}
	}
}

function refreshLanguage() {
	localize(document.body);
	document.title = uiLang() === 'en' ? 'Know your Skyrim' : 'Know your Skyrim';
}

function applyTheme(theme) {`
	);
}

// 2) 渲染完刷一遍
const hooks = [
	['	renderFamilies();\n', '	renderFamilies();\n	refreshLanguage();\n'],
	['	renderSubKinds();\n', '	renderSubKinds();\n	refreshLanguage();\n'],
	['	renderRows();\n', '	renderRows();\n	refreshLanguage();\n'],
	['	detailEl.append(renderLinksPlaceholder());\n', '	detailEl.append(renderLinksPlaceholder());\n']
];
for (const [search, replace] of hooks) {
	if (js.includes(search)) js = js.replace(search, replace);
}

// renderDetail 末尾统一刷新
js = js.replace(
	`	renderLinks(entry, section);
	renderBacklinks(entry, section);
	renderPlacements(entry, section);
}`,
	`	renderLinks(entry, section);
	renderBacklinks(entry, section);
	renderPlacements(entry, section);
	refreshLanguage();
}`
);

// 3) 语言选择框接线
if (!js.includes("$('ui-lang')")) {
	js = js.replace(
		"	for (const id of ['book-body-font', 'book-hand-font', 'book-title-font', 'book-font-size']) {",
		`	$('ui-lang').addEventListener('change', async () => {
		state.config = { ...(state.config || {}), uiLang: $('ui-lang').value };
		await postConfig({ uiLang: $('ui-lang').value });
		refreshLanguage();
	});
	for (const id of ['book-body-font', 'book-hand-font', 'book-title-font', 'book-font-size']) {`
	);
	js = js.replace(
		`	$('language').value = config.config.language || 'chinese';
	fillBookSettings(config.config);`,
		`	$('language').value = config.config.language || 'chinese';
	$('ui-lang').value = config.config.uiLang === 'en' ? 'en' : 'zh';
	fillBookSettings(config.config);`
	);
}

fs.writeFileSync(file, js);
console.log('app.js i18n patched');
