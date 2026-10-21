const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Load the pure CJK helpers straight from the toolbar module so the test
// breaks if the shipped classification or threshold semantics change.
const file = path.join(__dirname, "../src/toolbar/modules/02-config.js");
const source = fs.readFileSync(file, "utf8");
const start = source.indexOf("// CJK script gate");
const end = source.indexOf("const SCROLL_REPAINT_MODE");
assert.ok(start > 0 && end > start, "CJK helpers block not found");
const snippet = source.slice(start, end);

const sandbox = {
  configCache: { language: "zh-CN", translateCjkThreshold: 15 },
  navigator: { language: "zh-CN" },
};
sandbox.getConfig = (key) => sandbox.configCache[key];
vm.createContext(sandbox);
vm.runInContext(
  `${snippet}\nglobalThis.cjkCharRatio = cjkCharRatio; globalThis.shouldHideTranslate = shouldHideTranslate;`,
  sandbox
);
const { cjkCharRatio, shouldHideTranslate } = sandbox;

const text = (cjk, ascii) => "中".repeat(cjk) + "a".repeat(ascii);

sandbox.configCache.translateCjkThreshold = 15;
assert.strictEqual(shouldHideTranslate("hello world"), false);
assert.strictEqual(shouldHideTranslate(text(22, 78)), true, "22% > 15%");
assert.strictEqual(shouldHideTranslate(text(15, 85)), false, "equal does not hide");
assert.strictEqual(shouldHideTranslate(text(10, 90)), false);

sandbox.configCache.translateCjkThreshold = 0;
assert.strictEqual(shouldHideTranslate("hello你"), true, "0 = any CJK hides");
assert.strictEqual(shouldHideTranslate("hello!"), false);

sandbox.configCache.translateCjkThreshold = 100;
assert.strictEqual(shouldHideTranslate(text(99, 1)), false, "100 = always show");

sandbox.configCache.translateCjkThreshold = 15;
sandbox.configCache.language = "en";
assert.strictEqual(shouldHideTranslate(text(99, 1)), false, "non-CJK UI ignores it");

sandbox.configCache.language = "ja-JP";
assert.strictEqual(shouldHideTranslate("これは日本語です"), true, "kana counts as CJK");
assert.strictEqual(shouldHideTranslate("hello"), false);

sandbox.configCache.language = "auto";
sandbox.navigator.language = "zh-CN";
assert.strictEqual(shouldHideTranslate(text(50, 50)), true, "auto follows browser language");

assert.strictEqual(cjkCharRatio(""), 0);
console.log("cjk-threshold ok");
