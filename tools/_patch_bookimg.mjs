// 书籍页：去掉首字放大，改成认 <img src='img://...'>（游戏里的花体首字母和插图就是这么插的）。

import fs from 'node:fs';

const file = 'src/web/app.js';
let js = fs.readFileSync(file, 'utf8');

// 1) 配置里不再有首字开关
js = js.replace(
	`	root.style.setProperty('--book-drop-font', \`\${hand}, "\${body}"\`);
	document.body.classList.toggle('no-dropcap', config ? config.bookDropCap === false : false);`,
	`	root.style.setProperty('--book-drop-font', \`\${hand}, "\${body}"\`);`
);
js = js.replace(
	`	$('book-dropcap').checked = config.bookDropCap !== false;
`,
	''
);
js = js.replace(
	`		bookFontSize: Number($('book-font-size').value) || 18,
		bookDropCap: $('book-dropcap').checked`,
	`		bookFontSize: Number($('book-font-size').value) || 18`
);
js = js.replace(
	`	for (const id of ['book-body-font', 'book-hand-font', 'book-title-font', 'book-font-size', 'book-dropcap']) {`,
	`	for (const id of ['book-body-font', 'book-hand-font', 'book-title-font', 'book-font-size']) {`
);

// 2) 文本里的图片标签
js = js.replace(
	`		const tokens = normalized
		.split(/(<\\/?(?:font|b|i|u|p|br)[^>]*>|\\[pagebreak\\])/i)
		.filter((part) => part !== '');`,
	`	const tokens = normalized
		.split(/(<\\/?(?:font|b|i|u|p|br)[^>]*>|<img\\b[^>]*>|\\[pagebreak\\])/i)
		.filter((part) => part !== '');`
);
js = js.replace(
	`		const match = token.match(/^<(\\/?)(font|b|i|u|p|br)([^>]*)>$/i);`,
	`	if (/^<img\\b/i.test(token)) {
			const source = (token.match(/src\\s*=\\s*['"]([^'"]+)/i) || [])[1] || '';
			const image = document.createElement('img');
			image.className = 'book-inline-img';
			image.alt = '';
			const mapped = bookImageSource(source);
			if (mapped) image.src = mapped;
			else image.classList.add('book-inline-img-missing');
			current().node.append(image);
			continue;
		}

		const match = token.match(/^<(\\/?)(font|b|i|u|p|br)([^>]*)>$/i);`
);

// 3) img:// 路径映射到解包出来的目录
js = js.replace(
	`function bookFontClass(face) {`,
	`// img://Textures/Interface/Books/Illuminated_Letters/A_letter.png → /bookart/textures/interface/books/illuminated_letters/a_letter.png
function bookImageSource(source) {
	const raw = (source || '').replace(/^img:\\/\\//i, '');
	if (!raw) return '';
	return '/bookart/' + raw.replace(/\\\\/g, '/').toLowerCase();
}

function bookFontClass(face) {`
);

// 4) 首字放大去掉
js = js.replace(
	`	// 首字放大：只对第一段、且第一段是普通文字的开头做
	const canDrop = !document.body.classList.contains('no-dropcap');
	if (canDrop && firstText && firstText.nodeValue && firstText.nodeValue.length > 1) {
		const character = firstText.nodeValue[0];
		if (!/\\s/.test(character)) {
			const span = document.createElement('span');
			span.className = 'book-drop';
			span.textContent = character;
			firstText.parentNode.insertBefore(span, firstText);
			firstText.nodeValue = firstText.nodeValue.slice(1);
		}
	}
	return root;`,
	`	return root;`
);
js = js.replace(`	let firstParagraph = null;
	let firstText = null;`, `	let firstParagraph = null;`);

// 5) 原始文本用服务端给的 rawText
js = js.replace(
	`	const pre = el('div', 'longtext raw', text);`,
	`	const pre = el('div', 'longtext raw', entry.rawText || text);`
);

fs.writeFileSync(file, js);
console.log('book: 去掉首字放大，接上图片');
