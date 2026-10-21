const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

// Compile the real detector so the test covers the exact classification and
// script counts used by the toolbar.
function loadDetector() {
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
  return mod.exports;
}

const { quickDetectLang, countScriptChars } = loadDetector();

// Load the gate helpers straight from the toolbar module.
const source = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/02-config.js"),
  "utf8"
);
const start = source.indexOf("// Compare base language tags");
const end = source.indexOf("const SCROLL_REPAINT_MODE");
assert.ok(start > 0 && end > start, "translate gate helpers not found");
const snippet = source.slice(start, end);

function load({
  uiLang = "zh-CN",
  browserLang = "zh-CN",
  threshold = 15,
  pageLang,
  metaLang = "",
  bodyLang = "",
} = {}) {
  const effective = pageLang === undefined
    ? (uiLang === "auto" ? browserLang : uiLang)
    : pageLang;
  const sandbox = {
    configCache: {
      language: uiLang,
      translateHideThreshold: threshold,
    },
    navigator: { language: browserLang },
    detectLanguage: quickDetectLang,
    countScriptChars,
    document: {
      documentElement: { lang: effective },
      body: { lang: bodyLang },
      querySelector(selector) {
        if (
          metaLang &&
          (selector.includes("content-language") ||
            selector.includes('name="language"') ||
            selector.includes("og:locale"))
        ) {
          return { getAttribute: () => metaLang };
        }
        return null;
      },
    },
  };
  sandbox.getConfig = (key) => sandbox.configCache[key];
  vm.createContext(sandbox);
  vm.runInContext(
    `${snippet}\nglobalThis.shouldHideTranslate = shouldHideTranslate; globalThis.baseLanguageTag = baseLanguageTag;`,
    sandbox
  );
  return sandbox;
}

const mixed = (han, latin) => "中".repeat(han) + "a".repeat(latin);

// Basic language gate: page language defaults to the current language here.
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("你好世界"), true);
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("こんにちは"), false);
assert.strictEqual(load({ uiLang: "ja-JP" }).shouldHideTranslate("こんにちは"), true);
assert.strictEqual(load({ uiLang: "ja-JP" }).shouldHideTranslate("你好世界"), false, "Chinese text on Japanese UI stays translatable");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("hello world"), false, "short Latin words are not hidden on a guess");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("hello world!!!"), false);

// English UI + English text, confirmed by the page language.
assert.strictEqual(
  load({ uiLang: "en", pageLang: "en" }).shouldHideTranslate("the quick brown fox and the dog"),
  true
);
assert.strictEqual(
  load({ uiLang: "en", pageLang: "de" }).shouldHideTranslate("der die das und ist nicht"),
  false,
  "detected German differs from English"
);

// Ratio step: current-language share below the threshold keeps the button.
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate(mixed(1, 9)), false, "10% < 15%");
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate(mixed(2, 8)), true, "20% >= 15%");
assert.strictEqual(load({ uiLang: "zh-CN", threshold: 15 }).shouldHideTranslate(mixed(3, 17)), true, "exactly 15% hides");
assert.strictEqual(load({ uiLang: "zh-CN", threshold: 35 }).shouldHideTranslate(mixed(2, 8)), false, "20% < 35%");
assert.strictEqual(load({ uiLang: "zh-CN", threshold: 55 }).shouldHideTranslate(mixed(9, 1)), true, "90% >= 55%");
assert.strictEqual(load({ uiLang: "zh-CN", threshold: 75 }).shouldHideTranslate(mixed(9, 1)), true, "90% >= 75%");
assert.strictEqual(
  load({ uiLang: "zh-CN", threshold: 75 }).shouldHideTranslate("中a"),
  false,
  "single CJK letter plus a letter is 50% < 75%"
);

// Final step: a different or unknown page language keeps the button.
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "en" }).shouldHideTranslate("你好世界"), false);
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "" }).shouldHideTranslate("你好世界"), false, "missing page lang keeps it");
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "und" }).shouldHideTranslate("你好世界"), false, "und keeps it");
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "", metaLang: "zh_CN" }).shouldHideTranslate("你好世界"), true, "og:locale fallback");
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "", bodyLang: "zh-CN" }).shouldHideTranslate("你好世界"), true, "body lang fallback");
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "zh-Hans" }).shouldHideTranslate("你好世界"), true);
assert.strictEqual(load({ uiLang: "zh-CN", pageLang: "zh-TW" }).shouldHideTranslate("你好世界"), true, "Chinese variants compare as zh");

// Noise filtering: punctuation, numbers, emoji, tabs, or one letter.
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

// Detector failures keep the button; noise is still filtered.
const broken = load({ uiLang: "zh-CN" });
broken.detectLanguage = () => {
  throw new Error("boom");
};
assert.strictEqual(broken.shouldHideTranslate("你好世界"), false);
assert.strictEqual(broken.shouldHideTranslate("12345"), true);

// auto follows the browser language.
assert.strictEqual(load({ uiLang: "auto", browserLang: "ja-JP" }).shouldHideTranslate("こんにちは"), true);
assert.strictEqual(load({ uiLang: "auto", browserLang: "ja-JP" }).shouldHideTranslate("你好世界"), false);
assert.strictEqual(load({ uiLang: "zh-CN" }).shouldHideTranslate("繁體中文"), true);

assert.strictEqual(load().baseLanguageTag("zh-Hant-TW"), "zh");
assert.strictEqual(load().baseLanguageTag(""), "");

console.log("translate-hide ok");
