// Privacy self-check: the toolbar must never cache translation results.
// usage: node scripts/test-no-translation-cache.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// Patterns that would mean a response/translation cache came back.
const forbidden = [
  /caches\.open\s*\(/,
  /CacheStorage/,
  /putHttpCache/,
  /getHttpCache/,
  /URL_CACHE_[A-Z_]+/,
  /MSG_(?:GET|PUT)_HTTPCACHE/,
  /DEFAULT_CACHE_TIMEOUT/,
];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|cjs|mjs)$/.test(entry.name) ? [full] : [];
  });

const offenders = [];
for (const file of [
  ...walk(path.join(root, "src")),
  ...walk(path.join(root, "scripts")),
]) {
  if (path.basename(file) === path.basename(__filename)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      offenders.push(`${path.relative(root, file)} matched ${pattern}`);
    }
  }
}
assert.deepStrictEqual(
  offenders,
  [],
  `translation cache code found:\n${offenders.join("\n")}`
);

// The built userscript must not ship the CacheStorage API either.
const bundle = path.join(root, "dist/text-selection-toolbar.user.js");
if (fs.existsSync(bundle)) {
  const code = fs.readFileSync(bundle, "utf8");
  assert.ok(!code.includes("caches.open"), "bundle still opens CacheStorage");
  assert.ok(
    !code.includes("CacheStorage"),
    "bundle still references CacheStorage"
  );
}

console.log("no translation cache: ok");
