import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import {
  URL_CACHE_TRAN,
  OPT_LANGS_TO_SPEC,
  OPT_LANGS_FROM_SPEC,
  OPT_LANGS_SPEC_DEFAULT,
  API_SPE_TYPES,
  DEFAULT_API_SETTING,
  MSG_BUILTINAI_DETECT,
  MSG_BUILTINAI_TRANSLATE,
  OPT_TRANS_TRANSLATOR_API,
  URL_CACHE_SUBTITLE,
  URL_CACHE_CONTEXT,
  OPT_LANGS_TO_CODE,
  OPT_LANGDETECTOR_MAP,
  defaultNobatchUserPrompt,
  isExternalApi,
} from "../config";
import { getSetting } from "../libs/storage";
import { kissLog } from "../libs/log";
import { withTimeout } from "../libs/utils";
import {
  isSameTranslationLanguage,
  normalizeLanguageCode,
} from "../libs/language";
import { getCacheDigest } from "../libs/cacheDigest";
import {
  handleTranslate,
  handleSubtitle,
  buildSubtitleSystemPrompt,
  formatIndexSubtitleEvents,
  handleSummarize,
} from "./trans";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { isTranslatorAPIAvailable } from "../libs/browser";
import { chromeDetect, chromeTranslate } from "../libs/builtinAI";
import { fnPolyfill } from "../libs/fetch";
import { normalizeHttpTimeout } from "../libs/request";
import { getFetchPool } from "../libs/pool";
import { supportsApiCapability } from "../config/serviceSelection";
import { trustedTypesHelper } from "../libs/trustedTypes";
import { getDocInfo } from "../libs/docInfo";
import { providerCacheSignature } from "../providers/cache";

const PROMPT_CACHE_SALT = "prompt-cache";
const PROMPT_CACHE_SCOPE_NOBATCH = "nobatch";
const PROMPT_CACHE_SCOPE_PLAIN = "plain";
const PROMPT_CACHE_SCOPE_QWEN_MT = "qwen-mt";

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

function getTranslatePromptCacheScope(apiSetting = {}) {
  return API_SPE_TYPES.ai.has(apiSetting.apiType)
    ? PROMPT_CACHE_SCOPE_NOBATCH
    : PROMPT_CACHE_SCOPE_PLAIN;
}

function getPromptCacheFields(apiSetting = {}, promptScope, glossary = {}) {
  let fields = [];

  if (promptScope === PROMPT_CACHE_SCOPE_NOBATCH) {
    fields = [
      apiSetting.nobatchPrompt || "",
      apiSetting.nobatchUserPrompt ?? defaultNobatchUserPrompt,
    ];
  } else if (promptScope === PROMPT_CACHE_SCOPE_QWEN_MT) {
    fields = [];
  } else {
    return [];
  }

  fields.push(apiSetting.tone || "", apiSetting.aiTerms || "");
  const glossaryEntries = Object.entries(glossary || {}).sort();
  if (glossaryEntries.length) {
    fields.push(JSON.stringify(glossaryEntries));
  }
  return fields;
}

