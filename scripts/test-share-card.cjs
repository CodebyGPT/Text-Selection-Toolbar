// Share card self-check: text layout, expanded context, script credit and output.
// usage: node scripts/test-share-card.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/27-share-card.js"),
  "utf8"
);

const messages = {
  share_label_url: "链接地址：",
  share_label_title: "网页标题：",
  share_label_time: "分享时间：",
  share_credit: "该分享卡片由%s生成",
};
const translate = (key, ...args) => {
  const text = messages[key] || key;
  return args.reduce(
    (result, arg) => result.replace("%s", String(arg)),
    text
  );
};

const ctx = new Function(
  "t",
  "getConfig",
  `${src}
  return {
    formatShareTime,
    shareFileName,
    expandShareLines,
    formatShareCardText,
    wrapShareText,
    wrapShareStyledLines,
    layoutShareCard,
    getScriptDisplayName,
  };`
)(translate, () => undefined);

// Timestamp and file name are locale-independent.
const stamp = new Date(2026, 0, 2, 3, 4, 5);
assert.strictEqual(ctx.formatShareTime(stamp), "2026-01-02 03:04");
assert.strictEqual(ctx.shareFileName(stamp, "png"), "share-20260102-030405.png");
assert.strictEqual(ctx.shareFileName(stamp, "txt"), "share-20260102-030405.txt");

// Credit name comes from the script metadata: plain @name under "auto",
// the localized @name:<language> field for an explicit UI language.
const metaSource = [
  "// ==UserScript==",
  "// @name          Text Selection Toolbar",
  "// @name:en       Text Selection Toolbar EN",
  "// @name:zh-CN    划词工具栏",
  "// @name:ru       Панель выделения текста",
  "// ==/UserScript==",
].join("\n");
assert.strictEqual(
  ctx.getScriptDisplayName("auto", { scriptSource: metaSource }),
  "Text Selection Toolbar"
);
assert.strictEqual(
  ctx.getScriptDisplayName("zh-CN", { scriptSource: metaSource }),
  "划词工具栏"
);
assert.strictEqual(
  ctx.getScriptDisplayName("en", { scriptSource: metaSource }),
  "Text Selection Toolbar EN"
);
assert.strictEqual(
  ctx.getScriptDisplayName("ru", { scriptSource: metaSource }),
  "Панель выделения текста"
);
// A missing localized field falls back to the plain @name.
assert.strictEqual(
  ctx.getScriptDisplayName("zh-CN", {
    scriptSource: "// @name Plain Name\n// @name:en English Name",
  }),
  "Plain Name"
);
// Managers that only expose GM_info.script.meta still work.
assert.strictEqual(
  ctx.getScriptDisplayName("auto", { script: { meta: { name: "Meta Name" } } }),
  "Meta Name"
);
assert.strictEqual(ctx.getScriptDisplayName("auto", null), "Text Selection Toolbar");

// Expanded context: the whole visual line, unselected parts dimmed.
assert.deepStrictEqual(ctx.expandShareLines("ABCDEFGHIJKLMN", "EFGHIJKL"), [
  [
    { text: "ABCD", dim: true },
    { text: "EFGHIJKL", dim: false },
    { text: "MN", dim: true },
  ],
]);
assert.deepStrictEqual(ctx.expandShareLines("ABCDEF", "ABC"), [
  [{ text: "ABC", dim: false }, { text: "DEF", dim: true }],
]);
assert.deepStrictEqual(ctx.expandShareLines("ABCDEF", "DEF"), [
  [{ text: "ABC", dim: true }, { text: "DEF", dim: false }],
]);
assert.deepStrictEqual(ctx.expandShareLines("EFGHIJKL", "EFGHIJKL"), [
  [{ text: "EFGHIJKL", dim: false }],
]);
// Multi-line: first line keeps its dim prefix, last line its dim suffix.
assert.deepStrictEqual(
  ctx.expandShareLines("aaABCDbb\nEFGH\nccIJKLdd", "ABCDbb\nEFGH\nccIJ"),
  [
    [{ text: "aa", dim: true }, { text: "ABCDbb", dim: false }],
    [{ text: "EFGH", dim: false }],
    [{ text: "ccIJ", dim: false }, { text: "KLdd", dim: true }],
  ]
);
// A mid-line to mid-line selection dims both partial lines.
assert.deepStrictEqual(
  ctx.expandShareLines("hello world\nsecond line here", "world\nsecond"),
  [
    [{ text: "hello ", dim: true }, { text: "world", dim: false }],
    [{ text: "second", dim: false }, { text: " line here", dim: true }],
  ]
);
// Line breaks and repeated spaces in selection.toString() are normalized.
assert.deepStrictEqual(ctx.expandShareLines("one\ntwo\nthree", "two\nthree"), [
  [{ text: "two", dim: false }],
  [{ text: "three", dim: false }],
]);
assert.strictEqual(ctx.expandShareLines("one\ntwo", "missing"), null);

