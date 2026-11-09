// Turns raw records into the entries the app shows. One function per record type; anything not listed here is
// skipped, so adding a type later is one entry in EXTRACTORS plus a row in the web UI's family table.

import { hiddenReason } from './unseen.js';
import { classify } from './subclass.js';
import { parseCondition } from './conditions.js';

const ITEM_SIGS = new Set(['WEAP', 'ARMO', 'ALCH', 'INGR', 'BOOK', 'MISC', 'KEYM', 'AMMO', 'SLGM', 'SCRL']);

const ARMOR_SLOTS = ['头', '头发', '身体', '手', '前臂', '护身符', '戒指', '脚', '小腿', '盾牌'];

const BOOK_TEACHES = {
	0: null,
	1: '技能书',
	2: '法术',
	3: '附魔',
	4: '炼金',
	5: '龙吼'
};

export class Extractor {
	constructor({ plugin, strings, onEntry, onLink, onPlacement, onContainer }) {
		this.plugin = plugin; // { index, name, masters: [loadIndex], light: bool }
		this.strings = strings;
		this.onEntry = onEntry;
		this.onLink = onLink;
		this.onPlacement = onPlacement;
		this.onContainer = onContainer;
	}

	// A form id inside this plugin's own numbering, moved to the global numbering the load order uses.
	// plugin.masters holds each master's base id, already shifted: 0x0A000000 for the eleventh plugin of the
	// load order, 0xFE001000 for a light one.
	globalId(localId) {
		const plugin = this.plugin;
		const high = localId >>> 24;
		const low = localId & 0x00ffffff;
		// Anything below the master count points into a master; the top byte of a record's own id is the master
		// count (an .esl keeps it at 0), so everything else is this file's own.
		if (high < plugin.masters.length) {
			const masterBase = plugin.masters[high];
			if (masterBase === undefined || masterBase < 0) return localId;
			return (masterBase | low) >>> 0;
		}
		if (plugin.light) {
			return (0xfe000000 | (plugin.lightIndex << 12) | (low & 0xfff)) >>> 0;
		}
		return ((plugin.index << 24) | low) >>> 0;
	}

	// Text that may live in a .STRINGS table (a 4 byte id) or right in the record (a null terminated string).
	text(field, kind = 'STRINGS') {
		if (!field) return '';
		if (field.length === 4) {
			const id = field.readUInt32LE(0);
			if (id === 0) return '';
			const fromTable = this.strings.lookup(kind, id);
			return fromTable ?? '';
		}
		const zero = field.indexOf(0);
		return field.toString('utf8', 0, zero === -1 ? field.length : zero);
	}

	// Book texts and journal entries live in the long string tables; a few odd ones sit in the short one.
	longText(field) {
		if (!field) return '';
		if (field.length !== 4) return this.text(field);
		const id = field.readUInt32LE(0);
		if (!id) return '';
		return this.strings.lookup('DLSTRINGS', id) ?? this.strings.lookup('ILSTRINGS', id) ?? this.strings.lookup('STRINGS', id) ?? '';
	}

	edid(fields) {
		const field = fields.get('EDID');
		if (!field) return '';
		const zero = field.indexOf(0);
		return field.toString('utf8', 0, zero === -1 ? field.length : zero);
	}

	keywords(fields) {
		const out = [];
		for (const chunk of fields.all('KWDA')) {
			for (let i = 0; i + 4 <= chunk.length; i += 4) out.push(this.globalId(chunk.readUInt32LE(i)));
		}
		return out;
	}

	// EFID + EFIT pairs: what an item, a spell or a potion does.
	effects(fields) {
		const ids = fields.all('EFID').map((b) => (b.length >= 4 ? this.globalId(b.readUInt32LE(0)) : 0));
		const fits = fields.all('EFIT');
		return ids.map((id, index) => {
			const fit = fits[index];
			const out = { effect: id };
			if (fit && fit.length >= 12) {
				out.magnitude = round(fit.readFloatLE(0));
				out.area = fit.readUInt32LE(4);
				out.duration = fit.readUInt32LE(8);
			}
			return out;
		});
	}

