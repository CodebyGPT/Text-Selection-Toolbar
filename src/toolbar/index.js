import { getSettingWithDefault, putSetting, storage } from "../libs/storage";
import { quickDetectLang, countScriptChars } from "../libs/detectFast";
import { installTextSelectionToolbar } from "./generated";

// Lightning paste hands off between tabs, so its cache must use the shared
// GM/extension storage. A per-tab Map silently breaks the cross-tab case.
const TRANSIENT_KEYS = new Set(["smart_paste_cache"]);
const TRANSIENT_KEY_PREFIX = "kiss_toolbar_";
let writeQueue = Promise.resolve();
let readPromise = null;

function readToolbarSetting() {
  if (!readPromise) {
    readPromise = getSettingWithDefault().then(
      (setting) => setting?.toolbarSetting || {}
    );
    // Share the read across the parallel startup burst, then allow refresh.
    readPromise.finally(() => {
      setTimeout(() => {
        readPromise = null;
      }, 0);
    });
  }
  return readPromise;
}

export async function getToolbarValue(key, fallback) {
  if (TRANSIENT_KEYS.has(key)) {
    return (await storage.getObj(TRANSIENT_KEY_PREFIX + key)) ?? fallback;
  }
  const toolbar = await readToolbarSetting();
  return Object.prototype.hasOwnProperty.call(toolbar, key)
    ? toolbar[key]
    : fallback;
}

export function setToolbarValue(key, value) {
  if (TRANSIENT_KEYS.has(key)) {
    return storage.setObj(TRANSIENT_KEY_PREFIX + key, value);
  }
  writeQueue = writeQueue.then(async () => {
    readPromise = null;
    const setting = await getSettingWithDefault();
    await putSetting({
      ...setting,
      toolbarSetting: {
        ...(setting?.toolbarSetting || {}),
        [key]: value,
      },
    });
  });
  return writeQueue;
}

let installed = false;
let toolbarApi = null;

export function installToolbar({ openSettings, translateSelection } = {}) {
  if (installed) return toolbarApi;
  installed = true;
  toolbarApi = installTextSelectionToolbar({
    getValue: getToolbarValue,
    setValue: setToolbarValue,
    openSettings,
    translateSelection,
    detectLanguage: quickDetectLang,
    countScriptChars,
  });
  return toolbarApi;
}

/** Show a toast inside the toolbar Shadow DOM. Returns false if unavailable. */
export function showToolbarToast(message, duration) {
  if (typeof toolbarApi?.showToast !== "function") return false;
  toolbarApi.showToast(message, duration);
  return true;
}

export function toggleEditPageMenu() {
  return toolbarApi?.toggleEditModeMenu?.();
}

export function activateHideElementsMenu() {
  return toolbarApi?.activateElementPicker?.();
}

export function clearPageBlockRulesMenu() {
  return toolbarApi?.clearPageBlockRules?.();
}

/** Resolves once the toolbar has loaded its configuration. */
export function waitForToolbarReady() {
  return toolbarApi?.ready || Promise.resolve();
}
