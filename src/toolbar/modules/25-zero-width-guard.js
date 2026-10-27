// Module 25: Zero-width identifier guard
//
// Some pages hide per-user tracking IDs in copied text using invisible
// zero-width characters. The guard scans the text that actually reaches the
// clipboard and warns once the configured sensitivity is exceeded. It is a
// pure read-only detector, like the rest of module 23.

// Zero-width / invisible formatting characters. Variation selectors and emoji
// tag characters are deliberately excluded: they are common in ordinary emoji
// text and would cause false positives.
const ZERO_WIDTH_CHAR_RE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u3164\uFEFF\uFFA0]/;

// A hit needs either a long consecutive run or enough total characters.
// "verylow" only looks at runs, matching the requested thresholds.
const ZERO_WIDTH_SENSITIVITY = {
    high: { run: 3, total: 5 },
    medium: { run: 6, total: 8 },
    low: { run: 10, total: 12 },
    verylow: { run: 16, total: 0 },
    disabled: null,
};

function getZeroWidthGuardThresholds() {
    const value = typeof getConfig === 'function' ? getConfig('zeroWidthGuardSensitivity') : 'low';
    return Object.prototype.hasOwnProperty.call(ZERO_WIDTH_SENSITIVITY, value)
        ? ZERO_WIDTH_SENSITIVITY[value]
        : ZERO_WIDTH_SENSITIVITY.low;
}

function scanZeroWidthIdentifier(text) {
    const value = String(text || '');
    if (!value) return null;

    const thresholds = getZeroWidthGuardThresholds();
    if (!thresholds) return null;

    let total = 0;
    let run = 0;
    let maxRun = 0;
    for (const ch of value) {
        if (ch.length === 1 && ZERO_WIDTH_CHAR_RE.test(ch)) {
            total++;
            run++;
            if (run > maxRun) maxRun = run;
        } else {
            run = 0;
        }
    }
    if (!total) return null;
    if (maxRun >= thresholds.run || (thresholds.total > 0 && total >= thresholds.total)) {
        return { total, run: maxRun };
    }
    return null;
}