	handle(record) {
		const sig = record.sig;
		const formid = this.globalId(record.formId);
		const entry = this.extract(record, sig, formid);
		if (!entry) return;
		entry.formid = formid;
		entry.sig = sig;
		// What the game would never show a player: the same rules the mod's own browser uses.
		const reason = hiddenReason(entry);
		entry.internal = reason ? 1 : 0;
		entry.hiddenReason = reason || '';
		const sub = classify(entry);
		entry.kind = sub.kind || '';
		entry.part = sub.part || '';
		entry.radiant = sub.radiant ? 1 : 0;
		// A quest without a single journal line has nothing to read in the game's own journal either.
		entry.journal =
			entry.type === 'quest' && (entry.data?.stages || []).some((stage) => stage.log && stage.log.trim()) ? 1 : entry.type === 'quest' ? 0 : 1;
		this.linkOut(entry);
		this.onEntry(entry);
	}

	// Edges that every entry type can have: keywords and effects. The type specific ones are made in extract().
	linkOut(entry) {
		const data = entry.data || {};
		for (const keyword of data.keywords || []) {
			if (keyword) this.onLink(entry.formid, keyword, 'keyword');
		}
		for (const effect of data.effects || []) {
			if (effect && effect.effect) this.onLink(entry.formid, effect.effect, 'effect');
		}
		if (data.enchantment) this.onLink(entry.formid, data.enchantment, 'enchantment');
		if (entry.type === 'actor') {
			for (const faction of data.factions || []) this.onLink(entry.formid, faction.faction, 'faction');
			for (const item of data.inventory || []) if (item.item) this.onLink(entry.formid, item.item, 'carries');
		}
		if (entry.type === 'recipe') {
			for (const item of data.ingredients || []) this.onLink(entry.formid, item.item, 'ingredient');
			if (data.workbench) this.onLink(entry.formid, data.workbench, 'keyword');
		}
		if (entry.type === 'place' && data.parent) this.onLink(entry.formid, data.parent, 'parent');
		if (entry.type === 'perk') {
			if (data.next) this.onLink(entry.formid, data.next, 'next');
			if (data.parent) this.onLink(entry.formid, data.parent, 'parent');
		}
		if (entry.type === 'cell' && data.world) this.onLink(entry.formid, data.world, 'world');
		if (entry.type === 'quest') {
			for (const next of data.nextAll || []) if (next) this.onLink(entry.formid, next, 'nextQuest');
			for (const other of data.aliasQuests || []) if (other) this.onLink(entry.formid, other, 'aliasQuest');
		}
		if (entry.type === 'container') {
			for (const item of data.items || []) this.onLink(entry.formid, item.item, 'contains');
		}
		if (entry.type === 'leveledItem' || entry.type === 'leveledActor') {
			for (const item of data.entries || []) if (item.item) this.onLink(entry.formid, item.item, 'leveled');
		}
		if (data.teachesForm) this.onLink(entry.formid, data.teachesForm, 'teaches');
	}

