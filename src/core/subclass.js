// Second-level categories: the chips under the family tabs. Every rule here is read from the record itself, not
// from the name of the thing, so it holds for mods and for English and Chinese alike.

const WEAPON_KINDS = ['其他', '单手剑', '单手匕首', '单手斧', '单手锤', '双手剑', '双手斧', '弓', '法杖', '弩'];
const WEAPON_GROUPS = { 1: '单手', 2: '单手', 3: '单手', 4: '单手', 5: '双手', 6: '双手', 7: '弓', 8: '法杖', 9: '弩' };

const SPELL_KINDS = ['法术', '疾病', '力量', '次级力量', '能力', '龙吼', '法杖附魔', '卷轴'];

const SLOT_PARTS = {
	头: '头盔',
	头发: '头盔',
	身体: '身体',
	手: '手',
	前臂: '手',
	护身符: '饰品',
	戒指: '饰品',
	脚: '脚',
	小腿: '脚',
	盾牌: '盾牌'
};

// The journal's own grouping, from QUST DNAM offset 8.
const QUEST_TYPES = {
	0: '未分类',
	1: '主线',
	2: '法师学院',
	3: '盗贼公会',
	4: '黑暗兄弟会',
	5: '战友团',
	6: '杂项',
	7: '魔神',
	8: '支线',
	9: '内战',
	10: '黎明守卫',
	11: '龙裔'
};

const QUEST_RULES = [
	[/^MQ/i, '主线'],
	[/^DLC1/i, '黎明守卫'],
	[/^DLC2/i, '龙裔'],
	[/^CWS?[A-Z0-9]/i, '内战'],
	[/^TG/i, '盗贼公会'],
	[/^DB/i, '黑暗兄弟会'],
	[/^MG/i, '法师学院'],
	[/^C0[0-9]/i, '战友团'],
	[/^DA/i, '魔神'],
	[/^MS/i, '支线'],
	[/^Favou?r/i, '跑腿'],
	[/^(TIF|Dialogue)/i, '对话']
];

const KEYWORD_RULES = [
	[/^Armor/i, '护甲'],
	[/^Weapon/i, '武器'],
	[/^Magic/i, '魔法'],
	[/^Vendor|^Vend/i, '商人'],
	[/^Crafting|^Recipe/i, '制作'],
	[/^ActorType/i, '角色类型']
];

// The errands the game hands out again and again: bounties, the Companions' radiant jobs, the
// Dawnguard's and the Dragonborn's, the favour errands and the world interactions.
const RADIANT = /^(BQ|CR\d|DLC1RH\d|DLC2RH\d|Favor|WI[A-Z])/i;

export function isRadiant(edid, name) {
	return RADIANT.test(String(edid || '')) || /悬赏/.test(String(name || ''));
}

export function questKind(edid) {
	const text = String(edid || '');
	for (const [pattern, kind] of QUEST_RULES) if (pattern.test(text)) return kind;
	return '其他';
}

export function keywordKind(edid) {
	const text = String(edid || '');
	for (const [pattern, kind] of KEYWORD_RULES) if (pattern.test(text)) return kind;
	return '其他';
}

export function weaponKind(animationType, name) {
	return WEAPON_KINDS[animationType] || '其他';
}

export function weaponGroup(animationType) {
	return WEAPON_GROUPS[animationType] || '其他';
}

export function spellKind(spellType) {
	return SPELL_KINDS[spellType] || '法术';
}

export function slotPart(slot) {
	const first = String(slot || '').split('·')[0];
	return SLOT_PARTS[first] || '';
}

// The kind (and, for armour, the part) of an entry: what the sub-chips filter by.
export function classify(entry) {
	const data = entry.data || {};
	switch (entry.type) {
		case 'item': {
			switch (entry.sig) {
				case 'WEAP':
					return { kind: weaponGroup(data.weaponType), detail: weaponKind(data.weaponType) };
				case 'ARMO':
					return { kind: data.armorClass || '其他', part: slotPart(data.slot) };
				case 'BOOK': {
					// The book's own flags say whether it teaches a spell, advances a skill, or is just a book.
					const flags = data.flags || 0;
					if (flags & 0x04) return { kind: '法术书' };
					if (flags & 0x02) return { kind: '技能书' };
					return { kind: data.text ? '书籍' : '其他' };
				}
				case 'MISC':
					return { kind: '杂项' };
				case 'KEYM':
					return { kind: '钥匙' };
				case 'AMMO':
					return { kind: '弹药' };
				case 'SLGM':
					return { kind: '灵魂石' };
				case 'ALCH':
					return { kind: '' }; // filled from the first effect after the index is built
				case 'INGR':
					return { kind: '' };
				case 'SCRL':
					return { kind: '' };
				default:
					return { kind: '其他' };
			}
		}
		case 'actor':
			return { kind: data.female ? '女' : '男' };
		case 'faction':
			return { kind: '派系' };
		case 'quest': {
			const type = entry.data && entry.data.questType;
			return { kind: QUEST_TYPES[type] || questKind(entry.edid), radiant: isRadiant(entry.edid, entry.name) ? 1 : 0 };
		}
		case 'place':
			return { kind: '地点' };
		case 'cell':
			return { kind: data.interior ? '室内' : '室外' };
		case 'world':
			return { kind: '世界' };
		case 'perk':
			return { kind: (data.rankCount || 0) > 1 ? '多级' : '单级' };
		case 'spell':
			return { kind: spellKind(data.spellType) };
		case 'shout':
			return { kind: '龙吼' };
		case 'magicEffect':
			return { kind: '魔法效果' };
		case 'enchantment':
			return { kind: '附魔' };
		case 'recipe':
			return { kind: '' }; // filled from the workbench keyword after the index is built
		case 'keyword':
			return { kind: keywordKind(entry.edid) };
		case 'leveledItem':
			return { kind: '物品' };
		case 'leveledActor':
			return { kind: '角色' };
		case 'global':
			return { kind: '全局变量' };
		case 'race':
			return { kind: '种族' };
		case 'class':
			return { kind: data.kind || '职业' };
		case 'container':
			return { kind: '容器' };
		default:
			return { kind: '其他' };
	}
}
