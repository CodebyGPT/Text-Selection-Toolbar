// Cross-tab lightning-paste self-check for src/toolbar/index.js.
// Two independent toolbar instances simulate two tabs sharing one GM storage.
// usage: node scripts/test-paste-cache.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs
  .readFileSync(path.join(__dirname, "../src/toolbar/index.js"), "utf8")
  .replace(/^import[^;]*;$/gm, "")
  .replace(/^export /gm, "");

const shared = new Map();
const storage = {
  getObj: async (key) => (shared.has(key) ? shared.get(key) : null),
  setObj: async (key, value) => {
    shared.set(key, value);
  },
};
const setting = {};
const loadTab = () =>
  new Function(
    "getSettingWithDefault",
    "putSetting",
    "storage",
    "quickDetectLang",
    "countScriptChars",
    "installTextSelectionToolbar",
    `${src}\nreturn { getToolbarValue, setToolbarValue };`
  )(
    async () => setting,
    async () => {},
    storage,
    () => "",
    () => 0,
    () => {}
  );

(async () => {
  const tabA = loadTab();
  const tabB = loadTab();
  const cache = { text: "hello", timestamp: 123 };

  await tabA.setToolbarValue("smart_paste_cache", cache);
  assert.deepStrictEqual(
    await tabB.getToolbarValue("smart_paste_cache", null),
    cache,
    "cache written in tab A must be readable in tab B"
  );

  // Persistent toolbar options still come from toolbarSetting.
  setting.toolbarSetting = { enablePaste: false };
  assert.strictEqual(await tabB.getToolbarValue("enablePaste", true), false);

  console.log("paste cache cross-tab check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
