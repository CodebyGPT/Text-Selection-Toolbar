// Safe copy self-check: read-only detection of altered clipboard data and
// hidden text, plus the optional full-screen strong reminder.
// usage: node scripts/test-safe-copy.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/23-safe-copy.js"),
  "utf8"
);

const messages = [];
const showToast = (message) => messages.push(message);
const t = (key, arg) => {
  if (key === "alarm_body_altered" || key === "alarm_body_hidden") {
    return `BODY:${key}:%s`;
  }
  if (key === "alarm_ack") return `ACK:${arg}`;
  return key;
};
let alarmEnabled = false;
const getConfig = () => alarmEnabled;

function makeSelection(text, elements = []) {
  const root = {
    nodeType: 1,
    tagName: "DIV",
    textContent: text,
    querySelectorAll: () => elements,
  };
  const range = { commonAncestorContainer: root };
  return {
    rangeCount: 1,
    getRangeAt: () => range,
    containsNode: (element) => elements.includes(element),
    toString: () => text,
  };
}

function makeElement({ text, style, rect }) {
  return {
    nodeType: 1,
    tagName: "SPAN",
    textContent: text,
    getBoundingClientRect: () => rect,
    __style: style,
  };
}

function makeEvent({ clipboard, selection, trusted = true, target = null }) {
  const calls = { preventDefault: 0, setData: 0, stopPropagation: 0 };
  const event = {
    isTrusted: trusted,
    target,
    composedPath: () => [target || {}],
    clipboardData: clipboard === undefined ? null : {
      getData: () => clipboard,
      setData: () => { calls.setData++; },
    },
    preventDefault: () => { calls.preventDefault++; },
    stopPropagation: () => { calls.stopPropagation++; },
    __selection: selection,
  };
  return { event, calls };
}

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
      addEventListener(type, listener) { listeners[type] = listener; },
      removeEventListener(type) { delete listeners[type]; },
      attachShadow() {
        const shadow = makeNode("#shadow");
        node.shadowRoot = shadow;
        return shadow;
      },
      click() { if (listeners.click) listeners.click(); },
      __listeners: listeners,
    };
    return node;
  }

  return {
    documentElement: makeNode("html"),
    createElement: (tag) => makeNode(tag),
  };
}

function findByClass(root, className) {
  for (const child of root.children) {
    if (child.className === className) return child;
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

function makeVisibleTree() {
  const visible = {
    display: "block",
    visibility: "visible",
    opacity: "1",
    fontSize: "16px",
    position: "static",
  };
  const doc = { documentElement: null };
  const makeElement = (tag, style = visible) => ({
    nodeType: 1,
    tagName: tag,
    parentElement: null,
    parentNode: null,
    textContent: "",
    ownerDocument: doc,
    __style: style,
    getBoundingClientRect: () => ({
      width: 100, height: 20, left: 0, top: 0, right: 100, bottom: 20,
    }),
    querySelectorAll: () => [],
  });

  const html = makeElement("HTML");
  const body = makeElement("BODY");
  const paragraph = makeElement("P");
  const hiddenSpan = makeElement("SPAN", { ...visible, display: "none" });
  const br = makeElement("BR");

  const text1 = { nodeType: 3, data: "Hello ", parentElement: paragraph, parentNode: paragraph };
  const hiddenText = { nodeType: 3, data: "secret", parentElement: hiddenSpan, parentNode: hiddenSpan };
  const text2 = { nodeType: 3, data: "world", parentElement: paragraph, parentNode: paragraph };
  const text3 = { nodeType: 3, data: "line2", parentElement: paragraph, parentNode: paragraph };

  paragraph.parentElement = body;
  paragraph.parentNode = body;
  hiddenSpan.parentElement = paragraph;
  hiddenSpan.parentNode = paragraph;
  br.parentElement = paragraph;
  br.parentNode = paragraph;
  body.parentElement = html;
  body.parentNode = html;
  html.parentElement = null;
  html.parentNode = null;
  doc.documentElement = html;

  paragraph.textContent = "Hello secretworldline2";
  hiddenSpan.textContent = "secret";
  paragraph.querySelectorAll = () => [hiddenSpan, br];

  const nodes = [text1, hiddenSpan, hiddenText, text2, br, text3];
  doc.createTreeWalker = () => {
    let index = 0;
    return { nextNode: () => nodes[index++] || null };
  };

  const range = {
    commonAncestorContainer: paragraph,
    startContainer: text1,
    startOffset: 0,
    endContainer: text3,
    endOffset: 5,
    intersectsNode: () => true,
  };
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    containsNode: (element) => element === hiddenSpan,
    toString: () => "Hello secretworld\nline2",
  };
  return { doc, selection };
}

const windowStub = {
  innerWidth: 1000,
  innerHeight: 800,
  getComputedStyle: (element) => element.__style,
  getSelection: () => null,
};

function load(documentStub, nowRef, timerRef) {
  const DateStub = { now: () => nowRef.value };
  const setIntervalStub = (fn) => {
    const id = timerRef.next++;
    timerRef.timers.set(id, fn);
    return id;
  };
  const clearIntervalStub = (id) => timerRef.timers.delete(id);
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
    `${src}\nreturn { handleSafeCopyCheck, getSafeCopyAlarmRemaining, formatSafeCopyAlarmBody, buildVisibleSelectionText };`
  )(
    windowStub,
    documentStub,
    getConfig,
    (event) => ({ selection: event.__selection }),
    showToast,
    t,
    setIntervalStub,
    clearIntervalStub,
    DateStub
  );
}

