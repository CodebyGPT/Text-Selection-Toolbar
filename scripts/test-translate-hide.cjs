const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

// Compile the real detector so the test covers the exact classification used
// by the toolbar, including the zh/ja ambiguity that motivated this change.
function loadQuickDetectLang() {
  const file = path.join(__dirname, "../src/libs/detectFast.js");
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [
      [require.resolve("@babel/preset-env"), { targets: { node: "current" } }],
    ],
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => {
      if (id.includes("browser")) return { browser: {} };
      if (id.includes("log")) return { kissLog() {} };
      if (id.includes("language")) return { normalizeLanguageCode: (v) => v };
      return {};
    },
    mod,
    mod.exports
  );
  return mod.exports.quickDetectLang;
}

const quickDetectLang = loadQuickDetectLang();

// Load the comparison helpers straight from the toolbar module.
const source = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/02-config.js"),
  "utf8"
);
const start = source.indexOf("// Compare base language tags");
const end = source.indexOf("const SCROLL_REPAINT_MODE");
assert.ok(start > 0 && end > start, "translate gate helpers not found");
const snippet = source.slice(start, end);

function load({ uiLang = "zh-CN", browserLang = "zh-CN", option = true } = {}) {
  const sandbox = {
    configCache: { language: uiLang, hideTranslateForCurrentLanguage: option },
    navigator: { language: browserLang },
    detectLanguage: quickDetectLang,
  };
  sandbox.getConfig = (key) => sandbox.configCache[key];
  vm.createContext(sandbox);
  vm.runInContext(
    `${snippet}\nglobalThis.shouldHideTranslate = shouldHideTranslate; globalThis.baseLanguageTag = baseLanguageTag;`,
    sandbox
  );
  return sandbox;
}

// The zh <-> ja case that broke the old CJK-ratio rule.
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("你好世界"), true);
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("こんにちは"), false);
assert.strictEqual(load({ uiLang: "ja-JP" }).shouldHideTranslate("こんにちは"), true);
assert.strictEqual(load({ uiLang: "ja-JP" }).shouldHideTranslate("你好世界"), false, "Chinese text on Japanese UI stays translatable");

// Foreign text on a same-language page is still translatable: selection, not page.
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("hello world"), false, "short Latin words are not hidden on a guess");

// Unknown detection never hides meaningful text.
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("hello world!!!"), false);

// Noise filtering: punctuation, numbers, or one letter (however padded).
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("。！？"), true, "punctuation-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("12345"), true, "number-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("你"), true, "single CJK letter");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("a"), true, "single Latin letter");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("你 123！？"), true, "one letter plus noise");
assert.strictEqual(load({ uiLang: "en" }).shouldHideTranslate("你好"), false, "two letters are not noise");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("$100.00"), true, "currency noise");
assert.strictEqual(load({ uiLang: "en" }).shouldHideTranslate("😀😀"), true, "emoji-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("\t\t\n"), true, "whitespace/tab-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("\u200b\u200b"), true, "zero-width-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("１２３"), true, "fullwidth digit-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("😀\t\n。"), true, "mixed noise-only");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("😀ab"), false, "noise plus two letters is meaningful");

// Option off still filters noise, but keeps meaningful foreign text.
assert.strictEqual(load({ option: false }).shouldHideTranslate("你好世界"), false);
assert.strictEqual(load({ option: false }).shouldHideTranslate("12345"), true);
const broken = load({ uiLang: "zh-CN" });
broken.detectLanguage = () => {
  throw new Error("boom");
};
assert.strictEqual(broken.shouldHideTranslate("你好世界"), false);

// auto follows the browser language; Chinese variants compare as zh.
assert.strictEqual(load({ uiLang: "auto", browserLang: "ja-JP" }).shouldHideTranslate("こんにちは"), true);
assert.strictEqual(load({ uiLang: "auto", browserLang: "ja-JP" }).shouldHideTranslate("你好世界"), false);
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("繁體中文"), true);

assert.strictEqual(load().baseLanguageTag("zh-Hant-TW"), "zh");
assert.strictEqual(load().baseLanguageTag(""), "");

console.log("translate-hide ok");
