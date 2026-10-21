// Multi-link menu display self-check.
// usage: node scripts/test-link-menu.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/13-renderer.js"),
  "utf8"
);
const { truncateLinkDisplay, parseLinkDisplay } = new Function(
  `${src}\nreturn { truncateLinkDisplay, parseLinkDisplay };`
)();

assert.deepStrictEqual(parseLinkDisplay("https://www.baidu.com/s/abc"), {
  domain: "www.baidu.com",
  rest: "/s/abc",
});
assert.deepStrictEqual(parseLinkDisplay("pan.baidu.com/s/1abc"), {
  domain: "pan.baidu.com",
  rest: "/s/1abc",
});
assert.deepStrictEqual(parseLinkDisplay("HTTPS://Example.COM:8080/a"), {
  domain: "Example.COM:8080",
  rest: "/a",
});
assert.deepStrictEqual(parseLinkDisplay("https://example.com"), {
  domain: "example.com",
  rest: "",
});

assert.strictEqual(truncateLinkDisplay("a".repeat(42)), "a".repeat(42));
assert.strictEqual(truncateLinkDisplay("a".repeat(43)), `${"a".repeat(41)}…`);
assert.strictEqual(
  parseLinkDisplay(`https://example.com/${"x".repeat(40)}`).domain,
  "example.com"
);

console.log("link menu check passed");
