// Regenerates the TLD table in src/toolbar/modules/02-config.js from the
// Public Suffix List (ICANN section). Browsers use the same source, so the
// script accepts exactly the domains they accept.
//
// usage: node scripts/update-tlds.mjs
import fs from "node:fs";
import path from "node:path";

const PSL_URL = "https://publicsuffix.org/list/public_suffix_list.dat";
const CONFIG = path.join(process.cwd(), "src/toolbar/modules/02-config.js");

const res = await fetch(PSL_URL);
if (!res.ok) throw new Error(`PSL fetch failed: ${res.status}`);
const lines = (await res.text()).split("\n");

const tlds = new Set();
let inIcann = false;
for (const raw of lines) {
  const line = raw.trim();
  if (line.includes("BEGIN ICANN")) { inIcann = true; continue; }
  if (line.includes("END ICANN")) { inIcann = false; continue; }
  if (!inIcann || !line || line.startsWith("//")) continue;
  const rule = line.split(/\s+/)[0].replace(/^!/, "");
  if (rule.startsWith("*.")) continue;
  const last = rule.split(".").pop();
  if (/^[a-z0-9-]+$/i.test(last)) tlds.add(last.toLowerCase());
}

const list = [...tlds].sort();
const block = `// Known TLDs, generated from the Public Suffix List (ICANN section).
// Source: ${PSL_URL} (MPL-2.0)
// Regenerate with: node scripts/update-tlds.mjs
const TLD_SET = new Set((${JSON.stringify(list.join(","))}).split(","));`;

const src = fs.readFileSync(CONFIG, "utf8");
const start = src.indexOf("// Top-level domain whitelist");
const end = src.indexOf("const TLD_SET_EXTENDED");
if (start < 0 || end < 0) throw new Error("TLD block markers not found in 02-config.js");
const after = src.slice(end).split("\n").slice(1).join("\n"); // drop the EXTENDED line

fs.writeFileSync(CONFIG, src.slice(0, start) + block + "\n" + after);
console.log(`Wrote ${list.length} TLDs to 02-config.js`);
