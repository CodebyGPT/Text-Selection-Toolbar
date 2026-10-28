// Page selection whitespace trimming self-check.
// usage: node scripts/test-whitespace-trim.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);
const load = (documentStub) =>
  new Function(
    "document",
    "NodeFilter",
    "Node",
    `${src}\nreturn { trimRangeWhitespace };`
  )(documentStub, { SHOW_TEXT: 4 }, { DOCUMENT_POSITION_PRECEDING: 2 });

function makeSelection(text, { direction, anchorOffset, focusOffset } = {}) {
  const node = { nodeType: 3, data: text, parentNode: {} };
  const range = {
    commonAncestorContainer: node,
    startContainer: node,
    startOffset: 0,
    endContainer: node,
    endOffset: text.length,
    intersectsNode: () => true,
  };
  const applied = [];
  const selection = {
    direction,
    anchorNode: node,
    focusNode: node,
    anchorOffset: anchorOffset ?? 0,
    focusOffset: focusOffset ?? text.length,
    getRangeAt: () => range,
    setBaseAndExtent(aNode, aOffset, fNode, fOffset) {
      applied.push({ aNode, aOffset, fNode, fOffset });
    },
  };
  const documentStub = {
    createTreeWalker() {
      let done = false;
      return {
        nextNode() {
          if (done) return null;
          done = true;
          return node;
        },
      };
    },
  };
  return { node, range, selection, applied, trim: load(documentStub) };
}

// Forward drag with edge whitespace: trim to the first/last visible character
// and keep the moving (focus) end last.
{
  const { node, selection, applied, trim } = makeSelection("   链接：example.com ");
  assert.strictEqual(trim.trimRangeWhitespace(selection), true);
  assert.deepStrictEqual(applied, [{
    aNode: node,
    aOffset: 3,
    fNode: node,
    fOffset: node.data.length - 1,
  }]);
}

// Backward drag: the anchor stays at the drag start (the trimmed end), the
// focus jumps to the trimmed start, so the selection keeps its direction.
{
  const { node, selection, applied, trim } = makeSelection("   链接：example.com ", {
    direction: "backward",
    anchorOffset: 20,
    focusOffset: 1,
  });
  assert.strictEqual(trim.trimRangeWhitespace(selection), true);
  assert.deepStrictEqual(applied, [{
    aNode: node,
    aOffset: node.data.length - 1,
    fNode: node,
    fOffset: 3,
  }]);
}

// No whitespace to trim: the selection must not be touched at all.
{
  const { selection, applied, trim } = makeSelection("链接：example.com", {
    direction: "backward",
    anchorOffset: 11,
    focusOffset: 0,
  });
  assert.strictEqual(trim.trimRangeWhitespace(selection), true);
  assert.deepStrictEqual(applied, []);
}

// Engines without selection.direction: fall back to the anchor/focus order.
{
  const { node, selection, applied, trim } = makeSelection("   x   ", {
    anchorOffset: 7,
    focusOffset: 3,
  });
  assert.strictEqual(trim.trimRangeWhitespace(selection), true);
  assert.deepStrictEqual(applied, [{
    aNode: node,
    aOffset: 4,
    fNode: node,
    fOffset: 3,
  }]);
}

// Whitespace-only selections report false so the toolbar stays hidden.
{
  const { selection, applied, trim } = makeSelection("   ");
  assert.strictEqual(trim.trimRangeWhitespace(selection), false);
  assert.deepStrictEqual(applied, []);
}

console.log("whitespace trim check passed");
