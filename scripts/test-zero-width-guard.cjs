// Zero-width identifier guard self-check: thresholds, clipboard scanning and
// stacking with the other safe-copy warnings.
// usage: node scripts/test-zero-width-guard.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const safeSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/23-safe-copy.js"),
  "utf8"
);
const zeroSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/25-zero-width-guard.js"),
  "utf8"
);

const messages = [];
const showToast = (message) => messages.push(message);
const t = (key, arg) => {
  if (key === "alarm_ack") return `ACK:${arg}`;
  if (key === "alarm_body_zero_width") return "ZERO:%s|%r";
  return key;
};

let sensitivity = "low";
let alarmEnabled = false;
const getConfig = (key) => {
  if (key === "zeroWidthGuardSensitivity") return sensitivity;
  if (key === "enableSafeCopyAlarm") return alarmEnabled;
  if (key === "safeCopyLinkScope") return "domain";
  return undefined;
};

function makeFakeDocument() {
  function makeNode(tag) {
    const listeners = {};
    const node = {
      tagName: String(tag).toUpperCase(),
      nodeType: 1,
      style: {},
      children: [],
      parentNode: null,
      id: "",
      className: "",
      textContent: "",
      innerHTML: "",
      isConnected: false,
      setAttribute() {},
      appendChild(child) {
        child.parentNode = node;
        node.children.push(child);
        child.isConnected = true;
        return child;
      },
      removeChild(child) {
        const index = node.children.indexOf(child);
        if (index >= 0) node.children.splice(index, 1);
        child.parentNode = null;
        child.isConnected = false;
      },
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
      removeEventListener(type) {
        delete listeners[type];
      },
      attachShadow() {
        const shadow = makeNode("#shadow");
        node.shadowRoot = shadow;
        return shadow;
      },
      click() {
        if (listeners.click) listeners.click();
      },
      __listeners: listeners,
    };
    return node;
  }

  return {
    documentElement: makeNode("html"),
    createElement: (tag) => makeNode(tag),
  };
}

function findByClass(root, className, out = []) {
  for (const child of root.children) {
    if (child.className === className) out.push(child);
    findByClass(child, className, out);
  }
  return out;
}

function findAlarmHost(doc) {
  return doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
}

const visibleStyle = {
  display: "block",
  visibility: "visible",
  opacity: "1",
  fontSize: "16px",
  position: "static",
};

function makeSelection(text) {
  const root = {
    nodeType: 1,
    tagName: "DIV",
    textContent: text,
    __style: visibleStyle,
    parentElement: null,
    getBoundingClientRect: () => ({
      width: 100,
      height: 20,
      left: 0,
      top: 0,
      right: 100,
      bottom: 20,
    }),
    querySelectorAll: () => [],
  };
  const range = { commonAncestorContainer: root };
  return {
    rangeCount: 1,
    getRangeAt: () => range,
    containsNode: () => false,
    toString: () => text,
  };
}

function makeCopyEvent({ clipboard, selection }) {
  return {
    isTrusted: true,
    target: null,
    composedPath: () => [{}],
    clipboardData: clipboard === undefined ? null : {
      getData: () => clipboard,
      setData: () => {},
    },
    preventDefault() {},
    stopPropagation() {},
    __selection: selection,
  };
}

const windowStub = {
  innerWidth: 1000,
  innerHeight: 800,
  getComputedStyle: (element) => element.__style,
  getSelection: () => null,
};

function load(doc) {
  return new Function(
    "window",
    "document",
    "getConfig",
    "getSelectionFromEvent",
    "showToast",
    "t",
    "setInterval",
    "clearInterval",
    "Date",
    `${safeSrc}\n${zeroSrc}\nreturn { scanZeroWidthIdentifier, handleSafeCopyCheck };`
  )(
    windowStub,
    doc,
    getConfig,
    (event) => ({ selection: event.__selection }),
    showToast,
    t,
    () => 1,
    () => {},
    { now: () => 1000 }
  );
}

