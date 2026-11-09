// 检查字体名有没有乱码：中文/日文字体名必须是正常字符。
import { systemFonts } from '../src/core/fonts.js';

const fonts = systemFonts();
const cjk = fonts.filter((name) => /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(name));
const mojibake = fonts.filter((name) => /[\ufffd\u00c0-\u00ff]{2,}/.test(name));
console.log('总数:', fonts.length);
console.log('CJK 字体:', cjk.length, '示例:', cjk.slice(0, 10).join(' | '));
console.log('疑似乱码:', mojibake.length, mojibake.slice(0, 5).join(' | '));