async function getPromptCacheSig(apiSetting = {}, promptScope, glossary) {
  const promptText = [
    promptScope,
    ...getPromptCacheFields(apiSetting, promptScope, glossary),
  ].join("\n");

  return (await getCacheDigest(promptText, PROMPT_CACHE_SALT)).slice(0, 16);
}

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
 * 承载了翻译缓存命中判断、并发批量队列合并、流式文本输出处理等最核心的工程化细节。
 * @param {Object} params
 * @param {string} params.text 待翻译的原文字符串 (如果是网页翻译，为被分割出的 DOM 文本块)
 * @param {string} params.fromLang 源语言，默认为 "auto"
 * @param {string} params.toLang 目标翻译语言
 * @param {Object} params.apiSetting 翻译接口的配置参数项
 * @param {string} params.glossary 自定义词汇术语替换表
 * @param {Object} params.docInfo 视频/文档摘要等额外上下文环境数据
 * @param {boolean} params.useCache 是否应用本地请求缓存 (默认 true)
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
  useCache = true,
  cacheMode = "default",
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
  const { apiType, apiSlug } = apiSetting;
  const langMap = OPT_LANGS_TO_SPEC[apiType] || OPT_LANGS_SPEC_DEFAULT;
  const fromMap = OPT_LANGS_FROM_SPEC[apiType] || langMap;
  const from = fromMap.get(fromLang);
  const to = langMap.get(toLang);
  if (!to) {
    throw new Error(`The target lang: ${toLang} not support`);
  }

  // REVIEW: 极其精妙的缓存 Key (cacheOpts) 构造。
  // 特别是将项目的 REACT_APP_VERSION 版本号（仅前两位小版本）加入了缓存 key。
  // 这可以确保用户在升级扩展插件后，旧版本的翻译缓存会被自动作废，防止旧的翻译 Prompt/规则影响新版效果。
  // 此外，如果当前是视频字幕翻译，还会缓存前 50 字符的上下文视频摘要信息，使上下文关联缓存更智能。
  const [v1, v2] = process.env.REACT_APP_VERSION.split(".");
  let promptSig = await getPromptCacheSig(
    apiSetting,
    getTranslatePromptCacheScope(apiSetting),
    glossary
  );
  if (apiSetting.provider) {
    promptSig = await providerCacheSignature(apiSetting, "translate", {
      promptSig,
      glossary,
      docInfo,
      fromLang,
      toLang,
      textFormat,
    });
  }
  const cacheOpts = {
    apiSlug,
    text,
    fromLang,
    toLang,
    textFormat,
    translateVariants,
    version: [v1, v2].join("."),
    promptSig,
    ...(docInfo?.summary && { ctx: docInfo.summary.slice(0, 50) }),
  };
  const cacheInput = `${URL_CACHE_TRAN}?${queryString.stringify(cacheOpts)}`;

  // 1. 查询本地 HTTP/CacheStorage 缓存
  if (useCache && cacheMode === "default") {
    const cache = await getHttpCachePolyfill(cacheInput);
    if (cache?.trText) {
      return {
        ...cache,
        isSame: getTranslationLanguageMatch({
          fromLang,
          toLang,
          to,
          srLang: cache.srLang,
          srCode: cache.srCode,
          translateVariants,
        }),
      };
    }
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  // 2. 缓存未命中，分发执行翻译请求
  let translation = [];
  if (apiType === OPT_TRANS_TRANSLATOR_API) {
    // 2.1 浏览器本地 AI 翻译路径
    translation = await apiTranslatorAPITranslate({
      text,
      from,
      to,
      apiSetting,
    });
  } else {
    // 2.2 单段文本请求：面板一次只翻译一段，不再聚合或流式返回。
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

  // 3. 对翻译引擎返回的数据格式进行规范化处理
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

  // 4. 将成功的结果写入本地网络缓存中
  if (useCache && cacheMode !== "off" && !signal?.aborted) {
    putHttpCachePolyfill(cacheInput, null, { trText, isSame, srLang, srCode });
  }

  return { trText, srLang, srCode, isSame };
};

export const apiSubtitle = async ({
  videoId,
  chunkSign,
  fromLang = "auto",
  toLang,
  events = [],
  apiSetting,
  docInfo,
  onSubtitleChunk,
  signal,
}) => {
  if (!supportsApiCapability(apiSetting, "segmentSubtitle"))
    throw Object.assign(
      new Error("Subtitle capability is disabled or unsupported."),
      { code: "CAPABILITY_DISABLED" }
    );
  if (!events?.length) return [];
  const formattedEvents = formatIndexSubtitleEvents(
    events,
    apiSetting.subtitlePrompt
  );
  // chunk 哈希同时包含 AI 输入和内部时间轴，避免相同首尾时间误命中旧字幕。
  const chunkHash = (
    await getCacheDigest(
      JSON.stringify(
        formattedEvents.map((item, index) => [
          item.id,
          item.text,
          events[index]?.start,
          events[index]?.end,
          // 新协议记录精确停顿；旧提示词仍使用 p 时继续纳入同一哈希槽位。
          item.pauseMs || item.p || 0,
        ])
      ),
      "subtitle-chunk-v4"
    )
  ).slice(0, 16);
  // 对完成变量替换的最终提示词签名，动态视频上下文无需再维护独立 contextSig。
  const renderedPrompt = buildSubtitleSystemPrompt({
    subtitlePrompt: apiSetting.subtitlePrompt,
    tone: apiSetting.tone,
    from: fromLang,
    to: toLang,
    fromLang,
    toLang,
    docInfo,
    aiTerms: apiSetting.aiTerms,
  });
  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    apiType: apiSetting.apiType,
    model: apiSetting.model,
    videoId,
    chunkSign,
    chunkHash,
    fromLang,
    toLang,
    segVer: 4,
    promptSig: (apiSetting.provider
      ? await providerCacheSignature(apiSetting, "segmentSubtitle", {
          renderedPrompt,
          docInfo,
          fromLang,
          toLang,
        })
      : await getCacheDigest(renderedPrompt, PROMPT_CACHE_SALT)
    ).slice(0, 16),
  };
  const cacheInput = `${URL_CACHE_SUBTITLE}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取视频字幕缓存
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 发起使用视频级系统上下文的字幕断句与翻译请求。
  const subtitles = await handleSubtitle({
    events,
    from: fromLang,
    to: toLang,
    apiSetting,
    docInfo,
    onSubtitleChunk,
    signal,
  });
  if (subtitles?.length) {
    putHttpCachePolyfill(cacheInput, null, subtitles);
    return subtitles;
  }

  return [];
};

/**
 * 对视频标题、简介和原始字幕轨进行长文本上下文的总结与归纳，提取视频核心大纲 (Video Context Summary)。
 * 归纳出的 summary 会反馈给字幕翻译 API，以便提供语义支撑。
 */
export const apiSummarizeContext = async ({
  videoId,
  title,
  description,
  transcript,
  apiSetting,
}) => {
  if (!supportsApiCapability(apiSetting, "summarize"))
    throw Object.assign(
      new Error("Summary capability is disabled or unsupported."),
      { code: "CAPABILITY_DISABLED" }
    );
  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    videoId,
    ...((apiSetting.provider || apiSetting.enabledCapabilities) && {
      providerSig: await providerCacheSignature(apiSetting, "summarize", {
        title,
        description,
        transcript,
      }),
    }),
  };
  const cacheInput = `${URL_CACHE_CONTEXT}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取总结摘要缓存，避免每次打开同一视频重复对长文本请求总结
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 调用大模型/特定接口生成视频提炼大纲
  const summary = await handleSummarize({
    title,
    description,
    transcript,
    apiSetting,
  });

  if (summary) {
    putHttpCachePolyfill(cacheInput, null, summary);
    return summary;
  }

  return "";
};

