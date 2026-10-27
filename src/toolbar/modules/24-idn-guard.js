// Module 24: IDN homograph guard
//
// Warns when the registrable (SLD+TLD) part of a host is written with
// non-ASCII characters, or when it uses the ASCII-compatible "xn--" form.
// The guard is event-driven: it runs once when the toolbar finishes loading
// and again on browser-reported navigation (pageshow/popstate/hashchange, plus
// the Navigation API when available). There is no polling.

function getIdnGuardMode() {
    const value = typeof getConfig === 'function' ? getConfig('idnGuardMode') : 'toast';
    return value === 'fullscreen' || value === 'disabled' ? value : 'toast';
}

// "SLD" here means the last two labels (name + public suffix), matching the
// link-consistency scope of module 23. Subdomain labels are presentation only.
function getIdnSldPortion(host) {
    const labels = String(host || '').toLowerCase().split('.').filter(Boolean);
    return labels.length > 2 ? labels.slice(-2).join('.') : labels.join('.');
}

// Keep the raw host before URL normalization: the URL parser rewrites a
// Unicode host to punycode, which would lose the non-ASCII signal.
function getIdnRawHost(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^/?#@]*@)?([^/?#]+)/i.exec(text);
    if (!match) return '';
    return match[1].replace(/:\d+$/, '');
}

function getIdnHostsForValue(value) {
    const hosts = [];
    const raw = getIdnRawHost(value);
    if (raw) hosts.push(raw);
    try {
        const host = new URL(String(value), typeof location !== 'undefined' ? location.href : undefined).hostname;
        if (host) hosts.push(host);
    } catch (e) {
        try {
            const host = new URL('http://' + String(value || '').trim()).hostname;
            if (host) hosts.push(host);
        } catch (err) {
            // Not a URL: the raw host check above is all we can do.
        }
    }
    return hosts;
}

function getIdnWarningsForHosts(hosts, selected) {
    const seen = new Set();
    const notices = [];
    const list = Array.isArray(hosts) ? hosts : [hosts];
    list.forEach((host) => {
        const allLabels = String(host || '').toLowerCase().split('.').filter(Boolean);
        const sld = getIdnSldPortion(host);
        if (!sld) return;
        const add = (idn) => {
            if (seen.has(idn)) return;
            seen.add(idn);
            notices.push({ kind: 'idn', idn, selected: selected === true });
        };
        // "xn--" is the ASCII-compatible encoding of an IDN label. Any label
        // counts here (e.g. an IDN TLD), since there is no false-positive risk.
        if (allLabels.some((label) => label.indexOf('xn--') === 0)) add('punycode');
        // Only the registrable domain is checked for raw non-ASCII labels.
        if (/[^\x00-\x7F]/.test(sld)) add('nonascii');
    });
    return notices;
}

// Prefer the page's own href: it preserves a Unicode host, while the
// normalized URL only carries punycode. Checks are per-value so a Unicode
// link does not also produce a redundant punycode warning.
function getIdnWarningsForAnchor(anchor, selected) {
    if (!anchor) return [];
    const values = [];
    try {
        const raw = anchor.getAttribute ? String(anchor.getAttribute('href') || '') : '';
        if (raw) values.push(raw);
    } catch (e) {}
    try {
        if (anchor.href) values.push(String(anchor.href));
    } catch (e) {}
    for (let i = 0; i < values.length; i++) {
        const notices = getIdnWarningsForUrlValue(values[i], selected);
        if (notices.length) return notices;
    }
    return [];
}

function getIdnWarningsForUrlValue(value, selected) {
    // The raw host keeps Unicode; the normalized URL only has punycode. Use the
    // raw form first so one IDN link never produces both warnings at once.
    const raw = getIdnRawHost(value);
    if (raw) {
        const rawNotices = getIdnWarningsForHosts([raw], selected);
        if (rawNotices.length) return rawNotices;
    }
    return getIdnWarningsForHosts(getIdnHostsForValue(value), selected);
}

// Kept for callers that only have a URL string (page bootstrap and tests).
function getIdnWarningsForUrl(value, selected) {
    return getIdnWarningsForUrlValue(value, selected);
}

function getIdnToastText(notice) {
    const scope = notice.selected ? 'selected_' : '';
    return t('toast_idn_' + scope + notice.idn);
}

function formatIdnAlarmBody(idn, selected) {
    return t('alarm_body_idn_' + (selected ? 'selected_' : '') + idn);
}

function checkIdnPage() {
    try {
        if (getIdnGuardMode() === 'disabled') return;
        if (typeof location === 'undefined') return;
        const notices = getIdnWarningsForHosts([location.hostname], false);
        if (notices.length) showSecurityWarnings(notices);
    } catch (e) {
        // A warning must never break the toolbar bootstrap.
    }
}

function initIdnGuard() {
    const target = typeof window !== 'undefined' ? window : null;
    if (target && typeof target.addEventListener === 'function') {
        // The initial page load is covered by the check below; only a bfcache
        // restore needs another pageshow run.
        target.addEventListener('pageshow', (event) => {
            if (event && event.persisted) checkIdnPage();
        });
        target.addEventListener('popstate', checkIdnPage);
        target.addEventListener('hashchange', checkIdnPage);
        try {
            if (target.navigation && typeof target.navigation.addEventListener === 'function') {
                target.navigation.addEventListener('navigatesuccess', checkIdnPage);
            }
        } catch (e) {
            // Navigation API is optional; the DOM navigation events still work.
        }
    }

    // At document-start the root element may not exist yet, and the toolbar
    // toast needs it. Defer that one case to DOMContentLoaded (still an event).
    if (typeof document !== 'undefined' && document.documentElement) {
        checkIdnPage();
    } else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', checkIdnPage, { once: true });
    }
}
