// 界面用的简→繁对照（由 OpenCC 的 STCharacters.txt 里抽出我们实际用到的字）。
// 键是简体字，值是繁体字；词级例外在 WORD_TW 里先替换。
// 重新生成：node tools/gen-tw.mjs

window.KYS_TW_PAIRS = "与與业業东東丢丟个個么麼义義书書于於从從价價会會伤傷体體关關内內写寫击擊则則别別剑劍务務动動区區单單卫衛历歷双雙发發变變台臺号號后後员員团團围圍声聲处處复復头頭学學宝寶实實对對导導层層师師带帶应應开開弹彈强強当當录錄态態戏戲战戰执執护護报報挡擋换換据據携攜摆擺数數无無时時显顯暂暫术術机機杀殺杂雜条條来來标標栏欄样樣档檔检檢没沒浅淺测測游遊滤濾灵靈炉爐点點炼煉状狀独獨现現疗療盗盜种種称稱筛篩签籤类類级級纯純纸紙纺紡线線练練织織结結给給统統续續缀綴编編网網职職脚腳节節范範药藥补補衬襯装裝见見认認训訓记記设設识識词詞译譯试試话話详詳语語误誤说說请請诺諾读讀谁誰败敗质質贼賊赋賦轴軸轻輕载載辑輯边邊过過还還这這进進远遠选選里裏钢鋼钥鑰链鏈错錯锤錘键鍵锻鍛长長问問间間阶階随隨隐隱页頁项項顺順题題饪飪饰飾龙龍";

window.KYS_TW_WORDS = {"制作":"製作","制皮":"製皮","系统":"系統","后台":"後台","里面":"裡面","头发":"頭髮","干":"幹"};

window.toTraditional = function toTraditional(text) {
	if (!text) return text;
	let result = text;
	for (const [from, to] of Object.entries(window.KYS_TW_WORDS || {})) {
		if (result.includes(from)) result = result.split(from).join(to);
	}
	const pairs = window.KYS_TW_PAIRS || '';
	const table = (window.__kysTwCache ||= (() => {
		const cache = new Map();
		for (let i = 0; i + 1 < pairs.length; i += 2) cache.set(pairs[i], pairs[i + 1]);
		return cache;
	})());
	let converted = '';
	for (const ch of result) converted += table.get(ch) || ch;
	return converted;
};
