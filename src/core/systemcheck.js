// The System page: what this installation actually is, which plugins the index could not read, which SKSE plugins
// are loaded, and the compatibility problems that can be proven from the files on disk.
//
// Every check here is evidence-based: a master that is missing from the load order, a plugin that parsed to nothing,
// a count that is over the engine's limit. No "this mod is known to be broken" folklore.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectInstances } from './loadorder.js';

const VERSION_CACHE = new Map();

function fileVersions(files) {
	const out = {};
	const wanted = files.filter((file) => fs.existsSync(file));
	if (!wanted.length) return out;
	const script = [
		'$ErrorActionPreference="SilentlyContinue"',
		`@(${wanted.map((file) => `'${file.replace(/'/g, "''")}'`).join(',')}) | ForEach-Object {`,
		'  $item = Get-Item -LiteralPath $_',
		'  $v = $item.VersionInfo',
		'  "$($item.FullName)|$($v.FileVersion)|$($v.ProductVersion)|$($v.FileDescription)"',
		'}'
	].join('\n');
	try {
		const stdout = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
			encoding: 'utf8',
			timeout: 20000,
			windowsHide: true
		});
		for (const line of stdout.split(/\r?\n/)) {
			const parts = line.split('|');
			if (parts.length < 2 || !parts[0]) continue;
			out[parts[0]] = { fileVersion: parts[1] || '', productVersion: parts[2] || '', description: parts[3] || '' };
		}
	} catch {
		// version info is a nicety; the page works without it
	}
	return out;
}

export function gameVersions(gamePath) {
	const key = gamePath || '';
	if (VERSION_CACHE.has(key)) return VERSION_CACHE.get(key);
	if (!gamePath) return {};
	const files = [
		path.join(gamePath, 'SkyrimSE.exe'),
		path.join(gamePath, 'skse64_loader.exe'),
		path.join(gamePath, 'CreationKit.exe'),
		path.join(gamePath, 'Data', 'SKSE', 'Plugins', 'versionlib-1-6-1170-0.bin')
	];
	const versions = fileVersions(files);
	const pick = (file) => versions[file] || null;
	const result = {
		game: pick(path.join(gamePath, 'SkyrimSE.exe')),
		skse: pick(path.join(gamePath, 'skse64_loader.exe')),
		creationKit: pick(path.join(gamePath, 'CreationKit.exe')),
		addressLibrary: fs.existsSync(path.join(gamePath, 'Data', 'SKSE', 'Plugins'))
			? fs
					.readdirSync(path.join(gamePath, 'Data', 'SKSE', 'Plugins'))
					.filter((name) => /^versionlib-.*\.bin$/i.test(name))
					.sort()
					.slice(-5)
			: []
	};
	VERSION_CACHE.set(key, result);
	return result;
}

// Every folder that can hold SKSE plugins: the game's Data, then each enabled mod in priority order.
export function sksePluginDirs(gamePath, modsDir, mods) {
	const dirs = [path.join(gamePath, 'Data', 'SKSE', 'Plugins')];
	for (const mod of mods || []) {
		if (!mod.enabled) continue;
		dirs.push(path.join(modsDir, mod.name, 'SKSE', 'Plugins'));
	}
	return dirs.filter((dir) => {
		try {
			return fs.statSync(dir).isDirectory();
		} catch {
			return false;
		}
	});
}

export function sksePlugins(gamePath, modsDir, mods) {
	const dirs = sksePluginDirs(gamePath, modsDir, mods);
	const found = new Map(); // name -> { file, from, ini }
	for (const dir of dirs) {
		let names = [];
		try {
			names = fs.readdirSync(dir);
		} catch {
			continue;
		}
		for (const name of names) {
			if (!/\.(dll|ini|bin)$/i.test(name)) continue;
			const key = name.toLowerCase();
			const previous = found.get(key) || {};
			found.set(key, { ...previous, [name.toLowerCase().endsWith('.dll') ? 'dll' : name.toLowerCase().endsWith('.ini') ? 'ini' : 'bin']: path.join(dir, name), from: fromLabel(dir) });
		}
	}
	const dlls = [...found.entries()].filter(([key, value]) => key.endsWith('.dll') && value.dll);
	const versions = fileVersions(dlls.map(([, value]) => value.dll));
	return dlls.map(([key, value]) => {
		const stat = fs.statSync(value.dll);
		const info = versions[value.dll] || {};
		const iniName = key.replace(/\.dll$/, '.ini');
		return {
			name: path.basename(value.dll),
			from: value.from,
			size: stat.size,
			mtime: stat.mtimeMs,
			fileVersion: info.fileVersion || '',
			description: info.description || '',
			ini: found.has(iniName)
		};
	});
}

function fromLabel(dir) {
	const parts = dir.split(/[\\/]/);
	const plugins = parts.lastIndexOf('Plugins');
	return plugins > 1 ? parts[plugins - 2] : 'Data';
}

