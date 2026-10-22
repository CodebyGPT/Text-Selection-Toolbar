// Mainland China ID card validation self-check.
// usage: node scripts/test-id-card.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dataSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/21-id-card-data.js"),
  "utf8"
);
const logicSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/22-id-card.js"),
  "utf8"
);

const api = new Function(
  "document",
  `${dataSrc}\n${logicSrc}\nreturn {
    normalizeIdCardText,
    isIdCardCandidate,
    isValidIdCardNumber,
    getIdCardRegion,
    getIdCardAge,
    getIdCardCheckMessage,
    rememberIdCardDragGuard,
    isIdCardReselectDrag
  };`
)({ addEventListener() {} });

// A widely used valid sample: 北京市东城区, born 1949-12-31, female.
const VALID = "11010519491231002X";

// Candidate gate: 17-19 chars, final X allowed, leading two digits 11-65.
assert.strictEqual(api.isIdCardCandidate(VALID), true);
assert.strictEqual(api.isIdCardCandidate(VALID.toLowerCase()), true);
assert.strictEqual(api.isIdCardCandidate("11010519491231002"), true); // 17
assert.strictEqual(api.isIdCardCandidate("110105194912310021"), true); // 18
assert.strictEqual(api.isIdCardCandidate("1101051949123100212"), true); // 19
assert.strictEqual(api.isIdCardCandidate("11010519491231002123"), false); // 20
assert.strictEqual(api.isIdCardCandidate(` ${VALID}`), true); // edge space
assert.strictEqual(api.isIdCardCandidate(`${VALID} `), true);
assert.strictEqual(api.isIdCardCandidate("10010519491231002X"), false); // 10
assert.strictEqual(api.isIdCardCandidate("66010519491231002X"), false); // 66
assert.strictEqual(api.isIdCardCandidate("11010519491231002A"), false);
assert.strictEqual(api.isIdCardCandidate("11010519491231002123"), false); // 20
assert.strictEqual(api.isIdCardCandidate(VALID.replace(/1/g, "１")), true); // full-width digits

// Checksum and birth date.
assert.strictEqual(api.isValidIdCardNumber(VALID), true);
assert.strictEqual(api.isValidIdCardNumber(VALID.toLowerCase()), true);
assert.strictEqual(api.isValidIdCardNumber("110105194912310021"), false);
assert.strictEqual(api.isValidIdCardNumber("11010519491332002X"), false);

// Region lookup covers municipality, province and direct-administered city.
assert.strictEqual(api.getIdCardRegion("11010519491231002X"), "北京市朝阳区");
assert.strictEqual(api.getIdCardRegion("440305199001011234"), "广东省深圳市南山区");
assert.strictEqual(api.getIdCardRegion("419001199001011234"), "河南省济源市");

// Age is computed from the birth date, not copied from the ID.
const now = new Date();
const birth = (dd) => {
  let age = now.getFullYear() - Number(dd.slice(0, 4));
  const before =
    now.getMonth() + 1 < Number(dd.slice(4, 6)) ||
    (now.getMonth() + 1 === Number(dd.slice(4, 6)) &&
      now.getDate() < Number(dd.slice(6, 8)));
  return before ? age - 1 : age;
};
assert.strictEqual(api.getIdCardAge("19491231"), birth("19491231"));

// Toast texts.
assert.strictEqual(
  api.getIdCardCheckMessage("11010519491231002"),
  "❌ 当前号码为17位，请检查"
);
assert.strictEqual(
  api.getIdCardCheckMessage("1101051949123100212"),
  "❌ 当前号码为19位，请检查"
);
assert.strictEqual(
  api.getIdCardCheckMessage(` ${VALID}`),
  "⚠ 当前号码首位包含空格，请检查"
);
assert.strictEqual(
  api.getIdCardCheckMessage(`${VALID} `),
  "⚠ 当前号码末位包含空格，请检查"
);
assert.strictEqual(
  api.getIdCardCheckMessage(VALID.toLowerCase()),
  "⚠ 身份证号码校验通过，但最后一位应为大写“X”"
);
assert.strictEqual(
  api.getIdCardCheckMessage(VALID.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0))),
  "⚠ 身份证号码校验通过，但包含全角字符"
);
assert.strictEqual(
  api.getIdCardCheckMessage("110105194912310021"),
  "❌ 身份证号码无效"
);
assert.strictEqual(
  api.getIdCardCheckMessage(VALID),
  `✅ 身份证号码有效，持证人女，${birth("19491231")}周岁，北京市朝阳区`
);

// Reselecting an already-selected ID would start a native text drag; the guard
// must only swallow that exact drag.
{
  const input = { value: `x ${VALID} y`, selectionStart: 2, selectionEnd: 20 };
  api.rememberIdCardDragGuard(input, VALID);
  assert.strictEqual(api.isIdCardReselectDrag(input), true);
  input.selectionStart = 0;
  input.selectionEnd = 1;
  assert.strictEqual(api.isIdCardReselectDrag(input), false);
  api.rememberIdCardDragGuard({ value: VALID, selectionStart: 0, selectionEnd: 18 }, VALID);
  assert.strictEqual(api.isIdCardReselectDrag(input), false);
}

console.log("test-id-card: ok");
