// Module 22: Mainland China resident ID card validation (input selections)

const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const ID_CARD_CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
const ID_CARD_NUMBER_RE = /^\d{17}[0-9X]$/;

// Full-width digits are easy to pick up from office documents; fold them to
// ASCII for validation and remember that the raw text was full-width.
function normalizeIdCardText(value) {
    return String(value ?? '').replace(/[０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

// Toolbar button gate: 17-19 chars, digits except a final X, first two digits
// 11-65. A single leading/trailing space is tolerated so the click handler can
// explain it; full-width digits are judged by their ASCII value.
function isIdCardCandidate(text) {
    const value = normalizeIdCardText(text).trim();
    return /^(?:1[1-9]|[2-5]\d|6[0-5])\d{14,16}[0-9Xx]$/.test(value);
}

function isValidIdCardBirthDate(part) {
    const year = Number(part.slice(0, 4));
    const month = Number(part.slice(4, 6));
    const day = Number(part.slice(6, 8));
    if (year < 1800 || year > new Date().getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function isValidIdCardNumber(value) {
    const text = String(value ?? '').toUpperCase();
    if (!ID_CARD_NUMBER_RE.test(text)) return false;
    if (!isValidIdCardBirthDate(text.slice(6, 14))) return false;

    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += Number(text[i]) * ID_CARD_WEIGHTS[i];
    }
    return ID_CARD_CHECK_CODES[sum % 11] === text[17];
}

function getIdCardRegion(text) {
    const province = ID_PROVINCE_NAMES[text.slice(0, 2)] || '';
    const city = ID_CITY_NAMES[text.slice(0, 4)] || '';
    const district = ID_DISTRICT_NAMES[text.slice(0, 6)] || '';
    // Municipalities and province-administered county-level cities report a
    // placeholder at city level; showing it would read "北京市市辖区东城区".
    const placeholderCity = !city || city === '市辖区' || city === '县' ||
        city === '省直辖县级行政区划' || city === '自治区直辖县级行政区划';
    return `${province}${placeholderCity ? '' : city}${district}`;
}

function getIdCardAge(birthPart) {
    const now = new Date();
    const year = Number(birthPart.slice(0, 4));
    const month = Number(birthPart.slice(4, 6));
    const day = Number(birthPart.slice(6, 8));
    let age = now.getFullYear() - year;
    const beforeBirthday =
        now.getMonth() + 1 < month ||
        (now.getMonth() + 1 === month && now.getDate() < day);
    return beforeBirthday ? age - 1 : age;
}

// Returns the exact toast text for the clicked selection.
function getIdCardCheckMessage(raw) {
    const original = String(raw ?? '');
    const normalized = normalizeIdCardText(original);
    const hadFullWidth = normalized !== original;
    const leadingSpace = original.startsWith(' ');
    const trailingSpace = original.endsWith(' ');
    const trimmed = normalized.trim();

    if (leadingSpace || trailingSpace) {
        if (isValidIdCardNumber(trimmed)) {
            return leadingSpace
                ? '⚠ 当前号码首位包含空格，请检查'
                : '⚠ 当前号码末位包含空格，请检查';
        }
        return '❌ 身份证号码无效';
    }

    if (original.length !== 18) {
        return `❌ 当前号码为${original.length}位，请检查`;
    }

    if (!isValidIdCardNumber(normalized)) {
        return '❌ 身份证号码无效';
    }

    if (original.endsWith('x')) {
        return '⚠ 身份证号码校验通过，但最后一位应为大写“X”';
    }
    if (hadFullWidth) {
        return '⚠ 身份证号码校验通过，但包含全角字符';
    }

    const text = normalized.toUpperCase();
    const gender = Number(text[16]) % 2 === 1 ? '男' : '女';
    const age = getIdCardAge(text.slice(6, 14));
    const region = getIdCardRegion(text);
    return `✅ 身份证号码有效，持证人${gender}，${age}周岁，${region}`;
}