// Every Address Library table the game can see, from Data and from the mods that overlay it.
export function addressLibrary(gamePath, modsDir, mods) {
	const found = new Set();
	for (const dir of sksePluginDirs(gamePath, modsDir, mods)) {
		try {
			for (const name of fs.readdirSync(dir)) if (/^version(lib)?-.*\.bin$/i.test(name)) found.add(name);
		} catch {
			// unreadable folder
		}
	}
	return [...found].sort();
}

export function compatibilityChecks(db, loadOrder, gamePath) {
	const checks = [];
	const plugins = db.prepare('SELECT idx, name, source, masters, light, entries, error FROM plugins ORDER BY idx').all();
	const names = new Set(plugins.map((plugin) => plugin.name.toLowerCase()));

	// 每项都写中英两版：界面按当前语言挑，文本报告里用中文那份
	const add = (level, zhTitle, enTitle, zhDetail, enDetail, list = []) => {
		checks.push({ level, title: zhTitle, titleEn: enTitle, detail: zhDetail, detailEn: enDetail, list });
	};

	const failed = plugins.filter((plugin) => plugin.error);
	if (failed.length) {
		add(
			'error',
			`${failed.length} 个插件整份解析失败`,
			`${failed.length} plugin file(s) failed to parse`,
			failed.slice(0, 12).map((plugin) => `${plugin.name}：${plugin.error}`).join('\n'),
			failed.slice(0, 12).map((plugin) => `${plugin.name}: ${plugin.error}`).join('\n'),
			failed.map((plugin) => plugin.name)
		);
	}

	const empty = plugins.filter((plugin) => !plugin.error && plugin.entries === 0);
	if (empty.length) {
		add(
			'info',
			`${empty.length} 个插件没有本工具索引的记录`,
			`${empty.length} plugin(s) have no records this tool indexes`,
			'文件能打开，但没有物品、人物、任务这类记录——多数是只有语音、对话、包或脚本的补丁。这不算错误。',
			'The file opens fine but holds no items, actors or quests — usually a voice/dialogue/package/script-only patch. Not an error.',
			empty.map((plugin) => plugin.name)
		);
	}

	const known = new Set(String(loadOrder?.allPlugins || '').toLowerCase().split('|').filter(Boolean));
	const missingFiles = [];
	const unticked = [];
	for (const plugin of plugins) {
		const masters = String(plugin.masters || '')
			.split('|')
			.filter(Boolean);
		for (const master of masters) {
			const key = master.toLowerCase();
			if (names.has(key)) continue;
			if (known.has(key)) unticked.push(`${plugin.name} 需要 ${master}`);
			else missingFiles.push(`${plugin.name} 需要 ${master}`);
		}
	}
	if (missingFiles.length) {
		add(
			'error',
			`${missingFiles.length} 处前置插件在盘上找不到`,
			`${missingFiles.length} required master(s) not found on disk`,
			'这些插件声明的前置既没勾选、也不在 profile 的加载列表里，游戏读到这里起不来。',
			'These masters are neither ticked nor present in the profile load order; the game cannot start without them.',
			missingFiles
		);
	}
	if (unticked.length) {
		add(
			'warn',
			`${unticked.length} 处前置写在加载列表里但没勾选`,
			`${unticked.length} required master(s) listed but not ticked`,
			'插件声明了这些前置，它们在 loadorder.txt 里存在但 plugins.txt 没打勾。游戏通常会在启动时报缺少前置——除非你用了别的合并手段。',
			'These masters exist in loadorder.txt but are not ticked in plugins.txt. The game usually reports missing masters at startup unless you merged them another way.',
			unticked
		);
	}

	const full = plugins.filter((plugin) => !plugin.light);
	const light = plugins.filter((plugin) => plugin.light);
	const saveFull = loadOrder?.saveFullCount || 0;
	const saveLight = loadOrder?.saveLightCount || 0;

	if (saveFull && (full.length !== saveFull || light.length !== saveLight)) {
		add(
			'warn',
			'索引的 load order 与存档记录的不一致',
			'Index load order differs from the save',
			`索引：完整 ${full.length} / 轻量 ${light.length}；存档：完整 ${saveFull} / 轻量 ${saveLight}。说明存档是在另一套勾选下存的，任务进度可能对不上。`,
			`Index: ${full.length} full / ${light.length} light; save: ${saveFull} full / ${saveLight} light. The save was made with a different load order, so quest progress may not line up.`,
			[]
		);
	}

	if (full.length > 254) {
		add(
			'warn',
			`索引里完整插件 ${full.length} 个，超过 254`,
			`${full.length} full plugins, above the 254 limit`,
			'Skyrim SE 的完整插件槽位是 254 个（0-253）。超过还进得去游戏，通常意味着有插件其实是 ESL 而本工具没认出来，或者你用了别的手段合并。可以对照 xEdit 的插件列表核对。',
			'Skyrim SE has 254 full-plugin slots (0-253). If the game still starts, some plugins are probably ESL files this tool did not recognise, or you merged them another way. Check against xEdit.',
			[]
		);
	} else if (full.length > 235) {
		add('info', `完整插件 ${full.length} 个，接近 254 上限`, `${full.length} full plugins, close to the 254 limit`, '再装十几个完整插件就到顶了，后面优先用 ESL 版本。', 'A dozen more full plugins and you are at the ceiling; prefer ESL versions from here.', []);
	}
	if (light.length > 4000) {
		add('error', `轻量插件 ${light.length} 个，超过 4096 上限`, `${light.length} light plugins, above the 4096 limit`, 'ESL 槽位用满了，游戏读不到后面的。', 'The ESL slots are full; the game will not load the rest.', []);
	}

	const hasLoader = fs.existsSync(path.join(gamePath, 'Data', 'SKSE', 'Plugins', 'skse64_steam_loader.dll')) || fs.existsSync(path.join(gamePath, 'skse64_loader.exe'));
	if (!hasLoader) {
		add('warn', '没找到 SKSE', 'SKSE not found', '游戏目录里没有 skse64_loader.exe，依赖 SKSE 的插件都会不工作。', 'skse64_loader.exe is missing from the game folder, so every SKSE plugin will fail.', []);
	}

	const sksePluginsList = sksePlugins(gamePath);
	const unknownVersion = sksePluginsList.filter((plugin) => !plugin.fileVersion);
	if (unknownVersion.length) {
		add(
			'info',
			`${unknownVersion.length} 个 SKSE 插件读不到版本号`,
			`${unknownVersion.length} SKSE plugin(s) have no version info`,
			'读不到版本不是错误，只是没法判断它跟当前游戏版本是否搭配。',
			'Missing version info is not an error; it just means we cannot tell whether it matches the game build.',
			unknownVersion.map((plugin) => plugin.name)
		);
	}

	const address = [];
	for (const dir of sksePluginDirs(gamePath, loadOrder?.modsDir, loadOrder?.mods)) {
		try {
			for (const name of fs.readdirSync(dir)) if (/^version(lib)?-.*\.bin$/i.test(name)) address.push(name);
		} catch {
			// unreadable folder: nothing to add
		}
	}
	if (!address.length) {
		add('warn', '没有 Address Library（versionlib-*.bin）', 'Address Library missing (versionlib-*.bin)', '大量 SKSE 插件靠它定位函数，缺了会直接不加载。', 'Many SKSE plugins use it to resolve addresses and simply will not load without it.', []);
	}

	const duplicates = loadOrder?.duplicates || [];
	if (duplicates.length) {
		add(
			'warn',
			`${duplicates.length} 个插件文件在多个 mod 里重复`,
			`${duplicates.length} plugin file(s) exist in more than one mod`,
			'同一个插件名字在多个 mod 目录里出现，实际生效的是优先级最高的那份；如果版本不同，可能读到的不是你想要的。',
			'The same plugin name appears in several mods; the highest priority copy wins. Different versions may not be the one you expect.',
			duplicates.slice(0, 40)
		);
	}

	return checks;
}