/**
 * 生成视频总结的确定性缓存签名。
 * 综合视频 ID、接口 slug、模型标识、目标语言、提示词模板内容（系统与用户提示词）以及输入内容（标题、简介、字幕），
 * 确保在字幕补全、元数据变更、修改提示词模板或切换语言时均能生成不同的签名。
 */
export const getVideoSummarySignature = async ({
  videoId = "",
  title = "",
  description = "",
  transcript = "",
  apiSetting = {},
  prompt = {},
  to = "zh-CN",
}) => {
  const contentToDigest = [
    videoId,
    apiSetting?.apiSlug || "",
    apiSetting?.modelRef || apiSetting?.model || "",
    to,
    prompt?.slug || "default",
    prompt?.systemPrompt || "",
    prompt?.userPrompt || "",
    title,
    description,
    transcript,
  ].join("\n---\n");

  const digest =
    apiSetting?.provider || apiSetting?.enabledCapabilities
      ? await providerCacheSignature(apiSetting, "summarize", {
          contentToDigest,
        })
      : await getCacheDigest(contentToDigest, "video_summary_v1");
  const sig = (digest || "").slice(0, 16);
  return `${videoId || "video"}_${apiSetting?.apiSlug || "api"}_${to}_${sig}`;
};

/**
 * 对视频标题、简介和原始字幕原稿生成结构化 Markdown 视频总结 (Video Summary)。
 * 支持使用 TranslatorAPI、LocalAI 或网络大模型，支持指定自定义总结提示词和目标语言，支持缓存与强制重新生成。
 */
export const apiSummarizeVideo = async ({
  videoId,
  title,
  description,
  transcript,
  apiSetting,
  prompt,
  to = "zh-CN",
  force = false,
  signal,
}) => {
  if (!supportsApiCapability(apiSetting, "summarize"))
    throw Object.assign(
      new Error("Summary capability is disabled or unsupported."),
      { code: "CAPABILITY_DISABLED" }
    );
  const summarySig = await getVideoSummarySignature({
    videoId,
    title,
    description,
    transcript,
    apiSetting,
    prompt,
    to,
  });

  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    videoId,
    to,
    sig: summarySig,
    type: "video_summary",
  };
  const cacheInput = `${URL_CACHE_CONTEXT}?${queryString.stringify(cacheOpts)}`;

  if (!force) {
    const cache = await getHttpCachePolyfill(cacheInput);
    if (cache) {
      return cache;
    }
  }

  const summary = await handleSummarize({
    title,
    description,
    transcript,
    apiSetting,
    prompt,
    to,
    signal,
    cacheMode: force ? "refresh" : undefined,
  });

  if (summary) {
    putHttpCachePolyfill(cacheInput, null, summary);
    return summary;
  }

  return "";
};
