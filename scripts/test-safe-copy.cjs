// Safe copy self-check: read-only detection of altered clipboard data, hidden
// text and mismatched link targets, plus the optional full-screen reminder.
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
  if (key === "alarm_body_link") return "LINKBODY:%s|%l";
  if (key === "alarm_ack") return `ACK:${arg}`;
  return key;
};
let alarmEnabled = false;
let linkScope = "domain";
const getConfig = (key) =>
  key === "safeCopyLinkScope" ? linkScope : alarmEnabled;

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

function makeAnchor({ href, text }) {
  return {
    nodeType: 1,
    tagName: "A",
    href,
    textContent: text,
    getAttribute: (name) => (name === "href" ? href : null),
  };
}

function makeHiddenRootSelection(text) {
  const root = {
    nodeType: 1,
    tagName: "SPAN",
    textContent: text,
    __style: {
      display: "block",
      visibility: "visible",
      opacity: "0",
      fontSize: "15px",
      position: "static",
    },
    getBoundingClientRect: () => ({
      width: 423, height: 21, left: 0, top: -141, right: 423, bottom: -120,
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

function makeContextMenuEvent(anchor, trusted = true) {
  return {
    isTrusted: trusted,
    target: anchor,
    clientX: 0,
    clientY: 0,
    composedPath: () => [anchor],
  };
}

function makeAlarmButton(rect) {
  return {
    style: {},
    textContent: "",
    getBoundingClientRect: () => rect,
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
    `${src}\nreturn { handleSafeCopyCheck, handleSafeCopyContextMenu, handleSafeCopyDragStart, getSafeCopyAlarmRemaining, formatSafeCopyAlarmBody, buildVisibleSelectionText, avoidSafeCopyAlarmPointer };`
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

// A fully hidden selection is a page-driven copy buffer, not user content.
// X's "Copy link" selects an opacity:0 span before execCommand; that must not
// warn, while the visible+hidden mixes above still do.
{
  messages.length = 0;
  const url = "https://x.com/daddyyuki/status/2115011025011347834?s=20";
  const selection = makeHiddenRootSelection(url);
  ctx.handleSafeCopyCheck(makeEvent({ clipboard: url, selection }).event);
  assert.deepStrictEqual(messages, []);
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

// A plain copy of a link's visible text copies that text, not the href: the
// <a> target is not "the copied link" and must not raise a mismatch warning.
{
  messages.length = 0;
  const anchor = makeAnchor({
    href: "https://login.bank.example.secure-verify.top/account",
    text: "https://www.bank.example/login",
  });
  const selection = makeSelection("https://www.bank.example/login", [anchor]);
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "https://www.bank.example/login", selection }).event
  );
  assert.deepStrictEqual(messages, []);
}

// The copy path only reports altered/hidden content. Link consistency lives
// in the right-click check, so a rewritten URL is an "altered" warning here.
{
  messages.length = 0;
  const selection = makeSelection("https://shop.example.com/item");
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "https://shop.example.com.evil.top/item", selection }).event
  );
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
}

{
  messages.length = 0;
  const selection = makeSelection("baidu.com");
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "https://baidu.com/", selection }).event
  );
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
}

// Version- and filename-looking labels are not links for the right-click check.
{
  messages.length = 0;
  const anchor = makeAnchor({ href: "https://evil.example/", text: "v1.2.3" });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
}

