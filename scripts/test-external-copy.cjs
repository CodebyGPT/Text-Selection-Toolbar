// External Ctrl+C / context-menu copy capture self-check.
// usage: node scripts/test-external-copy.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

let written = null;
const windowStub = { getSelection: () => null };
const { handleExternalCopy } = new Function(
  "window",
  "document",
  "getConfig",
  "safeSetValue",
  "unregisterVisibilityCleanup",
  `${src}\nreturn { handleExternalCopy };`
)(
  windowStub,
  {},
  () => true,
  async (key, value) => {
    written = { key, value };
  },
  () => {}
);

(async () => {
  // Copying a selection inside an input.
  await handleExternalCopy({
    target: {
      tagName: "INPUT",
      value: "hello world",
      selectionStart: 0,
      selectionEnd: 5,
    },
  });
  assert.strictEqual(written.key, "smart_paste_cache");
  assert.strictEqual(written.value.text, "hello");
  assert.strictEqual(written.value.type, "clipboard");
  assert.ok(Number.isFinite(written.value.timestamp));

  // Copying a page selection.
  windowStub.getSelection = () => ({ toString: () => "page text" });
  await handleExternalCopy({ target: { tagName: "DIV" } });
  assert.strictEqual(written.value.text, "page text");
  assert.strictEqual(written.value.type, "clipboard");

  // Empty copies do not overwrite the cache.
  written = null;
  windowStub.getSelection = () => ({ toString: () => "" });
  await handleExternalCopy({ target: { tagName: "DIV" } });
  assert.strictEqual(written, null);

  console.log("external copy check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
