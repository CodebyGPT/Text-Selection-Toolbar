/**
 * @file detect.js
 * @description 语言检测服务模块。仅保留浏览器内置 LanguageDetector 与本地 i18n 兜底。
 */

import {
  OPT_LANGS_TO_CODE,
  OPT_TRANS_BUILTINAI,
  OPT_LANGDETECTOR_MAP,
} from "../config";
import { browser } from "./browser";
import { apiBuiltinAIDetect } from "../apis";
import { kissLog } from "./log";
import { normalizeLanguageCode } from "./language";

// 各个平台的语言检测函数映射表
const langdetectFns = {
  [OPT_TRANS_BUILTINAI]: apiBuiltinAIDetect,
};

/**
 * 尝试检测给定文本的源语言代码
 * @param {string} text 待检测的文本内容
 * @param {string} [langDetector="-"] 选择的检测算法/接口类型 ("-" 表示仅使用本地检测)
 * @returns {Promise<string>} 语言代码（如 "en", "zh-CN", 若检测失败返回空字符串 ""）
 */
export const tryDetectLang = async (text, langDetector = "-") => {
  let deLang = "";

  // Existing detector type values stay valid; additional values are service instance IDs.
  if (
    langDetector &&
    langDetector !== "-" &&
    !OPT_LANGDETECTOR_MAP.has(langDetector)
  ) {
    try {
      const { invokeSavedService } = await import("../providers/savedService");
      const result = await invokeSavedService(langDetector, "detectLanguage", {
        text,
      }).result;
      deLang = normalizeLanguageCode(result.language);
    } catch (err) {
      kissLog("detect lang provider", err);
    }
  }

  // 1. 如果配置了内置 AI 语言检测服务，则首选该服务进行识别
  if (OPT_LANGDETECTOR_MAP.has(langDetector)) {
    try {
      const lang = await langdetectFns[langDetector](text);
      if (lang) {
        const mappedLang = OPT_LANGS_TO_CODE[langDetector].get(lang) || lang;
        deLang = normalizeLanguageCode(mappedLang);
      }
    } catch (err) {
      kissLog("detect lang remote", err);
    }
  }

  // 2. 采用浏览器的 i18n API 执行本地原生识别作为兜底
  if (!deLang) {
    try {
      const res = await browser?.i18n?.detectLanguage(text);
      const lang = res?.languages?.[0]?.language;
      const normalizedLang = normalizeLanguageCode(lang);
      if (normalizedLang && (res?.isReliable || /^zh(?:[-_]|$)/i.test(lang))) {
        deLang = normalizedLang;
      }
    } catch (err) {
      kissLog("detect lang local", err);
    }
  }

  return deLang;
};
