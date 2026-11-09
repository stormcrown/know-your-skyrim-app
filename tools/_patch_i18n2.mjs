// 语言切换可逆：记住原文，切回中文时恢复，而不是把英文留在页面上。

import fs from 'node:fs';

const file = 'src/web/app.js';
let js = fs.readFileSync(file, 'utf8');

js = js.replace(
	`	for (const node of nodes) {
		const parent = node.parentElement;
		if (!parent || parent.closest(NO_TRANSLATE)) continue;
		const next = translateText(node.nodeValue);
		if (next !== node.nodeValue) node.nodeValue = next;
	}`,
	`	for (const node of nodes) {
		const parent = node.parentElement;
		if (!parent || parent.closest(NO_TRANSLATE)) continue;
		if (node.__kysOriginal === undefined) node.__kysOriginal = node.nodeValue;
		node.nodeValue = translateText(node.__kysOriginal);
	}`
);

js = js.replace(
	`	for (const element of root.querySelectorAll('[placeholder], [title]')) {
		for (const attribute of ['placeholder', 'title']) {
			const value = element.getAttribute(attribute);
			if (!value) continue;
			const next = translateText(value);
			if (next !== value) element.setAttribute(attribute, next);
		}
	}`,
	`	for (const element of root.querySelectorAll('[placeholder], [title]')) {
		if (!element.__kysAttrs) element.__kysAttrs = {};
		for (const attribute of ['placeholder', 'title']) {
			if (!element.hasAttribute(attribute)) continue;
			if (element.__kysAttrs[attribute] === undefined) element.__kysAttrs[attribute] = element.getAttribute(attribute);
			element.setAttribute(attribute, translateText(element.__kysAttrs[attribute]));
		}
	}`
);

fs.writeFileSync(file, js);
console.log('可逆切换已加');
