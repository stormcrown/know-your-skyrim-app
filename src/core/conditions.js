// CTDA: the condition records that say when a quest, a stage or an objective is allowed. The layout is 32 bytes:
// one operator byte (compare in the top three bits, flags in the low five), the comparison value, the function
// index and its two parameters, what the function runs on, the reference, and a last parameter.

import { conditionFunctionName } from './functions.js';

export const COMPARE = { 0: '==', 1: '!=', 2: '>', 3: '>=', 4: '<', 5: '<=' };
export const COMPARE_TEXT = { 0: '等于', 1: '不等于', 2: '大于', 3: '大于等于', 4: '小于', 5: '小于等于' };
export const RUN_ON = { 0: '主体', 1: '目标', 2: '指定引用', 3: '战斗目标', 4: '链接引用', 5: '任务别名', 6: '包数据', 7: '事件数据' };

export function parseCondition(data, globalId) {
	if (!data || data.length < 32) return null;
	const operatorByte = data[0];
	const compare = operatorByte >>> 5;
	const flags = operatorByte & 0x1f;
	const usesGlobal = (flags & 0x04) !== 0;
	const rawValue = data.readUInt32LE(4);
	const functionIndex = data.readUInt32LE(8) & 0xffff;
	const param1 = data.readUInt32LE(12);
	const param2 = data.readUInt32LE(16);
	const runOn = data.readUInt32LE(20);
	const reference = data.readUInt32LE(24);
	const param3 = data.readUInt32LE(28);

	const isFormId = (value) => value > 0xff && (value >>> 24) < 0xfe && value < 0xfe000000;
	return {
		compare,
		compareText: COMPARE[compare] || '?',
		or: (flags & 0x01) !== 0,
		usesAlias: (flags & 0x02) !== 0,
		usesGlobal,
		// a global form id sits in the value field when the "use global" flag is on
		globalValue: usesGlobal ? globalId(rawValue) : 0,
		value: usesGlobal ? null : rawValue,
		valueFloat: usesGlobal ? null : Math.fround(new Float32Array(new Uint32Array([rawValue]).buffer)[0]),
		functionIndex,
		functionName: conditionFunctionName(functionIndex),
		param1: isFormId(param1) ? globalId(param1) : param1,
		param1IsForm: isFormId(param1),
		param2: isFormId(param2) ? globalId(param2) : param2,
		param2IsForm: isFormId(param2),
		param3: isFormId(param3) ? globalId(param3) : param3,
		runOn,
		runOnText: RUN_ON[runOn] || String(runOn),
		reference: reference ? globalId(reference) : 0
	};
}

// A first pass at words; the page renders the parts it can name and leaves the rest as ids rather than inventing
// meaning for a function the table does not know.
// The actor values a condition usually asks about, in the game's own order.
const ACTOR_VALUES = {
	0: '侵略性', 1: '自信', 2: '精力', 3: '道德', 4: '情绪', 5: '协助',
	6: '单手武器', 7: '双手武器', 8: '箭术', 9: '格挡', 10: '锻造',
	11: '重甲', 12: '轻甲', 13: '扒窃', 14: '开锁', 15: '潜行',
	16: '炼金', 17: '口才', 18: '变化系', 19: '召唤系', 20: '毁灭系',
	21: '幻术系', 22: '恢复系', 23: '附魔', 24: '生命', 25: '法力', 26: '耐力'
};

