// Lightning-paste TTL validation self-check.
// usage: node scripts/test-paste-ttl.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/02-config.js"),
  "utf8"
);
const {
  normalizePasteTtl,
  getPasteTtlMs,
  truncatePasteText,
  getPasteQuotePair,
  configCache,
} = new Function(
  `${src}\nreturn { normalizePasteTtl, getPasteTtlMs, truncatePasteText, getPasteQuotePair, configCache };`
)();

for (const [input, expected] of [
  [3, 3],
  [8, 8],
  [30, 30],
  ["10", 10],
  [2, 8],
  [31, 8],
  [8.5, 8],
  ["", 8],
  [null, 8],
  [undefined, 8],
  ["abc", 8],
]) {
  assert.strictEqual(
    normalizePasteTtl(input),
    expected,
    `normalizePasteTtl(${JSON.stringify(input)})`
  );
}

assert.strictEqual(getPasteTtlMs(), 8000);
configCache.pasteTtl = 3;
assert.strictEqual(getPasteTtlMs(), 3000);
configCache.pasteTtl = 30;
assert.strictEqual(getPasteTtlMs(), 30000);
configCache.pasteTtl = 31;
assert.strictEqual(getPasteTtlMs(), 8000);

// Half-width characters count as 0.5, full-width as 1; the ellipsis itself
// occupies the final unit.
assert.strictEqual(truncatePasteText("abcdefghijkl", 6), "abcdefghijkl");
assert.strictEqual(truncatePasteText("abcdefghijklm", 6), "abcdefghij…");
assert.strictEqual(truncatePasteText("你好世界你好", 6), "你好世界你好");
assert.strictEqual(truncatePasteText("你好世界你好啊", 6), "你好世界你…");
assert.strictEqual(truncatePasteText("你好abcdefgh", 6), "你好abcdefgh");
assert.strictEqual(truncatePasteText("你好abcdefghi", 6), "你好abcdef…");
assert.strictEqual(truncatePasteText("", 6), "");

configCache.language = "zh-CN";
assert.deepStrictEqual(getPasteQuotePair(), ["“", "”"]);
configCache.language = "en";
assert.deepStrictEqual(getPasteQuotePair(), ['"', '"']);
configCache.language = "ru";
assert.deepStrictEqual(getPasteQuotePair(), ["«", "»"]);

console.log("paste TTL check passed");