function makeShadowHostTree() {
  const visible = {
    display: "block",
    visibility: "visible",
    opacity: "1",
    fontSize: "16px",
    position: "absolute",
  };
  const doc = { documentElement: null };
  const makeElement = (tag, style = visible, rect = {
    width: 100, height: 20, left: 0, top: 0, right: 100, bottom: 20,
  }) => ({
    nodeType: 1,
    tagName: tag,
    parentElement: null,
    parentNode: null,
    textContent: "",
    ownerDocument: doc,
    __style: style,
    getBoundingClientRect: () => rect,
    querySelectorAll: () => [],
  });

  const html = makeElement("HTML");
  const body = makeElement("BODY");
  const host = makeElement("DIV", visible, {
    width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0,
  });
  const paragraph = makeElement("P", visible, {
    width: 200, height: 20, left: 0, top: 0, right: 200, bottom: 20,
  });
  const text = {
    nodeType: 3,
    data: "Option name",
    parentElement: paragraph,
    parentNode: paragraph,
  };
  const shadowRoot = { nodeType: 11, host };

  paragraph.parentElement = null;
  paragraph.parentNode = shadowRoot;
  host.parentElement = body;
  host.parentNode = body;
  body.parentElement = html;
  body.parentNode = html;
  doc.documentElement = html;

  paragraph.textContent = "Option name";
  const range = {
    commonAncestorContainer: paragraph,
    startContainer: text,
    startOffset: 0,
    endContainer: text,
    endOffset: text.data.length,
    intersectsNode: () => true,
  };
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    containsNode: (element) => element === paragraph,
    toString: () => "Option name",
  };
  return { doc, selection };
}

const nowRef = { value: 1000 };
const timerRef = { next: 1, timers: new Map() };
const ctx = load(makeFakeDocument(), nowRef, timerRef);

const visibleStyle = {
  display: "block",
  visibility: "visible",
  opacity: "1",
  fontSize: "16px",
  position: "static",
};

// A page rewrote the copy data in its own handler. We only warn.
{
  messages.length = 0;
  const selection = makeSelection("hello");
  const { event, calls } = makeEvent({ clipboard: "evil", selection });
  ctx.handleSafeCopyCheck(event);
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
  assert.deepStrictEqual(calls, { preventDefault: 0, setData: 0, stopPropagation: 0 });
}

// Copying the selection unchanged stays silent.
{
  messages.length = 0;
  const selection = makeSelection("hello");
  const { event, calls } = makeEvent({ clipboard: "hello", selection });
  ctx.handleSafeCopyCheck(event);
  assert.deepStrictEqual(messages, []);
  assert.deepStrictEqual(calls, { preventDefault: 0, setData: 0, stopPropagation: 0 });
}

// Hidden element inside the selection (display / offscreen variants).
{
  messages.length = 0;
  const hidden = makeElement({
    text: "secret",
    style: { ...visibleStyle, display: "none" },
    rect: { width: 100, height: 20, left: 0, top: 0, right: 100, bottom: 20 },
  });
  const selection = makeSelection("hellosecret", [hidden]);
  ctx.handleSafeCopyCheck(makeEvent({ clipboard: "", selection }).event);
  assert.deepStrictEqual(messages, ["toast_copy_hidden"]);
}

{
  messages.length = 0;
  const offscreen = makeElement({
    text: "secret",
    style: { ...visibleStyle, position: "absolute" },
    rect: { width: 100, height: 20, left: -500, top: 0, right: -400, bottom: 20 },
  });
  const selection = makeSelection("hellosecret", [offscreen]);
  ctx.handleSafeCopyCheck(makeEvent({ clipboard: "", selection }).event);
  assert.deepStrictEqual(messages, ["toast_copy_hidden"]);
}

