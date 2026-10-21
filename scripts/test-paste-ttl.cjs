// Lightning-paste TTL validation self-check.
// usage: node scripts/test-paste-ttl.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/02-config.js"),
  "utf8"
);
const { normalizePasteTtl, getPasteTtlMs, configCache } = new Function(
  `${src}\nreturn { normalizePasteTtl, getPasteTtlMs, configCache };`
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

console.log("paste TTL check passed");
