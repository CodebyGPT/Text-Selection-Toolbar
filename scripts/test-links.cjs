// Link recognition self-check: same accept/reject rule as the browsers'
// "Go to <url>" context menu item (Public Suffix List based).
// usage: node scripts/test-links.cjs
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../src/toolbar/modules");
const src = ["02-config.js", "06-extractors.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
  .join("\n");
const { extractUrlsFromText, extractLinkAndCode } = new Function(
  src + "\nreturn { extractUrlsFromText, extractLinkAndCode };"
)();

const cases = [
  ["baidu.site", true],
  ["baidu.go", false],
  ["www.baidu.com", true],
  ["example.com/path", true],
  ["https://foo.notatld/x", true], // explicit scheme always wins
  ["http://localhost:3000/x", true],
  ["192.168.1.1", true],
  ["browser.tabs.closeButtons", false],
  ["见 https://pan.baidu.com/s/1abcDEFG 提取码: x3k9", true],
  ["没有链接的一段文字", false],
];

let failed = 0;
for (const [text, expected] of cases) {
  const got = extractUrlsFromText(text).length > 0;
  if (got !== expected) {
    failed++;
    console.error(`FAIL ${JSON.stringify(text)}: expected ${expected}, got ${got}`);
  }
}

const pan = extractLinkAndCode("见 https://pan.baidu.com/s/1abcDEFG 提取码: x3k9");
if (pan?.urls?.[0]?.code !== "x3k9") {
  failed++;
  console.error("FAIL extraction code not attached:", JSON.stringify(pan));
}

console.log(failed === 0 ? `ok (${cases.length + 1} checks)` : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
