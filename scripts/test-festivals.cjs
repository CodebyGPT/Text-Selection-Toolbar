// Festival lookup self-check for src/libs/festivals.js.
// usage: node scripts/test-festivals.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs
  .readFileSync(path.join(__dirname, "../src/libs/festivals.js"), "utf8")
  .replace(/^export /gm, "");

const { getFestivalInfo } = new Function(`${src}\nreturn { getFestivalInfo };`)();

const at = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0);

const cases = [
  [at(2026, 2, 14), "valentine"],
  [at(2026, 3, 8), "women"],
  [at(2026, 3, 17), "patrick"],
  [at(2026, 5, 1), "labor"],
  [at(2026, 5, 17), "idahot"],
  [at(2026, 6, 1), "children"],
  [at(2026, 10, 31), "halloween"],
  [at(2026, 11, 1), "dayOfDead"],
  [at(2026, 11, 2), "dayOfDead"],
  [at(2026, 12, 25), "christmas"],
  [at(2026, 2, 17), "spring"], // 农历正月初一
  [at(2026, 3, 3), "lantern"], // 农历正月十五
  [at(2026, 6, 19), "dragonBoat"], // 农历五月初五
  [at(2026, 9, 25), "midAutumn"], // 农历八月十五
];

for (const [date, id] of cases) {
  const info = getFestivalInfo(date);
  assert.ok(info, `expected festival on ${date.toDateString()}`);
  assert.strictEqual(info.id, id, `wrong festival on ${date.toDateString()}`);
  assert.ok(Array.isArray(info.emojis) && info.emojis.length > 0);
}

// Neighbouring days are not festivals.
assert.strictEqual(getFestivalInfo(at(2026, 2, 15)), null);
assert.strictEqual(getFestivalInfo(at(2026, 2, 16)), null);
assert.strictEqual(getFestivalInfo(at(2026, 10, 30)), null);
assert.strictEqual(getFestivalInfo(at(2026, 11, 3)), null);
assert.strictEqual(getFestivalInfo(at(2026, 9, 26)), null);

// A leap lunar month must not fire the regular festival.
assert.strictEqual(getFestivalInfo(at(2025, 7, 25)), null); // 闰六月初一

// Emoji lists match the requested festivals.
assert.deepStrictEqual(getFestivalInfo(at(2026, 2, 14)).emojis, ["💕", "💋", "💍", "💌"]);
assert.deepStrictEqual(getFestivalInfo(at(2026, 5, 1)).emojis, ["💼", "📎", "📌", "🖊️", "🗒️"]);
assert.deepStrictEqual(getFestivalInfo(at(2026, 2, 17)).emojis, ["🧨", "🧧", "🥟", "🎇"]);

console.log("test-festivals: ok");
