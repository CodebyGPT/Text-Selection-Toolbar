// Code block copy button self-check for src/toolbar/modules/20-code-copy.js.
// usage: node scripts/test-code-copy.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/20-code-copy.js"),
  "utf8"
);

function makeSandbox({ copied = [] } = {}) {
  const toasts = [];
  const api = new Function(
    "window",
    "copyToClipboard",
    "showToast",
    "t",
    "hostElement",
    src +
      `
      let isUnlockMode = false;
      return {
        findCodeBlock,
        getCodeCopyPosition,
        getCodeBlockText,
        copyCodeBlock,
        handleCodeCopyHover,
        setUnlock: (value) => { isUnlockMode = value; }
      };`
  )(
    { innerWidth: 1000, innerHeight: 800 },
    async (text) => {
      copied.push(text);
      return true;
    },
    (message) => toasts.push(message),
    (key) => key,
    null
  );
  return { api, copied, toasts };
}

const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// Any <pre> with text is a copy candidate, with or without a <code> wrapper
// (cnblogs/hljs renders spans directly into the <pre>).
{
  const { api } = makeSandbox();
  const pre = { tagName: "PRE", textContent: "module UART_recv;" };
  const target = { closest: (selector) => (selector === "pre" ? pre : null) };
  assert.strictEqual(api.findCodeBlock(target), pre);

  const codePre = {
    tagName: "PRE",
    textContent: "const x = 1;",
    querySelector: () => ({ textContent: "const x = 1;" }),
  };
  assert.strictEqual(
    api.findCodeBlock({ closest: () => codePre }),
    codePre
  );

  const emptyPre = { tagName: "PRE", textContent: "  \n " };
  assert.strictEqual(api.findCodeBlock({ closest: () => emptyPre }), null);
  assert.strictEqual(api.findCodeBlock({ closest: () => null }), null);
  assert.strictEqual(api.findCodeBlock(null), null);
}

// The button sits inside the block's top-right corner.
{
  const { api } = makeSandbox();
  const pos = api.getCodeCopyPosition(rect(100, 200, 400, 100), {
    width: 40,
    height: 40,
  });
  assert.strictEqual(pos.left, 454);
  assert.strictEqual(pos.top, 206);
}

// ... but stays inside the viewport when the block touches the top/right edge.
{
  const { api } = makeSandbox();
  const pos = api.getCodeCopyPosition(rect(900, 0, 400, 100), {
    width: 40,
    height: 40,
  });
  assert.strictEqual(pos.left, 952); // clamped to innerWidth - width - 8
  assert.strictEqual(pos.top, 8); // clamped to the viewport edge
}

// Copy text keeps indentation and drops only the template newlines.
{
  const { api } = makeSandbox();
  const pre = {
    querySelector: () => ({ textContent: "\n  if (a) {\n    b();\n  }\n" }),
    textContent: "ignored",
  };
  assert.strictEqual(api.getCodeBlockText(pre), "  if (a) {\n    b();\n  }");
}

(async () => {
  // Clicking (i.e. copyCodeBlock) uses the toolbar clipboard path and toasts.
  {
    const copied = [];
    const { api, toasts } = makeSandbox({ copied });
    const pre = {
      querySelector: () => ({ textContent: "const x = 1;" }),
    };
    assert.strictEqual(await api.copyCodeBlock(pre), true);
    assert.deepStrictEqual(copied, ["const x = 1;"]);
    assert.deepStrictEqual(toasts, ["toast_copied"]);
  }

  // Hovering non-code content hides the button; unlock mode leaves hover alone.
  {
    const { api } = makeSandbox();
    assert.doesNotThrow(() => api.handleCodeCopyHover({ target: { closest: () => null } }));
    api.setUnlock(true);
    assert.doesNotThrow(() =>
      api.handleCodeCopyHover({
        target: { closest: () => ({ querySelector: () => ({}) }) },
        composedPath: () => [],
      })
    );
  }

  console.log("test-code-copy: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