export function conditionWords(condition, resolveName) {
	if (!condition) return '';
	const name = conditionFunctionName(condition.functionIndex) || condition.functionName || `函数#${condition.functionIndex}`;
	const subject =
		condition.runOn === 2 && condition.reference
			? resolveName(condition.reference)
			: condition.runOn === 0
				? '主体'
				: condition.runOnText;
	const value = condition.usesGlobal ? resolveName(condition.globalValue) : formatNumber(condition.valueFloat ?? condition.value);
	const arg1 = condition.param1IsForm ? resolveName(condition.param1) : formatNumber(condition.param1);
	const arg2 = condition.param2IsForm ? resolveName(condition.param2) : formatNumber(condition.param2);
	const op = condition.compareText;
	const isForm = (flag) => flag;

	// The sentences a player would say out loud; the fallback keeps the raw shape for anything not in here.
	switch (name) {
		case 'GetStage':
			return `任务《${arg1}》的阶段 ${op} ${value}`;
		case 'GetStageDone':
			return `任务《${arg1}》的阶段 ${arg2} 走过（${op} ${value}）`;
		case 'GetQuestCompleted':
			return `任务《${arg1}》 已完成（${op} ${value}）`;
		case 'GetQuestRunning':
			return `任务《${arg1}》 ${op === '==' && Number(condition.value) === 1 ? '正在进行' : '未开始'}`;
		case 'GetGlobalValue':
			return `全局变量《${arg1}》 ${op} ${value}`;
		case 'GetInFaction':
		case 'IsInFaction':
			return `${subject}在派系《${arg1}》里（${op} ${value}）`;
		case 'GetFactionRank':
			return `${subject} 在派系《${arg1}》的等级 ${op} ${value}`;
		case 'GetIsID':
			return `${subject} 是《${arg1}》`;
		case 'GetItemCount':
			return `${subject} 拥有《${arg1}》 ${op} ${value} 件`;
		case 'HasPerk':
			return `${subject} 拥有天赋《${arg1}》`;
		case 'HasMagicEffect':
			return `${subject} 身上有魔法效果《${arg1}》`;
		case 'GetActorValue':
		case 'GetAV':
			return `${subject}的 ${ACTOR_VALUES[condition.param1] || `属性#${condition.param1}`} 等级 ${op} ${value}`;
		case 'GetBaseActorValue':
			return `${subject}的基础 ${ACTOR_VALUES[condition.param1] || `属性#${condition.param1}`} 等级 ${op} ${value}`;
		case 'GetLevel':
			return `${subject}的等级 ${op} ${value}`;
		case 'GetIsRace':
			return `${subject} 的种族是《${arg1}》`;
		case 'GetIsSex':
			return `${subject} 的性别是 ${op === '==' && Number(condition.value) === 1 ? '女' : '男'}`;
		case 'IsInCombat':
			return `${subject} ${Number(condition.value) === 1 ? '正在战斗' : '不在战斗'}`;
		case 'IsDead':
			return `${subject} ${Number(condition.value) === 1 ? '已经死了' : '还活着'}`;
		case 'GetInCell':
			return `${subject}在房间《${arg1}》里`;
		case 'GetInCurrentLoc':
			return `${subject}当前所在的地点《${arg1}》`;
		case 'GetDistance':
			return `${subject} 与《${arg1}》的距离 ${op} ${value}`;
		case 'Random':
			return `随机数 ${op} ${value}（五成一半概率之类）`;
		case 'GetRelationshipRank':
			return `${subject} 与《${arg1}》的关系等级 ${op} ${value}`;
		case 'GetCrimeGold':
			return `${subject} 的赏金 ${op} ${value}`;
		case 'GetVATSMode':
			return `${subject} 的 V.A.T.S. 模式 ${op} ${value}`;
		default:
			if (!condition.functionName && !conditionFunctionName(condition.functionIndex)) {
				return `${subject}.${name}(${[arg1, isForm(condition.param1IsForm) ? '' : ''].filter(Boolean).join(', ')}) ${op} ${value}`;
			}
			return `${subject}.${name}(${arg1}${arg2 && arg2 !== '0' ? ', ' + arg2 : ''}) ${op} ${value}`;
	}
}

function formatNumber(value) {
	if (value === null || value === undefined) return '0';
	const rounded = Math.round(value * 100) / 100;
	return String(rounded);
}
