// Canonical defaults for the ported Text Selection Toolbar.
// Keep in sync with src/toolbar/modules/02-config.js.
export const PASTE_TTL_DEFAULT = 8;
export const PASTE_TTL_MIN = 3;
export const PASTE_TTL_MAX = 30;

export const DEFAULT_TOOLBAR_SETTING = {
  language: "auto",
  offset: 12,
  timeout: 2400,
  buttonStyle: "row",
  forceWhiteBlack: true,
  searchEngine: "baidu",
  searchEngines: [],
  enableHiddenLinks: true,
  unlockHotkey: "ControlLeft",
  enablePaste: true,
  showPastePreview: false,
  pasteTtl: PASTE_TTL_DEFAULT,
  enableDragPreview: false,
  scrollRepaintMode: "always",
  disableFestivalEffect: false,
  enableTranslate: true,
  translateHideThreshold: 15,
  showBlockMenu: true,
  showTranslateMenu: true,
  menuOrder: ["translate", "block", "settings"],
};

export const TOOLBAR_MENU_ORDER_DEFAULT = [
  "translate",
  "block",
  "settings",
];

/** Keep saved orders stable and append newly introduced menu items. */
export function normalizeToolbarMenuOrder(order) {
  const known = new Set(TOOLBAR_MENU_ORDER_DEFAULT);
  const result = [];
  (Array.isArray(order) ? order : []).forEach((id) => {
    if (known.has(id) && !result.includes(id)) result.push(id);
  });
  TOOLBAR_MENU_ORDER_DEFAULT.forEach((id) => {
    if (!result.includes(id)) result.push(id);
  });
  return result;
}

export const TOOLBAR_SEARCH_ENGINES = {
  google: { name: "Google", url: "https://www.google.com/search?q=%s" },
  baidu: { name: "Baidu", url: "https://www.baidu.com/s?wd=%s" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=%s" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=%s" },
};

export const TOOLBAR_SCROLL_REPAINT_MODES = ["always", "viewport", "hide"];
