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
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeDataTransfer {
  constructor() {
    this.data = {};
  }
  setData(type, value) {
    this.data[type] = value;
  }
  getData(type) {
    return this.data[type] || "";
  }
}

class FakeClipboardEvent extends FakeEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.clipboardData = init.clipboardData;
  }
}

const messages = [];
const showToast = (message) => messages.push(message);
const t = (key) => key;

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
const { deleteSelectedText, performPaste } = new Function(
  "window",
  "document",
  "Range",
  "InputEvent",
  "Event",
  "ClipboardEvent",
  "DataTransfer",
  "showToast",
  "t",
  "getConfig",
  "getSelectionForRoot",
  `${src}\nreturn { deleteSelectedText, performPaste };`
)(
  windowStub,
  documentStub,
  class Range {},
  undefined,
  FakeEvent,
  FakeClipboardEvent,
  FakeDataTransfer,
  showToast,
  t,
  () => false,
  (root) =>
    root && typeof root.getSelection === "function"
      ? root.getSelection()
      : windowStub.getSelection()
);

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

// A controlled editor that handles the synthetic paste event must not also
// receive the execCommand fallback (which is what left Baidu Translate's model
// empty while the DOM showed text).
{
  let execCalls = 0;
  documentStub.execCommand = () => {
    execCalls++;
    return true;
  };
  const target = {
    tagName: "DIV",
    isContentEditable: true,
    textContent: "",
    focus() {},
    dispatchEvent(event) {
      if (event.type === "paste") {
        assert.strictEqual(event.clipboardData.getData("text/plain"), "hello");
        event.preventDefault();
      }
      return true;
    },
  };
  messages.length = 0;
  performPaste(target, "hello");
  assert.strictEqual(execCalls, 0);
  assert.deepStrictEqual(messages, ["toast_pasted"]);
}

// When no editor handles paste, fall back to execCommand.
{
  let execCalls = 0;
  documentStub.execCommand = (command, ui, value) => {
    execCalls++;
    assert.strictEqual(command, "insertText");
    assert.strictEqual(value, "hello");
    return true;
  };
  const target = {
    tagName: "DIV",
    isContentEditable: true,
    focus() {},
    dispatchEvent() {
      return true;
    },
  };
  messages.length = 0;
  performPaste(target, "hello");
  assert.strictEqual(execCalls, 1);
  assert.deepStrictEqual(messages, ["toast_pasted"]);
}

console.log("cut compatibility check passed");
