import { fetchData } from "../libs/fetch";
import {
  OPT_LANGS_TO_SPEC,
  OPT_LANGS_FROM_SPEC,
  OPT_LANGS_SPEC_DEFAULT,
  DEFAULT_API_SETTING,
  MSG_BUILTINAI_DETECT,
  MSG_BUILTINAI_TRANSLATE,
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_LOCAL_TRANSLATOR,
  OPT_LANGS_TO_CODE,
  OPT_LANGDETECTOR_MAP,
  isExternalApi,
} from "../config";
import { getSetting } from "../libs/storage";
import { kissLog } from "../libs/log";
import { withTimeout } from "../libs/utils";
import {
  isSameTranslationLanguage,
  normalizeLanguageCode,
} from "../libs/language";
import { handleTranslate } from "./trans";
import { isTranslatorAPIAvailable } from "../libs/browser";
import { chromeDetect, chromeTranslate } from "../libs/builtinAI";
import { fnPolyfill } from "../libs/fetch";
import { normalizeHttpTimeout } from "../libs/request";
import { getFetchPool } from "../libs/pool";
import { supportsApiCapability } from "../config/serviceSelection";

const isGenericChineseLanguageCode = (code) =>
  typeof code === "string" && /^zh$/i.test(code.trim());

const getTranslationLanguageMatch = ({
  fromLang,
  toLang,
  to,
  srLang,
  srCode,
  translateVariants,
}) => {
  if (fromLang !== "auto") return false;

  const isGenericChinese = isGenericChineseLanguageCode(srLang);
  const normalizedSource =
    isGenericChinese && translateVariants
      ? ""
      : normalizeLanguageCode(srCode || srLang);
  const normalizedTarget = normalizeLanguageCode(toLang);

  return (
    isSameTranslationLanguage(
      normalizedSource,
      normalizedTarget,
      translateVariants
    ) ||
    (!isGenericChinese &&
      (!normalizedSource || !normalizedTarget) &&
      srLang === to)
  );
};

/**
 * 跨端/多终端规则与设置数据同步接口。
 * @param {string} url 同步接口的服务器 URL
 * @param {string} key 同步密钥
 * @param {Object} data 待同步的最新设置与规则数据
 * @returns {Promise<Object>} 接口返回的同步判定结果
 */

/**
 * 通用轻量数据拉取函数。
 * @param {string} url 目标 URL
 * @returns {Promise<*>} 拉取的数据内容
 */
export const apiFetch = (url) => fetchData(url);
export const apiFetchText = (url) =>
  fetchData(url, undefined, { expect: "text" });

/**

/**
 * 现代浏览器 (Chrome 127+) 内置 Gemini Nano AI 本地语言识别 API。
 * 依靠扩展 runtime/polyfill 桥接特权页面 API 实现。
 * @param {string} text 待测原文
 * @returns {Promise<string>} 检测出的语言
 */
export const apiTranslatorAPIDetect = async (text) => {
  if (!isTranslatorAPIAvailable) {
    return "";
  }

  // 跨运行环境调用 chrome.translation.canDetectLanguage() 垫片包装
  const [lang, error] = await fnPolyfill({
    fn: chromeDetect,
    msg: MSG_BUILTINAI_DETECT,
    text,
  });
  if (!error) {
    return lang;
  }

  return "";
};

// 远程语言检测服务已移除；TranslatorAPI 的自动检测失败后直接保留原始错误。
const LANGDETECT_FNS = {};

/**
 * TranslatorAPI 自动检测源语言失败后的回退解析。
 * 浏览器内置 LanguageDetector 不可用时，改用用户配置的远程语言检测服务
 * 解析出具体源语言；全部失败时返回空串并保留原始错误。
 * @param {string} text 待检测文本
 * @returns {Promise<string>} 解析出的语言代码，失败返回 ""
 */
const resolveTranslatorAPISourceLang = async (text) => {
  try {
    const setting = (await getSetting()) || {};
    const { langDetector } = setting;
    if (OPT_LANGDETECTOR_MAP.has(langDetector)) {
      const detectFn = LANGDETECT_FNS[langDetector];
      // TranslatorAPI 检测器刚刚失败过，不再重复尝试
      if (detectFn) {
        const lang = await detectFn(text);
        if (lang) {
          const mappedLang = OPT_LANGS_TO_CODE[langDetector].get(lang) || lang;
          return normalizeLanguageCode(mappedLang);
        }
      }
    }
  } catch (err) {
    kissLog("detect lang fallback", err);
  }
  return "";
};

/**
 * 浏览器内置 Gemini Nano AI 翻译 API。
 * 整合了超时管理与内置并发频率池（FetchPool），保证前台调用不易发生死锁。
 */
