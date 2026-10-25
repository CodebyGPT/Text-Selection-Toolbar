import { browser } from "./browser";

const sendMessage = (tabId, message, options) => {
  const sendPromise = options
    ? browser.tabs.sendMessage(tabId, message, options)
    : browser.tabs.sendMessage(tabId, message);
  return sendPromise.catch((err) => {
    if (
      err?.message?.includes("Could not establish connection") ||
      err?.message?.includes("Receiving end does not exist")
    ) {
      return;
    }
    throw err;
  });
};

/**
 * 向扩展后台 Service Worker (Background) 发送单向或双向消息。
 * REVIEW: 该方法依赖 `browser?.runtime` API，只能在浏览器扩展环境（Content Script, Popup, Options 等）下工作。
 * 在油猴 Userscript 环境中不可使用（油猴需使用特定 GM 接口或 CustomEvent 传递信息）。
 * @param {string} action 指令动作名称
 * @param {Object} args 指令参数数据
 * @returns {Promise<*>} 后台响应的数据
 */
export const sendBgMsg = (action, args) =>
  browser?.runtime.sendMessage({ action, args });
