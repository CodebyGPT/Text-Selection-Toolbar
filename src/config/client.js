/**
 * @file client.js
 * @description 客户端类型常量定义模块，区分 Web、浏览器扩展（Chrome, Edge, Firefox, Thunderbird）以及油猴脚本（Userscript）环境。
 */

export const CLIENT_WEB = "web"; // 普通 Web 网页端
export const CLIENT_CHROME = "chrome"; // Chrome 扩展程序
export const CLIENT_EDGE = "edge"; // Edge 扩展程序
export const CLIENT_FIREFOX = "firefox"; // Firefox 扩展程序
export const CLIENT_USERSCRIPT = "userscript"; // 油猴脚本 (Greasemonkey / Tampermonkey 等)
export const CLIENT_THUNDERBIRD = "thunderbird"; // Thunderbird 邮件客户端扩展

// 浏览器扩展类客户端的集合
export const CLIENT_EXTS = [
  CLIENT_CHROME,
  CLIENT_EDGE,
  CLIENT_FIREFOX,
  CLIENT_THUNDERBIRD,
];