// A visible element never warns, even when it is scrolled out of view.
{
  messages.length = 0;
  const visible = makeElement({
    text: "secret",
    style: visibleStyle,
    rect: { width: 100, height: 20, left: 0, top: -1000, right: 100, bottom: -980 },
  });
  const selection = makeSelection("hellosecret", [visible]);
  ctx.handleSafeCopyCheck(makeEvent({ clipboard: "", selection }).event);
  assert.deepStrictEqual(messages, []);
}

// The toast is on by default; the alarm is off by default.
{
  messages.length = 0;
  alarmEnabled = false;
  const selection = makeSelection("hello");
  ctx.handleSafeCopyCheck(makeEvent({ clipboard: "evil", selection }).event);
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
}

// Input/textarea copies compare against the input's own selection.
{
  messages.length = 0;
  const input = {
    tagName: "INPUT",
    value: "hello",
    selectionStart: 0,
    selectionEnd: 5,
  };
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "evil", selection: null, target: input }).event
  );
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
}

// Synthetic events dispatched by a page are ignored.
{
  messages.length = 0;
  const selection = makeSelection("hello");
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "evil", selection, trusted: false }).event
  );
  assert.deepStrictEqual(messages, []);
}

// The strong reminder renders the full-screen warning, keeps the toast, and
// auto-closes when the deadline is reached.
{
  messages.length = 0;
  alarmEnabled = true;
  const doc = makeFakeDocument();
  const localNow = { value: 1000 };
  const localTimers = { next: 1, timers: new Map() };
  const alarmCtx = load(doc, localNow, localTimers);
  const selection = makeSelection("hello");
  alarmCtx.handleSafeCopyCheck(makeEvent({ clipboard: "evil", selection }).event);

  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
  const host = doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
  assert.ok(host);
  const shadow = host.shadowRoot;
  const title = findByClass(shadow, "sc-guard-title");
  const body = findByClass(shadow, "sc-guard-body");
  const button = findByClass(shadow, "sc-guard-ack");
  assert.strictEqual(title.textContent, "alarm_title_altered");
  assert.strictEqual(body.textContent, "BODY:alarm_body_altered:hello");
  assert.strictEqual(button.textContent, "ACK:15");

  // Countdown reaches zero: the overlay removes itself.
  localNow.value += 15000;
  for (const tick of localTimers.timers.values()) tick();
  assert.strictEqual(host.isConnected, false);

  // A new warning can be dismissed with the button.
  alarmCtx.handleSafeCopyCheck(makeEvent({ clipboard: "evil", selection }).event);
  const host2 = doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
  assert.ok(host2);
  const button2 = findByClass(host2.shadowRoot, "sc-guard-ack");
  button2.click();
  assert.strictEqual(host2.isConnected, false);
  alarmEnabled = false;
}

// Countdown math also handles a clock that jumps past the deadline.
{
  assert.strictEqual(ctx.getSafeCopyAlarmRemaining(15000, 0), 15);
  assert.strictEqual(ctx.getSafeCopyAlarmRemaining(15000, 14500), 1);
  assert.strictEqual(ctx.getSafeCopyAlarmRemaining(15000, 15000), 0);
  assert.strictEqual(ctx.getSafeCopyAlarmRemaining(15000, 16000), 0);
  assert.strictEqual(ctx.getSafeCopyAlarmRemaining(30000, 0), 15);
}

// Selection text is placed literally (no "$&" replacement semantics).
{
  assert.strictEqual(
    ctx.formatSafeCopyAlarmBody("altered", "a$&b"),
    "BODY:alarm_body_altered:a$&b"
  );
  const longText = "x".repeat(2100);
  const formatted = ctx.formatSafeCopyAlarmBody("hidden", longText);
  assert.ok(formatted.endsWith("…"));
  assert.ok(formatted.length < longText.length);
}

// Zero-sized shadow hosts (settings / panel UI) are layout wrappers, not
// hidden text. Selecting a settings option name must not warn.
{
  messages.length = 0;
  const { doc, selection } = makeShadowHostTree();
  const shadowCtx = load(doc, { value: 1000 }, { next: 1, timers: new Map() });
  shadowCtx.handleSafeCopyCheck(makeEvent({ clipboard: "", selection }).event);
  assert.deepStrictEqual(messages, []);
  assert.strictEqual(shadowCtx.buildVisibleSelectionText(selection, windowStub), null);
}

// Toolbar-copy sanitizer drops hidden text and keeps visible block breaks.
{
  const { doc, selection } = makeVisibleTree();
  const visibleCtx = load(doc, { value: 1000 }, { next: 1, timers: new Map() });
  const result = visibleCtx.buildVisibleSelectionText(selection, windowStub);
  assert.deepStrictEqual(result, { text: "Hello world\nline2", changed: true });
}

console.log("safe copy check passed");
