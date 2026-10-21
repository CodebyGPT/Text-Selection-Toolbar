import { RU } from "./ru";

const EN = {
  "系统提示词": "System prompt",
  "用户提示词": "User prompt",
  "请求钩子": "Request hook",
  "响应钩子": "Response hook",
  "温度": "Temperature",
  "最大 Token 数": "Max tokens",
  "预设": "Preset",
  "展开": "Expand",
  "收起": "Collapse",
  "启用": "Enabled",
  "禁用": "Disabled",
  "展开/收起": "Expand/Collapse",
  "支持用英文逗号“,”分隔，轮询调用":
    'Supports polling calls separated by English commas ",".',
  "已修改": "Modified",
  "重置": "Reset",
  "思考模式": "Thinking mode",
  "流式渲染模式": "Stream render mode",
  "触发方式": "Trigger",
  "聚合翻译提示词": "Batch translation prompt",
  "单句翻译提示词": "Single-sentence translation prompt",
  "字幕翻译提示词": "Subtitle translation prompt",
  "+ 添加自定义接口": "Add custom API",
  "自定义接口": "Custom API",
  "聚合发送翻译请求": "Batch requests",
  "显示网页自带划词栏隐藏工具": "Show page toolbar hiding tools",
  "显示网页编辑工具": "Show page editing tool",
  "此选项仅影响功能入口的可见性，不会清空或禁用现存规则": "This only hides the menu entry; saved rules stay active",
  "关闭设置": "Close settings",
  "功能开关": "Feature switches",
  "当选取的文本不含中文时调用备选搜索引擎": "Use the fallback engine when the selected text has no Chinese",
  "备选搜索引擎": "Fallback search engine",
  "首选搜索引擎": "Preferred search engine",
  "界面主题": "Interface theme",
  "0 表示不自动消失": "0 = never auto-hide",
  "不启用": "Disabled",
  "不显示": "Hidden",
  "仅移动端": "Mobile only",
  "仅视口内重绘": "Repaint in viewport only",
  "偏移量 (px)": "Offset (px)",
  "停留时长 (ms)": "Display time (ms)",
  "全局：忽略选择器": "Global: ignore selector",
  "全局：根节点选择器": "Global: root selector",
  "全局：源语言": "Global: source language",
  "全局：目标语言": "Global: target language",
  "全局：翻译元素选择器": "Global: translate selector",
  "全局：翻译接口": "Global: translation API",
  "全局：自动开启翻译": "Global: auto-start translation",
  "关闭": "Off",
  "关闭后减少启动开销": "Reduces startup overhead",
  "分块长度": "Chunk length",
  "单词": "Word",
  "原文在前": "Original first",
  "双语插入页面": "Insert bilingual text",
  "双语显示": "Bilingual display",
  "同步": "Sync",
  "同步地址": "Sync URL",
  "同步方式": "Sync method",
  "启用字幕翻译": "Enable subtitle translation",
  "启用输入框翻译": "Enable input-box translation",
  "启用鼠标悬停翻译": "Enable hover translation",
  "图标显示": "Icon visibility",
  "失焦自动隐藏": "Hide on blur",
  "如 ControlLeft": "e.g. ControlLeft",
  "如 ControlLeft / AltLeft / ShiftLeft，留空禁用": "e.g. ControlLeft / AltLeft / ShiftLeft; empty disables",
  "始终显示": "Always visible",
  "字幕列表": "Subtitle list",
  "字幕悬浮查词": "Subtitle hover lookup",
  "字幕翻译": "Subtitle translation",
  "密码 / Token": "Password / Token",
  "展示方式": "Display mode",
  "工具栏外观": "Toolbar appearance",
  "开启": "On",
  "弹出位置": "Popup position",
  "强制浅色按钮": "Force light toolbar",
  "当前区域": "Current region",
  "当前段落": "Current paragraph",
  "悬浮气泡": "Floating bubble",
  "打开页面时预初始化": "Pre-initialize on page open",
  "按住时长 (ms)": "Hold duration (ms)",
  "按住翻译范围": "Hold-to-translate scope",
  "按住译文显示": "Hold translation display",
  "按钮布局": "Button layout",
  "提前翻译 (ms)": "Pre-translate (ms)",
  "提示词": "Prompts",
  "搜索": "Search",
  "操作反馈": "Action feedback",
  "数据同步": "Data sync",
  "整篇区域": "Whole area",
  "断句方式": "Sentence splitting",
  "日本語": "Japanese",
  "显示删除按钮": "Show delete button",
  "显示翻译按钮": "Show translate button",
  "CJK 文本隐藏翻译阈值 (%)": "Hide translate button for CJK text (%)",
  "当前语言为中文/日文/韩文时，选中文本的 CJK 字符占比超过该值就隐藏翻译按钮；0=含任意 CJK 字符即隐藏，100=始终显示": "When the interface language is Chinese, Japanese, or Korean, hide the translate button once the CJK character share of the selection exceeds this value; 0 = any CJK character hides it, 100 = always show",
  "显示顺序": "Display order",
  "极简样式": "Minimal style",
  "模糊译文": "Blur translation",
  "横排胶囊": "Horizontal capsule",
  "每行一个域名或匹配模式": "One domain or pattern per line",
  "气泡样式": "Bubble style",
  "浅色": "Light",
  "测试中…": "Testing…",
  "测试接口": "Test API",
  "获取模型中…": "Fetching models…",
  "未找到模型，可手动输入。": "No models found. You can enter one manually.",
  "深色": "Dark",
  "源语言": "Source language",
  "滚动即隐藏": "Hide on scroll",
  "滚动时": "On scroll",
  "独立成块": "As a block",
  "生词本": "Vocabulary",
  "生词本已保存": "Vocabulary saved",
  "用 %s 代替关键词": "Use %s for the query",
  "用于反向互译": "For reverse translation",
  "用户名": "Username",
  "界面": "Interface",
  "界面语言": "Interface language",
  "目标语言": "Target language",
  "移动端关闭": "Off on mobile",
  "端到端加密口令": "End-to-end encryption key",
  "第二目标语言": "Second target language",
  "简体中文": "Simplified Chinese",
  "繁體中文": "Traditional Chinese",
  "纯英文时使用备用引擎": "Use fallback engine for English text",
  "纵排矩形": "Vertical rectangle",
  "统计断句": "Statistical splitting",
  "继承": "Inherit",
  "网页翻译规则": "Web page translation rules",
  "网页翻译": "Web page translation",
  "提示词管理": "Prompt management",
  "关于": "About",
  "版本号": "Version",
  "主页": "Homepage",
  "许可证": "License",
  "网页规则已保存": "Web rules saved",
  "翻译": "Translation",
  "翻译接口": "Translation API",
  "翻译面板": "Translation panel",
  "自动检测": "Auto detect",
  "自动翻译": "Auto translate",
  "自定义": "Custom",
  "自定义 URL": "Custom URL",
  "行内显示": "Inline",
  "规则已保存": "Rules saved",
  "规则断句": "Rule-based splitting",
  "触发按键": "Trigger key",
  "触发符号": "Trigger symbol",
  "设置已保存": "Settings saved",
  "译文在前": "Translation first",
  "译文样式": "Translation styles",
  "调用 KISS 翻译面板": "Open the KISS translation panel",
  "超级取词键": "Super-selection key",
  "跟随系统": "Follow system",
  "跟随网页规则": "Follow page rule",
  "跟随选区": "Follow selection",
  "跟随重绘": "Repaint with selection",
  "跟随页面": "Follow page",
  "跳过广告": "Skip ads",
  "输入框翻译": "Input-box translation",
  "选中即缓存": "Cache on selection",
  "选区字符末尾": "End of selection",
  "逗号分隔，如 xyz, shop": "Comma separated, e.g. xyz, shop",
  "通用": "General",
  "释义": "Definition",
  "链接拖拽预览": "Link drag preview",
  "长句阈值": "Long sentence threshold",
  "闪电粘贴": "Smart paste",
  "阻止点击跳转": "Prevent link navigation",
  "高级": "Advanced",
  "高级设置（JSON）": "Advanced settings (JSON)",
  "黑名单": "Blacklist",
  "鼠标位置": "Mouse position",
  "鼠标悬停翻译": "Hover translation",
  "删除": "Delete",
  "还原": "Restore",
  "添加 Custom": "Add Custom",
  "测试中…": "Testing…",
  "测试接口": "Test API",
  "保存设置 JSON": "Save settings JSON",
  "保存规则 JSON": "Save rules JSON",
  "保存生词本 JSON": "Save vocabulary JSON",
  "+ 添加自定义规则": "+ Add custom rule",
  "保存网页规则": "Save web rules",
  "+ 添加自定义提示词": "+ Add custom prompt",
  "+ 添加自定义样式": "+ Add custom style",
  "+ 添加生词": "+ Add word",
  "单词": "Word",
  "释义": "Definition",
  "全局：翻译接口": "Global: translation API",
  "全局：源语言": "Global: source language",
  "全局：目标语言": "Global: target language",
  "全局：自动开启翻译": "Global: auto-start translation",
  "全局：翻译元素选择器": "Global: translate selector",
  "全局：忽略选择器": "Global: ignore selector",
  "全局：根节点选择器": "Global: root selector",
  "网址匹配": "URL pattern",
  "翻译元素选择器": "Translate selector",
  "忽略选择器": "Ignore selector",
  "自动翻译": "Auto translate",
  "自定义规则": "Custom rule",
  "System Prompt": "System Prompt",
  "User Prompt": "User Prompt",
  "名称": "Name",
  "网址匹配": "URL pattern",
};

