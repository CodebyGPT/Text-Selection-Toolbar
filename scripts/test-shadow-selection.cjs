// Shadow-root selection arming self-check.
// A selection inside an open shadow root is invisible to window.getSelection()
// in Chromium: the press must remember the root's own Selection object.
// usage: node scripts/test-shadow-selection.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

const prelude = `
  let hostElement = null;
  let shadowRoot = null;
  let isScrolling = false;
  let cachedSelection = { text: '', html: '' };
`;

const rootListeners = [];
const shadowSelection = {
  rangeCount: 1,
  isCollapsed: false,
  toString: () => (shadowSelection.isCollapsed ? "" : "评论区文字"),
};
const textNode = { nodeType: 3 };
const shadowRoot = {
  nodeType: 11,
  addEventListener: (...args) => rootListeners.push(args),
  getSelection: () => shadowSelection,
};
const host = { nodeType: 1, shadowRoot };
textNode.getRootNode = () => shadowRoot;
host.getRootNode = () => document;

// window.getSelection() is empty: the shadow selection lives on the root.
const win = { getSelection: () => ({ rangeCount: 0, isCollapsed: true, toString: () => "" }) };
const doc = { activeElement: null };

const api = new Function(
  "window",
  "document",
  "hideUI",
  "initContainer",
  `${prelude}
   ${src}
   return {
     handleSelectionPressStart,
     armSelectionGesture,
     armOnSelectStart,
     consumeSelectionArm,
   };`
)(
  win,
  doc,
  () => {},
  () => {}
);

const pressIn = (node) => api.handleSelectionPressStart({
  button: 0,
  target: node,
  composedPath: () => [node, host, doc],
});

// A drag in a shadow root: the document-level selectionchange must arm through
// the root's Selection, even though window.getSelection() stays empty.
pressIn(textNode);
assert.strictEqual(api.consumeSelectionArm(), false, "press starts unarmed");
assert.ok(rootListeners.length > 0, "the press subscribes to its shadow root");
api.armSelectionGesture({ target: doc });
assert.strictEqual(api.consumeSelectionArm(), true, "shadow selection arms the press");
assert.strictEqual(api.consumeSelectionArm(), false, "the arm is consumed once");

// The native selectstart path arms synchronously (listener installed at press).
pressIn(textNode);
api.armOnSelectStart();
assert.strictEqual(api.consumeSelectionArm(), true, "selectstart arms the press");

// Clicking selected text in the shadow root clears that root's selection; the
// resulting empty change must not arm.
pressIn(textNode);
shadowSelection.isCollapsed = true;
shadowSelection.rangeCount = 0;
api.armSelectionGesture({ target: doc });
assert.strictEqual(api.consumeSelectionArm(), false, "clearing a shadow selection never arms");

console.log("shadow selection check passed");
