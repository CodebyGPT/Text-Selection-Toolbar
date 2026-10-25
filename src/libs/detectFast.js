/**
 * @file detectFast.js
 * @description 划词翻译拦截专用的轻量本地语言检测模块。仅依赖基础配置与浏览器原生 API，
 * 不引入翻译 API 栈，供内容脚本高频调用场景（如选区语言判定）使用。
 */

import { browser } from "./browser";
import { kissLog } from "./log";
import { normalizeLanguageCode } from "./language";

const DETECT_CACHE_LIMIT = 100; // 检测结果缓存条数上限，防止长会话内存膨胀
const DETECT_TIMEOUT = 100; // 本地语言检测超时阈值 (ms)
const MAX_DETECT_TEXT_LEN = 300; // 参与检测的文本长度上限
const detectCache = new Map();

// 字符集快判所需的正则
const RE_CJK = /[\u4e00-\u9fff]/g;
const RE_HIRAGANA = /[\u3040-\u309f]/g;
const RE_KATAKANA = /[\u30a0-\u30ff]/g;
const RE_HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g;
const RE_CYRILLIC = /[\u0400-\u04ff]/g;
const RE_GREEK = /[\u0370-\u03ff]/g;
const RE_LATIN = /[a-zA-Z]/g;

// 区分简体/繁体中文的常用独有字形
const SIMP_CHARS = new Set(
  "国华门车东发风见机体为还这各个样时经长运边开来后别问应当设过对给现进们动两从远义学话谁网达问题单数业农产说认门".split(
    ""
  )
);
const TRAD_CHARS = new Set(
  "國華門車東發風見機體為還這各個樣時經長運邊開來後別問應當設過對給現進們動兩從遠義學話誰網達問題單數業農產說認門".split(
    ""
  )
);

/**
 * 基于字符集对文本进行快速的同步语言判断。
 * @param {string} text 待检测文本
 * @returns {string} 语言代码 (zh-CN / zh-TW / ja / ko / ru / el / en / de / fr / es，无法确定时返回 "")
 */
/**
 * 基于字符集对文本进行快速的同步语言判断。
 * 零异步开销，适用于划词热路径的初步筛选。
 * @param {string} text 待检测文本
 * @returns {string} 语言代码 (zh-CN / zh-TW / ja / ko / ru / el / en / de / fr / es，无法确定时返回 "")
 */
export function quickDetectLang(text) {
  const count = (re) => (text.match(re) || []).length;
  const cjk = count(RE_CJK);
  const hiragana = count(RE_HIRAGANA);
  const katakana = count(RE_KATAKANA);
  const hangul = count(RE_HANGUL);
  const cyrillic = count(RE_CYRILLIC);
  const greek = count(RE_GREEK);
  const latin = count(RE_LATIN);

  // 日语文本必然夹杂假名
  if (hiragana > 0 || katakana > 0) return "ja";
  if (hangul > 0) return "ko";
  if (cyrillic > 0) return "ru";
  if (greek > 0) return "el";
  if (cjk > 0) return detectZhVariant(text);

  // 拉丁字符集区分英/德/法/西：依据变音字母与高频词计分
  return detectLatinVariant(text, latin) || "";
}

/**
 * 统计文本中各脚本字符的数量，供“当前语言占比”阈值判断复用。
 * 与 quickDetectLang 使用同一组字符集，结果口径一致。
 * @param {string} text 待统计文本
 * @returns {{han:number,hiragana:number,katakana:number,hangul:number,cyrillic:number,greek:number,latin:number}}
 */
export function countScriptChars(text) {
  const value = String(text || "");
  const count = (re) => (value.match(re) || []).length;
  return {
    han: count(RE_CJK),
    hiragana: count(RE_HIRAGANA),
    katakana: count(RE_KATAKANA),
    hangul: count(RE_HANGUL),
    cyrillic: count(RE_CYRILLIC),
    greek: count(RE_GREEK),
    latin: count(RE_LATIN),
  };
}

function detectZhVariant(text) {
  let trad = 0;
  let simp = 0;
  for (const ch of text) {
    if (TRAD_CHARS.has(ch)) trad++;
    else if (SIMP_CHARS.has(ch)) simp++;
  }
  return trad > simp ? "zh-TW" : "zh-CN";
}

function detectLatinVariant(text, latinCount) {
  if (!latinCount) return "";
  const lower = text.toLowerCase();
  const countWord = (re) => (lower.match(re) || []).length;
  const score = { en: 0, de: 0, fr: 0, es: 0 };

  score.en += countWord(/\b(the|and|is|of|to|in|that|it|you|for|with|on)\b/g);
  score.de +=
    countWord(/\b(der|die|das|und|ist|nicht|ein|eine|mit|auf|ich)\b/g) +
    countWord(/[äöüß]/g);
  score.fr +=
    countWord(/\b(le|la|les|de|des|et|un|une|est|que|pour)\b/g) +
    countWord(/[çœàâêîôûëïü]/g);
  score.es +=
    countWord(/\b(el|la|los|las|de|que|y|no|en|un|por|es)\b/g) +
    countWord(/[ñ¿¡]/g);

  let best = "";
  let bestScore = 0;
  for (const [lang, s] of Object.entries(score)) {
    if (s > bestScore) {
      best = lang;
      bestScore = s;
    }
  }
  // 仅当有多个独立信号时采纳，避免单点误判
  return bestScore >= 2 ? best : "";
}

function setCache(key, value) {
  if (detectCache.size >= DETECT_CACHE_LIMIT) {
    const oldestKey = detectCache.keys().next().value;
    detectCache.delete(oldestKey);
  }
  detectCache.set(key, value);
}