const apiTranslatorAPITranslate = async ({ text, from, to, apiSetting }) => {
  if (!isTranslatorAPIAvailable) {
    return ["", true];
  }

  const { fetchInterval, fetchLimit, httpTimeout } = apiSetting;
  // 1. 获取限制并发的频率控制池，保障不频繁打爆本地 AI 进程
  const fetchPool = getFetchPool(fetchInterval, fetchLimit);

  // 2. 执行带有超时机制 (withTimeout) 的本地 AI 翻译
  const result = await withTimeout(
    fetchPool.push(fnPolyfill, {
      fn: chromeTranslate,
      msg: MSG_BUILTINAI_TRANSLATE,
      text,
      from,
      to,
    }),
    normalizeHttpTimeout(httpTimeout)
  );

  if (!result) {
    throw new Error("apiTranslatorAPITranslate got null reault");
  }

  const [trText, srLang, error] = result;
  if (error) {
    // 浏览器内置检测失败时，使用用户配置的检测服务解析具体源语言并重试一次。
    if (
      from === "auto" &&
      String(error).includes("Automatic detection of source language failed")
    ) {
      const deLang = await resolveTranslatorAPISourceLang(text);
      if (deLang) {
        const mappedFrom =
          OPT_LANGS_FROM_SPEC[OPT_TRANS_TRANSLATOR_API].get(deLang) || deLang;
        const retry = await withTimeout(
          fetchPool.push(fnPolyfill, {
            fn: chromeTranslate,
            msg: MSG_BUILTINAI_TRANSLATE,
            text,
            from: mappedFrom,
            to,
          }),
          normalizeHttpTimeout(httpTimeout)
        );
        if (!retry) {
          throw new Error("apiTranslatorAPITranslate retry got null result");
        }

        const [trTextRetry, srLangRetry, errorRetry] = retry;
        if (errorRetry) {
          throw new Error(`apiTranslatorAPITranslate got error: ${errorRetry}`);
        }
        return [trTextRetry, srLangRetry];
      }
    }
    throw new Error(`apiTranslatorAPITranslate got error: ${error}`);
  }

  return [trText, srLang];
};

/**
 * 全局统一翻译分发控制网关。
 * 承载了并发批量队列合并、流式文本输出处理等最核心的工程化细节。
 * 翻译结果不做任何本地缓存：原文与译文都不落盘。
 * @param {Object} params
 * @param {string} params.text 待翻译的原文字符串 (如果是网页翻译，为被分割出的 DOM 文本块)
 * @param {string} params.fromLang 源语言，默认为 "auto"
 * @param {string} params.toLang 目标翻译语言
 * @param {Object} params.apiSetting 翻译接口的配置参数项
 * @param {string} params.glossary 自定义词汇术语替换表
 * @param {Object} params.docInfo 视频/文档摘要等额外上下文环境数据
 * @param {boolean} params.usePool 是否应用限制连接池 (默认 true)
 * @param {boolean} params.translateVariants 是否翻译同一语言的不同变体
 * @param {"text"|"html"} params.textFormat 输入与输出的内容格式，默认为纯文本
 * @param {AbortSignal} params.signal AbortController 传导的取消控制信号
 * @returns {Promise<Object>} 最终解析出的翻译响应数据 (trText, srLang, srCode, isSame)
 */
export const apiTranslate = async ({
  text,
  fromLang = "auto",
  toLang,
  apiSetting = DEFAULT_API_SETTING,
  glossary,
  docInfo,
  usePool = true,
  translateVariants = true,
  textFormat = "text",
  signal,
  capture,
}) => {
  if (!text) {
    throw new Error("The text cannot be empty.");
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  if (!supportsApiCapability(apiSetting, "translate"))
    throw Object.assign(
      new Error("Translation capability is disabled or unsupported."),
      { code: "CAPABILITY_DISABLED" }
    );

  if (isExternalApi(apiSetting)) {
    throw new Error("外部翻译接口请通过工具栏翻译按钮调用。");
  }
  const { apiType } = apiSetting;
  const langMap = OPT_LANGS_TO_SPEC[apiType] || OPT_LANGS_SPEC_DEFAULT;
  const fromMap = OPT_LANGS_FROM_SPEC[apiType] || langMap;
  const from = fromMap.get(fromLang);
  const to = langMap.get(toLang);
  if (!to) {
    throw new Error(`The target lang: ${toLang} not support`);
  }

  // 1. 分发执行翻译请求
  let translation = [];
  if (apiType === OPT_TRANS_TRANSLATOR_API) {
    // 1.1 浏览器本地 AI 翻译路径
    translation = await apiTranslatorAPITranslate({
      text,
      from,
      to,
      apiSetting,
    });
  } else if (apiType === OPT_TRANS_LOCAL_TRANSLATOR) {
    // 1.2 同浏览器扩展：经页面消息桥交给 Local Translator for Chromium 离线翻译。
    const { translateWithLocalTranslator } = await import(
      "../libs/localTranslatorBridge"
    );
    translation = [
      await translateWithLocalTranslator({
        text,
        from: fromLang,
        to: toLang,
        timeout: apiSetting.httpTimeout,
        signal,
      }),
      "",
    ];
  } else {
    // 1.3 单段文本请求：面板一次只翻译一段，不再聚合或流式返回。
    const generator = handleTranslate([text], {
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      textFormat,
      apiSetting,
      usePool,
      docInfo,
      signal,
      capture,
    });

    for await (const item of generator) {
      if (item.id !== 0) {
        continue;
      }
      translation = item.result;
    }
  }

  // 2. 对翻译引擎返回的数据格式进行规范化处理
  let trText = "";
  let srLang = "";
  let srCode = "";
  if (Array.isArray(translation)) {
    [trText, srLang = ""] = translation;
    if (srLang) {
      srCode =
        OPT_LANGS_TO_CODE[apiType]?.get(srLang) ||
        (apiSetting.provider &&
        apiSetting.provider.implementation.kind !== "native"
          ? normalizeLanguageCode(srLang)
          : "");
    }
  } else if (typeof translation === "string") {
    trText = translation;
  }

  if (!trText) {
    throw new Error("translate api got empty trtext");
  }

  // 判断是否发生了“源语言与目标语言相同”的无效翻译情况 (如英文网页翻译为英文)
  const isSame = getTranslationLanguageMatch({
    fromLang,
    toLang,
    to,
    srLang,
    srCode,
    translateVariants,
  });

  return { trText, srLang, srCode, isSame };
};
