// Cut/delete compatibility self-check for contenteditable editors.
// usage: node scripts/test-cut-compat.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/15-text-correct.js"),
  "utf8"
);

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = init.bubbles;
    this.cancelable = init.cancelable;
  }
}

const inputProto = {};
Object.defineProperty(inputProto, "value", {
  set(value) {
    this._value = value;
  },
  configurable: true,
});
const windowStub = {
  HTMLInputElement: { prototype: inputProto },
  HTMLTextAreaElement: { prototype: inputProto },
  getSelection: () => null,
};
const documentStub = { execCommand: () => false };
const { deleteSelectedText } = new Function(
  "window",
  "document",
  "Range",
  "InputEvent",
  "Event",
  `${src}\nreturn { deleteSelectedText };`
)(windowStub, documentStub, class Range {}, undefined, FakeEvent);

// Native input: value is replaced and DOM events are dispatched for frameworks.
{
  const events = [];
  const target = {
    tagName: "INPUT",
    _value: "hello world",
    selectionStart: 0,
    selectionEnd: 5,
    get value() {
      return this._value;
    },
    set value(value) {
      this._value = value;
    },
    focus() {},
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  };
  assert.strictEqual(deleteSelectedText(target, { start: 0, end: 5 }), true);
  assert.strictEqual(target.value, " world");
  assert.strictEqual(target.selectionStart, 0);
  assert.deepStrictEqual(events, ["beforeinput", "input", "change"]);
}

// Contenteditable editor that reports success but keeps the text (the Vditor
// case): fall back to deleting the live Range and notifying input listeners.
{
  let deleted = false;
  const target = {
    isContentEditable: true,
    textContent: "hello",
    focus() {},
    dispatchEvent() {
      return true;
    },
  };
  const range = {
    deleteContents() {
      deleted = true;
      target.textContent = "";
    },
  };
  const selection = {
    rangeCount: 1,
    isCollapsed: false,
    getRangeAt: () => range,
    removeAllRanges() {},
    addRange() {},
  };
  windowStub.getSelection = () => selection;
  documentStub.execCommand = () => true;

  assert.strictEqual(deleteSelectedText(target, null), true);
  assert.strictEqual(deleted, true);
  assert.strictEqual(target.textContent, "");
}

console.log("cut compatibility check passed");
