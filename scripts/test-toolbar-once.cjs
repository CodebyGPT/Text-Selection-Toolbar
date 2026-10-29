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

let selectionBox = { left: 0, top: 0, right: 20, bottom: 20, width: 20, height: 20 };
const selection = {
  rangeCount: 1,
  isCollapsed: false,
  text: "hello",
  getRangeAt: () => ({
    cloneContents: () => ({}),
    getBoundingClientRect: () => selectionBox,
  }),
  toString: () => selection.text,
};

const doc = {
  activeElement: null,
  createElement: () => ({ appendChild() {}, innerHTML: "<b>hello</b>" }),
};
const win = { getSelection: () => selection, innerWidth: 1280, innerHeight: 800 };
let clickSelectionShowsToolbar = false;

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
  (key) => (key === "clickSelectionShowsToolbar" ? clickSelectionShowsToolbar : false),
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
const release = (x = 10, y = 10) => api.handleSelectionMouseUp({
  clientX: x,
  clientY: y,
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

  // A selection event that fires *after* the release belongs to whatever the
  // page does next (a "select this paragraph" button selects in its click
  // handler, i.e. after the button's mouseup). It must not arm the render this
  // release already queued for the previous selection.
  press();
  release();
  api.armSelectionGesture();
  await wait(40);
  assert.strictEqual(calls.length, 1, "a post-release selection opens nothing");

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

  // <input>/<textarea> selections have no window selection and no paste cache
  // required: a selected text must still get the regular toolbar.
  const textarea = {
    nodeType: 1,
    tagName: "TEXTAREA",
    isContentEditable: false,
    value: "本次更新 / Changes",
    selectionStart: 0,
    selectionEnd: 4,
    selectionDirection: "forward",
    parentElement: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 30, width: 200, height: 30 }),
  };
  doc.activeElement = textarea;
  press();
  api.armSelectionGesture({ target: textarea });
  api.handleSelectionMouseUp({
    clientX: 20,
    clientY: 20,
    composedPath: () => [textarea],
  });
  await wait(60);
  assert.strictEqual(calls.length, 3, "a textarea selection opens a toolbar");
  const textareaCall = calls[2];
  assert.strictEqual(textareaCall[0].right, 20, "the bar anchors at the release point");
  assert.strictEqual(textareaCall[0].isBackward, false, "a forward selection is not backward");
  assert.strictEqual(textareaCall[5], "default", "no cache means the regular toolbar");
  assert.strictEqual(textareaCall[6], textarea, "cut/delete must target the textarea");

  // A right-to-left selection releases at its left endpoint: the same endpoint
  // placement must flip the bar to that side instead of always drifting right.
  textarea.selectionDirection = "backward";
  press();
  api.armSelectionGesture({ target: textarea });
  api.handleSelectionMouseUp({
    clientX: 30,
    clientY: 25,
    composedPath: () => [textarea],
  });
  await wait(60);
  assert.strictEqual(calls.length, 4, "a backward textarea selection opens one toolbar");
  const backwardCall = calls[3];
  assert.strictEqual(backwardCall[0].left, 30, "the bar anchors at the backward endpoint");
  assert.strictEqual(backwardCall[0].isBackward, true, "the direction is preserved");

  // A drag in a text control released outside it: the control keeps focus and
  // its selection, so the bar must still appear, anchored inside the control
  // instead of at the release point on unrelated content.
  const outside = { nodeType: 1, tagName: "DIV" };
  textarea.selectionDirection = "forward";
  press();
  api.armSelectionGesture({ target: textarea });
  api.handleSelectionMouseUp({
    clientX: 400,
    clientY: 100,
    composedPath: () => [outside],
  });
  await wait(60);
  assert.strictEqual(calls.length, 5, "a release outside the focused textarea still opens a bar");
  const outsideCall = calls[4];
  assert.strictEqual(outsideCall[6], textarea, "the focused textarea remains the target");
  assert.strictEqual(outsideCall[0].right, 200, "x is clamped to the control box");
  assert.strictEqual(outsideCall[0].bottom, 30, "y is clamped to the control box");

  // Opt-in: a click on a selection the browser leaves in place opens the bar.
  // It is off by default, and it still requires the click to land on that
  // selection.
  doc.activeElement = null;
  assert.strictEqual(clickSelectionShowsToolbar, false, "the opt-in is off by default");
  press();
  release();
  await wait(40);
  assert.strictEqual(calls.length, 5, "with the opt-in off, clicking a selection opens nothing");

  clickSelectionShowsToolbar = true;
  press();
  release();
  await wait(40);
  assert.strictEqual(calls.length, 6, "with the opt-in on, a click on the surviving selection opens the bar");

  press();
  release(400, 400);
  await wait(40);
  assert.strictEqual(calls.length, 6, "a click away from the selection opens nothing");
  clickSelectionShowsToolbar = false;

  console.log("toolbar once-per-selection check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
