import { useCallback } from "react";
import { useSetting } from "./Setting";
import { I18N, URL_RAW_PREFIX } from "../config";
import { resolveUiLang } from "../config/i18n";
import { useGet } from "./Fetch";

/**
 * 获取多语言文本的工具函数
 * @param {string} uiLang 当前界面语言 (如 'zh-CN', 'en')
 * @param {string} key 翻译键名
 * @param {string} defaultText 默认备用文本，缺少时使用 key
 * @returns {string} 本地化后的文本
 */
export const getI18n = (uiLang, key, defaultText = key) => {
  return I18N?.[key]?.[resolveUiLang(uiLang)] ?? defaultText;
};

// Bind the language and keep the lookup function stable until uiLang changes.
// Consumers use it in memo and callback dependencies, so a new identity on every
// render would invalidate their caches.
export const useLangMap = (uiLang) => {
  return useCallback(
    (key, defaultText = key) => getI18n(uiLang, key, defaultText),
    [uiLang]
  );
};

/**
 * 界面多语言本地化的自定义 Hook
 * @returns {function} i18n(key, defaultText) 翻译函数
 */
export const useI18n = () => {
  const {
    setting: { uiLang },
  } = useSetting();
  return useLangMap(uiLang);
};
