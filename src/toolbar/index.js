import { getSettingWithDefault, putSetting } from "../libs/storage";
import { quickDetectLang, countScriptChars } from "../libs/detectFast";
import { installTextSelectionToolbar } from "./generated";

const TRANSIENT_KEYS = new Set(["smart_paste_cache"]);
const transientValues = new Map();
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
    return transientValues.has(key) ? transientValues.get(key) : fallback;
  }
  const toolbar = await readToolbarSetting();
  return Object.prototype.hasOwnProperty.call(toolbar, key)
    ? toolbar[key]
    : fallback;
}

export function setToolbarValue(key, value) {
  if (TRANSIENT_KEYS.has(key)) {
    transientValues.set(key, value);
    return Promise.resolve();
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

export function installToolbar({ translateSelection } = {}) {
  if (installed) return;
  installed = true;
  installTextSelectionToolbar({
    getValue: getToolbarValue,
    setValue: setToolbarValue,
    openSettings: null,
    translateSelection,
    detectLanguage: quickDetectLang,
    countScriptChars,
  });
}