const originals = new WeakMap();
const attrOriginals = new WeakMap();

function translate(value, lang) {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (String(lang || "").startsWith("zh")) {
    return value;
  }
  const translated = (lang === "ru" ? RU[trimmed] : EN[trimmed]) || EN[trimmed];
  if (!translated) return value;
  return value.replace(trimmed, translated);
}

function translateNode(node, lang) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    const original = originals.get(node);
    const next = translate(original, lang);
    if (node.nodeValue !== next) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  for (const attr of ["placeholder", "title", "aria-label"]) {
    if (!node.hasAttribute(attr)) continue;
    let map = attrOriginals.get(node);
    if (!map) {
      map = {};
      attrOriginals.set(node, map);
    }
    if (!(attr in map)) map[attr] = node.getAttribute(attr);
    const next = translate(map[attr], lang);
    if (node.getAttribute(attr) !== next) node.setAttribute(attr, next);
  }
  for (const child of node.childNodes) translateNode(child, lang);
}

export function translateDom(root, lang) {
  if (!root) return () => {};
  if (lang === "auto") {
    const nav = String(globalThis.navigator?.language || "").toLowerCase();
    lang = nav.startsWith("ru") ? "ru" : nav.startsWith("zh") ? "zh" : "en";
  }
  let applying = false;
  const run = () => {
    if (applying) return;
    applying = true;
    try {
      translateNode(root, lang);
    } finally {
      applying = false;
    }
  };
  run();
  const observer = new MutationObserver(run);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
  return () => observer.disconnect();
}