export function systemReport({ versions, skse, checks, plugins, meta, gamePath }) {
	const lines = [];
	lines.push('Know your Skyrim · 系统报告');
	lines.push(`生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`);
	lines.push(`游戏目录：${gamePath}`);
	lines.push('');
	lines.push('== 版本 ==');
	lines.push(`游戏 SkyrimSE.exe：${versions.game?.fileVersion || '读不到'}`);
	lines.push(`SKSE loader：${versions.skse?.fileVersion || '读不到'}`);
	lines.push(`CreationKit：${versions.creationKit?.fileVersion || '读不到'}`);
	lines.push(`Address Library：${(versions.addressLibrary || []).join(', ') || '没有'}`);
	lines.push('');
	lines.push('== 索引 ==');
	lines.push(`插件 ${meta.pluginCount || '?'} 个（完整 ${meta.fullPlugins || '?'} / 轻量 ${meta.lightPlugins || '?'}），记录 ${meta.entryCount || '?'} 条`);
	lines.push(`配置：${meta.profile || ''}　语言：${meta.language || ''}`);
	lines.push('');
	lines.push('== 兼容性检查 ==');
	if (!checks.length) lines.push('没有发现问题。');
	for (const check of checks) {
		lines.push(`[${check.level}] ${check.title}`);
		if (check.detail) lines.push(`    ${check.detail.replace(/\n/g, '\n    ')}`);
		if (check.list?.length) lines.push(`    涉及：${check.list.slice(0, 60).join('、')}${check.list.length > 60 ? ' …' : ''}`);
	}
	lines.push('');
	lines.push('== SKSE 插件 ==');
	for (const plugin of skse) lines.push(`${plugin.name}　${plugin.fileVersion || '(无版本号)'}${plugin.description ? '　' + plugin.description : ''}`);
	lines.push('');
	lines.push('== 解析失败的插件 ==');
	const failed = plugins.filter((plugin) => plugin.error || plugin.entries === 0);
	if (!failed.length) lines.push('没有。');
	for (const plugin of failed) lines.push(`${plugin.name}：${plugin.error || '解析出 0 条记录'}`);
	return lines.join('\r\n');
}

export function resolveGamePath() {
	const instance = detectInstances().find((item) => /skyrim/i.test(item.gameName || '') && item.gamePath && fs.existsSync(item.gamePath));
	return instance ? instance.gamePath : '';
}
