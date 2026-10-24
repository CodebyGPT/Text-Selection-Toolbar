// Local Translator for Chromium bridge self-check.
// usage: node scripts/test-local-translator-bridge.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/libs/localTranslatorBridge.js"),
  "utf8"
);

function loadBridge() {
  const pageWindow = { listeners: new Set(), posted: [] };
  pageWindow.addEventListener = (type, handler) => {
    if (type === "message") pageWindow.listeners.add(handler);
  };
  pageWindow.removeEventListener = (type, handler) => {
    if (type === "message") pageWindow.listeners.delete(handler);
  };
  pageWindow.postMessage = (data) => pageWindow.posted.push(data);
  pageWindow.emit = (data) => {
    for (const handler of [...pageWindow.listeners])
      handler({ data, source: pageWindow });
  };
  const { translateWithLocalTranslator } = new Function(
    "window",
    "unsafeWindow",
    `${src.replace(/^export /gm, "")}\nreturn { translateWithLocalTranslator };`
  )(pageWindow, undefined);
  return { pageWindow, translateWithLocalTranslator };
}

const respond = (pageWindow, id, payload) =>
  pageWindow.emit({
    source: "local-translator-for-chromium",
    id,
    ...payload,
  });

(async () => {
  // A matching response resolves with the translated text.
  {
    const { pageWindow, translateWithLocalTranslator } = loadBridge();
    const promise = translateWithLocalTranslator({
      text: "hello",
      from: "auto",
      to: "zh-CN",
    });
    const request = pageWindow.posted[0];
    assert.deepStrictEqual(
      { ...request, id: "ignored" },
      {
        source: "text-selection-toolbar",
        type: "translate",
        id: "ignored",
        text: "hello",
        from: "auto",
        to: "zh-CN",
      }
    );
    // Unrelated page traffic and a stale id must not settle the request.
    respond(pageWindow, "stale", { text: "wrong" });
    pageWindow.emit({ some: "other message" });
    respond(pageWindow, request.id, { text: "你好" });
    assert.strictEqual(await promise, "你好");
    assert.strictEqual(pageWindow.listeners.size, 0);
  }

  // An extension-side error rejects with its message.
  {
    const { pageWindow, translateWithLocalTranslator } = loadBridge();
    const promise = translateWithLocalTranslator({ text: "x", to: "en" });
    respond(pageWindow, pageWindow.posted[0].id, {
      error: "Target language is not supported by selected translator",
    });
    await assert.rejects(promise, /not supported/);
  }

  // Without an installed extension the request times out instead of hanging.
  {
    const { translateWithLocalTranslator } = loadBridge();
    await assert.rejects(
      translateWithLocalTranslator({ text: "x", to: "en", timeout: 0.01 }),
      /未响应/
    );
  }

  // Aborting settles the pending request immediately.
  {
    const { pageWindow, translateWithLocalTranslator } = loadBridge();
    const controller = new AbortController();
    const promise = translateWithLocalTranslator({
      text: "x",
      to: "en",
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(promise, (error) => error.name === "AbortError");
    assert.strictEqual(pageWindow.listeners.size, 0);
  }

  console.log("local translator bridge: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
