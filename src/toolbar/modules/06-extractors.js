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

const isChineseChar = (ch) => /[\u4e00-\u9fa5]/.test(ch);

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

// Scan URL path from startPos in text, return path end position
// Key rule: stop scanning on Chinese characters; backtrack '(' before Chinese
function scanUrlPath(text, startPos) {
    let urlEnd = startPos;
    let sawChinese = false;

    for (let i = startPos; i < text.length; i++) {
        const ch = text[i];

        if (isChineseChar(ch)) {
            sawChinese = true;
            const collected = text.substring(startPos, urlEnd);
            if (collected.endsWith('(:') || collected.endsWith('(')) {
                while (urlEnd > startPos && text[urlEnd - 1] !== '(') {
                    urlEnd--;
                }
                urlEnd--;
            }
            continue;
        }

        if (sawChinese) break;

        if (isUrlSafeChar(ch)) {
            urlEnd = i + 1;
        } else {
            break;
        }
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

        const fullUrl = url.startsWith('http') ? url : 'http://' + url;

        results.push({
            display: url,
            url: fullUrl,
            host: finalHost,
            anchorStart: anchor.start  // Keep anchor position in original text for password assignment
        });

        // Mark covered range for subsequent anchor dedup
        lastUrlEnd = pathEnd;
    }

    return results;
}

// Extract all passwords with their positions in the original text
function extractAllCodesWithPositions(rawText) {
    const results = [];
    const codePatterns = [
        /(?:提取码|提取密碼|密码|訪問碼|访问码|分享码|口令|code|pwd|key|pw|pass)\s*[:：\s]+\s*([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /(?:提取码|提取密碼|密码|訪問碼|访问码|分享码|口令|code|pwd|key|pw|pass)[:：]([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /码\s*[:：\s]*([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /\([:：\s]*([a-zA-Z0-9]{3,8})\s*\)/gi,
    ];
    const seen = new Set(); // Dedup: same position + same code recorded once
    for (const pat of codePatterns) {
        let m;
        while ((m = pat.exec(rawText)) !== null) {
            const key = m.index + '|' + m[1];
            if (!seen.has(key)) {
                seen.add(key);
                results.push({ code: m[1], index: m.index });
            }
        }
    }
    results.sort((a, b) => a.index - b.index);
    return results;
}

// Smart link and password extractor
function extractLinkAndCode(rawText) {
    if (!rawText) return null;

    // ---- Stage 1: Extract all passwords with positions ----
    const allCodes = extractAllCodesWithPositions(rawText);
    const password = allCodes.length > 0 ? allCodes[0].code : null;

    // ---- Stage 2: Extract URLs (dual strategy) ----
    let urls = extractUrlsFromText(rawText);

    if (urls.length === 0) {
        const cleanText = rawText
            .replace(/[\u4e00-\u9fa5]+/g, '')
            .replace(/\s+/g, '');
        urls = extractUrlsFromText(cleanText);
    }

    if (urls.length === 0 && !password) return null;

    // ---- Stage 3: Assign nearest password to each URL (use anchor position directly, no re-search on host) ----
    for (let i = 0; i < urls.length; i++) {
        const urlStart = urls[i].anchorStart;
        if (urlStart === undefined) continue;
        // This URL's range in the original text: [urlStart, nextUrlStart)
        const nextUrlStart = (i + 1 < urls.length && urls[i + 1].anchorStart !== undefined)
            ? urls[i + 1].anchorStart
            : rawText.length;
        const matched = allCodes.filter(c => c.index >= urlStart && c.index < nextUrlStart);
        if (matched.length > 0) {
            urls[i].code = matched[0].code;
        }
    }

    return {
        urls: urls,
        password: password
    };
}

// Email address extractor
function extractEmailFromText(rawText) {
    if (!rawText || !rawText.includes('@')) return null;
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const m = rawText.match(emailPattern);
    return m ? m[1] : null;
}
