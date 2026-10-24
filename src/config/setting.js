/**
 * @file setting.js
 * @description 应用默认全局设置定义模块。
 * KISS 侧只保留工具栏翻译面板所需的配置；网页翻译、字幕、输入框、
 * 悬浮翻译、生词本等功能的默认值已随功能一起移除。
 */

import { LogLevel } from "../libs/log";
import { OPT_TRANS_TRANSLATOR_API } from "./api";
import { DEFAULT_TOOLBAR_SETTING } from "./toolbar";
import { CURRENT_SETTINGS_VERSION } from "./prompt";
import { defaultServices } from "./defaultServices";

// --- 配置同步设置（仅保留存储结构，同步入口已移除） ---
export const DEFAULT_SYNC = {
  syncType: "KISS-Worker",
  syncUrl: "",
  syncUser: "",
  syncKey: "",
  syncEncryptKey: "",
  syncMeta: {},
  subRulesSyncAt: 0,
  dataCaches: {},
};

// --- 划词翻译面板配置（由工具栏翻译按钮打开） ---
export const DEFAULT_TRANBOX_SETTING = {
  transOpen: false, // 划词 UI 由 Text Selection Toolbar 承担
  apiSlugs: [OPT_TRANS_TRANSLATOR_API], // 启用的翻译 API
  fromLang: "auto",
  toLang: "zh-CN",
  toLang2: "en", // 第二目标语言，用于自动反向互译
  promptSlug: "", // 面板提示词，默认为空（跟随接口）
  ttsApiSlug: "", // 云端朗读服务；空字符串使用系统朗读
  boxOffsetX: 0, // 翻译结果框的横向偏移像素
  boxOffsetY: 10, // 翻译结果框的纵向偏移像素
  hideClickAway: false, // 失焦后是否隐藏面板（false 表示固定）
  simpleStyle: false, // 是否启用极简无边框设计风格
  followSelection: false, // 翻译结果框位置是否贴紧选中文本中心
  autoHeight: false, // 翻译结果框高度是否自适应内容长度
  singleWordNoTrans: false, // 单词只显示词典结果、不走翻译接口
};

// --- 全局默认设置对象，存储于 local storage ---
export const DEFAULT_SETTING = {
  version: CURRENT_SETTINGS_VERSION,
  toolbarSetting: DEFAULT_TOOLBAR_SETTING,
  // 输入框拉伸手柄样式（14 选 1，见 StylesSetting 页说明）
  textareaGripStyle: "concentric-smooth",
  darkMode: "auto", // 主题外观模式 ("light" 浅色, "dark" 深色, "auto" 跟随浏览器系统)
  uiLang: "auto", // 界面语言 ("auto" 跟随系统)
  transApis: defaultServices(), // 新装及重置使用的服务实例
  prompts: [], // 用户自定义提示词；预设提示词由 config/prompt.js 提供，不写入本地配置
  shortcuts: {}, // KISS 原版快捷键已移除；工具栏超级取词键在 toolbarSetting
  tranboxSetting: DEFAULT_TRANBOX_SETTING, // 划词翻译面板配置
  translateVariants: true, // 是否继续翻译同一语言的不同变体（如简体中文与繁体中文）
  parseLatex: false, // 是否将译文中的行内 LaTeX 公式转换为可读的 Unicode 文本
  langDetector: "-", // 主动检测源语言的外部 API 服务选择 ("-" 表示由翻译 API 本身自动判定)
  logLevel: LogLevel.INFO.value, // 扩展运行时的全局调试日志级别
};
