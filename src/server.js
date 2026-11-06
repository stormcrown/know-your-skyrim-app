// The local server: JSON endpoints, the static page, and the one write action the app has — rebuilding the index
// in a child process so the page stays alive and can watch the progress.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { getEntry, plugins, search, stats } from './core/query.js';
import { detectInstances } from './core/loadorder.js';
import { listSaves, readSaveFile } from './core/savegame.js';
import { DB_FILE, loadConfig, saveConfig } from './core/config.js';
import { createSaveTables } from './core/db.js';
import { readQuestProgress } from './core/savequests.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const WEB_DIR = path.join(HERE, 'web');
const CLI = path.join(HERE, 'cli.js');
const SAVE_JSON = path.join(ROOT, 'data', 'save.json');

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon'
};

function json(res, body, status = 200) {
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
	res.end(JSON.stringify(body));
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.on('data', (chunk) => {
			size += chunk.length;
			if (size > 64 * 1024) {
				reject(new Error('请求太大'));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (!chunks.length) return resolve({});
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch (err) {
				reject(err);
			}
		});
		req.on('error', reject);
	});
}

export function createServer(dbFile = DB_FILE) {
	const state = {
		db: null,
		dbFile,
		progress: null,
		rebuild: { running: false, startedAt: 0, index: 0, total: 0, current: '', entries: 0, error: null, log: [], exit: null }
	};

	function openDb() {
		if (!fs.existsSync(state.dbFile)) return null;
		try {
			// Not read-only: the save's quest progress is written into its own table beside the index.
			state.db = new DatabaseSync(state.dbFile);
			createSaveTables(state.db);
			applySavedProgress(false);
		} catch (err) {
			state.db = null;
		}
		return state.db;
	}

	// data/save.json holds what was read out of the picked save; the index table is refilled from it.
	function loadProgressJson() {
		try {
			return JSON.parse(fs.readFileSync(SAVE_JSON, 'utf8'));
		} catch {
			return null;
		}
	}

	function applySavedProgress(force) {
		const progress = loadProgressJson();
		if (!progress || !state.db) return null;
		const config = loadConfig();
		if (!force && config.saveFile && progress.file !== config.saveFile) return null;
		state.progress = progress;
		createSaveTables(state.db);
		state.db.exec('DELETE FROM save_progress');
		const stmt = state.db.prepare(
			'INSERT OR REPLACE INTO save_progress (quest, current_stage, done_stages, stage_count, stages) VALUES (?, ?, ?, ?, ?)'
		);
		state.db.exec('BEGIN');
		for (const quest of progress.quests || []) {
			stmt.run(quest.formid, quest.currentStage ?? null, quest.doneStages || 0, quest.stages?.length || 0, JSON.stringify(quest.stages || []));
		}
		state.db.exec('COMMIT');
		return progress;
	}

	// Read the picked save's quest progress: the stages are checked against the plugins, so nothing here is guessed.
	function parseProgress() {
		const config = loadConfig();
		if (!config.saveFile || !fs.existsSync(config.saveFile) || !state.db) return null;
		const questStages = new Map();
		for (const row of state.db.prepare("SELECT formid, name, data FROM entries WHERE type = 'quest'").all()) {
			let data = {};
			try {
				data = JSON.parse(row.data || '{}');
			} catch {
				data = {};
			}
			questStages.set(row.formid, {
				formid: row.formid,
				name: row.name,
				stages: new Set((data.stages || []).map((s) => s.index))
			});
		}
		const progress = readQuestProgress(config.saveFile, questStages);
		fs.mkdirSync(path.dirname(SAVE_JSON), { recursive: true });
		fs.writeFileSync(SAVE_JSON, JSON.stringify(progress), 'utf8');
		applySavedProgress(true);
		return progress;
	}

	function closeDb() {
		try {
			state.db?.close();
		} catch {
			// already gone
		}
		state.db = null;
	}

	openDb();

	function instanceList() {
		return detectInstances().map((instance) => ({
			id: instance.id,
			gameName: instance.gameName,
			gamePath: instance.gamePath,
			profile: instance.profile,
			baseDir: instance.baseDir,
			exists: Boolean(instance.gamePath && fs.existsSync(instance.gamePath))
		}));
	}

	function profilesOf(instanceId) {
		const instance = detectInstances().find((i) => i.id === instanceId);
		if (!instance) return [];
		const dir = path.join(instance.baseDir || instance.instanceDir, 'profiles');
		try {
			return fs
				.readdirSync(dir, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name);
		} catch {
			return [];
		}
	}

	function savesOf(config) {
		const instance = detectInstances().find((i) => i.id === config.instanceId);
		const profileSavesDir = instance
			? path.join(instance.baseDir || instance.instanceDir, 'profiles', config.profile || instance.profile || 'Default', 'saves')
			: undefined;
		const documentsSavesDir = path.join(os.homedir(), 'Documents', 'My Games', 'Skyrim Special Edition', 'Saves');
		return listSaves({ profileSavesDir, documentsSavesDir });
	}

	function saveMeta(config) {
		if (!config.saveFile) return null;
		try {
			return readSaveFile(config.saveFile);
		} catch (err) {
			return { error: err.message, file: config.saveFile };
		}
	}

	function progressSummary() {
		const progress = state.progress || loadProgressJson();
		if (!progress) return null;
		return {
			fileName: progress.fileName,
			file: progress.file,
			parsedAt: progress.parsedAt,
			quests: (progress.quests || []).length,
			pluginCount: progress.pluginCount,
			playerName: progress.header?.playerName,
			playerLevel: progress.header?.playerLevel
		};
	}

	function startRebuild() {
		if (state.rebuild.running) return false;
		closeDb();
		state.rebuild = { running: true, startedAt: Date.now(), index: 0, total: 0, current: '', entries: 0, error: null, log: [], exit: null };

		const child = spawn(process.execPath, [CLI, 'index', '--progress-json', '--db', state.dbFile], {
			cwd: ROOT,
			windowsHide: true,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let buffer = '';
		child.stdout.on('data', (chunk) => {
			buffer += chunk.toString('utf8');
			let at;
			while ((at = buffer.indexOf('\n')) >= 0) {
				const line = buffer.slice(0, at).trim();
				buffer = buffer.slice(at + 1);
				if (!line) continue;
				try {
					const message = JSON.parse(line);
					if (message.type === 'progress') {
						state.rebuild.index = message.index;
						state.rebuild.total = message.total;
						state.rebuild.current = message.name || '';
						if (message.entries !== undefined) state.rebuild.entries = message.total_entries ?? state.rebuild.entries;
						if (message.error) state.rebuild.log.push(`${message.name}: ${message.error}`);
					} else if (message.type === 'done') {
						state.rebuild.entries = message.entries;
						state.rebuild.total = message.plugins;
						state.rebuild.summary = message;
					} else if (message.type === 'log') {
						state.rebuild.log.push(message.text);
					}
				} catch {
					state.rebuild.log.push(line);
				}
			}
		});
		child.stderr.on('data', (chunk) => state.rebuild.log.push(chunk.toString('utf8').trim()));
		child.on('close', (code) => {
			state.rebuild.running = false;
			state.rebuild.exit = code;
			state.rebuild.ms = Date.now() - state.rebuild.startedAt;
			if (code !== 0) state.rebuild.error = state.rebuild.log.slice(-5).join('\n') || `索引进程退出码 ${code}`;
			openDb();
		});
		return true;
	}

	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, 'http://localhost');
		try {
			if (!url.pathname.startsWith('/api/')) return serveStatic(res, url.pathname);

			if (url.pathname === '/api/config' && req.method === 'GET') {
				const config = loadConfig();
				return json(res, {
					config,
					instances: instanceList(),
					profiles: profilesOf(config.instanceId),
					saves: savesOf(config),
					save: saveMeta(config),
					index: state.db ? stats(state.db).meta : null,
					progress: progressSummary(),
					rebuild: state.rebuild
				});
			}

			if (url.pathname === '/api/config' && req.method === 'POST') {
				const body = await readBody(req);
				const before = loadConfig();
				const next = saveConfig({
					instanceId: 'instanceId' in body ? String(body.instanceId) : undefined,
					profile: 'profile' in body ? String(body.profile) : undefined,
					language: 'language' in body ? String(body.language) : undefined,
					saveFile: 'saveFile' in body ? String(body.saveFile) : undefined
				});
				const needsRebuild =
					before.instanceId !== next.instanceId || before.profile !== next.profile || before.language !== next.language;
				return json(res, { config: next, profiles: profilesOf(next.instanceId), saves: savesOf(next), needsRebuild });
			}

			if (url.pathname === '/api/save' && req.method === 'POST') {
				const body = await readBody(req);
				const config = saveConfig({ saveFile: String(body.saveFile || '') });
				let progress = null;
				let progressError = null;
				if (config.saveFile) {
					try {
						progress = parseProgress();
					} catch (err) {
						progressError = err.message;
					}
				}
				return json(res, { config, save: saveMeta(config), progress: progressSummary(), progressError });
			}

			if (url.pathname === '/api/rebuild' && req.method === 'POST') {
				const started = startRebuild();
				return json(res, { started, rebuild: state.rebuild }, started ? 202 : 409);
			}

			if (url.pathname === '/api/rebuild') {
				return json(res, { rebuild: state.rebuild });
			}

			if (!state.db) {
				return json(res, { error: state.rebuild.running ? '正在重建索引' : '还没有索引', rebuilding: state.rebuild.running }, 503);
			}

			if (url.pathname === '/api/status') return json(res, stats(state.db));
			if (url.pathname === '/api/plugins') return json(res, { plugins: plugins(state.db) });
			if (url.pathname === '/api/search') {
				const split = (key) =>
					(url.searchParams.get(key) || '')
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
				return json(
					res,
					search(state.db, {
						q: url.searchParams.get('q') || '',
						types: split('types'),
						sigs: split('sigs'),
						plugin: url.searchParams.get('plugin') || '',
						limit: url.searchParams.get('limit') || 100,
						offset: url.searchParams.get('offset') || 0,
						sort: url.searchParams.get('sort') || 'name',
						hideInternal: url.searchParams.get('hideInternal') !== '0',
						hideNoJournal: url.searchParams.get('hideNoJournal') === '1',
						met: url.searchParams.get('met') || '',
						kind: url.searchParams.get('kind') || '',
						part: url.searchParams.get('part') || '',
						tags: split('tags'),
						radiant: url.searchParams.get('radiant') || '',
						journal: url.searchParams.get('journal') || '',
						effect: url.searchParams.get('effect') || '',
						magnitude: url.searchParams.get('magnitude'),
						flags: split('flags'),
						keyword: url.searchParams.get('keyword') || '',
						sortDir: url.searchParams.get('sortDir') || 'asc'
					})
				);
			}
			if (url.pathname.startsWith('/api/entry/')) {
				const key = decodeURIComponent(url.pathname.slice('/api/entry/'.length));
				const entry = getEntry(state.db, /^\d+$/.test(key) ? Number(key) : 0, key);
				if (!entry) return json(res, { error: '没有这个记录' }, 404);
				return json(res, entry);
			}
			return json(res, { error: '没有这个接口' }, 404);
		} catch (err) {
			return json(res, { error: err.message }, 500);
		}
	});

	return { server, state };
}

function serveStatic(res, pathname) {
	const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
	const file = path.join(WEB_DIR, rel);
	if (!file.startsWith(WEB_DIR)) {
		res.writeHead(403);
		return res.end('no');
	}
	fs.readFile(file, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
			return res.end('找不到 ' + rel);
		}
		res.writeHead(200, {
			'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
			'Cache-Control': 'no-cache'
		});
		res.end(data);
	});
}

export function startServer({ dbFile = DB_FILE, port = 4820, host = '127.0.0.1' } = {}) {
	const { server } = createServer(dbFile);
	return new Promise((resolve) => {
		server.listen(port, host, () => resolve({ server, url: `http://${host}:${port}` }));
	});
}
