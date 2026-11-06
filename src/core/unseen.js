// The rules for "no player was meant to see this": mirrored from the mod's own BrowserIndex.cpp, so the app hides
// exactly what the in-game browser hides. Names come from the plugin as the game would say them, so an empty name,
// an editor id, a developer's test, or a quest that only works the game are the things to look for.

const PLACEHOLDER_MARKS = [
	'uninitialized text',
	'report me as a bug',
	'do not delete',
	'placeholder',
	'dummy object',
	'load dummy',
	'trap dummy'
];

// Letters on both sides of the word means it is part of a longer word, not the word itself.
export function hasWord(text, word) {
	const source = String(text || '');
	const needle = String(word || '');
	if (!needle) return false;
	for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) {
		const before = at === 0 ? '' : source[at - 1];
		const after = at + needle.length >= source.length ? '' : source[at + needle.length];
		const starts = !/[A-Za-z]/.test(before);
		const ends = !/[A-Za-z]/.test(after);
		if (starts && ends) return true;
	}
	return false;
}

// A name of capitals and a number the developers gave a spot they never named, "POI 13".
export function numbered(name) {
	const text = String(name || '');
	let capitals = 0;
	while (capitals < text.length && /[A-Z]/.test(text[capitals])) capitals++;
	let rest = text.slice(capitals);
	if (rest.startsWith(' ')) rest = rest.slice(1);
	return capitals >= 2 && capitals <= 4 && rest.length > 0 && /^[0-9]+$/.test(rest);
}

// "Test Vorpal Sword", a storage unit, an E3 demo.
export function testing(name) {
	const lowered = String(name || '').toLowerCase();
	return lowered.includes('storage unit') || hasWord(lowered, 'test') || hasWord(lowered, 'e3');
}

// A name that is really the editor id: no spaces, nine letters or more, two bumps of capitals ("IronSwordDwarven").
export function editorName(name) {
	const text = String(name || '');
	if (text.includes(' ') || text.length < 9) return false;
	let capitals = 0;
	for (let i = 1; i < text.length; i++) {
		if (/[A-Z]/.test(text[i]) && /[a-z]/.test(text[i - 1])) capitals++;
	}
	return capitals >= 2;
}

export function placeholder(name) {
	const text = String(name || '');
	const lowered = text.toLowerCase();
	// Our own additions to the mod's rules: a name of nothing but digits ("8284") or nothing but marks ("?????")
	// is a record nobody ever named.
	if (/^[0-9\s._-]+$/.test(text)) return true;
	if (/^[?？!！.。,，…·:：;；\-\s"'“”‘’()（）\[\]【】]+$/.test(text)) return true;
	return (
		PLACEHOLDER_MARKS.some((mark) => lowered.includes(mark)) ||
		hasWord(lowered, 'debug') ||
		hasWord(lowered, 'tbd') ||
		text.includes('TEMP') ||
		numbered(text)
	);
}

// The handlers, controllers and triggers of a guild or a mod, and the radiant lines the game names after what
// someone says ("\"Did you find something good?\"").
export function working(name) {
	const lowered = String(name || '').toLowerCase();
	return String(name || '').startsWith('"') || hasWord(lowered, 'handler') || hasWord(lowered, 'controller') || hasWord(lowered, 'trigger');
}

export function controller(name) {
	return hasWord(String(name || '').toLowerCase(), 'controller');
}

export function unseen(name) {
	const text = String(name || '');
	return text.trim() === '' || placeholder(text) || editorName(text) || testing(text);
}

// An entry the browser leaves out, with the reason it is left out (shown in the UI when the filters are off).
export function hiddenReason(entry) {
	const name = String(entry.name || '');
	if (name.trim() === '') return '没有名字';
	if (placeholder(name)) return '占位或测试名';
	if (editorName(name)) return '编辑器名';
	if (testing(name)) return '测试名字';
	if (entry.type === 'quest' && working(name)) return '只给游戏用的任务';
	if (entry.type === 'actor' && controller(name)) return '控制器角色';
	if (entry.type === 'item' && entry.sig === 'BOOK' && (entry.data?.flags ?? 0) & 0x01) return '不能拾取的书';
	return null;
}
