// Electron 外壳（CommonJS 主进程）：把本地 HTTP 服务跑在主进程里，再用窗口显示同一套页面。
// 主进程用 CJS，src 那边是 ESM，靠动态 import() 接进来——这样不用担心 electron 的 ESM 导出问题。

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.dirname(__dirname);
const LOG = path.join(ROOT, 'data', '_main.log');
function log(message) {
	try {
		fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${message}\n`);
	} catch {
		// 日志写不了就算了
	}
}
log(`启动，ELECTRON_RUN_AS_NODE=${process.env.ELECTRON_RUN_AS_NODE || ''}，execPath=${process.execPath}`);
const HOST = '127.0.0.1';

let mainWindow = null;
let httpServer = null;
let port = 4820;
let CONFIG_FILE = path.join(ROOT, 'config.json');
let DATA_DIR = path.join(ROOT, 'data');

function openWindow() {
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 940,
		minHeight: 620,
		backgroundColor: '#14161a',
		title: 'Know your Skyrim',
		show: false,
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false
		}
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		if (DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
	});
	mainWindow.on('closed', () => {
		mainWindow = null;
	});
	mainWindow.loadURL(`http://${HOST}:${port}/`);

	// 站内链接留在窗口里，外链交给系统浏览器
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	mainWindow.webContents.on('did-fail-load', (event, code, description) => {
		dialog.showErrorBox('页面没加载出来', `本地服务可能还没起来：\n${code} ${description}\n\nhttp://${HOST}:${port}/`);
	});

	buildMenu();
}

function buildMenu() {
	const template = [
		{
			label: '文件',
			submenu: [
				{ label: '重新加载页面', accelerator: 'F5', click: () => mainWindow && mainWindow.reload() },
				{ type: 'separator' },
				{ label: '打开配置目录', click: () => shell.openPath(path.dirname(CONFIG_FILE)) },
				{ label: '打开数据目录', click: () => shell.openPath(DATA_DIR) },
				{ type: 'separator' },
				{ role: 'quit', label: '退出' }
			]
		},
		{
			label: '编辑',
			submenu: [
				{ role: 'undo', label: '撤销' },
				{ role: 'redo', label: '重做' },
				{ type: 'separator' },
				{ role: 'cut', label: '剪切' },
				{ role: 'copy', label: '复制' },
				{ role: 'paste', label: '粘贴' },
				{ role: 'selectAll', label: '全选' }
			]
		},
		{
			label: '视图',
			submenu: [
				{ role: 'resetZoom', label: '实际大小' },
				{ role: 'zoomIn', label: '放大' },
				{ role: 'zoomOut', label: '缩小' },
				{ type: 'separator' },
				{ role: 'togglefullscreen', label: '全屏' },
				{ role: 'toggleDevTools', label: '开发者工具' }
			]
		},
		{
			label: '帮助',
			submenu: [
				{
					label: '关于',
					click: () => {
						dialog.showMessageBox(mainWindow, {
							type: 'info',
							title: 'Know your Skyrim',
							message: 'Know your Skyrim',
							detail: [
								'把当前载入的 Skyrim SE 全部数据搬到游戏外面看。',
								'',
								`版本：${app.getVersion()}`,
								`Electron：${process.versions.electron}`,
								`本地服务：http://${HOST}:${port}/`,
								`索引：${path.join(DATA_DIR, 'index.sqlite')}`
							].join('\n'),
							buttons: ['好']
						});
					}
				}
			]
		}
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function startServer() {
	const { createServer } = await import('../src/server.js');
	const { loadConfig, CONFIG_FILE: configFile, DATA_DIR: dataDir } = await import('../src/core/config.js');
	CONFIG_FILE = configFile;
	DATA_DIR = dataDir;

	const config = loadConfig();
	port = Number(config.port) || 4820;

	const created = createServer();
	httpServer = created.server;
	await new Promise((resolve, reject) => {
		httpServer.once('error', reject);
		httpServer.listen(port, HOST, resolve);
	});
}

// 开发模式：给渲染进程开调试端口，方便 WebStorm / Chrome DevTools 附着
const DEV = process.argv.includes('--dev') || process.env.KYS_DEV === '1';
if (DEV) {
	app.commandLine.appendSwitch('remote-debugging-port', '9222');
	app.commandLine.appendSwitch('enable-logging');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
} else {
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});

	app.whenReady().then(async () => {
		log('ready');
		try {
			await startServer();
			log('服务已监听 ' + port);
			openWindow();
			log('窗口已创建');
		} catch (err) {
			log('失败：' + (err && err.stack));
			const busy = err && err.code === 'EADDRINUSE';
			dialog.showErrorBox(
				'起不来',
				busy
					? `端口 ${port} 已经被占用——多半是还开着一个旧版命令行服务。\n先把它关掉，或者改 config.json 里的 port。\n\n${err.message}`
					: `本地服务启动失败：\n${(err && err.stack) || err}`
			);
			app.quit();
		}
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) openWindow();
	});

	app.on('window-all-closed', () => {
		if (httpServer) {
			try {
				httpServer.close();
			} catch {
				// 已经关了
			}
		}
		app.quit();
	});
}
