// Page selection whitespace trimming self-check.
// usage: node scripts/test-whitespace-trim.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);

function makeSelection(text) {
  const node = {
    nodeType: 3,
    data: text,
    parentNode: {},
  };
  const range = {
    commonAncestorContainer: node,
    startContainer: node,
    startOffset: 0,
    endContainer: node,
    endOffset: text.length,
    intersectsNode: () => true,
    setStart(target, offset) {
      this.startContainer = target;
      this.startOffset = offset;
    },
    setEnd(target, offset) {
      this.endContainer = target;
      this.endOffset = offset;
    },
  };
  let added = null;
  const selection = {
    getRangeAt: () => range,
    removeAllRanges() {},
    addRange(value) {
      added = value;
    },
  };
  return { node, range, selection, getAdded: () => added };
}

const documentStub = {};

{
  const data = makeSelection("   链接：example.com ");
  const documentStub = {
    createTreeWalker() {
      let done = false;
      return {
        nextNode() {
          if (done) return null;
          done = true;
          return data.node;
        },
      };
    },
  };
  const { trimRangeWhitespace } = new Function(
    "document",
    "NodeFilter",
    `${src}\nreturn { trimRangeWhitespace };`
  )(documentStub, { SHOW_TEXT: 4 });
  assert.strictEqual(trimRangeWhitespace(data.selection), true);
  assert.strictEqual(data.range.startOffset, 3);
  assert.strictEqual(data.range.endOffset, data.node.data.length - 1);
  assert.strictEqual(data.getAdded(), data.range);
}

{
  const data = makeSelection("   ");
  const documentStub = {
    createTreeWalker() {
      let done = false;
      return {
        nextNode() {
          if (done) return null;
          done = true;
          return data.node;
        },
      };
    },
  };
  const { trimRangeWhitespace } = new Function(
    "document",
    "NodeFilter",
    `${src}\nreturn { trimRangeWhitespace };`
  )(documentStub, { SHOW_TEXT: 4 });
  assert.strictEqual(trimRangeWhitespace(data.selection), false);
}

console.log("whitespace trim check passed");
