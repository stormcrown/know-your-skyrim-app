// 冒烟测试：用假 electron 模块在普通 node 里跑一遍主进程，验证「起服务 + 建窗口调用」这条链路本身没写错。
// 真窗口还是得在桌面会话里开。

const Module = require('node:module');
const stub = require('./electron-stub/index.js');

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
	if (request === 'electron') return stub;
	return originalLoad.call(this, request, parent, isMain);
};

require('../electron/main.cjs');

setTimeout(async () => {
	try {
		const response = await fetch('http://127.0.0.1:4820/api/status');
		const body = await response.json();
		console.log('冒烟：HTTP', response.status, '记录数', body?.entries);
	} catch (err) {
		console.log('冒烟失败：', err.message);
	}
	process.exit(0);
}, 6000);
