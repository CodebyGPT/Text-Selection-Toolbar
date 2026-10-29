// Scroll/resize anchor policy self-check.
// The toolbar follows its stored range, freezes when the anchor leaves the
// viewport, and is only destroyed by the explicit "hide" setting.
// usage: node scripts/test-scroll-anchor.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const geomSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/07-selection.js"),
  "utf8"
);
const eventsSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

// --- anchor geometry -------------------------------------------------------
const win = { innerWidth: 1000, innerHeight: 800 };
const geom = new Function(
  "window",
  `let toolbarAnchor = null;
   ${geomSrc}
   return { rememberToolbarAnchor, getToolbarAnchorRect, isOutsideViewport };`
)(win);

const rectIn = { left: 10, top: 100, right: 80, bottom: 120, width: 70, height: 20 };
const rectOut = { left: 10, top: -60, right: 80, bottom: -40, width: 70, height: 20 };
const range = {
  startContainer: { isConnected: true },
  getClientRects: () => [rectIn, rectOut],
};

geom.rememberToolbarAnchor(range, { isBackward: false, isVertical: false });
assert.deepStrictEqual(geom.getToolbarAnchorRect(), rectOut, "forward selection anchors at its end");
geom.rememberToolbarAnchor(range, { isBackward: true });
assert.deepStrictEqual(geom.getToolbarAnchorRect(), rectIn, "backward selection anchors at its start");
assert.strictEqual(geom.isOutsideViewport(rectOut), true, "anchor above the viewport is outside");
assert.strictEqual(geom.isOutsideViewport(rectIn), false, "visible anchor is inside");

const detached = { startContainer: { isConnected: false }, getClientRects: () => [] };
geom.rememberToolbarAnchor(detached, null);
assert.strictEqual(geom.getToolbarAnchorRect(), null, "a detached range has no anchor");
geom.rememberToolbarAnchor(null, null);
assert.strictEqual(geom.getToolbarAnchorRect(), null, "no anchor after dismissal");

// --- scroll handler policy -------------------------------------------------
const SCROLL_REPAINT_MODE = { KEEP: "always", HIDE: "hide" };
let placeCalls = 0;
let hideCalls = 0;
let mode = SCROLL_REPAINT_MODE.KEEP;
let anchor = rectIn;
let visible = true;
const btn = {
  classList: {
    contains: (name) => (name === "visible" ? visible : false),
  },
};
const shadow = {
  querySelector: (selector) => (selector === ".sc-container" ? btn : null),
};
const host = {};

const api = new Function(
  "window",
  "document",
  "hostElement",
  "shadowRoot",
  "getConfig",
  "getToolbarAnchorRect",
  "isOutsideViewport",
  "placeToolbar",
  "hideUI",
  "repositionLinkMenu",
  "SCROLL_REPAINT_MODE",
  `${eventsSrc}
   return { handleResizeOrScroll };`
)(
  win,
  {},
  host,
  shadow,
  () => mode,
  () => anchor,
  (r) => r === rectOut,
  () => { placeCalls += 1; },
  () => { hideCalls += 1; },
  () => true,
  SCROLL_REPAINT_MODE
);

const reset = () => { placeCalls = 0; hideCalls = 0; };

reset();
api.handleResizeOrScroll();
assert.strictEqual(placeCalls, 1, "an in-view anchor keeps following");
assert.strictEqual(hideCalls, 0, "an in-view anchor is not hidden");

reset();
anchor = rectOut;
api.handleResizeOrScroll();
assert.strictEqual(placeCalls, 0, "an out-of-view anchor freezes the bar");
assert.strictEqual(hideCalls, 0, "default mode keeps the bar visible");

reset();
mode = SCROLL_REPAINT_MODE.HIDE;
api.handleResizeOrScroll();
assert.strictEqual(hideCalls, 1, "hide mode destroys the bar when the anchor leaves");
assert.strictEqual(placeCalls, 0, "hide mode does not follow an invisible anchor");

reset();
mode = SCROLL_REPAINT_MODE.KEEP;
anchor = null;
api.handleResizeOrScroll();
assert.strictEqual(placeCalls, 0, "a missing anchor never dismisses or moves the bar");
assert.strictEqual(hideCalls, 0, "a missing anchor keeps the bar alive");

reset();
visible = false;
anchor = rectIn;
api.handleResizeOrScroll();
assert.strictEqual(placeCalls, 0, "a dismissed bar is never resurrected by scrolling");
assert.strictEqual(hideCalls, 0, "a dismissed bar needs no extra hide");

console.log("scroll anchor check passed");
