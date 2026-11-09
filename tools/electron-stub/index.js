// 用来在普通 node 里跑 electron/main.cjs 的假 electron 模块：只为验证主进程代码本身没有低级错误。
// 真的窗口还是得在桌面会话里开。

class FakeWindow {
	constructor(options) {
		this.options = options;
		this.webContents = {
			setWindowOpenHandler: () => {},
			on: () => {},
			openDevTools: () => {}
		};
	}
	once() {}
	on() {}
	loadURL(url) {
		console.log('[stub] loadURL', url);
	}
	isMinimized() {
		return false;
	}
	restore() {}
	focus() {}
	reload() {}
}

const listeners = new Map();

const app = {
	getVersion: () => '0.1.0',
	requestSingleInstanceLock: () => true,
	on(event, handler) {
		const list = listeners.get(event) || [];
		list.push(handler);
		listeners.set(event, list);
	},
	whenReady: () => Promise.resolve(),
	quit: () => {
		console.log('[stub] quit');
		process.exit(0);
	},
	getPath: (name) => `/tmp/${name}`
};

const BrowserWindow = Object.assign(FakeWindow, { getAllWindows: () => [] });
const Menu = { buildFromTemplate: (template) => template, setApplicationMenu: (menu) => console.log('[stub] menu items:', menu.length) };
const dialog = { showErrorBox: (title, message) => console.log('[stub] error box:', title, message), showMessageBox: () => {} };
const shell = { openExternal: (url) => console.log('[stub] openExternal', url), openPath: (p) => console.log('[stub] openPath', p) };

module.exports = { app, BrowserWindow, Menu, dialog, shell };
