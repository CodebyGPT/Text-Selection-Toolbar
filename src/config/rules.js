/**
 * @file rules.js
 * @description 网页翻译规则相关的配置参数。定义匹配选择器、翻译时机、段落切分、生词高亮策略以及兜底和内置的定制网站翻译规则。
 */

import { OPT_TRANS_OLLAMA } from "./api";
import { OPT_STYLE_NONE } from "./styles"; // 默认的生词高亮背景色/波浪线颜色

export const DEFAULT_TRANS_TAG = "font"; // 默认翻译译文所外包的 HTML 标签名
export const DEFAULT_SELECT_STYLE =
  "-webkit-line-clamp: unset; max-height: none; height: auto;";

// --- 文本段落切分拆分策略 (避免单个段落过长导致大模型翻译效果差或报错) ---
export const OPT_SPLIT_PARAGRAPH_DISABLE = "split_disable";

// 默认的待翻译元素选择器：包含主要的标题、列表、段落及引用块
export const DEFAULT_SELECTOR =
  "h1, h2, h3, h4, h5, h6, li, p, dd, blockquote, figcaption, label, legend";
// 默认被忽略、不参与翻译的选择器：包含按钮、页脚、导航栏、代码块、矢量图以及带“logo”属性的元素
export const DEFAULT_IGNORE_SELECTOR =
  "button, footer, pre, mark, nav, svg, img[src*='.svg'], [class*='logo'] svg, [id*='logo'] svg";
// 默认保留原样、不破坏内部结构的特殊行内元素选择器（如行内代码、公式等）
export const DEFAULT_KEEP_SELECTOR = `code, cite, math, .math, a:has(code)`;

// 全局兜底规则：当网页没有匹配的特定规则时，采用此默认规则
export const GLOBLA_RULE = {
  pattern: "*", // 匹配任意网址
  enabled: true,
  selector: DEFAULT_SELECTOR, // 默认的翻译元素
  keepSelector: DEFAULT_KEEP_SELECTOR, // 保留不动的行内元素
  blockSelector: "",
  terms: "",
  aiTerms: "",
  apiSlug: OPT_TRANS_OLLAMA, // 默认采用本地 Ollama 翻译
  fromLang: "auto", // 默认自动识别原文语言
  toLang: "zh-CN", // 默认翻译为简体中文
  textStyle: OPT_STYLE_NONE, // 默认译文不加额外线条/高亮背景
  wrapOriginal: "false", // 默认不改变原文 DOM 层级
  originalTextStyle: OPT_STYLE_NONE, // 默认原文不加额外样式
  transOpen: "false", // 默认不自动开始翻译网页 (需要手动点击或快捷键)
  // bgColor: DEFAULT_COLOR, // 译文颜色 (作废)
  // textDiyStyle: DEFAULT_DIY_STYLE, // 自定义译文样式 (作废)
  textExtStyle: "",
  termsStyle: "font-weight: bold;", // 专业术语默认加粗
  highlightStyle: "color: red;", // 高亮生词默认标红
  selectStyle: DEFAULT_SELECT_STYLE,
  parentStyle: "",
  grandStyle: "",
  injectJs: "",
  injectCss: "",
  transOnly: "false", // 默认保留原文，呈现双语对比形式
  transOnlyRevert: "false",
  transOnlyRevertDelay: "0.5",
  // transTiming: OPT_TIMING_PAGESCROLL, // 翻译时机/鼠标悬停翻译 (暂时作废)
  transTag: DEFAULT_TRANS_TAG,
  transTitle: "false", // 默认不自动翻译网页 Tab 标题
  // transSelected: "true", // 是否启用划词翻译 (移回setting)
  // detectRemote: "true", // 是否使用远程语言检测 (移回setting)
  // skipLangs: [], // 不翻译的语言 (移回setting)
  // fixerSelector: "", // 修复函数选择器 (暂时作废)
  // fixerFunc: "-", // 修复函数 (暂时作废)
  transStartHook: "",
  transEndHook: "",
  // transRemoveHook: "", // 钩子函数 (暂时作废)
  autoScan: "true", // 默认自动扫描文本节点，确保漏网之鱼也被翻译
  hasRichText: "true", // 默认进行富文本标签翻译，以保证链接等样式不会在翻译后破损
  hasShadowroot: "false", // 默认不主动穿透 Shadow DOM (因性能开销，仅在特定页面开启)
  scanAll: "false",
  isPlainText: "false", // 默认关闭 <pre> 纯文本翻译模式
  rootsSelector: "body",
  ignoreSelector: DEFAULT_IGNORE_SELECTOR,
  splitParagraph: OPT_SPLIT_PARAGRAPH_DISABLE,
  splitLength: 100,
  transOrder: "original-first", // 文本顺序：原文在上 ("original-first") 或 译文在上 ("translation-first")
};

