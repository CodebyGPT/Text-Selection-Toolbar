// Search engine list normalization self-check.
// usage: node scripts/test-search-engines.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/02-config.js"),
  "utf8"
);
const { getSearchEngineList, configCache } = new Function(
  `${src}\nreturn { getSearchEngineList, configCache };`
)();

// Empty custom list falls back to the legacy single-engine setting.
configCache.searchEngines = [];
configCache.searchEngine = "baidu";
assert.deepStrictEqual(getSearchEngineList(), [
  { name: "Baidu", url: "https://www.baidu.com/s?wd=%s" },
]);

configCache.searchEngines = [
  { name: "A", url: "https://a.example/?q=%s" },
  { name: "B", url: "https://b.example/?q=%s" },
];
assert.deepStrictEqual(getSearchEngineList(), [
  { name: "A", url: "https://a.example/?q=%s" },
  { name: "B", url: "https://b.example/?q=%s" },
]);

// Invalid entries are ignored; more than 8 valid entries are capped.
configCache.searchEngines = Array.from({ length: 10 }, (_, i) => ({
  name: `S${i}`,
  url: `https://s${i}.example/?q=%s`,
}));
assert.strictEqual(getSearchEngineList().length, 8);

configCache.searchEngines = [{ name: "", url: "https://ignored.example" }];
configCache.searchEngine = "https://custom.example/?q=%s";
assert.deepStrictEqual(getSearchEngineList(), [
  { name: "Custom", url: "https://custom.example/?q=%s" },
]);

configCache.searchEngines = [];
configCache.searchEngine = "unknown";
assert.deepStrictEqual(getSearchEngineList(), [
  { name: "Google", url: "https://www.google.com/search?q=%s" },
]);

console.log("search engines check passed");