// --- Sensitivity thresholds ----------------------------------------------
const ctx = load(makeFakeDocument());
const hit = (text) => ctx.scanZeroWidthIdentifier(text);
const zw = (count) => "\u200B".repeat(count);
const spaced = (count) => Array.from({ length: count }, () => "\u200B").join("a");

sensitivity = "high";
assert.deepStrictEqual(hit(zw(3)), { total: 3, run: 3 });
assert.deepStrictEqual(hit("a" + spaced(5)), { total: 5, run: 1 });
assert.strictEqual(hit(zw(2)), null);
assert.strictEqual(hit(spaced(4)), null);

sensitivity = "medium";
assert.deepStrictEqual(hit(zw(6)), { total: 6, run: 6 });
assert.deepStrictEqual(hit(spaced(8)), { total: 8, run: 1 });
assert.strictEqual(hit(zw(5)), null);
assert.strictEqual(hit(spaced(7)), null);

// Default (and unrecognised values) behave as low sensitivity.
sensitivity = "low";
assert.deepStrictEqual(hit(zw(10)), { total: 10, run: 10 });
assert.deepStrictEqual(hit(spaced(12)), { total: 12, run: 1 });
assert.strictEqual(hit(zw(9)), null);
assert.strictEqual(hit(spaced(11)), null);
sensitivity = "unknown";
assert.deepStrictEqual(hit(zw(10)), { total: 10, run: 10 });

sensitivity = "verylow";
assert.deepStrictEqual(hit(zw(16)), { total: 16, run: 16 });
assert.strictEqual(hit(spaced(20)), null);

sensitivity = "disabled";
assert.strictEqual(hit(zw(50)), null);

// The documented characters are recognised; plain text is not.
sensitivity = "high";
assert.deepStrictEqual(hit("\u200B\u200C\u200D"), { total: 3, run: 3 });
assert.deepStrictEqual(hit("\uFEFF\u2060\u180E"), { total: 3, run: 3 });
assert.strictEqual(hit("hello world"), null);

// --- Clipboard rewrite + zero-width identifiers stack together -----------
{
  messages.length = 0;
  sensitivity = "high";
  alarmEnabled = true;
  const doc = makeFakeDocument();
  const copyCtx = load(doc);
  const selection = makeSelection("hello");
  copyCtx.handleSafeCopyCheck(
    makeCopyEvent({ clipboard: "evil\u200B\u200C\u200D", selection })
  );

  assert.deepStrictEqual(messages, [
    "toast_copy_altered\ntoast_copy_zero_width",
  ]);
  const host = findAlarmHost(doc);
  assert.ok(host);
  const titles = findByClass(host.shadowRoot, "sc-guard-title").map(
    (node) => node.textContent
  );
  const bodies = findByClass(host.shadowRoot, "sc-guard-body").map(
    (node) => node.textContent
  );
  assert.deepStrictEqual(titles, [
    "alarm_title_altered",
    "alarm_title_zero_width",
  ]);
  assert.deepStrictEqual(bodies, ["alarm_body_altered", "ZERO:3|3"]);
}

// --- Zero-width warning can appear without an alteration warning ---------
{
  messages.length = 0;
  sensitivity = "low";
  alarmEnabled = false;
  const doc = makeFakeDocument();
  const copyCtx = load(doc);
  const selection = makeSelection("hello" + zw(10));
  copyCtx.handleSafeCopyCheck(
    makeCopyEvent({ clipboard: "hello" + zw(10), selection })
  );
  assert.deepStrictEqual(messages, ["toast_copy_zero_width"]);
  assert.strictEqual(findAlarmHost(doc), undefined);
}

// --- A short run below the low threshold stays silent --------------------
{
  messages.length = 0;
  sensitivity = "low";
  alarmEnabled = false;
  const doc = makeFakeDocument();
  const copyCtx = load(doc);
  const selection = makeSelection("hello" + zw(9));
  copyCtx.handleSafeCopyCheck(
    makeCopyEvent({ clipboard: "hello" + zw(9), selection })
  );
  assert.deepStrictEqual(messages, []);
}

console.log("zero-width guard check passed");
