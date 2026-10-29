// Lightning-paste inside open shadow roots self-check.
// A mouseup inside a shadow tree is retargeted to the host by the time it
// reaches document, which used to hide the paste button for editors rendered
// by custom elements (bilibili comments and friends).
// usage: node scripts/test-shadow-paste.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

function makeToolbar(doc, win) {
  const prelude = `
    let hostElement = null;
    let shadowRoot = null;
    let isScrolling = false;
    let cachedSelection = { text: '', html: '' };
  `;
  return new Function(
    "window",
    "document",
    "getConfig",
    "safeGetValue",
    "getPasteTtlMs",
    "renderButton",
    "initContainer",
    "hideUI",
    "isChineseUI",
    "isIdCardCandidate",
    "rememberIdCardDragGuard",
    "getSmartSelectionState",
    "rememberToolbarAnchor",
    "PASTE_MODE_THREE_BTNS",
    "PASTE_MODE_WHITESPACE",
    `${prelude}
     ${src}
     return { handleInputPasteMouseUp, editableTargetOf, eventTargetDeep, activeElementDeep };`
  )(
    win,
    doc,
    () => true,
    async () => ({ text: "hello", timestamp: Date.now() }),
    () => 8000,
    (...args) => calls.push(args),
    () => {},
    () => {},
    () => false,
    () => false,
    () => {},
    () => null,
    () => {},
    "copy-search-paste",
    "whitespace-delete-paste"
  );
}

const calls = [];
const doc = {
  activeElement: null,
  body: { nodeType: 1, tagName: "BODY", children: [] },
  documentElement: { nodeType: 1, tagName: "HTML", children: [] },
  getSelection: () => null,
};
const win = { getSelection: () => null };
const toolbar = makeToolbar(doc, win);

// <bili-comment-rich-textarea> #shadow-root > div[contenteditable] > span
const editor = {
  nodeType: 1,
  tagName: "DIV",
  isContentEditable: true,
  parentElement: null,
  children: [],
};
const span = {
  nodeType: 1,
  tagName: "SPAN",
  isContentEditable: true,
  parentElement: editor,
  children: [],
};
const shadowRoot = {
  nodeType: 11,
  host: { nodeType: 1, tagName: "BILI-COMMENT-RICH-TEXTAREA", shadowRoot: null, children: [] },
  children: [editor],
  getSelection: () => ({ rangeCount: 0 }),
};
const host = shadowRoot.host;
span.getRootNode = () => shadowRoot;
editor.getRootNode = () => shadowRoot;
host.getRootNode = () => doc;

// A click in the shadow editor: document sees the host, composedPath sees all.
const event = {
  target: host,
  composedPath: () => [span, shadowRoot, host, doc.body],
  clientX: 120,
  clientY: 240,
};

assert.strictEqual(toolbar.eventTargetDeep(event), span, "deep target wins over retargeted host");
assert.strictEqual(toolbar.editableTargetOf(host), null, "the outer host is not editable");
assert.strictEqual(toolbar.editableTargetOf(span), editor, "click target resolves to its editing host");

setTimeout(() => {
  toolbar.handleInputPasteMouseUp(event);
  setTimeout(() => {
    assert.strictEqual(calls.length, 1, "lightning paste must fire inside a shadow root");
    const [, , , text, , mode, targetInput] = calls[0];
    assert.strictEqual(mode, "paste", "a collapsed click offers the single paste button");
    assert.strictEqual(text, "hello", "cached clipboard text is offered");
    assert.strictEqual(targetInput, editor, "paste must target the contenteditable, not the host");

    // document.activeElement is retargeted the same way.
    doc.activeElement = host;
    host.shadowRoot = { activeElement: span };
    assert.strictEqual(toolbar.activeElementDeep(), span, "deep activeElement descends shadow roots");

    // A disabled input inside a shadow root is still not a paste target.
    const disabled = {
      nodeType: 1,
      tagName: "INPUT",
      disabled: true,
      readOnly: false,
      isContentEditable: false,
      parentElement: null,
      children: [],
    };
    assert.strictEqual(toolbar.editableTargetOf(disabled), null, "disabled inputs stay excluded");

    console.log("shadow-root lightning paste check passed");
  }, 40);
}, 0);
