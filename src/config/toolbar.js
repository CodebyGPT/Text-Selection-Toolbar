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
  enableToast: true,
  enableCache: true,
  unlockHotkey: "ControlLeft",
  enablePaste: true,
  showPastePreview: false,
  pasteTtl: PASTE_TTL_DEFAULT,
  enableDragPreview: false,
  scrollRepaintMode: "always",
  smartEngine: false,
  fallbackEngine: "bing",
  enableDeleteBtn: true,
  enableTranslate: true,
  translateHideThreshold: 15,
  showBlockMenu: true,
  showEditMenu: true,
};

export const TOOLBAR_SEARCH_ENGINES = {
  google: { name: "Google", url: "https://www.google.com/search?q=%s" },
  baidu: { name: "Baidu", url: "https://www.baidu.com/s?wd=%s" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=%s" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=%s" },
};

export const TOOLBAR_SCROLL_REPAINT_MODES = ["always", "viewport", "hide"];
