// Selection endpoint self-check for src/toolbar/modules/07-selection.js.
// usage: node scripts/test-selection-position.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/07-selection.js"),
  "utf8"
);
const windowStub = {
  innerWidth: 1000,
  innerHeight: 800,
  getComputedStyle: (el) => ({ writingMode: el.writingMode }),
};
const NodeStub = { DOCUMENT_POSITION_PRECEDING: 2 };
const getSmartSelectionState = new Function(
  "window",
  "Node",
  src + "\nreturn getSmartSelectionState;"
)(windowStub, NodeStub);

const rect = (left, top, width = 100, height = 20) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});
const node = ({ connected = true, writingMode = "horizontal-tb" } = {}) => ({
  nodeType: 1,
  isConnected: connected,
  writingMode,
  parentElement: null,
  compareDocumentPosition: () => 0,
});
const selection = ({ rects, anchorNode, focusNode, anchorOffset = 0, focusOffset = 0 }) => ({
  rangeCount: 1,
  anchorNode,
  focusNode,
  anchorOffset,
  focusOffset,
  getRangeAt: () => ({ getClientRects: () => rects }),
});

// Forward drag: focus is the selection tail, so use the last line rect.
{
  const anchor = node();
  const r1 = rect(10, 10);
  const r2 = rect(10, 40);
  const got = getSmartSelectionState(
    selection({ rects: [r1, r2], anchorNode: anchor, focusNode: anchor, anchorOffset: 0, focusOffset: 10 })
  );
  assert.strictEqual(got, r2);
  assert.strictEqual(got.isBackward, false);
}

// Backward drag: focus is the selection head, so use the first line rect.
{
  const anchor = node();
  const r1 = rect(10, 10);
  const r2 = rect(10, 40);
  const got = getSmartSelectionState(
    selection({ rects: [r1, r2], anchorNode: anchor, focusNode: anchor, anchorOffset: 10, focusOffset: 0 })
  );
  assert.strictEqual(got, r1);
  assert.strictEqual(got.isBackward, true);
}

// Cross-node direction and vertical writing mode.
{
  const anchor = node();
  const focus = node({ writingMode: "vertical-rl" });
  anchor.compareDocumentPosition = () => 0;
  const r1 = rect(10, 10);
  const r2 = rect(10, 40);
  const got = getSmartSelectionState(
    selection({ rects: [r1, r2], anchorNode: anchor, focusNode: focus })
  );
  assert.strictEqual(got, r2);
  assert.strictEqual(got.isVertical, true);

  anchor.compareDocumentPosition = () => NodeStub.DOCUMENT_POSITION_PRECEDING;
  const backward = getSmartSelectionState(
    selection({ rects: [r1, r2], anchorNode: anchor, focusNode: focus })
  );
  assert.strictEqual(backward, r1);
  assert.strictEqual(backward.isBackward, true);
}

// Unreliable geometry must return null so the caller falls back to the mouse.
{
  const anchor = node();
  const base = { anchorNode: anchor, focusNode: anchor };
  assert.strictEqual(
    getSmartSelectionState(selection({ ...base, rects: [] })),
    null
  );
  assert.strictEqual(
    getSmartSelectionState(selection({ ...base, rects: [rect(10, 10, 0, 0)] })),
    null
  );
  assert.strictEqual(
    getSmartSelectionState(selection({ ...base, rects: [rect(-500, -500)] })),
    null
  );
  // A valid non-endpoint rect must not replace an unreliable endpoint.
  assert.strictEqual(
    getSmartSelectionState(
      selection({ ...base, rects: [rect(10, 10), rect(-500, -500)] })
    ),
    null
  );
  assert.strictEqual(
    getSmartSelectionState(
      selection({ rects: [rect(10, 10)], anchorNode: node({ connected: false }), focusNode: anchor })
    ),
    null
  );
}

console.log("ok (selection endpoint checks)");
