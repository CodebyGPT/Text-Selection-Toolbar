// IDN homograph guard self-check: SLD detection, page-load navigation checks,
// and combined right-click warnings with the safe-copy link check.
// usage: node scripts/test-idn-guard.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const safeSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/23-safe-copy.js"),
  "utf8"
);
const idnSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/24-idn-guard.js"),
  "utf8"
);

const messages = [];
const showToast = (message) => messages.push(message);
const t = (key, arg) => {
  if (key === "alarm_ack") return `ACK:${arg}`;
  return key;
};

let mode = "toast";
let alarmEnabled = false;
let linkScope = "domain";
const getConfig = (key) => {
  if (key === "idnGuardMode") return mode;
  if (key === "enableSafeCopyAlarm") return alarmEnabled;
  if (key === "safeCopyLinkScope") return linkScope;
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

function findByClass(root, className) {
  for (const child of root.children) {
    if (child.className === className) return child;
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

function findAllByClass(root, className, out = []) {
  for (const child of root.children) {
    if (child.className === className) out.push(child);
    findAllByClass(child, className, out);
  }
  return out;
}

function makeAnchor({ href, text, rawHref, tagName = "A" }) {
  return {
    nodeType: 1,
    tagName,
    href,
    textContent: text,
    getAttribute: (name) =>
      name === "href" ? (rawHref === undefined ? href : rawHref) : null,
  };
}

function makeContextMenuEvent(target) {
  return {
    isTrusted: true,
    target,
    clientX: 0,
    clientY: 0,
    composedPath: () => [target],
  };
}

function findAlarmHost(doc) {
  return doc.documentElement.children.find(
    (child) => child.id === "tm-safe-copy-alarm-host"
  );
}

const windowStub = {
  innerWidth: 1000,
  innerHeight: 800,
  getComputedStyle: (element) => element.__style,
  getSelection: () => null,
  addEventListener() {},
  navigation: null,
};

function load(doc, locationStub) {
  return new Function(
    "window",
    "document",
    "location",
    "getConfig",
    "getSelectionFromEvent",
    "showToast",
    "t",
    "setInterval",
    "clearInterval",
    "Date",
    `${safeSrc}\n${idnSrc}\nreturn {
      getIdnWarningsForHosts,
      getIdnWarningsForUrl,
      getIdnWarningsForAnchor,
      getIdnGuardMode,
      checkIdnPage,
      initIdnGuard,
      showSecurityWarnings,
      handleSafeCopyContextMenu
    };`
  )(
    windowStub,
    doc,
    locationStub,
    getConfig,
    () => ({ selection: null }),
    showToast,
    t,
    () => 1,
    () => {},
    { now: () => 1000 }
  );
}

const ctx = load(makeFakeDocument(), {
  hostname: "example.com",
  href: "https://example.com/",
});

// --- SLD detection -------------------------------------------------------
assert.deepStrictEqual(
  ctx.getIdnWarningsForHosts(["例子.com"], false).map((n) => n.idn),
  ["nonascii"]
);
assert.deepStrictEqual(
  ctx.getIdnWarningsForHosts(["www.xn--fsqu00a.com"], false).map((n) => n.idn),
  ["punycode"]
);
// Punycode is detected even with a multi-label public suffix (SLD is not the
// last label there), while raw non-ASCII stays limited to the registrable part.
assert.deepStrictEqual(
  ctx.getIdnWarningsForHosts(["xn--fsqu00a.co.uk"], false).map((n) => n.idn),
  ["punycode"]
);
assert.deepStrictEqual(ctx.getIdnWarningsForHosts(["www.example.com"], false), []);
// A non-ASCII subdomain alone is not the registrable domain.
assert.deepStrictEqual(ctx.getIdnWarningsForHosts(["例子.example.com"], false), []);
assert.deepStrictEqual(
  ctx.getIdnWarningsForHosts(["sub.例子.com"], false).map((n) => n.idn),
  ["nonascii"]
);
// Both signals can exist at once; each is reported once.
assert.deepStrictEqual(
  ctx.getIdnWarningsForHosts(["例子.xn--p1ai"], false).map((n) => n.idn).sort(),
  ["nonascii", "punycode"]
);
assert.deepStrictEqual(
  ctx.getIdnWarningsForUrl("https://例子.com/path", true).map((n) => n.idn),
  ["nonascii"]
);

// --- Page check: toast is the default ------------------------------------
{
  messages.length = 0;
  mode = "toast";
  alarmEnabled = false;
  const doc = makeFakeDocument();
  const loc = { hostname: "xn--fsqu00a.com", href: "https://xn--fsqu00a.com/" };
  const pageCtx = load(doc, loc);
  pageCtx.checkIdnPage();
  assert.deepStrictEqual(messages, ["toast_idn_punycode"]);
  assert.strictEqual(findAlarmHost(doc), undefined);
}

// --- Page check: full-screen option --------------------------------------
{
  messages.length = 0;
  mode = "fullscreen";
  const doc = makeFakeDocument();
  const pageCtx = load(doc, {
    hostname: "xn--fsqu00a.com",
    href: "https://xn--fsqu00a.com/",
  });
  pageCtx.checkIdnPage();
  assert.deepStrictEqual(messages, []);
  const host = findAlarmHost(doc);
  assert.ok(host);
  // One layer below the toolbar host so a toast stays readable above it.
  assert.strictEqual(host.style.zIndex, "2147483646");
  assert.strictEqual(
    findByClass(host.shadowRoot, "sc-guard-title").textContent,
    "alarm_title_idn_punycode"
  );
  assert.strictEqual(
    findByClass(host.shadowRoot, "sc-guard-body").textContent,
    "alarm_body_idn_punycode"
  );
}

// --- Page check: disabled stays silent -----------------------------------
{
  messages.length = 0;
  mode = "disabled";
  const doc = makeFakeDocument();
  const pageCtx = load(doc, {
    hostname: "xn--fsqu00a.com",
    href: "https://xn--fsqu00a.com/",
  });
  pageCtx.checkIdnPage();
  assert.deepStrictEqual(messages, []);
  assert.strictEqual(findAlarmHost(doc), undefined);
}

// --- Right-click: both toasts in one notification ------------------------
{
  messages.length = 0;
  mode = "toast";
  alarmEnabled = false;
  linkScope = "domain";
  const doc = makeFakeDocument();
  const contextCtx = load(doc, {
    hostname: "example.com",
    href: "https://example.com/",
  });
  const anchor = makeAnchor({
    href: "https://xn--fsqu00a.com/verify",
    rawHref: "https://例子.com/verify",
    text: "https://www.bank.example/login",
  });
  contextCtx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.strictEqual(messages.length, 1);
  assert.deepStrictEqual(messages[0].split("\n"), [
    "toast_copy_link",
    "toast_idn_selected_nonascii",
  ]);
  assert.strictEqual(findAlarmHost(doc), undefined);
}

// --- Right-click: both full-screen notices in one overlay ----------------
{
  messages.length = 0;
  mode = "fullscreen";
  alarmEnabled = true;
  linkScope = "domain";
  const doc = makeFakeDocument();
  const contextCtx = load(doc, {
    hostname: "example.com",
    href: "https://example.com/",
  });
  const anchor = makeAnchor({
    href: "https://xn--fsqu00a.com/verify",
    rawHref: "https://例子.com/verify",
    text: "https://www.bank.example/login",
  });
  contextCtx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  // The link mismatch toast remains; the IDN warning is full-screen only.
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
  const host = findAlarmHost(doc);
  assert.ok(host);
  const titles = findAllByClass(host.shadowRoot, "sc-guard-title").map(
    (node) => node.textContent
  );
  const bodies = findAllByClass(host.shadowRoot, "sc-guard-body").map(
    (node) => node.textContent
  );
  assert.deepStrictEqual(titles, ["alarm_title_link", "alarm_title_idn_nonascii"]);
  assert.deepStrictEqual(bodies, [
    "alarm_body_link",
    "alarm_body_idn_selected_nonascii",
  ]);
  assert.strictEqual(
    findAllByClass(host.shadowRoot, "sc-guard-ack").length,
    1
  );
}

// --- Right-click: IDN toast stays above the safe-copy full-screen alarm ---
{
  messages.length = 0;
  mode = "toast";
  alarmEnabled = true;
  linkScope = "domain";
  const doc = makeFakeDocument();
  const contextCtx = load(doc, {
    hostname: "example.com",
    href: "https://example.com/",
  });
  const anchor = makeAnchor({
    href: "https://xn--fsqu00a.com/verify",
    rawHref: "https://例子.com/verify",
    text: "https://www.bank.example/login",
  });
  contextCtx.handleSafeCopyContextMenu(makeContextMenuEvent(anchor));
  assert.deepStrictEqual(messages, [
    "toast_copy_link\ntoast_idn_selected_nonascii",
  ]);
  const host = findAlarmHost(doc);
  assert.ok(host);
  // The alarm renders only the link warning; the IDN toast must paint above it.
  assert.strictEqual(host.style.zIndex, "2147483646");
  assert.deepStrictEqual(
    findAllByClass(host.shadowRoot, "sc-guard-title").map((n) => n.textContent),
    ["alarm_title_link"]
  );
}

// --- Right-click: one feature off, the other still warns -----------------
{
  messages.length = 0;
  mode = "disabled";
  alarmEnabled = false;
  const doc = makeFakeDocument();
  const contextCtx = load(doc, {
    hostname: "example.com",
    href: "https://example.com/",
  });
  contextCtx.handleSafeCopyContextMenu(
    makeContextMenuEvent(
      makeAnchor({
        href: "https://xn--fsqu00a.com/verify",
        rawHref: "https://例子.com/verify",
        text: "https://www.bank.example/login",
      })
    )
  );
  assert.deepStrictEqual(messages, ["toast_copy_link"]);
  assert.strictEqual(findAlarmHost(doc), undefined);
}

// --- Right-click: IDN only, plain text right-click stays silent ----------
{
  messages.length = 0;
  mode = "toast";
  alarmEnabled = false;
  linkScope = "off";
  const doc = makeFakeDocument();
  const contextCtx = load(doc, {
    hostname: "example.com",
    href: "https://example.com/",
  });
  contextCtx.handleSafeCopyContextMenu(
    makeContextMenuEvent(
      makeAnchor({
        href: "https://xn--fsqu00a.com/verify",
        rawHref: "https://xn--fsqu00a.com/verify",
        text: "verify now",
      })
    )
  );
  assert.deepStrictEqual(messages, ["toast_idn_selected_punycode"]);

  messages.length = 0;
  contextCtx.handleSafeCopyContextMenu(
    makeContextMenuEvent({ nodeType: 1, tagName: "SPAN", parentElement: null })
  );
  assert.deepStrictEqual(messages, []);
}

console.log("idn guard check passed");