{
  messages.length = 0;
  const anchor = makeAnchor({
    href: "https://files.example.com/readme.txt",
    text: "readme.txt",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
}

// Right-clicking a link whose visible text is another URL warns before the
// browser copies anything (default scope: full hostname).
{
  messages.length = 0;
  linkScope = "domain";
  const anchor = makeAnchor({
    href: "https://login.bank.example.secure-verify.top/account",
    text: "https://www.bank.example/login",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
}

// Same hostname, different path stays quiet at the default scope.
{
  messages.length = 0;
  linkScope = "domain";
  const anchor = makeAnchor({
    href: "https://shop.example.com/other",
    text: "shop.example.com/item",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
}

// The full-link scope also compares the path.
{
  messages.length = 0;
  linkScope = "full";
  const anchor = makeAnchor({
    href: "https://shop.example.com/other",
    text: "shop.example.com/item",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
  linkScope = "domain";
}

// SLD scope ignores subdomains.
{
  messages.length = 0;
  linkScope = "sld";
  const anchor = makeAnchor({
    href: "https://login.example.com/x",
    text: "https://www.example.com/login",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
  linkScope = "domain";
}

// Disabled scope, non-URL labels and synthetic events stay quiet.
{
  messages.length = 0;
  linkScope = "off";
  const anchor = makeAnchor({
    href: "https://evil.example/",
    text: "https://www.bank.example/login",
  });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
  linkScope = "domain";

  messages.length = 0;
  const plain = makeAnchor({ href: "https://evil.example/", text: "Click here" });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(plain));
  assert.deepStrictEqual(messages, []);

  messages.length = 0;
  const fake = makeAnchor({ href: "https://evil.example/", text: "bank.com" });
  ctx.handleSafeCopyContextMenu(makeContextMenuEvent(fake, false));
  assert.deepStrictEqual(messages, []);
}

// The scope setting never changes copy-time warnings: copying a rewritten
// URL is still an "altered" warning, not a link warning.
{
  messages.length = 0;
  linkScope = "full";
  const selection = makeSelection("https://a.example.com/x");
  ctx.handleSafeCopyCheck(
    makeEvent({ clipboard: "https://a.example.com/y", selection }).event
  );
  assert.deepStrictEqual(messages, ["toast_copy_altered"]);
  linkScope = "domain";
}

// The right-click reminder names the real destination. Its backdrop is
// click-through (only the acknowledge button takes input), so the native
// context menu keeps working, and the user can still close it manually.
{
  messages.length = 0;
  alarmEnabled = true;
  const doc = makeFakeDocument();
  const passiveNow = { value: 1000 };
  const passiveTimers = { next: 1, timers: new Map() };
  const alarmCtx = load(doc, passiveNow, passiveTimers);
  const anchor = makeAnchor({
    href: "https://login.bank.example.secure-verify.top/account",
    text: "https://www.bank.example/login",
  });
  alarmCtx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
  const host = doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
  assert.ok(host);
  assert.strictEqual(host.style.pointerEvents, "none");
  assert.strictEqual(
    findByClass(host.shadowRoot, "sc-guard-title").textContent,
    "alarm_title_link"
  );
  assert.strictEqual(
    findByClass(host.shadowRoot, "sc-guard-body").textContent,
    "LINKBODY:https://www.bank.example/login|https://login.bank.example.secure-verify.top/account"
  );
  const ack = findByClass(host.shadowRoot, "sc-guard-ack");
  assert.ok(ack);
  assert.strictEqual(ack.textContent, "ACK:15");
  ack.click();
  assert.strictEqual(host.isConnected, false);

  // A fresh right-click warning still auto-closes on the 15s timer.
  alarmCtx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  const host2 = doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
  assert.ok(host2);
  passiveNow.value += 15000;
  for (const tick of passiveTimers.timers.values()) tick();
  assert.strictEqual(host2.isConnected, false);
  alarmEnabled = false;
}

// The acknowledge button dodges a right-click that would land on it, by the
// smallest horizontal shift that clears the pointer. Copy alarms never dodge.
{
  const rect = { left: 400, top: 500, right: 560, bottom: 552, width: 160, height: 52 };
  const button = makeAlarmButton(rect);
  ctx.avoidSafeCopyAlarmPointer(button, { x: 430, y: 530 });
  assert.strictEqual(button.style.transform, "translate(46px, 0)");

  ctx.avoidSafeCopyAlarmPointer(button, { x: 540, y: 530 });
  assert.strictEqual(button.style.transform, "translate(-36px, 0)");

  // Pointer outside the button: no shift.
  ctx.avoidSafeCopyAlarmPointer(button, { x: 430, y: 200 });
  assert.strictEqual(button.style.transform, "");

  // No pointer (copy-event alarm): no shift.
  ctx.avoidSafeCopyAlarmPointer(button, null);
  assert.strictEqual(button.style.transform, "");
}

// Dragging a link with mismatched text warns with a toast only: the alarm is
// enabled, but a full-screen layer must never interrupt the drag.
{
  messages.length = 0;
  alarmEnabled = true;
  const doc = makeFakeDocument();
  const dragCtx = load(doc, { value: 1000 }, { next: 1, timers: new Map() });
  const anchor = makeAnchor({
    href: "https://login.bank.example.secure-verify.top/account",
    text: "https://www.bank.example/login",
  });
  dragCtx.handleSafeCopyDragStart(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
  assert.strictEqual(
    doc.documentElement.children.some(
      (child) => child.id === "tm-safe-copy-alarm-host"
    ),
    false
  );

  // Matching link and disabled scope stay quiet.
  messages.length = 0;
  dragCtx.handleSafeCopyDragStart(
    makeContextMenuEvent(
      makeAnchor({ href: "https://baidu.com/", text: "baidu.com" })
    )
  );
  assert.deepStrictEqual(messages, []);

  messages.length = 0;
  linkScope = "off";
  dragCtx.handleSafeCopyDragStart(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, []);
  linkScope = "domain";
  alarmEnabled = false;
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