// 预设规则列表，初始化时直接注册
export const DEFAULT_RULES = [GLOBLA_RULE];

// REVIEW: 针对特定高频复杂网页做特殊定制的内置规则映射表。
// 这些预置规则解决了各大平台（如维基百科、黑客新闻、X/Twitter、YouTube直播、GitHub）由于动态加载、复杂的 CSS 结构、大量的干扰元素所导致的翻译错位或不完整问题。
const RULES_MAP = {
  // "www.google.com/search": {
  //   rootsSelector: `#rcnt`,
  // },
  "en.wikipedia.org": {
    ignoreSelector: `.button, code, footer, form, mark, pre, .mwe-math-element, .mw-editsection`,
  },
  "news.ycombinator.com": {
    selector: `p, .titleline, .commtext, .hn-item-title, .hn-comment-text, .hn-story-title`,
    keepSelector: `code, img, svg, pre, .sitebit`,
    ignoreSelector: `button, code, footer, form, header, mark, nav, pre, .reply`,
    autoScan: `false`,
  },
  "twitter.com, https://x.com": {
    selector: `[data-testid='tweetText'], [data-testid='twitter-article-title'], [data-testid='UserDescription'], .public-DraftStyleDefault-block, span.text-body, div.css-175oi2r.r-3pj75a div.css-175oi2r>span, div.css-175oi2r.r-3pj75a li>span, div.r-1s2bzr4>div.r-16dba41, div.r-16y2uox>div.r-1jeg54m`,
    keepSelector: `img, svg, a, span:has(a), div:has(a)`,
    ignoreSelector: `[data-testid='videoPlayer'], [data-testid^='tweetTextarea']`,
    autoScan: `false`,
    selectStyle: `-webkit-line-clamp: unset; max-height: none; height: auto;`,
  },
  "www.youtube.com/live_chat": {
    rootsSelector: `div#items`,
    selector: `span.yt-live-chat-text-message-renderer`,
    autoScan: `false`,
  },
  "www.youtube.com": {
    rootsSelector: `ytd-page-manager`,
    ignoreSelector: `aside, button, footer, form, header, pre, mark, nav, #player, #container, .caption-window, .ytp-settings-menu, #kiss-youtube-subtitle-list-container`,
    selectStyle: `-webkit-line-clamp: unset; max-height: none; height: auto;`,
    parentStyle: `-webkit-line-clamp: unset; max-height: none; height: auto;`,
    grandStyle: `-webkit-line-clamp: unset; max-height: none; height: auto;`,
  },
  "web.telegram.org": {
    autoScan: `false`,
    selector: ".text-content, .embedded-text-wrapper",
    rootsSelector: ".Transition",
  },
  "github.com": {
    autoScan: `false`,
    selector: `h1, h2, h3, h4, h5, h6, .markdown-body li, p, dd, blockquote, figcaption, label, legend, .user-profile-bio>div, [data-testid="results-list"] .search-match, .Subhead-description, [class^="prc-SelectPanel-Subtitle-"], [class^="prc-ActionList-ItemLabel-"], [role="dialog"] .overflow-auto, .h4, .repos-list-description, .discussion-title, [class*="PinnedIssue-module__Link"] span, .js-wiki-sidebar-page-container :is(.Truncate-text, .Link--primary)`,
    ignoreSelector: `button, p.pinned-item-desc+p`,
  },
};

// 格式化 RULES_MAP 为内置规则数组，供扩展初始化或同步逻辑使用
export const BUILTIN_RULES = Object.entries(RULES_MAP).map(
  ([pattern, rule]) => ({
    // ...DEFAULT_RULE,
    ...rule,
    pattern,
  })
);
