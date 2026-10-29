// Toolbar appears exactly once per text-selection press.
// usage: node scripts/test-toolbar-once.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

const calls = [];
let hideCalls = 0;
let cancel = () => {};

const prelude = `
  let hostElement = null;
  let shadowRoot = null;
  let isScrolling = false;
  let cachedSelection = { text: '', html: '' };
`;

const selection = {
  rangeCount: 1,
  isCollapsed: false,
  text: "hello",
  getRangeAt: () => ({ cloneContents: () => ({}) }),
  toString: () => selection.text,
};

const doc = {
  activeElement: null,
  createElement: () => ({ appendChild() {}, innerHTML: "<b>hello</b>" }),
};
const win = { getSelection: () => selection, innerWidth: 1280, innerHeight: 800 };

const api = new Function(
  "window",
  "document",
  "getConfig",
  "getSmartSelectionState",
  "bindSelectionScrollTargets",
  "rememberToolbarAnchor",
  "renderButton",
  "initContainer",
  "hideUI",
  "safeGetValue",
  "getPasteTtlMs",
  "isChineseUI",
  "isIdCardCandidate",
  "rememberIdCardDragGuard",
  "PASTE_MODE_THREE_BTNS",
  "PASTE_MODE_WHITESPACE",
  `${prelude}
   ${src}
   return {
     handleSelectionPressStart,
     armSelectionGesture,
     handleSelectionMouseUp,
     cancelScheduledToolbar,
   };`
)(
  win,
  doc,
  () => false,
  () => ({ left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 }),
  () => {},
  () => {},
  (...args) => calls.push(args),
  () => {},
  () => {
    hideCalls += 1;
    cancel();
  },
  async () => null,
  () => 8000,
  () => false,
  () => false,
  () => {},
  "copy-search-paste",
  "whitespace-delete-paste"
);
cancel = api.cancelScheduledToolbar;

const press = () => api.handleSelectionPressStart({ button: 0, composedPath: () => [] });
const release = () => api.handleSelectionMouseUp({
  clientX: 10,
  clientY: 10,
  composedPath: () => [],
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  // A drag selection: press -> selectionchange -> release paints once.
  press();
  api.armSelectionGesture();
  release();
  await wait(40);
  assert.strictEqual(calls.length, 1, "a new selection opens one toolbar");

  // Clicking again while the same selection still exists fires no selection
  // event, so the dismissed toolbar must not come back.
  press();
  release();
  await wait(40);
  assert.strictEqual(calls.length, 1, "a click without a new selection opens nothing");

  // Clicking the text that is already selected: the browser still reports the
  // old selection during mouseup and clears it right after. That clearing
  // selectionchange must not arm a bar for text the user just deselected.
  press();
  release();
  selection.isCollapsed = true;
  selection.rangeCount = 0;
  selection.text = "";
  api.armSelectionGesture({ target: doc });
  await wait(40);
  assert.strictEqual(calls.length, 1, "deselecting never opens a toolbar");
  selection.isCollapsed = false;
  selection.rangeCount = 1;
  selection.text = "hello";

  // A press that is dismissed before the deferred render fires leaves no
  // stale toolbar behind.
  press();
  api.armSelectionGesture();
  release();
  press();
  await wait(40);
  assert.strictEqual(calls.length, 1, "a new press cancels the previous render");

  // No selection event at all -> no toolbar, even though a selection exists.
  press();
  release();
  await wait(40);
  assert.strictEqual(calls.length, 1, "selection state alone never opens a toolbar");
  assert.ok(hideCalls >= 4, "dismissed presses hide the old bar");

  // Editable selections follow the same rule, while the collapsed-click paste
  // offer (no selection) stays a per-press feature.
  const editor = {
    nodeType: 1,
    tagName: "DIV",
    isContentEditable: true,
    parentElement: null,
  };
  doc.activeElement = editor;
  const releaseInEditor = () => api.handleSelectionMouseUp({
    clientX: 10,
    clientY: 10,
    composedPath: () => [editor],
  });

  press();
  releaseInEditor();
  await wait(60);
  assert.strictEqual(calls.length, 1, "a click leaving an editable selection opens nothing");

  press();
  api.armSelectionGesture();
  releaseInEditor();
  await wait(60);
  assert.strictEqual(calls.length, 2, "a new editable selection opens one toolbar");

  console.log("toolbar once-per-selection check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
