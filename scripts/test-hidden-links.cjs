// Hidden <a href> link recognition self-check.
// usage: node scripts/test-hidden-links.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/13-renderer.js"),
  "utf8"
);
const documentStub = { baseURI: "https://example.com/page" };
const extractUrlsFromText = (text) => {
  try {
    const url = new URL(text);
    return [{ display: text, url: text, host: url.hostname }];
  } catch (e) {
    return [];
  }
};
const { resolveHrefLink, mergeHiddenLinks } = new Function(
  "document",
  "extractUrlsFromText",
  "window",
  "getConfig",
  `${src}\nreturn { resolveHrefLink, mergeHiddenLinks };`
)(documentStub, extractUrlsFromText, {}, () => true);

const relative = resolveHrefLink("/a/b");
assert.strictEqual(relative.url, "https://example.com/a/b");
assert.strictEqual(relative.fromHref, true);

const protocolRelative = resolveHrefLink("//cdn.example.com/x");
assert.strictEqual(protocolRelative.url, "https://cdn.example.com/x");

assert.strictEqual(resolveHrefLink("javascript:alert(1)"), null);
assert.strictEqual(resolveHrefLink("mailto:a@b.com"), null);
assert.strictEqual(resolveHrefLink("#section"), null);
assert.strictEqual(resolveHrefLink(""), null);

const textLink = { display: "https://example.com/a", url: "https://example.com/a" };
const duplicate = resolveHrefLink("https://example.com/a");
const hidden = resolveHrefLink("/hidden");
const merged = mergeHiddenLinks(
  { urls: [textLink], password: "abcd" },
  [duplicate, hidden]
);
assert.strictEqual(merged.urls.length, 2);
assert.strictEqual(merged.urls[0], textLink);
assert.strictEqual(merged.urls[1].fromHref, true);
assert.strictEqual(merged.password, "abcd");

const onlyHidden = mergeHiddenLinks(null, [hidden]);
assert.strictEqual(onlyHidden.urls.length, 1);
assert.strictEqual(onlyHidden.password, null);

console.log("hidden link check passed");
