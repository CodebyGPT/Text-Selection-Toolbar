// Module 06: Link & Password Extractors

// Host without port / trailing dot, lowercased
function normalizeHost(host) {
    return host.replace(/:\d+$/, '').replace(/\.+$/, '').toLowerCase();
}

// Same rule browsers use for "Go to <url>" vs "Search for <text>":
// a scheme-less host counts as a URL only when its TLD is in the Public
// Suffix List (or is one of the RFC 6761 / 6762 special-use names).
function isKnownHost(host) {
    const h = normalizeHost(host);
    if (!h) return false;
    if (h === 'localhost') return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    const dot = h.lastIndexOf('.');
    if (dot <= 0) return false;
    const tld = h.slice(dot + 1);
    return TLD_SET.has(tld) || /^(example|test|local|internal)$/.test(tld);
}

// RFC 3986 URL safe character detection (unreserved + reserved)
const isUrlSafeChar = (ch) => {
    const code = ch.charCodeAt(0);
    return code < 128 && /^[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]$/.test(ch);
};

// Clean non-URL characters from the end of a URL
function trimUrlTail(url) {
    url = url.replace(/[,.。;:!?！？、]+$/, '');
    const openParens = (url.match(/\(/g) || []).length;
    const closeParens = (url.match(/\)/g) || []).length;
    if (closeParens > openParens) {
        const excess = closeParens - openParens;
        for (let i = 0; i < excess; i++) {
            url = url.replace(/\)+$/, (m) => m.slice(1));
        }
    }
    if (openParens > closeParens && url.endsWith('(')) {
        url = url.slice(0, -1);
    }
    url = url.replace(/[,.。;:!?！？、]+$/, '');
    return url;
}

// Scan the URL path until the first character that cannot belong to a URL.
// CJK text is non-ASCII, so it stops the scan automatically; trimUrlTail then
// removes the dangling "(" left behind by "(访问码:...)".
function scanUrlPath(text, startPos) {
    let urlEnd = startPos;
    while (urlEnd < text.length && isUrlSafeChar(text[urlEnd])) {
        urlEnd++;
    }
    return urlEnd;
}

// Protocol anchor regex (scheme present => URL, host may be localhost/IP)
const PROTO_ANCHOR_PATTERN = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(?::\d+)?/gi;

// Protocol-less domain anchor regex (for patterns like cloud.189.cn/t/xxx),
// plus bare IPv4 hosts, which browsers also open directly.
const DOMAIN_ANCHOR_PATTERN = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|\d{1,3}(?:\.\d{1,3}){3}/gi;