	extract(record, sig, formid) {
		const f = record.fields;
		const edid = this.edid(f);
		const name = this.text(f.get('FULL'));
		const base = { edid, name };

		if (ITEM_SIGS.has(sig)) {
			const item = this.item(record, sig, f, edid, name);
			if (item) return item;
			return null;
		}

		switch (sig) {
			case 'NPC_': {
				const acbs = f.get('ACBS');
				const flags = acbs && acbs.length >= 4 ? acbs.readUInt32LE(0) : 0;
				const level = acbs && acbs.length >= 12 ? acbs.readUInt16LE(10) : 0;
				const factions = [];
				for (const chunk of f.all('SNAM')) {
					if (chunk.length >= 5) factions.push({ faction: this.globalId(chunk.readUInt32LE(0)), rank: chunk[4] });
				}
				const inventory = [];
				for (const chunk of f.all('CNTO')) {
					if (chunk.length >= 8) inventory.push({ item: this.globalId(chunk.readUInt32LE(0)), count: chunk.readInt32LE(4) });
				}
				const perks = f.all('PKID').map((b) => (b.length >= 4 ? this.globalId(b.readUInt32LE(0)) : 0));
				return {
					type: 'actor',
					...base,
					text: '',
					data: {
						race: f.get('RNAM') ? this.globalId(f.u32('RNAM')) : 0,
						class: f.u32('CNAM') ? this.globalId(f.u32('CNAM')) : 0,
						level,
						essential: (flags & 0x02) !== 0,
						protected: (flags & 0x800) !== 0,
						unique: (flags & 0x20) !== 0,
						female: (flags & 0x01) !== 0,
						voice: f.u32('VTCK') ? this.globalId(f.u32('VTCK')) : 0,
						crimeFaction: f.u32('CRIF') ? this.globalId(f.u32('CRIF')) : 0,
						factions,
						inventory,
						perks,
						keywords: this.keywords(f)
					}
				};
			}

			case 'QUST': {
				// Walk the record in the order it was written: INDX opens a stage, the CNAM right after it is that
				// stage's journal line, and each QOBJ/NNAM pair after that is an objective the stage adds.
				const stages = [];
				const objectives = [];
				let current = null;
				let pendingObjective = null;
				let pendingLogFlags = 0;
				let inObjective = false;
				let inAlias = false;
				const nextQuests = [];
				const recordConditions = [];
				const aliasQuests = [];
				for (const { sig: fieldSig, data } of f.order) {
					if (fieldSig === 'INDX' && data.length >= 2) {
						current = {
							index: data.readUInt16LE(0),
							flags: data.length >= 3 ? data[2] : 0,
							log: '',
							complete: false,
							fail: false,
							objectives: []
						};
						stages.push(current);
						pendingLogFlags = 0;
						inObjective = false;
						inAlias = false;
					} else if (fieldSig === 'QSDT' && current) {
						// 0x01 = this stage completes the quest, 0x02 = it fails it
						pendingLogFlags = data.length >= 1 ? data[0] : 0;
						if (pendingLogFlags & 0x01) current.complete = true;
						if (pendingLogFlags & 0x02) current.fail = true;
					} else if (fieldSig === 'NAM0' && data.length >= 4) {
						const next = this.globalId(data.readUInt32LE(0));
						if (next) {
							nextQuests.push(next);
							this.pendingNext = next;
						}
					} else if (fieldSig === 'CNAM' && current) {
						current.log = this.text(data, 'DLSTRINGS');
					} else if (fieldSig === 'QOBJ' && data.length >= 2) {
						inObjective = true;
						pendingObjective = {
							index: data.readUInt16LE(0),
							flags: data.length >= 4 ? data.readUInt16LE(2) : 0,
							text: '',
							conditions: []
						};
						objectives.push(pendingObjective);
						if (current) current.objectives.push(pendingObjective);
					} else if (fieldSig === 'NNAM' && pendingObjective) {
						pendingObjective.text = this.text(data, 'DLSTRINGS');
					} else if (fieldSig === 'ALST' || fieldSig === 'ALLS') {
						inAlias = true;
						inObjective = false;
					} else if (fieldSig === 'ALEQ' && data.length >= 4) {
						const referenced = this.globalId(data.readUInt32LE(0));
						if (referenced) aliasQuests.push(referenced);
					} else if (fieldSig === 'CTDA') {
						const condition = parseCondition(data, (formId) => this.globalId(formId));
						if (condition) {
							if (inObjective && pendingObjective) pendingObjective.conditions.push(condition);
							else if (current && !inAlias) (current.conditions || (current.conditions = [])).push(condition);
							else recordConditions.push(condition);
						}
					}
				}
				const dnam = f.get('DNAM');
				const questFlags = dnam && dnam.length >= 2 ? dnam.readUInt16LE(0) : 0;
				// Offset 8 of DNAM is the quest type the journal groups it under.
				const questType = dnam && dnam.length >= 12 ? dnam.readUInt32LE(8) : 0;
				if (nextQuests.length) this.nextQuests = nextQuests;
				return {
					type: 'quest',
					...base,
					text: stages.map((stage) => stage.log).filter(Boolean).join('\n'),
					data: {
						stages,
						objectives,
						flags: questFlags,
						questType,
						conditions: recordConditions,
						aliasQuests,
						next: nextQuests[0] || 0,
						nextAll: nextQuests,
						completeStages: stages.filter((stage) => stage.complete).map((stage) => stage.index),
						keywords: this.keywords(f)
					}
				};
			}

			case 'LCTN': {
				const parent = f.get('PNAM');
				return {
					type: 'place',
					...base,
					text: '',
					data: {
						parent: parent && parent.length >= 4 ? this.globalId(parent.readUInt32LE(0)) : 0,
						keywords: this.keywords(f)
					}
				};
			}

			case 'WRLD': {
				const parent = f.get('WNAM');
				return {
					type: 'world',
					...base,
					text: '',
					data: {
						parentWorld: parent && parent.length >= 4 ? this.globalId(parent.readUInt32LE(0)) : 0,
						keywords: this.keywords(f)
					}
				};
			}

			case 'CELL': {
				// Cells inside a block group carry their grid; the group context says which world they belong to.
				const data = f.get('DATA');
				const grid = f.get('XCLC');
				const flags = data && data.length >= 2 ? data.readUInt16LE(0) : 0;
				const interior = (flags & 0x01) !== 0;
				return {
					type: 'cell',
					...base,
					text: '',
					data: {
						interior,
						world: record.world ? this.globalId(record.world) : 0,
						gridX: grid && grid.length >= 4 ? grid.readInt16LE(0) : 0,
						gridY: grid && grid.length >= 4 ? grid.readInt16LE(2) : 0,
						owner: f.u32('XOWN') ? this.globalId(f.u32('XOWN')) : 0
					}
				};
			}

			case 'REFR':
			case 'ACHR': {
				const baseForm = f.u32('NAME');
				if (!baseForm) return null;
				const count = f.get('XCNT') ? f.get('XCNT').readInt32LE(0) : 1;
				this.onPlacement(this.globalId(baseForm), formid, record.cell ? this.globalId(record.cell) : 0, record.world ? this.globalId(record.world) : 0, count);
				return null;
			}

			case 'PERK': {
				const ranks = [];
				for (const chunk of f.all('DATA')) {
					ranks.push({ flags: chunk.length >= 1 ? chunk[0] : 0, description: '' });
				}
				return {
					type: 'perk',
					...base,
					text: this.text(f.get('DESC'), 'DESC'),
					data: {
						rankCount: ranks.length,
						next: f.u32('NNAM') ? this.globalId(f.u32('NNAM')) : 0,
						parent: f.u32('PNAM') ? this.globalId(f.u32('PNAM')) : 0,
						keywords: this.keywords(f)
					}
				};
			}

			case 'SPEL':
			case 'SHOU': {
				const spit = f.get('SPIT');
				return {
					type: sig === 'SHOU' ? 'shout' : 'spell',
					...base,
					text: this.text(f.get('DESC')),
					data: {
						spellType: spit && spit.length >= 4 ? spit.readUInt32LE(0) : 0,
						cost: spit && spit.length >= 8 ? round(spit.readFloatLE(4)) : 0,
						effects: this.effects(f),
						keywords: this.keywords(f)
					}
				};
			}

			case 'MGEF': {
				return {
					type: 'magicEffect',
					...base,
					text: this.text(f.get('DESC')),
					data: {}
				};
			}

			case 'ENCH': {
				return {
					type: 'enchantment',
					...base,
					text: '',
					data: { effects: this.effects(f) }
				};
			}

			case 'FACT': {
				const relations = [];
				for (const chunk of f.all('XNAM')) {
					if (chunk.length >= 8) relations.push({ faction: this.globalId(chunk.readUInt32LE(0)), value: chunk.readInt32LE(4) });
				}
				return {
					type: 'faction',
					...base,
					text: '',
					data: { relations, keywords: this.keywords(f) }
				};
			}

			case 'COBJ': {
				const ingredients = [];
				for (const chunk of f.all('CNTO')) {
					if (chunk.length >= 8) ingredients.push({ item: this.globalId(chunk.readUInt32LE(0)), count: chunk.readInt32LE(4) });
				}
				const created = f.u32('CNAM');
				const workbench = f.u32('BNAM');
				if (!created) return null;
				const createdId = this.globalId(created);
				this.onLink(createdId, formid, 'recipe');
				return {
					type: 'recipe',
					...base,
					text: '',
					data: {
						created: createdId,
						count: f.u16('NAM1') ?? 1,
						workbench: workbench ? this.globalId(workbench) : 0,
						ingredients
					}
				};
			}

			case 'CLAS': {
				const classEdid = this.edid(f);
				return {
					type: 'class',
					...base,
					text: '',
					data: {
						kind: /Trainer/i.test(classEdid) ? '训练师' : /Vendor/i.test(classEdid) ? '商人' : ''
					}
				};
			}

			case 'GLOB': {
				// A global has no name field of its own: its editor id is the name, and FNAM holds the number.
				const fnam = f.get('FNAM');
				return { type: 'global', ...base, name: base.edid || base.name, text: '', data: { value: fnam && fnam.length >= 4 ? fnam.readFloatLE(0) : 0 } };
			}

			case 'RACE': {
				return { type: 'race', ...base, text: this.text(f.get('DESC')), data: {} };
			}

			case 'KYWD':
				return { type: 'keyword', ...base, text: '', data: {} };

			case 'LVLI':
			case 'LVLN': {
				const entries = [];
				for (const chunk of f.all('LVLO')) {
					if (chunk.length >= 8) entries.push({ item: this.globalId(chunk.readUInt32LE(0)), level: chunk.readUInt16LE(4), count: chunk.readUInt16LE(6) });
				}
				const lvlf = f.get('LVLF');
				return {
					type: sig === 'LVLI' ? 'leveledItem' : 'leveledActor',
					...base,
					text: '',
					data: { flags: lvlf ? lvlf[0] : 0, entries }
				};
			}
			case 'CONT': {
				const items = [];
				for (const chunk of f.all('CNTO')) {
					if (chunk.length >= 8) items.push({ item: this.globalId(chunk.readUInt32LE(0)), count: chunk.readInt32LE(4) });
				}
				if (items.length) this.onContainer(formid, record.cell ? this.globalId(record.cell) : 0, items);
				return { type: 'container', ...base, text: '', data: { items } };
			}

			default:
				return null;
		}
	}

