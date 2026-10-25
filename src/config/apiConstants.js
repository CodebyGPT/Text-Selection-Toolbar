/** Pure legacy IDs and feature flags, shared by configuration and compiled providers. */
// --- 基础请求控制参数 ---
export const DEFAULT_HTTP_TIMEOUT = 30; // 调用超时时间 (单位：秒)
export const DEFAULT_FETCH_LIMIT = 10; // 默认最大并行请求/任务数量
export const DEFAULT_FETCH_INTERVAL = 100; // 当前网页 URL 占位符
export const INPUT_PLACE_FROM = "{{from}}"; // 源语言占位符
export const INPUT_PLACE_TO = "{{to}}"; // 目标语言占位符
export const INPUT_PLACE_FROM_LANG = "{{fromLang}}"; // 源语言代码占位符
export const INPUT_PLACE_TO_LANG = "{{toLang}}"; // 目标语言代码占位符
export const INPUT_PLACE_TEXT = "{{text}}"; // 翻译源文本占位符
export const INPUT_PLACE_TONE = "{{tone}}"; // 翻译风格/语气占位符 (例如：formal, casual 等)
export const INPUT_PLACE_TITLE = "{{title}}"; // 页面标题占位符
export const INPUT_PLACE_DESCRIPTION = "{{description}}"; // 页面描述(Description)占位符
export const INPUT_PLACE_SUMMARY = "{{summary}}"; // 页面摘要(Summary)占位符
export const INPUT_PLACE_CONTEXT = "{{context}}"; // AI 模型名称占位符
export const INPUT_PLACE_GLOSSARY = "{{glossary}}"; // 专业术语表占位符
export const INPUT_PLACE_SEGMENTS = "{{segments}}";

// --- 翻译服务提供商标识常量（仅保留本地/自托管接口）---
export const OPT_TRANS_TRANSLATOR_API = "TranslatorAPI"; // 浏览器内置翻译 API
export const OPT_TRANS_STRANSLATE = "STranslate"; // 外部程序 STranslate（仅转发划词文本）
export const OPT_TRANS_MTRAN = "MTranServer"; // 自托管 MTranServer（KISS 兼容 /kiss 接口）
export const OPT_TRANS_LOCAL_TRANSLATOR = "LocalTranslator"; // 同浏览器内的 Local Translator for Chromium 扩展（页面消息桥）
export const OPT_TRANS_OLLAMA = "Ollama"; // 本地部署 Ollama 模型翻译
export const OPT_TRANS_CUSTOMIZE = "Custom"; // 自定义翻译 API

// 内置支持的翻译引擎
export const OPT_ALL_TRANS_TYPES = [
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_STRANSLATE,
  OPT_TRANS_MTRAN,
  OPT_TRANS_LOCAL_TRANSLATOR,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
];

// The browser translation API only ships in Chromium 138 and newer, so the
// preset is hidden and unusable everywhere else.
export const BUILTIN_AI_MIN_CHROMIUM_VERSION = 138;
export function isTranslatorAPISupported() {
  const ua = String(globalThis.navigator?.userAgent || "");
  const match = ua.match(/(?:Chrome|Chromium|CriOS)\/(\d+)/);
  return Boolean(
    match && Number(match[1]) >= BUILTIN_AI_MIN_CHROMIUM_VERSION
  );
}

export const OPT_LANGDETECTOR_ALL = [OPT_TRANS_TRANSLATOR_API];

export const OPT_LANGDETECTOR_MAP = new Set(OPT_LANGDETECTOR_ALL);

// 翻译引擎特殊集合：按能力将翻译引擎分类
export const API_SPE_TYPES = {
  // 内置翻译引擎
  builtin: new Set(OPT_ALL_TRANS_TYPES),
  // 机器翻译引擎（传统查表/神经网络翻译，不需要大型语言模型）
  machine: new Set(),
  // 大语言模型 AI 翻译引擎
  ai: new Set([OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE]),
  // 支持多 API Key 轮询/备用的引擎
  mulkeys: new Set([OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE]),
  // 支持段落聚合（批处理合并）翻译的引擎
  batch: new Set([OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE]),
  // 支持带历史会话（Context）关联的翻译引擎
  context: new Set([OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE]),
  // 支持流式文本返回（Server-Sent Events / Stream）的翻译引擎
  stream: new Set([OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE]),
  // 官方推荐/赞助商的翻译服务
  sponsors: new Set(),
  // 暗黑模式下图标反色
  darkIcon: new Set([OPT_TRANS_OLLAMA]),
};
