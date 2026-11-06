#!/usr/bin/env node
// know-your-skyrim-app: build the index from a load order, then browse it outside the game.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { detectInstances, instancesForSkyrim, resolveLoadOrder } from './core/loadorder.js';
import { buildIndex } from './core/indexer.js';
import { startServer } from './server.js';
import { DB_FILE, loadConfig, saveConfig } from './core/config.js';

function parseArgs(argv) {
	const out = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith('--')) {
			const key = arg.slice(2);
			const next = argv[i + 1];
			if (next === undefined || next.startsWith('--')) out[key] = true;
			else {
				out[key] = next;
				i++;
			}
		} else {
			out._.push(arg);
		}
	}
	return out;
}

function usage() {
	console.log(`用法：
  node src/cli.js instances                     列出这台机器上的 Mod Organizer 实例
  node src/cli.js config                        看当前配置（实例 / 配置 / 语言 / 存档）
  node src/cli.js index [选项]                  建索引
  node src/cli.js serve [选项]                  打开浏览器界面
  node src/cli.js stats                         看已有索引的概况

index 选项（省略时用 config.json 里存的）：
  --instance "SkyrimSEAll"    MO2 实例目录名
  --profile "MakeLoveOstim"   MO2 配置
  --game "F:\\Games\\Skyrim Special Edition"  没装 MO2 时直接用游戏目录
  --language chinese|english  字符串表语言，默认 chinese
  --only "Skyrim.esm,Update.esm"  只索引列出的插件（调试用）
  --db data\\index.sqlite      索引文件位置
  --progress-json             每处理一个插件往 stdout 打一行 JSON（界面刷新时用）

serve 选项：
  --port 4820                 端口
  --no-open                   不自动开浏览器`);
}

function openBrowser(url) {
	if (process.platform === 'win32') {
		spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
	} else if (process.platform === 'darwin') {
		spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
	} else {
		spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
	}
}

function pickInstance(config, args) {
	const instances = detectInstances();
	const wantedId = String(args.instance || config.instanceId || '');
	if (wantedId) {
		const found = instances.find((i) => i.id.toLowerCase() === wantedId.toLowerCase());
		if (found) return found;
		console.error(`没有这个 MO2 实例：${wantedId}`);
		console.error('有的是：' + instances.map((i) => i.id).join('、') + '，再不然用 --game 直接指游戏目录');
		process.exit(1);
	}
	const skyrim = instancesForSkyrim(instances);
	return skyrim[0] || null;
}

async function commandIndex(args) {
	const config = loadConfig();
	const quiet = Boolean(args['progress-json']);
	const say = (line) => {
		if (quiet) console.log(JSON.stringify({ type: 'log', text: String(line) }));
		else console.log(line);
	};

	const instance = args.game ? null : pickInstance(config, args);
	if (!instance && !args.game) {
		say('没找到 Skyrim SE 的 Mod Organizer 实例，也没给 --game。用 node src/cli.js instances 看看。');
		if (quiet) console.log(JSON.stringify({ type: 'done', error: 'no-instance' }));
		process.exit(1);
	}
	const profile = args.profile ? String(args.profile) : config.profile || undefined;
	const language = args.language ? String(args.language) : config.language || 'chinese';

	say(`实例：${instance ? instance.id : '(直接指游戏目录)'}   配置：${profile || '(实例默认)'}   语言：${language}`);
	const loadOrder = resolveLoadOrder({
		instance,
		gamePath: args.game ? String(args.game) : undefined,
		profile,
		language
	});
	say(`插件：${loadOrder.plugins.length} 个（缺 ${loadOrder.missing.length}）   字符串表：${loadOrder.stringsDir}`);

	// Remember what worked, so the app and the next run start from the same place.
	saveConfig({
		instanceId: instance ? instance.id : config.instanceId,
		profile: loadOrder.profile || profile || '',
		language
	});

	const only = args.only ? new Set(String(args.only).split(',').map((s) => s.trim().toLowerCase())) : null;
	const dbFile = args.db ? path.resolve(String(args.db)) : DB_FILE;
	const started = Date.now();
	let lastReport = 0;

	const result = buildIndex({
		loadOrder,
		dbFile,
		only: only ? (plugin) => only.has(plugin.name.toLowerCase()) : null,
		onProgress: (p) => {
			if (p.error) {
				say(`  ! ${p.name || ''}: ${p.error}`);
				return;
			}
			if (quiet) {
				console.log(JSON.stringify({ type: 'progress', ...p }));
				return;
			}
			const now = Date.now();
			if (now - lastReport > 400 || p.index === p.total - 1) {
				lastReport = now;
				const rate = ((p.index + 1) / ((now - started) / 1000)).toFixed(1);
				process.stdout.write(`\r  [${p.index + 1}/${p.total}] ${p.name.padEnd(48).slice(0, 48)} ${String(p.entries).padStart(6)} 条  ${rate} 插件/秒   `);
			}
		}
	});
	if (!quiet) process.stdout.write('\n');
	say(`完成：${result.plugins} 个插件，${result.entries} 条记录，${(result.ms / 1000).toFixed(1)} 秒`);
	say(`索引：${dbFile}`);
	if (loadOrder.missing.length) say(`缺失的插件（不在盘上，跳过）：${loadOrder.missing.slice(0, 10).join('、')}${loadOrder.missing.length > 10 ? ' …' : ''}`);

	if (quiet) console.log(JSON.stringify({ type: 'done', entries: result.entries, plugins: result.plugins, ms: result.ms, db: dbFile }));
}

async function commandServe(args) {
	const config = loadConfig();
	const dbFile = args.db ? path.resolve(String(args.db)) : DB_FILE;
	const port = Number(args.port) || config.port || 4820;
	const { url, server } = await startServer({ dbFile, port });
	console.log(`Know your Skyrim 在 ${url} 开着，Ctrl+C 关掉。`);
	if (!fs.existsSync(dbFile)) console.log('还没有索引：页面里选好实例和配置，点「重建索引」。');
	if (!args['no-open']) openBrowser(url);
	return server;
}

async function commandStats(args) {
	const dbFile = args.db ? path.resolve(String(args.db)) : DB_FILE;
	const { DatabaseSync } = await import('node:sqlite');
	const db = new DatabaseSync(dbFile, { readOnly: true });
	const meta = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
	console.log(meta);
	for (const row of db.prepare('SELECT type, COUNT(*) n FROM entries GROUP BY type ORDER BY n DESC').all()) {
		console.log(`${row.type.padEnd(14)} ${row.n}`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const command = args._[0] || 'serve';
	if (command === 'instances') {
		for (const instance of detectInstances()) {
			const ok = instance.gamePath && fs.existsSync(instance.gamePath) ? '' : '  (游戏目录不在)';
			console.log(`${instance.id.padEnd(24)} ${instance.gameName}  ${instance.gamePath}  [${instance.profile}]${ok}`);
		}
		return;
	}
	if (command === 'config') {
		console.log(loadConfig());
		const skyrim = instancesForSkyrim(detectInstances()).map((i) => `${i.id} [${i.profile}]`);
		console.log('可用的 Skyrim SE 实例：', skyrim.join('、') || '（没有）');
		return;
	}
	if (command === 'index') return commandIndex(args);
	if (command === 'serve') return commandServe(args);
	if (command === 'stats') return commandStats(args);
	if (command === 'help' || command === '--help' || command === '-h') return usage();
	usage();
}

main().catch((err) => {
	console.error(err.stack || err.message);
	process.exit(1);
});
