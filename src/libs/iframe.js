/**
 * 判定当前脚本是否运行在 Iframe 嵌套子页面中。
 */
export const isIframe = window.self !== window.top;
