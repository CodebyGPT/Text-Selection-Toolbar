import { getSettingWithDefault } from "./libs/storage";
import { logger } from "./libs/log";
import { newI18n, isExternalApi } from "./config";
import {
  DEFAULT_TOOLBAR_SETTING,
  normalizeToolbarMenuOrder,
} from "./config/toolbar";
import { invokeExternalApi } from "./libs/externalTranslate";
import {
  installToolbar,
  showToolbarToast,
  toggleEditPageMenu,
  activateHideElementsMenu,
  clearPageBlockRulesMenu,
  waitForToolbarReady,
} from "./toolbar";

/**
 * 建立旧式 GM_* API 到现代 GM 对象的兼容垫片。
 * 必须在任何 storage 访问前执行，避免旧油猴环境在数据迁移阶段缺少 GM。
 */
function ensureUserscriptGM() {
  globalThis.GM = globalThis.GM || {};

  globalThis.GM.xmlHttpRequest =
    globalThis.GM.xmlHttpRequest || globalThis.GM_xmlhttpRequest;
  globalThis.GM.registerMenuCommand =
    globalThis.GM.registerMenuCommand || globalThis.GM_registerMenuCommand;
  globalThis.GM.unregisterMenuCommand =
    globalThis.GM.unregisterMenuCommand || globalThis.GM_unregisterMenuCommand;
  globalThis.GM.setValue = globalThis.GM.setValue || globalThis.GM_setValue;
  globalThis.GM.getValue = globalThis.GM.getValue || globalThis.GM_getValue;
  globalThis.GM.deleteValue =
    globalThis.GM.deleteValue || globalThis.GM_deleteValue;
  globalThis.GM.addValueChangeListener =
    globalThis.GM.addValueChangeListener ||
    globalThis.GM_addValueChangeListener;
  globalThis.GM.removeValueChangeListener =
    globalThis.GM.removeValueChangeListener ||
    globalThis.GM_removeValueChangeListener;
  globalThis.GM.info = globalThis.GM.info || globalThis.GM_info;
}

/**
 * 在页面顶部弹出一个悬浮的红色错误提示 Banner 框，持续 10 秒后自动淡出。
 * @param {string} message 错误内容信息
 */
