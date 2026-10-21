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

// Complex share texts: the link must stop before the Chinese/parenthesized
// suffix, and the code must attach to the link it belongs to.
const shareCases = [
  {
    text: " 天翼云盘：https://cloud.189.cn/t/3yqYreieuUFv(访问码:cpn0) ",
    display: "https://cloud.189.cn/t/3yqYreieuUFv",
    code: "cpn0",
  },
  {
    text: " 5日iPhone 历代壁纸https://www.aliyundrive.com/s/rxUp6HNpwP8点击链接保存,或者复制本段内容,打开「阿里云盘」APP ,无 ",
    display: "https://www.aliyundrive.com/s/rxUp6HNpwP8",
    code: undefined,
  },
  {
    text: "链接 https://pan.baidu.com/s/1abcDEFG 提取码: x3k9 复制本段",
    display: "https://pan.baidu.com/s/1abcDEFG",
    code: "x3k9",
  },
  {
    text: "提取码：cpn0 https://pan.quark.cn/s/abc123",
    display: "https://pan.quark.cn/s/abc123",
    code: "cpn0",
  },
  {
    text: "两个链接 https://a.com/x 提取码：aaaa https://b.com/y 提取码：bbbb",
    display: "https://a.com/x",
    code: "aaaa",
  },
];

for (const { text, display, code } of shareCases) {
  const got = extractLinkAndCode(text);
  if (got?.urls?.[0]?.display !== display || got?.urls?.[0]?.code !== code) {
    failed++;
    console.error(
      `FAIL share text ${JSON.stringify(text)}: got ${JSON.stringify(got)}`
    );
  }
}

// Links broken by CJK/zero-width characters must be de-obfuscated, but real
// separators and password labels must not be swallowed into the URL.
const obfuscatedCases = [
  {
    text: "htt删ps:/掉/www这.baid几u.co汉m/s",
    displays: ["https://www.baidu.com/s"],
    code: undefined,
  },
  {
    text: "htt删ps:/掉/pa这n.bai几du.co汉m/s/1abc 提取码: x3k9",
    displays: ["https://pan.baidu.com/s/1abc"],
    code: "x3k9",
  },
  {
    text: "www.baid几u.co汉m/s",
    displays: ["www.baidu.com/s"],
    code: undefined,
  },
  {
    text: "https://pan.baidu.com/s/1ab删c",
    displays: ["https://pan.baidu.com/s/1abc"],
    code: undefined,
  },
  {
    text: "https://www.baid删u.com",
    displays: ["https://www.baidu.com"],
    code: undefined,
  },
  {
    text: "https://a.com中文www.b.com",
    displays: ["https://a.com", "www.b.com"],
    code: undefined,
  },
  {
    text: "https://cloud.189.cn/t/3yqYreieuUFv访问码:cpn0",
    displays: ["https://cloud.189.cn/t/3yqYreieuUFv"],
    code: "cpn0",
  },
  {
    text: "https://a.com和https://b.com",
    displays: ["https://a.com", "https://b.com"],
    code: undefined,
  },
  {
    text: "https://a.com保存.com",
    displays: ["https://a.com"],
    code: undefined,
  },
];

for (const { text, displays, code } of obfuscatedCases) {
  const got = extractLinkAndCode(text);
  const gotDisplays = got?.urls?.map((url) => url.display) || [];
  if (JSON.stringify(gotDisplays) !== JSON.stringify(displays) || got?.urls?.[0]?.code !== code) {
    failed++;
    console.error(
      `FAIL obfuscated text ${JSON.stringify(text)}: got ${JSON.stringify(got)}`
    );
  }
}

// Explicit scheme is case-insensitive; it must not become "http://HTTPS://...".
const upper = extractUrlsFromText(
  "HTTPS://WWW.ALIYUNDRIVE.COM/S/RXUP6HNPWP8 点击"
);
if (upper.length !== 1 || upper[0].url !== "HTTPS://WWW.ALIYUNDRIVE.COM/S/RXUP6HNPWP8") {
  failed++;
  console.error("FAIL uppercase scheme:", JSON.stringify(upper));
}

// "验证码" is a login code, not a share code; a parenthesized path segment is
// part of the URL, not a password.
const falseCodes = [
  "验证码: 1234 登录",
  "https://example.com/a 验证码: 1234",
  "https://example.com/(foo)",
];
for (const text of falseCodes) {
  const got = extractLinkAndCode(text);
  if (got?.password || got?.urls?.[0]?.code) {
    failed++;
    console.error(`FAIL false code ${JSON.stringify(text)}: ${JSON.stringify(got)}`);
  }
}

console.log(
  failed === 0
    ? `ok (${cases.length + shareCases.length + obfuscatedCases.length + falseCodes.length + 2} checks)`
    : `${failed} failed`
);
process.exit(failed === 0 ? 0 : 1);
