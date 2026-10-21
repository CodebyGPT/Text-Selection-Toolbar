// Super-selection focus preservation self-check.
// usage: node scripts/test-unlock-focus.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/10-unlock-mode.js"),
  "utf8"
);

const documentStub = {
  activeElement: null,
  body: {},
  documentElement: {},
  addEventListener() {},
  removeEventListener() {},
};
const windowStub = {
  addEventListener() {},
  removeEventListener() {},
  getSelection: () => null,
};
const { captureUnlockFocus, restoreUnlockFocus } = new Function(
  "window",
  "document",
  `${src}\nreturn { captureUnlockFocus, restoreUnlockFocus };`
)(windowStub, documentStub);

// Ctrl+V in an input: focus falls to the page, then focus/selection come back.
{
  let focused = false;
  const input = {
    isConnected: true,
    tagName: "INPUT",
    disabled: false,
    readOnly: false,
    selectionStart: 3,
    selectionEnd: 5,
    focus() {
      focused = true;
    },
  };
  documentStub.activeElement = input;
  const snapshot = captureUnlockFocus();
  documentStub.activeElement = documentStub.body;
  restoreUnlockFocus(snapshot);
  assert.strictEqual(focused, true);

  // If the input still owns focus, do not refocus/reposition it.
  focused = false;
  documentStub.activeElement = input;
  restoreUnlockFocus(snapshot);
  assert.strictEqual(focused, false);
}

// Contenteditable: restore the caret only when no live range survived the blur.
{
  let focused = false;
  let added = null;
  const range = { commonAncestorContainer: {}, cloneRange() { return this; } };
  const editor = {
    isConnected: true,
    isContentEditable: true,
    contains: () => true,
    focus() {
      focused = true;
    },
  };
  documentStub.activeElement = editor;
  windowStub.getSelection = () => ({ rangeCount: 1, getRangeAt: () => range });
  const snapshot = captureUnlockFocus();

  documentStub.activeElement = documentStub.body;
  windowStub.getSelection = () => ({
    rangeCount: 0,
    addRange(value) {
      added = value;
    },
  });
  restoreUnlockFocus(snapshot);
  assert.strictEqual(focused, true);
  assert.strictEqual(added, range);
}

console.log("unlock focus check passed");