// Extract all URLs from text
function extractUrlsFromText(text) {
    const results = [];

    // Collect all anchors (proto + proto-less)
    const allAnchors = [];

    // Protocol anchors
    let m;
    const protoRegex = new RegExp(PROTO_ANCHOR_PATTERN.source, 'gi');
    while ((m = protoRegex.exec(text)) !== null) {
        allAnchors.push({
            start: m.index,
            end: m.index + m[0].length,
            hostAndProto: m[0],
            hasProto: true
        });
    }

    // Protocol-less domain anchors (only where not already covered)
    const domainRegex = new RegExp(DOMAIN_ANCHOR_PATTERN.source, 'gi');
    while ((m = domainRegex.exec(text)) !== null) {
        // Check if this domain is already covered by a proto anchor
        const isOverlapped = allAnchors.some(a =>
            m.index >= a.start && m.index < a.end
        );
        if (!isOverlapped) {
            allAnchors.push({
                start: m.index,
                end: m.index + m[0].length,
                hostAndProto: m[0],
                hasProto: false
            });
        }
    }

    // Sort by position
    allAnchors.sort((a, b) => a.start - b.start);

    // Deduplicate: remove anchors whose range is already covered by a previous one (use anchor end position for initial filtering)
    const deduped = [];
    for (const anchor of allAnchors) {
        if (deduped.length === 0 || anchor.start >= deduped[deduped.length - 1].end) {
            deduped.push(anchor);
        }
    }

    // Scan path for each anchor; record actual URL end position for dedup
    let lastUrlEnd = 0;
    for (const anchor of deduped) {
        // Skip anchors already covered by the previous full URL
        if (anchor.start < lastUrlEnd) continue;

        const pathEnd = scanUrlPath(text, anchor.end);
        let url = text.substring(anchor.start, pathEnd);
        url = url.replace(/[\u4e00-\u9fa5]+/g, '');
        url = trimUrlTail(url);

        // Same acceptance rule as the browsers: an explicit scheme is always a
        // URL; a scheme-less host needs a known TLD.
        const hostStart = anchor.hasProto ? url.indexOf('://') + 3 : 0;
        const finalHost = normalizeHost(url.slice(hostStart).split(/[/?#]/)[0]);
        if (!finalHost) continue;
        if (!anchor.hasProto && !isKnownHost(finalHost)) continue;
        if (!anchor.hasProto && !finalHost.includes('.')) continue;

        const fullUrl = /^https?:\/\//i.test(url) ? url : 'http://' + url;

        results.push({
            display: url,
            url: fullUrl,
            host: finalHost,
            anchorStart: anchor.start,  // Keep anchor position in original text for password assignment
            end: pathEnd                // Full URL range, used to avoid reading codes out of the URL
        });

        // Mark covered range for subsequent anchor dedup
        lastUrlEnd = pathEnd;
    }

    return results;
}

// Labels that announce a share code. "验证码" is intentionally absent: it is
// not a cloud-drive password and the old generic "码" pattern picked it up.
const CODE_LABEL_PATTERN = '(?<![a-zA-Z])(?:提取码|提取密碼|密码|密碼|訪問碼|访问码|分享码|分享碼|口令|password|code|pwd|key|pw|pass)(?![a-zA-Z])';
const CODE_SEPARATOR_PATTERN = '\\s*(?:[:：=＝]|为|是)?\\s*';
const LABELED_CODE_PATTERN = new RegExp(
    CODE_LABEL_PATTERN + CODE_SEPARATOR_PATTERN + '([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])',
    'gi'
);
const PAREN_CODE_PATTERN = /[\(（]\s*([a-zA-Z0-9]{3,8})\s*[\)）]/gi;

// Extract codes with their positions. URL ranges are excluded so a path like
// "https://example.com/(foo)" is not mistaken for a bare "(foo)" code.
function extractCodesWithPositions(rawText, urlRanges = []) {
    const results = [];
    const labeledRanges = [];
    let m;

    LABELED_CODE_PATTERN.lastIndex = 0;
    while ((m = LABELED_CODE_PATTERN.exec(rawText)) !== null) {
        const code = m[1];
        results.push({
            code,
            index: m.index + m[0].length - code.length,
            labeled: true
        });
        labeledRanges.push([m.index, m.index + m[0].length]);
    }

    // Bare "(cpn0)" is a common fallback, but only in text that actually
    // contains a link, and never inside that link.
    if (urlRanges.length > 0) {
        PAREN_CODE_PATTERN.lastIndex = 0;
        while ((m = PAREN_CODE_PATTERN.exec(rawText)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            const inUrl = urlRanges.some(([s, e]) => start < e && end > s);
            const alreadyLabeled = labeledRanges.some(([s, e]) => start < e && end > s);
            if (inUrl || alreadyLabeled) continue;
            results.push({
                code: m[1],
                index: start + m[0].lastIndexOf(m[1]),
                labeled: false
            });
        }
    }

    results.sort((a, b) => a.index - b.index);
    return results;
}

// Associate each URL with one code. A code normally follows its link; the
// second pass also accepts "提取码: xxxx 链接: ..." (code before the link).
function assignCodesToUrls(urls, codes, textLength) {
    const used = new Set();

    for (let i = 0; i < urls.length; i++) {
        const start = urls[i].anchorStart;
        const next = i + 1 < urls.length ? urls[i + 1].anchorStart : textLength;
        const found = codes.findIndex((c, idx) => !used.has(idx) && c.index >= start && c.index < next);
        if (found !== -1) {
            urls[i].code = codes[found].code;
            used.add(found);
        }
    }

    for (let i = 0; i < urls.length; i++) {
        if (urls[i].code) continue;
        const start = urls[i].anchorStart;
        const prevEnd = i > 0 ? urls[i - 1].end : 0;
        let best = -1;
        let bestDistance = 80;
        codes.forEach((c, idx) => {
            if (used.has(idx) || c.index < prevEnd || c.index > start) return;
            const distance = start - c.index;
            if (distance < bestDistance) {
                best = idx;
                bestDistance = distance;
            }
        });
        if (best !== -1) {
            urls[i].code = codes[best].code;
            used.add(best);
        }
    }
}

// Smart link and password extractor
function extractLinkAndCode(rawText) {
    if (!rawText) return null;

    const urls = extractUrlsFromText(rawText);
    if (urls.length === 0) {
        // Last-resort fallback for text where Chinese characters split a URL.
        // Positions no longer map back to rawText, so skip code association.
        const cleanText = rawText
            .replace(/[\u4e00-\u9fa5]+/g, '')
            .replace(/\s+/g, '');
        const cleanedUrls = extractUrlsFromText(cleanText);
        if (cleanedUrls.length === 0) return null;
        return { urls: cleanedUrls, password: null };
    }

    const allCodes = extractCodesWithPositions(
        rawText,
        urls.map((u) => [u.anchorStart, u.end])
    );
    assignCodesToUrls(urls, allCodes, rawText.length);

    return {
        urls,
        // Only a code associated with a URL may drive the key-icon paste button.
        password: urls.find((u) => u.code)?.code || null
    };
}

// Email address extractor
function extractEmailFromText(rawText) {
    if (!rawText || !rawText.includes('@')) return null;
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const m = rawText.match(emailPattern);
    return m ? m[1] : null;
}