// Plain-text card: the selection leads, then a blank line and labeled metadata.
assert.strictEqual(
  ctx.formatShareCardText({
    title: "Title",
    url: "https://example.com",
    time: "2026-01-02 03:04",
    text: "selected",
    credit: "该分享卡片由name生成",
  }),
  "selected\n\n链接地址：https://example.com\n网页标题：Title\n" +
    "分享时间：2026-01-02 03:04\n该分享卡片由name生成"
);
assert.strictEqual(
  ctx.formatShareCardText({
    title: "",
    url: "https://example.com",
    time: "",
    text: "selected",
    credit: "",
  }),
  "selected\n\n链接地址：https://example.com"
);
assert.strictEqual(ctx.formatShareCardText({ text: "only text" }), "only text");

// Wrapping: character budget, word boundary preferred for Latin text.
const measure = (text) => Array.from(text).length * 10;
assert.deepStrictEqual(ctx.wrapShareText("hello world", 90, measure), [
  "hello",
  "world",
]);
assert.deepStrictEqual(ctx.wrapShareText("abcdefghijkl", 100, measure), [
  "abcdefghij",
  "kl",
]);
assert.deepStrictEqual(ctx.wrapShareText("a\n\nb", 100, measure), ["a", "", "b"]);

// Styled wrapping keeps dim/solid boundaries across wrapped lines.
assert.deepStrictEqual(
  ctx.wrapShareStyledLines(
    [
      [
        { text: "ABCD", dim: true },
        { text: "EFGHIJKL", dim: false },
        { text: "MN", dim: true },
      ],
    ],
    100,
    measure
  ),
  [
    [
      { text: "ABCD", dim: true },
      { text: "EFGHIJ", dim: false },
    ],
    [
      { text: "KL", dim: false },
      { text: "MN", dim: true },
    ],
  ]
);

// Layout: every configured block appears in order and the card grows.
const fullCard = {
  text: "selected text",
  title: "Page title",
  url: "https://example.com/page",
  favicon: "https://example.com/favicon.ico",
  time: "2026-01-02 03:04",
  credit: "该分享卡片由name生成",
  expanded: ctx.expandShareLines("before SELECTED after", "SELECTED"),
};
const full = ctx.layoutShareCard(fullCard, measure);
assert.deepStrictEqual(
  full.blocks.map((block) => block.kind),
  ["title", "meta", "divider", "body", "footer"]
);
assert.strictEqual(full.blocks[3].styled, true);
assert.ok(full.height > 0);

// Expanded context off: the body is just the selected text.
const plain = ctx.layoutShareCard(
  {
    text: "only text",
    title: "",
    url: "",
    favicon: "",
    time: "",
    credit: "",
    expanded: null,
  },
  measure
);
assert.deepStrictEqual(plain.blocks.map((block) => block.kind), ["body"]);
assert.strictEqual(plain.blocks[0].styled, undefined);
assert.strictEqual(plain.height, 132);

console.log("share card check passed");