function showErr(message) {
  const bannerId = "text-selection-toolbar-message";
  const existingBanner = document.getElementById(bannerId);
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement("div");
  banner.id = bannerId;

  // 设置 Banner 绝对定位和高 z-index，保证提示在前台可见
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    backgroundColor: "#f44336",
    color: "white",
    textAlign: "center",
    padding: "8px 16px",
    zIndex: "1001",
    boxSizing: "border-box",
    fontSize: "16px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  });

  const closeButton = document.createElement("span");
  closeButton.textContent = "×";

  Object.assign(closeButton.style, {
    position: "absolute",
    top: "50%",
    right: "20px",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "22px",
    fontWeight: "bold",
  });

  const messageText = document.createTextNode(`Text Selection Toolbar: ${message}`);
  banner.appendChild(messageText);
  banner.appendChild(closeButton);

  const root = document.body || document.documentElement;
  if (!root) return;
  root.appendChild(banner);

  // 渐隐淡出效果
  const removeBanner = () => {
    banner.style.transition = "opacity 0.5s ease";
    banner.style.opacity = "0";
    setTimeout(() => {
      if (banner && banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 500);
  };

  closeButton.onclick = removeBanner;
  setTimeout(removeBanner, 10000); // 10秒后自动消失
}

/** Open the local settings overlay; loaded lazily to keep page startup cheap. */
function openSettings(path) {
  import("./settings")
    .then(({ openSettings: open }) => open(path))
    .catch((err) => console.error("[Text Selection Toolbar]", err));
}

/** Open a blank translation panel for manual input. */
function openTranslatePanel() {
  import("./libs/translationPanel")
    .then(({ showTranslationPanel }) => showTranslationPanel("", null))
    .catch((err) => console.error("[Text Selection Toolbar]", err));
}

/**
 * Register the userscript-manager menu entries in the order chosen in
 * Settings → General → Menu Management. Disabled entries are not registered.
 */
function registerMenus(setting) {
  if (!globalThis.GM?.registerMenuCommand) return;
  if (window.top !== window) return;

  const toolbarSetting = {
    ...DEFAULT_TOOLBAR_SETTING,
    ...(setting.toolbarSetting || {}),
  };
  const i18n = newI18n(setting.uiLang || "zh");

  const items = {
    translate: {
      label: i18n("menu_translate_panel", "翻译面板"),
      enabled: toolbarSetting.showTranslateMenu !== false,
      action: openTranslatePanel,
    },
    edit: {
      label: i18n("menu_edit_page", "编辑网页"),
      enabled: toolbarSetting.showEditMenu !== false,
      action: toggleEditPageMenu,
    },
    block: {
      label: i18n("menu_hide_elements", "隐藏网页元素"),
      enabled: toolbarSetting.showBlockMenu !== false,
      action: activateHideElementsMenu,
    },
    clear: {
      label: i18n("menu_clear_hidden_rules", "清空该网页的隐藏规则"),
      // Clearing rules belongs to the hide-elements tool and is only shown
      // while that tool is enabled; it is not a standalone menu-management row.
      enabled: toolbarSetting.showBlockMenu !== false,
      action: clearPageBlockRulesMenu,
    },
    settings: {
      label: i18n("menu_script_settings", "脚本设置"),
      enabled: true,
      action: () => openSettings(),
    },
  };

  normalizeToolbarMenuOrder(toolbarSetting.menuOrder).forEach((id) => {
    const item = items[id];
    if (!item?.enabled) return;
    globalThis.GM.registerMenuCommand(item.label, item.action);
    // The clear action always follows the hide-elements entry.
    if (id === "block" && items.clear.enabled) {
      globalThis.GM.registerMenuCommand(
        items.clear.label,
        items.clear.action
      );
    }
  });
}

/**
 * 前端翻译器的核心运行总入口。
 * KISS 侧只保留工具栏翻译按钮弹出的翻译面板；其余翻译功能均已移除。
 * @param {boolean} isUserscript 是否作为油猴 Userscript 脚本模式运行 (false 代表作为浏览器 Extension 运行)
 */
export async function run(isUserscript = false) {
  try {
    if (isUserscript) {
      ensureUserscriptGM();

      // 0. 执行核心数据迁移 (针对油猴等无后台更新事件的场景)
      const { runDataMigration } = await import("./libs/storage");
      await runDataMigration();
    }

    // 1. 加载本地设置
    const setting = await getSettingWithDefault();

    // 2. 初始化全局日志配置
    logger.setLevel(setting.logLevel);

    // 3. 页面类型拦截：若是 PDF / 图片 / 音视频等非 HTML 或纯文本媒体页面，则终止执行，避免注入多余 DOM
    const contentType = document?.contentType?.toLowerCase() || "";
    const isPdfDocument = contentType.includes("application/pdf");
    if (
      !contentType.includes("text") &&
      !contentType.includes("html") &&
      !isPdfDocument
    ) {
      logger.info("Skip running in document content type: ", contentType);
      return;
    }

    // 4. 只启动划词工具栏；工具栏的翻译按钮是翻译面板唯一入口。
    //    It keeps its own Shadow DOM and only creates UI after a selection,
    //    so startup stays cheap.
    installToolbar({
      openSettings,
      translateSelection: async (text, rect) => {
        try {
          const current = await getSettingWithDefault();
          const apiSlug = (current.tranboxSetting?.apiSlugs || [])[0];
          const api = (current.transApis || []).find(
            (item) => item.apiSlug === apiSlug && !item.isDisabled
          );

          if (isExternalApi(api)) {
            try {
              // External services hand the text to another application and
              // show the translation in their own window. Success is silent.
              await invokeExternalApi(api, text);
            } catch (err) {
              const message = err?.message || "外部翻译接口调用失败。";
              if (!showToolbarToast(message, 3200)) showErr(message);
            }
            return;
          }
        } catch (err) {
          console.error("[Text Selection Toolbar] resolve API failed", err);
        }

        import("./libs/translationPanel")
          .then(({ showTranslationPanel }) => showTranslationPanel(text, rect))
          .catch((err) => console.error("[Text Selection Toolbar]", err));
      },
    });

    // 5. 按用户在“菜单管理”中设置的顺序注册油猴菜单。
    if (isUserscript) {
      await waitForToolbarReady();
      registerMenus(setting);
    }
  } catch (err) {
    console.error("[Text Selection Toolbar]", err);
    showErr(err.message); // 向前台页面绘制报错 Banner，便于用户感知与排查问题
  }
}
