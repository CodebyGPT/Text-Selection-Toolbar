/**
 * @file i18n.js
 * @description 国际化本地化字典文件，包含支持的界面语言与多语言文案对照。
 */

import { RU_I18N } from "./i18n.ru";
export const I18N = {
  general: {
    zh: `通用`,
    en: `General`
  },
  translate: {
    zh: `翻译`,
    en: `Translate`
  },
  dictionary: {
    zh: `词典`,
    en: `Dictionary`
  },
  about: {
    zh: `关于`,
    en: `About`
  },
  translate_service_multiple: {
    zh: `翻译服务 (支持多选)`,
    en: `Translation service (multiple supported)`
  },
  tranbox_title: {
    zh: `划词翻译面板（power by KISS Translator）`,
    en: `Selection Translation Panel (power by KISS Translator)`
  },
  choose_service: {
    zh: `选择接口`,
    en: `Choose service`
  },
  from_lang: {
    zh: `原文语言`,
    en: `Source Language`
  },
  to_lang: {
    zh: `目标语言`,
    en: `Target Language`
  },
  to_lang2: {
    zh: `第二目标语言`,
    en: `Target Language 2`
  },
  save: {
    zh: `保存`,
    en: `Save`
  },
  edit: {
    zh: `编辑`,
    en: `Edit`
  },
  cancel: {
    zh: `取消`,
    en: `Cancel`
  },
  delete: {
    zh: `删除`,
    en: `Delete`
  },
  reset: {
    zh: `重置`,
    en: `Reset`
  },
  add: {
    zh: `添加`,
    en: `Add`
  },
  preset_prompt_nobatch_translation_concise: {
    zh: `Concise`,
    en: `Concise`
  },
  preset_prompt_nobatch_translation: {
    zh: `Legacy`,
    en: `Legacy`
  },
  style_none: {
    zh: `无`,
    en: `None`
  },
  marker: {
    zh: `马克笔`,
    en: `Marker`
  },
  highlight: {
    zh: `高亮`,
    en: `Highlight`
  },
  blockquote: {
    zh: `引用`,
    en: `Blockquote`
  },
  gradient: {
    zh: `渐变`,
    en: `Gradient`
  },
  glow: {
    zh: `发光`,
    en: `Glow`
  },
  setting: {
    zh: `设置`,
    en: `Setting`
  },
  pattern: {
    zh: `匹配网址`,
    en: `URL pattern`
  },
  selector: {
    zh: `选择器`,
    en: `Selector`
  },
  terms: {
    zh: `专业术语`,
    en: `Terms`
  },
  import: {
    zh: `导入`,
    en: `Import`
  },
  export: {
    zh: `导出`,
    en: `Export`
  },
  share: {
    zh: `分享`,
    en: `Share`
  },
  help: {
    zh: `求助`,
    en: `Help`
  },
  show: {
    zh: `显示`,
    en: `Show`
  },
  hide: {
    zh: `隐藏`,
    en: `Hide`
  },
  domain: {
    zh: `网域`,
    en: `Domain`
  },
  disable: {
    zh: `禁用`,
    en: `Disable`
  },
  enable: {
    zh: `启用`,
    en: `Enable`
  },
  translated_text: {
    zh: `译文`,
    en: `Translated Text`
  },
  original_text: {
    zh: `原文`,
    en: `Original Text`
  },
  more: {
    zh: `更多`,
    en: `More`
  },
  popup_translating: {
    zh: `正在翻译…`,
    en: `Translating…`
  },
  read_aloud: {
    zh: `朗读`,
    en: `Read aloud`
  },
  copied: {
    zh: `已复制`,
    en: `Copied`
  },
  less: {
    zh: `更少`,
    en: `Less`
  },
  menu_translate_panel: {
    zh: `翻译面板`,
    en: `Translation Panel`
  },
  menu_hide_elements: {
    zh: `隐藏网页元素`,
    en: `Hide Page Elements`
  },
  menu_clear_hidden_rules: {
    zh: `清空该网页的隐藏规则`,
    en: `Clear Hidden Rules for This Page`
  },
  menu_script_settings: {
    zh: `脚本设置`,
    en: `Script Settings`
  },
  menu_check_ascii: {
    zh: `检查选中文本是否含非 ASCII 字符`,
    en: `Check Selected Text for Non-ASCII Characters`
  },
  menu_check_ascii_prompt: {
    zh: `当前没有选中文本，请粘贴要检查的文本：`,
    en: `No text is selected. Paste the text to check:`
  },
  menu_check_ascii_has: {
    zh: `检测结果：选中的文本含非 ASCII 字符。`,
    en: `Result: the selected text contains non-ASCII characters.`
  },
  menu_check_ascii_none: {
    zh: `检测结果：选中的文本不含非 ASCII 字符。`,
    en: `Result: the selected text contains no non-ASCII characters.`
  },
  menu_check_ascii_empty: {
    zh: `没有可检查的文本。`,
    en: `No text to check.`
  },
  field_resize_height: {
    zh: `拖动调整高度`,
    en: `Drag to adjust height`
  },
  // 契约：各语言值须自带前导空格与括号（zh/zh_TW 全角括号无前导空格，
  // 其余半角括号带一个前导空格）。消费方（TextareaResizeGrip）将其与
  // label 无分隔符直连拼接，此处不得改存纯文案，否则 tooltip 粘连。
  field_resize_unlock_hint: {
    zh: `（双击或按 Esc 解锁高度）`,
    en: ` (Double-click or press Esc to unlock height)`
  },
  placeholder: {
    zh: `占位符`,
    en: `Placeholder`
  },
  btn_tip_click_away: {
    zh: `固定弹窗（取消固定后失焦隐藏）`,
    en: `Pin panel (unpin to hide on focus loss)`
  },
  btn_tip_follow_selection: {
    zh: `跟随/固定模式`,
    en: `Follow/Fixed Mode`
  },
  btn_tip_simple_style: {
    zh: `迷你/常规模式`,
    en: `Mini/Regular Mode`
  },
  btn_tip_dark_mode: {
    zh: `亮色/暗色/跟随系统`,
    en: `Light/Dark/Auto`
  },
  detected_lang: {
    zh: `语言检测`,
    en: `Language detection`
  },
  detected_result: {
    zh: `检测结果`,
    en: `Detect result`
  },
  split_disable: {
    zh: `禁用`,
    en: `Disable`
  },
  open_separate_window: {
    zh: `独立窗口打开`,
    en: `Open in Separate Window`
  },
  copy: {
    zh: `复制`,
    en: `Copy`
  },
  copy_success: {
    zh: `已复制`,
    en: `Copied`
  },
  retry: {
    zh: `重试`,
    en: `Retry`
  },
  paste: {
    zh: `黏贴`,
    en: `Paste`
  },
  submit: {
    zh: `提交`,
    en: `Submit`
  },
  collect: {
    zh: `收藏`,
    en: `Save`
  },
  opacity: {
    zh: `透明度`,
    en: `Opacity`
  },
  padding: {
    zh: `内边距`,
    en: `Padding`
  },
  vertical: {
    zh: `上下`,
    en: `Vertical`
  },
  horizontal: {
    zh: `左右`,
    en: `Horizontal`
  },
  close: {
    zh: `关闭`,
    en: `Close`
  },
  popup_text_auth_failed: {
    zh: `请在设置中检查 API Key`,
    en: `Check the API key in settings`
  },
  popup_text_failed: {
    zh: `翻译失败，请重试`,
    en: `Translation failed. Please try again.`
  },
  popup_text_request_failed: {
    zh: `请求失败（{status}）`,
    en: `Request failed ({status})`
  },
  popup_text_result_empty: {
    zh: `译文将在这里显示`,
    en: `Translation will appear here.`
  },
};

// Merge Russian translations after registering all labels, including M3 settings.
// Fall back to English for labels without a Russian translation.
Object.keys(I18N).forEach(key => {
  I18N[key].ru = RU_I18N[key] ?? I18N[key].ru ?? I18N[key].en;
});
// "auto" follows the browser UI language; the rest of the app uses uiLang raw.
export const resolveUiLang = lang => {
  if (lang && lang !== "auto") return lang;
  const nav = String(globalThis.navigator?.language || "").toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ru")) return "ru";
  return "en";
};
export const newI18n = lang => {
  const l = resolveUiLang(lang);
  return (key, defaultText = key) => I18N[key]?.[l] ?? defaultText;
};
