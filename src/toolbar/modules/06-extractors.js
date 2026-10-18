// Module 06: Link & Password Extractors

// Get merged complete TLD set (built-in + user-defined)
function getEffectiveTLDs() {
    const custom = getConfig('customTLDs') || [];
    if (custom.length === 0) return TLD_SET_EXTENDED;
    const merged = new Set(TLD_SET_EXTENDED);
    custom.forEach(t => merged.add(t.toLowerCase().replace(/^\./, '')));
    return merged;
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

// Protocol anchor regex
const PROTO_ANCHOR_PATTERN = /https?:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/gi;

// Protocol-less domain anchor regex (for patterns like cloud.189.cn/t/xxx)
const DOMAIN_ANCHOR_PATTERN = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/gi;

// Extract all URLs from text
function extractUrlsFromText(text) {
    const effectiveTLDs = getEffectiveTLDs();
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
        const host = anchor.hostAndProto.replace(/^https?:\/\//, '').split('/')[0];
        const tld = host.split('.').pop().toLowerCase();
        if (!effectiveTLDs.has(tld)) continue;
        if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/.test(host)) continue;

        const pathEnd = scanUrlPath(text, anchor.end);
        let url = text.substring(anchor.start, pathEnd);
        url = url.replace(/[\u4e00-\u9fa5]+/g, '');
        url = trimUrlTail(url);

        // Validate: URL must have path beyond domain
        if (!anchor.hasProto) {
            const urlHost = url.split('/')[0];
            // URL after protocol must contain at least one / path or ? param
            if (url === urlHost || url.length <= urlHost.length) {
                // No path; check for ? params
                const questionIdx = text.indexOf('?', anchor.end);
                if (questionIdx !== -1 && questionIdx < anchor.end + 50) {
                    // May have params after, but scanner didn't catch them. Conservative skip.
                }
                // Bare domain not treated as link (e.g., "cloud.189.cn" alone)
                if (!/[/?#]/.test(url)) continue;
            }
        }

        const finalHost = url.replace(/^https?:\/\//, '').split('/')[0];
        const finalTld = finalHost.split('.').pop().toLowerCase();
        if (!effectiveTLDs.has(finalTld)) continue;

        const fullUrl = url.startsWith('http') ? url : 'http://' + url;
        const displayUrl = anchor.hasProto ? url : url; // Display shows with http:// if needed

        results.push({
            display: fullUrl.replace(/^https?:\/\//, '') === url.replace(/^https?:\/\//, '')
                ? url : fullUrl,
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
