const globals = require("globals");
const userscripts = require("eslint-plugin-userscripts");

// 模块间通过全局变量共享的标识符
const crossModuleGlobals = {
  // 01-compat.js
  safeGetValue: "readonly",
  safeSetValue: "readonly",
  safeOpenTab: "readonly",
  // 19-bootstrap.js (动态 visibilitychange)
  registerVisibilityCleanup: "readonly",
  unregisterVisibilityCleanup: "readonly",
  // 02-config.js
  DEFAULT_CONFIG: "readonly",
  SCROLL_REPAINT_MODE: "readonly",
  PASTE_MODE_THREE_BTNS: "readonly",
  SEARCH_ENGINES: "readonly",
  PAN_DOMAINS: "readonly",
  TLD_SET: "readonly",
  TLD_SET_EXTENDED: "readonly",
  sessionPanCode: "writable",
  PAN_CODE_MAX_AGE: "readonly",
  cleanExpiredPanEntries: "readonly",
  cachedSelection: "writable",
  uiTimer: "writable",
  toastTimer: "writable",
  isScrolling: "writable",
  scrollTimeout: "writable",
  shadowRoot: "writable",
  hostElement: "writable",
  configCache: "writable",
  getConfig: "readonly",
  setConfig: "readonly",
  // 03-i18n.js
  I18N: "readonly",
  t: "readonly",
  // 04-compliance.js
  isEditMode: "writable",
  isInEditable: "readonly",
  setComplianceBanner: "readonly",
  toggleEditMode: "readonly",
  // 05-menu.js
  initConfiguration: "readonly",
  initDefaultSearchEngine: "readonly",
  registerMenus: "readonly",
  // 06-extractors.js
  extractLinkAndCode: "readonly",
  extractUrlsFromText: "readonly",
  extractEmailFromText: "readonly",
  getEffectiveTLDs: "readonly",
  extractPanUrlId: "readonly",
  // 07-selection.js
  getAnchorPosition: "readonly",
  getSelectionCoords: "readonly",
  getSmartSelectionState: "readonly",
  // 08-shadow-dom.js
  initContainer: "readonly",
  // 09-drag-preview.js
  PREVIEW_WIN_NAME: "readonly",
  handleLinkDragStart: "readonly",
  handleLinkDragEnd: "readonly",
  // 10-unlock-mode.js
  isUnlockMode: "writable",
  // 11-clipboard.js
  copyToClipboard: "readonly",
  cutToClipboard: "readonly",
  pasteFromCache: "readonly",
  showToast: "readonly",
  performPaste: "readonly",
  // 12-theme.js
  detectBackgroundBrightness: "readonly",
  getTheme: "readonly",
  getBestContrastTheme: "readonly",
  // 13-renderer.js
  renderButton: "readonly",
  renderButtons: "readonly",
  hideUI: "readonly",
  // 14-events.js
  handleSelectionMouseUp: "readonly",
  handleInputPasteMouseUp: "readonly",
  handleGlobalMouseDown: "readonly",
  handleContextMenu: "readonly",
  handleResizeOrScroll: "readonly",
  handleKeydownHideUI: "readonly",
  // 15-text-correct.js
  smartCorrectText: "readonly",
  handleTextCorrection: "readonly",
  // 16-blocker.js
  activateElementPicker: "readonly",
  applySavedBlockingRules: "readonly",
  // 17-festival.js
  getSpringFestivalToastText: "readonly",
  triggerSpringFestivalEffect: "readonly",
};

module.exports = [
  // UserScript 模块 (00-19)
  {
    files: ["modules/0*.js", "modules/1*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.greasemonkey,
        GM: "readonly",
        GM_getValue: "readonly",
        GM_setValue: "readonly",
        GM_openInTab: "readonly",
        GM_registerMenuCommand: "readonly",
        GM_unregisterMenuCommand: "readonly",
        GM_getTab: "readonly",
        GM_addStyle: "readonly",
        GM_notification: "readonly",
        GM_setClipboard: "readonly",
        GM_xmlhttpRequest: "readonly",
        unsafeWindow: "readonly",
        ...crossModuleGlobals
      }
    },
    plugins: {
      userscripts
    },
    rules: {
      // 原有的合理规则
      "no-var": "off",
      "no-redeclare": "off",
      "prefer-const": "warn",
      "eqeqeq": ["warn", "smart"],

      // === 可导致运行时错误的规则 (error) ===
      "constructor-super": "error",
      "for-direction": "error",
      "getter-return": "error",
      "no-async-promise-executor": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-condition": "error",
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-ex-assign": "error",
      "no-extra-boolean-cast": "error",
      "no-fallthrough": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-inner-declarations": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-mixed-spaces-and-tabs": "error",
      "no-new-symbol": "error",
      "no-nonoctal-decimal-escape": "error",
      "no-obj-calls": "error",
      "no-octal": "error",
      "no-prototype-builtins": "error",
      "no-regex-spaces": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-this-before-super": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-useless-backreference": "error",
      "no-useless-catch": "error",
      "no-useless-escape": "error",
      "no-with": "error",
      "require-yield": "error",
      "use-isnan": "error",
      "valid-typeof": "error",

      // === 代码质量警告 (warn) ===
      "no-empty": "warn",
      "no-extra-semi": "warn",
      "no-undef": "warn",
      "no-unused-labels": "warn",
      "no-unused-vars": "warn",

      // === userscripts 元数据规则 ===
      "userscripts/filename-user": "off",
      "userscripts/no-invalid-metadata": "off",
      "userscripts/require-name": ["error", "required"],
      "userscripts/require-description": ["error", "required"],
      "userscripts/require-version": ["error", "required"],
      "userscripts/require-attribute-space-prefix": "error",
      "userscripts/use-homepage-and-url": "error",
      "userscripts/require-download-url": "warn",
      "userscripts/align-attributes": ["warn", 2],
      "userscripts/metadata-spacing": "error",
      "userscripts/no-invalid-headers": "error",
      "userscripts/no-invalid-grant": "error",
      "userscripts/compat-grant": "off",
      "userscripts/compat-headers": "off",
      "userscripts/better-use-match": "warn"
    }
  },
  // Node.js 构建脚本 (build.js)
  {
    files: ["modules/build.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-empty": "warn",
      "prefer-const": "warn"
    }
  },
  // 忽略构建产物
  {
    ignores: [
      "main.user.js",
      "main.min.user.js",
      "main.meta.js",
      "node_modules/**",
      "PoC/**",
      "docs/**"
    ]
  }
];
