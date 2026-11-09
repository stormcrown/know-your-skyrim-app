// 用最小 DOM 跑一遍 i18n 的翻译逻辑：界面文字要翻，数据（书页、名字）不能动。

import fs from 'node:fs';
import vm from 'node:vm';

const i18n = fs.readFileSync('src/web/i18n.js', 'utf8');
const app = fs.readFileSync('src/web/app.js', 'utf8');

const start = app.indexOf('// 界面语言：中文原句');
const end = app.indexOf('function applyTheme(theme) {');
const code = app.slice(start, end);

class TextNode {
	constructor(value) {
		this.nodeValue = value;
		this.parentElement = null;
	}
}

class Element {
	constructor(tag, className = '') {
		this.tagName = tag;
		this.className = className;
		this.children = [];
		this.attributes = {};
	}
	append(...nodes) {
		for (const node of nodes) {
			this.children.push(node);
			if (node && node.nodeValue !== undefined) node.parentElement = this;
		}
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
	}
	hasAttribute(name) {
		return this.attributes[name] !== undefined;
	}
	getAttribute(name) {
		return this.attributes[name] ?? null;
	}
	closest(selector) {
		const classes = selector.split(',').map((part) => part.trim().replace(/^\./, ''));
		let node = this;
		while (node) {
			if (classes.some((name) => node.className.split(' ').includes(name))) return node;
			node = node.parentElement;
		}
		return null;
	}
	querySelectorAll(selector) {
		const out = [];
		const walk = (node) => {
			for (const child of node.children) {
				if (child instanceof Element) {
					if (selector === '[placeholder], [title]' && (child.attributes.placeholder || child.attributes.title)) out.push(child);
					walk(child);
				}
			}
		};
		walk(this);
		return out;
	}
}

const root = new Element('body');
const heading = new Element('h3');
heading.append(new TextNode('阶段 · 目标 · 日记'));
root.append(heading);

const bookPanel = new Element('div', 'book-panel');
bookPanel.append(new TextNode('阶段 · 目标 · 日记'));
root.append(bookPanel);

const chip = new Element('span', 'chip');
chip.append(new TextNode('单手'));
root.append(chip);

const input = new Element('input');
input.setAttribute('placeholder', '全部插件（可搜索）');
root.append(input);

const doc = {
	body: root,
	title: '',
	createTreeWalker(node) {
		const texts = [];
		const walk = (current) => {
			for (const child of current.children) {
				if (child instanceof TextNode) texts.push(child);
				else walk(child);
			}
		};
		walk(node);
		let index = -1;
		const walker = { currentNode: null };
		walker.nextNode = () => {
			index += 1;
			if (index >= texts.length) return null;
			walker.currentNode = texts[index];
			return walker.currentNode;
		};
		return walker;
	}
};

const sandbox = { document: doc, window: {}, NodeFilter: { SHOW_TEXT: 4 }, console };
sandbox.globalThis = sandbox;
sandbox.window.KYS_EN = {};
vm.createContext(sandbox);
vm.runInContext(i18n, sandbox);
vm.runInContext('var state = { config: {} };', sandbox);
vm.runInContext(code, sandbox);

sandbox.state.config = { uiLang: 'en' };
sandbox.refreshLanguage();

console.log('标题:', heading.children[0].nodeValue);
console.log('书页里（不该翻）:', bookPanel.children[0].nodeValue);
console.log('芯片:', chip.children[0].nodeValue);
console.log('placeholder:', input.attributes.placeholder);

sandbox.state.config = { uiLang: 'zh' };
sandbox.refreshLanguage();
console.log('切回中文还是中文？', chip.children[0].nodeValue);
