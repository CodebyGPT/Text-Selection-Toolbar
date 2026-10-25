/**
 * @file app.js
 * @description 定义应用的基本信息与全局 UI 常量，例如 DOM 注入元素的 ID、版本解析以及主题名称。
 */

// 统一格式化应用名称，将空格替换为 "-"
export const APP_NAME = process.env.REACT_APP_NAME.trim()
  .split(/\s+/)
  .join("-");
export const APP_LCNAME = APP_NAME.toLowerCase();

// 当前应用的版本，按点号拆分成数组 (例如: "1.0.2" -> ["1", "0", "2"])
export const APP_VERSION = process.env.REACT_APP_VERSION.split(".");

// 主题模式常量
export const THEME_LIGHT = "light"; // 浅色模式
export const THEME_DARK = "dark"; // 深色模式