	item(record, sig, f, edid, name) {
		const data = f.get('DATA');
		const extra = {};
		switch (sig) {
			case 'WEAP': {
				extra.value = data && data.length >= 4 ? data.readUInt32LE(0) : 0;
				extra.weight = data && data.length >= 8 ? round(data.readFloatLE(4)) : 0;
				extra.damage = data && data.length >= 10 ? data.readUInt16LE(8) : 0;
				const dnam = f.get('DNAM');
				extra.speed = dnam && dnam.length >= 8 ? round(dnam.readFloatLE(4)) : 0;
				// The animation type tells a sword from a warhammer and a bow from a staff.
				extra.weaponType = dnam && dnam.length >= 4 ? dnam.readUInt32LE(0) : 0;
				extra.critDamage = f.get('CRDT') && f.get('CRDT').length >= 4 ? f.get('CRDT').readUInt16LE(0) : 0;
				extra.enchantment = f.u32('EITM') ? this.globalId(f.u32('EITM')) : 0;
				extra.enchantCharge = f.u16('EAMT') ?? 0;
				extra.slot = f.u32('ETYP') ? this.globalId(f.u32('ETYP')) : 0;
				break;
			}
			case 'ARMO': {
				extra.value = data && data.length >= 4 ? data.readUInt32LE(0) : 0;
				extra.weight = data && data.length >= 8 ? round(data.readFloatLE(4)) : 0;
				const dnam = f.get('DNAM');
				// The game keeps the armour rating as a hundredth of the number it shows.
				extra.armor = dnam && dnam.length >= 4 ? round(dnam.readUInt32LE(0) / 100) : 0;
				const bod2 = f.get('BOD2');
				// BOD2: the slot bits first, then the armour class (0 light, 1 heavy, 2 clothing).
				extra.slot = bod2 && bod2.length >= 4 ? slotName(bod2.readUInt32LE(0)) : '';
				extra.armorClass = bod2 && bod2.length >= 8 ? ['轻甲', '重甲', '服装'][bod2.readUInt32LE(4)] ?? '' : '';
				extra.enchantment = f.u32('EITM') ? this.globalId(f.u32('EITM')) : 0;
				break;
			}
			case 'ALCH': {
				// A potion keeps its weight alone in DATA and its price in ENIT.
				extra.weight = data && data.length >= 4 ? round(data.readFloatLE(0)) : 0;
				const enit = f.get('ENIT');
				extra.value = enit && enit.length >= 4 ? enit.readUInt32LE(0) : 0;
				extra.effects = this.effects(f);
				break;
			}
			case 'INGR': {
				// An ingredient keeps both in DATA; its ENIT is about the effects, not the price.
				extra.value = data && data.length >= 4 ? data.readUInt32LE(0) : 0;
				extra.weight = data && data.length >= 8 ? round(data.readFloatLE(4)) : 0;
				extra.effects = this.effects(f);
				break;
			}
			case 'BOOK': {
				// flags, teaches, then two unused bytes, a form id, the price and the weight.
				extra.value = data && data.length >= 12 ? data.readInt32LE(8) : 0;
				extra.weight = data && data.length >= 16 ? round(data.readFloatLE(12)) : 0;
				extra.flags = data ? data[0] : 0;
				extra.teaches = data && data[1] ? BOOK_TEACHES[data[1]] ?? null : data && (data[0] & 0x04) ? '法术书' : null;
				extra.teachesForm = f.u32('INAM') ? this.globalId(f.u32('INAM')) : 0;
				extra.text = this.longText(f.get('DESC'));
				break;
			}
			default: {
				extra.value = data && data.length >= 4 ? data.readUInt32LE(0) : 0;
				extra.weight = data && data.length >= 8 ? round(data.readFloatLE(4)) : 0;
				if (sig === 'AMMO') {
					const dnam = f.get('DNAM');
					extra.damage = dnam && dnam.length >= 2 ? dnam.readUInt16LE(0) : 0;
				}
				if (sig === 'SLGM') extra.capacity = f.u8('SOUL');
				break;
			}
		}
		if (!name && !edid) return null;
		const itemText = sig === 'BOOK' ? extra.text || '' : '';
		return {
			type: 'item',
			sig,
			edid,
			name,
			text: itemText,
			data: {
				...extra,
				onType: f.u32('ETYP') ? this.globalId(f.u32('ETYP')) : 0,
				keywords: this.keywords(f),
				description: sig === 'BOOK' ? '' : this.text(f.get('DESC'))
			}
		};
	}
}

function round(value) {
	return Math.round(value * 100) / 100;
}

function slotName(flags) {
	const parts = [];
	for (let i = 0; i < ARMOR_SLOTS.length; i++) {
		if (flags & (1 << i)) parts.push(ARMOR_SLOTS[i]);
	}
	return parts.join('·');
}

export { ARMOR_SLOTS };
