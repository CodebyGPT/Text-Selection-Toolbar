// Module 23: Safe copy (read-only copy guard)
//
// Copy Guard-style checks run synchronously inside the copy event. This module
// must never call preventDefault / stopPropagation / setData / execCommand or
// any clipboard write: outside unlock mode the page's own copy behavior must
// stay exactly as it was. It only reads the selection, the event's clipboard
// data and computed styles, then shows a toast (and optionally a full-screen
// warning). Link consistency is checked on right-click and, when the opt-in
// setting is on, via a cover laid over mismatched links in the viewport (the
// page's own click behavior is never modified). Chromium's "Copy link
// address" writes the clipboard without dispatching a copy event.
//
// ponytail: the hidden-element scan is capped so a full-page select cannot
// jank the copy event; raise the cap if a site nests deeper than 2000 nodes.
const SAFE_COPY_SCAN_LIMIT = 2000;
const SAFE_COPY_ALARM_SECONDS = 15;
const SAFE_COPY_ALARM_TEXT_LIMIT = 2000;

const SAFE_COPY_ALARM_ICON = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M24 5L2 43H46L24 5Z" fill="#f8e71c" stroke="#d0021b" stroke-width="4" stroke-linejoin="round"/><path d="M24 35V36" stroke="#000000" stroke-width="4" stroke-linecap="square"/><path d="M24 19.0005L24.0083 29" stroke="#000000" stroke-width="4" stroke-linecap="square"/></svg>';

// Same dim + blur treatment as the settings overlay.
const SAFE_COPY_ALARM_CSS = `
:host { all: initial; }
.sc-guard-viewport {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(8, 10, 14, 0.55);
    -webkit-backdrop-filter: blur(14px) saturate(1.08);
    backdrop-filter: blur(14px) saturate(1.08);
    color: #ececf1;
    overscroll-behavior: contain;
}
.sc-guard-panel {
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100vh - 40px);
    overflow: auto;
    box-sizing: border-box;
    text-align: center;
    font: 15px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.sc-guard-panel * { box-sizing: border-box; }
.sc-guard-icon { display: flex; justify-content: center; margin: 0 auto 14px; }
.sc-guard-icon svg { width: 120px; height: 120px; display: block; filter: drop-shadow(0 8px 24px rgba(248, 231, 28, 0.25)); }
.sc-guard-notices { display: flex; flex-direction: column; }
.sc-guard-notice + .sc-guard-notice {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.sc-guard-title { margin: 0 0 14px; color: #fff; font-size: 26px; line-height: 1.3; font-weight: 800; }
.sc-guard-body {
    margin: 0;
    color: #d7d7de;
    font-size: 16px;
    line-height: 1.7;
    text-align: left;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
}
.sc-guard-actions {
    margin-top: 24px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}
.sc-guard-ack {
    border: 0;
    border-radius: 12px;
    padding: 12px 28px;
    background: #f8e71c;
    color: #171717;
    font: inherit;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    /* The overlay is click-through; only this button takes input. */
    pointer-events: auto;
}
.sc-guard-ack:hover { filter: brightness(0.94); }
.sc-guard-ack:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.sc-guard-secondary {
    border: 2px solid rgba(248, 231, 28, 0.85);
    border-radius: 12px;
    padding: 10px 22px;
    background: transparent;
    color: #f8e71c;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    pointer-events: auto;
}
.sc-guard-secondary:hover { background: rgba(248, 231, 28, 0.12); }
.sc-guard-secondary:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
`;

let safeCopyAlarm = null;
// Acknowledging a click-triggered warning disables click interception for the
// rest of this tab. In-memory only: a reload clears it. Timeout does not.
let safeCopyClickAcknowledged = false;

function getSafeCopyTarget(event) {
    try {
        const path = event && event.composedPath ? event.composedPath() : null;
        if (path && path.length) return path[0];
    } catch (e) {}
    return event ? event.target : null;
}

function getSafeCopyText(event) {
    const target = getSafeCopyTarget(event);
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            return { text: String(target.value || '').substring(start, end), selection: null };
        }
    }

    const found = typeof getSelectionFromEvent === 'function'
        ? getSelectionFromEvent(event)
        : { selection: typeof window !== 'undefined' ? window.getSelection() : null };
    const selection = found && found.selection ? found.selection : null;
    return { text: selection ? selection.toString() : '', selection };
}

// A bare domain or a full URL counts as a link for the link consistency check.
// Scheme and trailing slashes are noise, so "https://baidu.com/" and
// "baidu.com" compare equal; a typo'd scheme ("htps://...") is stripped too.
// Detection itself is delegated to the selection-link extractor (module 06),
// which also drops CJK/zero-width interference. Only an unambiguous single
// link is usable for a consistency check: with zero links there is nothing to
// compare, and with several links the label itself is too vague to be a
// "displayed link". "readme.txt" / "v1.2.3" are not links to the extractor.
function findSafeCopyLink(text) {
    if (typeof extractUrlsFromText !== 'function') return '';
    const value = String(text || '').trim();
    if (!value) return '';
    const links = extractUrlsFromText(value);
    return links.length === 1 ? links[0].display : '';
}

function normalizeSafeCopyLink(value) {
    let text = String(value || '').trim().toLowerCase();
    text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // http(s) header / typos
    text = text.replace(/\/+$/, ''); // trailing slash
    return text;
}

// The settings allow comparing only the hostname (default), only the SLD+TLD,
// the whole URL, or turning the link check off.
function getSafeCopyLinkScope() {
    const value = typeof getConfig === 'function' ? getConfig('safeCopyLinkScope') : '';
    return value === 'sld' || value === 'full' || value === 'off' ? value : 'domain';
}

function getSafeCopyLinkHost(normalized) {
    // "www." is presentation noise, not a different site.
    return normalized.split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/^www\./, '');
}

function getSafeCopyLinkKey(value, scope) {
    const normalized = normalizeSafeCopyLink(value);
    if (scope === 'full') return normalized;
    const host = getSafeCopyLinkHost(normalized);
    if (scope !== 'sld') return host;
    // ponytail: last two labels, no Public Suffix List. Handles co.uk-style
    // suffixes when the caller opts into SLD scope; swap in a PSL if needed.
    const labels = host.split('.').filter(Boolean);
    return labels.length > 2 ? labels.slice(-2).join('.') : host;
}

function compareSafeCopyLinks(shown, target, scope) {
    if (scope === 'off') return false;
    return getSafeCopyLinkKey(shown, scope) !== getSafeCopyLinkKey(target, scope);
}

function getSafeCopyAnchorHref(anchor) {
    try {
        const href = anchor.href ? String(anchor.href)
            : anchor.getAttribute ? String(anchor.getAttribute('href') || '')
                : '';
        if (!href) return '';
        // Non-navigational schemes are not links the user can be phished with.
        if (/^(?:javascript|mailto|tel|data|blob):/i.test(href) || href.charAt(0) === '#') return '';
        return href;
    } catch (e) {}
    return '';
}

function findSafeCopyAnchor(node) {
    let element = node && node.nodeType === 1 ? node : getParentElement(node);
    while (element) {
        if (element.tagName === 'A') return element;
        element = getParentElement(element);
    }
    return null;
}

function isHiddenForCopy(element, win) {
    if (!element || element.nodeType !== 1) return false;
    const tag = element.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return false;

    let style;
    try {
        style = win.getComputedStyle(element);
    } catch (e) {
        return false;
    }
    if (!style) return false;

    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    if (style.opacity !== '' && parseFloat(style.opacity) === 0) return true;
    if (style.fontSize && parseFloat(style.fontSize) === 0) return true;
    if (style.contentVisibility === 'hidden') return true;

    let rect;
    try {
        rect = element.getBoundingClientRect();
    } catch (e) {
        return false;
    }
    if (!rect) return false;
    if (rect.width <= 0 || rect.height <= 0) return true;

    return isOffscreenElement(element, win, style, rect);
}

// Classic offscreen text is absolutely/fixed positioned far outside the
// visible document. Absolute boxes are measured in document coordinates so
// a normally scrolled-out element is not mistaken for hidden text.
function isOffscreenElement(element, win, style, rect) {
    const position = style && style.position;
    if (position === 'fixed') {
        const margin = 100;
        if (rect.right <= -margin || rect.bottom <= -margin ||
            rect.left >= win.innerWidth + margin ||
            rect.top >= win.innerHeight + margin) {
            return true;
        }
    } else if (position === 'absolute') {
        const margin = 100;
        const scrollX = win.scrollX || 0;
        const scrollY = win.scrollY || 0;
        const docEl = element.ownerDocument && element.ownerDocument.documentElement;
        const docWidth = docEl ? docEl.scrollWidth : win.innerWidth;
        const docHeight = docEl ? docEl.scrollHeight : win.innerHeight;
        const docLeft = rect.left + scrollX;
        const docTop = rect.top + scrollY;
        if (docLeft + rect.width <= -margin || docTop + rect.height <= -margin ||
            docLeft >= docWidth + margin || docTop >= docHeight + margin) {
            return true;
        }
    }
    return false;
}

// Only these ancestor styles hide a subtree unconditionally. Visibility and
// font-size are inherited and may be overridden by the selected text element,
// so they are read from that element instead of from every ancestor.
function isAncestorHidden(element, win) {
    if (!element || element.nodeType !== 1) return false;
    let style;
    try {
        style = win.getComputedStyle(element);
    } catch (e) {
        return false;
    }
    if (!style) return false;
    if (style.display === 'none') return true;
    if (style.opacity !== '' && parseFloat(style.opacity) === 0) return true;
    if (style.contentVisibility === 'hidden') return true;
    return false;
}

function selectionHasHiddenText(selection, win, limit = SAFE_COPY_SCAN_LIMIT) {
    if (!selection || selection.rangeCount === 0) return false;

    let range;
    try {
        range = selection.getRangeAt(0);
    } catch (e) {
        return false;
    }

    const start = range.commonAncestorContainer;
    const root = start && start.nodeType === 1 ? start : start && start.parentElement;
    if (!root) return false;

    // A wholly hidden selection is a page-driven copy buffer (e.g. X's "Copy
    // link" selects an opacity:0 span before execCommand). The user never saw
    // it, so only warn when hidden text is mixed into visible selected text.
    const docEl = root.ownerDocument && root.ownerDocument.documentElement;
    let ancestor = root;
    while (ancestor) {
        if (isAncestorHidden(ancestor, win)) return false;
        if (ancestor === docEl) break;
        ancestor = getParentElement(ancestor);
    }
    try {
        const rootStyle = win.getComputedStyle(root);
        const rootRect = root.getBoundingClientRect();
        if (rootRect && isOffscreenElement(root, win, rootStyle, rootRect)) return false;
    } catch (e) {
        // A zero-sized or detached root simply falls through to the scan.
    }

    const elements = [root];
    let children = [];
    try {
        children = root.querySelectorAll ? root.querySelectorAll('*') : [];
    } catch (e) {
        children = [];
    }
    const maxElements = limit > 0 ? Math.min(children.length, limit) : children.length;
    for (let i = 0; i < maxElements; i++) elements.push(children[i]);

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (!element || element.nodeType !== 1) continue;
        if (!element.textContent || !element.textContent.trim()) continue;

        let contained = false;
        try {
            contained = selection.containsNode(element, true);
        } catch (e) {
            contained = false;
        }
        if (contained && isHiddenForCopy(element, win)) return true;
    }
    return false;
}

const BLOCK_DISPLAYS = new Set([
    'block', 'list-item', 'table', 'table-row', 'table-cell', 'table-caption',
    'flex', 'grid', 'flow-root'
]);

function getParentElement(node) {
    if (!node) return null;
    if (node.parentElement) return node.parentElement;
    const parent = node.parentNode;
    if (parent) {
        if (parent.nodeType === 1) return parent;
        if (parent.host) return parent.host;
    }
    return null;
}

function isNodeAncestorHidden(node, win, cache) {
    let element = node && node.nodeType === 1 ? node : getParentElement(node);
    if (!element) return false;
    const docEl = element.ownerDocument && element.ownerDocument.documentElement;

    while (element) {
        if (cache.has(element)) {
            if (cache.get(element)) return true;
        } else {
            const hidden = isAncestorHidden(element, win);
            cache.set(element, hidden);
            if (hidden) return true;
        }
        if (element === docEl) break;
        element = getParentElement(element);
    }
    return false;
}

function isNodeHidden(node, win, cache) {
    const element = node && node.nodeType === 1 ? node : getParentElement(node);
    if (!element) return false;

    if (cache.has(element)) {
        if (cache.get(element)) return true;
    } else {
        const hidden = isHiddenForCopy(element, win);
        cache.set(element, hidden);
        if (hidden) return true;
    }

    return isNodeAncestorHidden(getParentElement(element), win, cache);
}

function getBlockAncestor(element, win, cache) {
    let current = element;
    while (current) {
        let display = cache.get(current);
        if (display === undefined) {
            try {
                display = win.getComputedStyle(current).display;
            } catch (e) {
                display = '';
            }
            cache.set(current, display);
        }
        if (BLOCK_DISPLAYS.has(display)) return current;
        current = getParentElement(current);
    }
    return null;
}

// Build a plain-text copy that drops hidden/offscreen text. Only used by the
// toolbar copy button; the page's own copy path is never touched.
function buildVisibleSelectionText(selection, win) {
    if (!selection || selection.rangeCount === 0) return null;
    // The copy button is a deliberate action: scan the whole selection instead
    // of using the 2000-node cap that protects ordinary copy events.
    if (!selectionHasHiddenText(selection, win, 0)) return null;

    let range;
    try {
        range = selection.getRangeAt(0);
    } catch (e) {
        return null;
    }

    const start = range.commonAncestorContainer;
    const root = start && start.nodeType === 1 ? start : start && start.parentElement;
    if (!root) return null;

    const doc = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.createTreeWalker) return null;

    let walker;
    try {
        walker = doc.createTreeWalker(root, 1 | 4, null, false);
    } catch (e) {
        return null;
    }

    const hiddenCache = new WeakMap();
    const blockCache = new WeakMap();
    let text = '';
    let lastBlock = null;

    const appendBreak = () => {
        if (text && !text.endsWith('\n')) text += '\n';
    };
    const intersects = (nodeToCheck) => {
        try {
            return range.intersectsNode(nodeToCheck);
        } catch (e) {
            return false;
        }
    };

    let node = null;
    while ((node = walker.nextNode())) {
        if (node.nodeType === 3) {
            if (!intersects(node)) continue;
            if (isNodeHidden(node, win, hiddenCache)) continue;

            const data = node.data || '';
            let from = 0;
            let to = data.length;
            if (node === range.startContainer) from = range.startOffset;
            if (node === range.endContainer) to = range.endOffset;
            if (to <= from) continue;

            const piece = data.slice(from, to);
            if (!piece) continue;

            const block = getBlockAncestor(getParentElement(node), win, blockCache);
            if (block !== lastBlock) {
                appendBreak();
                lastBlock = block;
            }
            text += piece;
        } else if (node.nodeType === 1 && node.tagName === 'BR') {
            if (intersects(node) && !isNodeAncestorHidden(node, win, hiddenCache)) {
                appendBreak();
            }
        }
    }

    return { text, changed: text !== selection.toString() };
}

function getSafeCopyAlarmRemaining(deadline, now = Date.now()) {
    const remaining = Math.ceil((deadline - now) / 1000);
    if (!Number.isFinite(remaining) || remaining <= 0) return 0;
    return Math.min(SAFE_COPY_ALARM_SECONDS, remaining);
}

function formatSafeCopyAlarmBody(kind, text, link) {
    const value = String(text || '');
    const shown = value.length > SAFE_COPY_ALARM_TEXT_LIMIT
        ? value.slice(0, SAFE_COPY_ALARM_TEXT_LIMIT) + '…'
        : value;
    // Function replacement keeps "$&"-like text in the selection literal.
    if (kind === 'link') {
        return t('alarm_body_link')
            .replace('%s', () => shown)
            .replace('%l', () => String(link || ''));
    }
    const key = kind === 'hidden' ? 'alarm_body_hidden' : 'alarm_body_altered';
    return t(key).replace('%s', () => shown);
}

function getSecurityNoticeTitle(notice) {
    if (notice.kind === 'link') return t('alarm_title_link');
    if (notice.kind === 'idn') return t('alarm_title_idn_' + notice.idn);
    if (notice.kind === 'zeroWidth') return t('alarm_title_zero_width');
    return t(notice.kind === 'hidden' ? 'alarm_title_hidden' : 'alarm_title_altered');
}

function formatSecurityNoticeBody(notice) {
    if (notice.kind === 'link') return formatSafeCopyAlarmBody('link', notice.text, notice.link);
    if (notice.kind === 'idn' && typeof formatIdnAlarmBody === 'function') {
        return formatIdnAlarmBody(notice.idn, notice.selected);
    }
    if (notice.kind === 'zeroWidth') {
        return t('alarm_body_zero_width')
            .replace('%s', () => String(notice.total || 0))
            .replace('%r', () => String(notice.run || 0));
    }
    return formatSafeCopyAlarmBody(notice.kind, notice.text, notice.link);
}

function getSecurityNoticeToastText(notice) {
    if (notice.kind === 'link') return t('toast_copy_link');
    if (notice.kind === 'idn' && typeof getIdnToastText === 'function') return getIdnToastText(notice);
    if (notice.kind === 'zeroWidth') {
        return t('toast_copy_zero_width').replace('%s', () => String(notice.total || 0));
    }
    if (notice.kind === 'hidden') return t('toast_copy_hidden');
    if (notice.kind === 'altered') return t('toast_copy_altered');
    return '';
}

// Copy/right-click warnings share one pipeline so two detections can surface
// together: toasts are merged into one multi-line toast, while full-screen
// notices are rendered as stacked panels in a single overlay. Callers may add
// one informational line (e.g. "Copied visible text only") after the warning.
function showSecurityWarnings(notices, pointer, extraToastText, actions) {
    if (!notices || !notices.length) return;
    const active = notices.filter((notice) =>
        notice.kind !== 'idn' ||
        (typeof getIdnGuardMode === 'function' && getIdnGuardMode() !== 'disabled')
    );
    if (!active.length) return;

    const toastTexts = active
        .filter((notice) => notice.kind !== 'idn' || getIdnGuardMode() === 'toast')
        .map(getSecurityNoticeToastText)
        .filter(Boolean);
    if (extraToastText) toastTexts.push(extraToastText);
    if (toastTexts.length && typeof showToast === 'function') {
        showToast(toastTexts.join('\n'), 2600);
    }

    const alarmNotices = active.filter((notice) => {
        if (notice.kind === 'link') return getConfig('enableSafeCopyAlarm') === true;
        if (notice.kind === 'idn') return getIdnGuardMode() === 'fullscreen';
        return getConfig('enableSafeCopyAlarm') === true;
    });
    if (alarmNotices.length) showSafeCopyAlarm({ notices: alarmNotices, pointer, actions });
}

function closeSafeCopyAlarm() {
    const state = safeCopyAlarm;
    if (!state) return;
    safeCopyAlarm = null;

    if (state.timer) clearInterval(state.timer);
    if (state.host && state.host.parentNode) state.host.parentNode.removeChild(state.host);
}

// Only the acknowledge button opts the rest of the tab out; the 15s timeout
// must leave click interception armed. The cover turns click-through but stays
// visible as a plain visual reminder.
function acknowledgeSafeCopyAlarm() {
    const state = safeCopyAlarm;
    const isClickWarning = state && Array.isArray(state.actionList) &&
        state.actionList.some((action) => action.kind === 'open');
    if (isClickWarning) {
        safeCopyClickAcknowledged = true;
        clearLinkGuardNavigationTimers();
        if (linkGuard) {
            linkGuard.boxes.forEach((box) => {
                box.setAttribute('data-passive', 'true');
                box.style.pointerEvents = 'none';
            });
        }
    }
    closeSafeCopyAlarm();
}

// The warning must never compete with a native context menu: the backdrop is
// click-through and never focused, only the acknowledge button takes input.
function createSafeCopyAlarm(doc) {
    const parent = doc.documentElement || doc.body;
    if (!parent) return null;

    const host = doc.createElement('div');
    host.id = 'tm-safe-copy-alarm-host';
    host.setAttribute('data-notranslate', '');
    host.style.all = 'initial';
    host.style.display = 'block';
    host.style.position = 'fixed';
    host.style.inset = '0';
    // One below the toolbar host (2147483647) so a toast stays visible on top
    // of the full-screen warning instead of being dimmed by its backdrop.
    host.style.zIndex = '2147483646';
    host.style.pointerEvents = 'none';
    parent.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = SAFE_COPY_ALARM_CSS;
    shadow.appendChild(style);

    const viewport = doc.createElement('div');
    viewport.className = 'sc-guard-viewport';
    shadow.appendChild(viewport);

    const panel = doc.createElement('div');
    panel.className = 'sc-guard-panel';
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-labelledby', 'tm-safe-copy-alarm-title');
    viewport.appendChild(panel);

    const icon = doc.createElement('div');
    icon.className = 'sc-guard-icon';
    icon.innerHTML = SAFE_COPY_ALARM_ICON;
    panel.appendChild(icon);

    const noticesEl = doc.createElement('div');
    noticesEl.className = 'sc-guard-notices';
    panel.appendChild(noticesEl);

    const actions = doc.createElement('div');
    actions.className = 'sc-guard-actions';
    panel.appendChild(actions);

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'sc-guard-ack';
    button.addEventListener('click', acknowledgeSafeCopyAlarm);
    actions.appendChild(button);

    // Link warnings get up to two follow-up actions: the displayed link and
    // the real target. Hidden for warnings that have nothing actionable.
    const makeActionButton = (index) => {
        const actionButton = doc.createElement('button');
        actionButton.type = 'button';
        actionButton.className = 'sc-guard-secondary';
        actionButton.style.display = 'none';
        actionButton.addEventListener('click', () => runSafeCopyAlarmAction(index));
        actions.appendChild(actionButton);
        return actionButton;
    };
    const actionButtons = [makeActionButton(0), makeActionButton(1)];

    return {
        host, doc, noticesEl, actions, button,
        actionButtons, actionList: [],
        timer: null, deadline: 0,
    };
}

function setSafeCopyAlarmActions(state, actions) {
    if (!state || !state.actionButtons) return;
    const valid = (Array.isArray(actions) ? actions : [])
        .filter((action) => action && action.url &&
            (action.kind === 'copy' || action.kind === 'open'));
    state.actionList = valid;
    state.actionButtons.forEach((button, index) => {
        const action = valid[index];
        button.style.display = action ? 'block' : 'none';
        if (!action) return;
        button.textContent = action.label ? t(action.label)
            : t(action.kind === 'open' ? 'alarm_open_displayed' : 'alarm_copy_displayed');
    });
}

function runSafeCopyAlarmAction(index) {
    const state = safeCopyAlarm;
    const action = state && state.actionList ? state.actionList[index] : null;
    if (!action) return;
    closeSafeCopyAlarm();
    try {
        if (action.kind === 'copy') {
            if (typeof copyToClipboard === 'function') {
                copyToClipboard(action.url, '').then((ok) => {
                    if (ok && typeof showToast === 'function') showToast(t('toast_link_copied'));
                });
            }
            return;
        }
        if (action.kind === 'open') openSafeCopyDisplayedLink(action.url, action.newTab);
    } catch (e) {
        // A failed follow-up must never leave the page in a worse state.
    }
}

function openSafeCopyDisplayedLink(url, newTab) {
    if (!/^https?:\/\//i.test(String(url || ''))) return;
    if (newTab && typeof safeOpenTab === 'function') {
        safeOpenTab(url);
        return;
    }
    if (typeof window === 'undefined') return;
    if (newTab && typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener');
        return;
    }
    if (window.location && typeof window.location.assign === 'function') {
        window.location.assign(url);
    }
}

// Each warning is a title + body pair inside the shared panel; the panel and
// acknowledge button stay single, so stacked warnings still fit one overlay.
function renderSafeCopyAlarmNotices(state, notices) {
    const list = state.noticesEl;
    if (!list) return;
    Array.from(list.children || []).forEach((child) => list.removeChild(child));

    notices.forEach((notice, index) => {
        const item = state.doc.createElement('div');
        item.className = 'sc-guard-notice';

        const title = state.doc.createElement('h2');
        title.className = 'sc-guard-title';
        if (index === 0) {
            title.id = 'tm-safe-copy-alarm-title';
        }
        title.textContent = getSecurityNoticeTitle(notice);

        const body = state.doc.createElement('p');
        body.className = 'sc-guard-body';
        body.textContent = formatSecurityNoticeBody(notice);

        item.appendChild(title);
        item.appendChild(body);
        list.appendChild(item);
    });
}

// The acknowledge button is the only clickable part of the overlay. When the
// right-click point falls on it, the button would become the mouseup target
// and disturb the native menu, so shift it sideways by the shortest distance
// that clears the pointer. Horizontal only: the panel clips vertical overflow.
function avoidSafeCopyAlarmPointer(button, pointer) {
    if (!button || !button.style) return;
    button.style.transform = '';
    if (!pointer || !button.getBoundingClientRect) return;

    let rect;
    try {
        rect = button.getBoundingClientRect();
    } catch (e) {
        return;
    }
    const x = Number(pointer.x);
    const y = Number(pointer.y);
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

    const margin = 16;
    const left = x - rect.right - margin;
    const right = x - rect.left + margin;
    const dx = Math.abs(left) <= Math.abs(right) ? left : right;
    button.style.transform = `translate(${Math.round(dx)}px, 0)`;
}

function showSafeCopyAlarm({ kind, text, link, notices, pointer, actions }) {
    if (typeof document === 'undefined' || !document.createElement) return false;

    let state = safeCopyAlarm;
    if (!state || !state.host.isConnected) {
        if (state) closeSafeCopyAlarm();
        state = createSafeCopyAlarm(document);
        if (!state) return false;
        safeCopyAlarm = state;
    }

    const list = Array.isArray(notices) && notices.length
        ? notices
        : [{ kind, text, link }];
    renderSafeCopyAlarmNotices(state, list);
    setSafeCopyAlarmActions(state, actions);
    state.deadline = Date.now() + SAFE_COPY_ALARM_SECONDS * 1000;

    if (state.timer) clearInterval(state.timer);
    const tick = () => {
        if (safeCopyAlarm !== state) return;
        const remaining = getSafeCopyAlarmRemaining(state.deadline);
        if (remaining <= 0) {
            closeSafeCopyAlarm();
            return;
        }
        state.button.textContent = t('alarm_ack', remaining);
    };
    state.timer = setInterval(tick, 1000);
    tick();
    avoidSafeCopyAlarmPointer(state.actions || state.button, pointer);
    return true;
}

// The action button follows the link the user actually saw, not the hidden
// href. Reuse the selection-link extractor so CJK/zero-width noise is dropped
// the same way as "detect hidden links". A clipped label ending in an ellipsis
// is completed from the href only when it really is a prefix of that href, so
// a genuinely different destination is never silently substituted.
function resolveSafeCopyDisplayedLink(anchor, shown) {
    const raw = String(anchor && anchor.textContent || '').trim();
    const value = String(shown || '').trim();
    if (!value) return '';
    const cleaned = value.replace(/(?:…|⋯|\.{3,})+$/, '').trim();
    if (!cleaned) return '';
    // The extractor trims the clipped tail, so look at the label itself to know
    // whether the displayed link was cut off.
    const clipped = /(?:…|⋯|\.{3,})+$/.test(raw) || cleaned !== value;

    let url = '';
    if (typeof extractUrlsFromText === 'function') {
        const found = extractUrlsFromText(cleaned);
        if (found.length) url = found[0].url;
    }
    if (!url) {
        url = /^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : 'https://' + cleaned;
    }

    const href = getSafeCopyAnchorHref(anchor);
    if (clipped && href && url &&
        getSafeCopyLinkKey(href, 'full').startsWith(getSafeCopyLinkKey(url, 'full'))) {
        return href;
    }
    // The extractor defaults a scheme-less label to http; prefer the anchor's
    // https scheme when both point at the same host.
    if (href && /^http:\/\//i.test(url) && /^https:\/\//i.test(href) &&
        getSafeCopyLinkKey(href, 'domain') === getSafeCopyLinkKey(url, 'domain')) {
        url = 'https://' + url.slice(7);
    }
    return url;
}

function findSafeCopyLinkProblem(anchor, scope) {
    if (!anchor || scope === 'off') return null;
    const shown = findSafeCopyLink(anchor.textContent);
    if (!shown) return null;
    const href = getSafeCopyAnchorHref(anchor);
    if (!href) return null;
    if (!compareSafeCopyLinks(shown, href, scope)) return null;
    return { shown, href };
}

// Chromium writes "Copy link address" straight to the system clipboard without
// a page event, so the last moment a page can look at the link is the
// right-click itself.
function handleSafeCopyContextMenu(event) {
    try {
        runSafeCopyContextMenuCheck(event);
    } catch (e) {
        // A read-only detector must never break the page's context menu.
    }
}

function runSafeCopyContextMenuCheck(event) {
    if (!event || event.isTrusted === false) return;

    const anchor = findSafeCopyAnchor(getSafeCopyTarget(event));
    if (!anchor) return;

    // Both detections feed the same warning pipeline so a single right-click
    // can surface link mismatch and IDN homograph notices together.
    const notices = [];
    const problem = findSafeCopyLinkProblem(anchor, getSafeCopyLinkScope());
    if (problem) {
        notices.push({ kind: 'link', text: problem.shown, link: problem.href });
    }
    if (typeof getIdnWarningsForAnchor === 'function') {
        notices.push(...getIdnWarningsForAnchor(anchor, true));
    }
    if (!notices.length) return;

    const actions = [];
    if (problem) {
        const displayed = resolveSafeCopyDisplayedLink(anchor, problem.shown);
        if (displayed) actions.push({ kind: 'copy', url: displayed });
        actions.push({ kind: 'copy', url: problem.href, label: 'alarm_copy_actual' });
    }
    showSecurityWarnings(notices, {
        x: event.clientX,
        y: event.clientY,
    }, null, actions);
}

// Dragging a link hands its URL to the drop target. A full-screen layer would
// break the drag, so this path is toast-only even when the alarm is enabled.
function handleSafeCopyDragStart(event) {
    try {
        if (!event || event.isTrusted === false) return;

        const problem = findSafeCopyLinkProblem(
            findSafeCopyAnchor(getSafeCopyTarget(event)),
            getSafeCopyLinkScope()
        );
        if (!problem) return;

        if (typeof showToast === 'function') showToast(t('toast_copy_link'), 2600);
    } catch (e) {
        // A read-only detector must never break the page's drag.
    }
}

// Opt-in link cover: instead of trying to cancel a native click (which pages
// can bypass with their own pointerdown/navigation handlers), a translucent
// layer is laid over each mismatched link in the viewport. The click lands on
// our layer, so the page's own event behavior is never touched. The viewport is
// re-checked on scroll/resize (coalesced with rAF) and, as a fast path, one
// hovered link is checked immediately; the whole document is never scanned on a
// timer.
const LINK_GUARD_Z_INDEX = '2147483000';
// ponytail: each scroll reads one rect per anchor in the document and caps the
// covers drawn. A page with tens of thousands of links may jank; move to
// IntersectionObserver if that ever shows up.
const LINK_GUARD_MAX_COVERS = 40;

const LINK_GUARD_CSS = `
:host { all: initial; }
.sc-link-guard {
    position: fixed;
    box-sizing: border-box;
    background: rgba(248, 231, 28, 0.30);
    border: 2px solid rgba(248, 231, 28, 0.92);
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.22), 0 2px 10px rgba(248, 231, 28, 0.24);
    pointer-events: auto;
    cursor: pointer;
}
.sc-link-guard[data-passive="true"] {
    pointer-events: none;
    cursor: default;
}
`;

let linkGuard = null;
let linkGuardScanScheduled = false;

function getLinkGuard() {
    if (linkGuard && linkGuard.host.isConnected) return linkGuard;
    if (typeof document === 'undefined' || !document.createElement) return null;
    const parent = document.documentElement || document.body;
    if (!parent) return null;

    const host = document.createElement('div');
    host.id = 'tm-safe-copy-link-guard-host';
    host.setAttribute('data-notranslate', '');
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.inset = '0';
    // Below the alarm (2147483646) and the toolbar (2147483647).
    host.style.zIndex = LINK_GUARD_Z_INDEX;
    host.style.pointerEvents = 'none';
    parent.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = LINK_GUARD_CSS;
    shadow.appendChild(style);
    linkGuard = { host, shadow, boxes: new Map() };
    return linkGuard;
}

function hideLinkGuard() {
    if (!linkGuard) return;
    if (linkGuard.host.parentNode) linkGuard.host.parentNode.removeChild(linkGuard.host);
    linkGuard = null;
}

function removeLinkGuardBox(state, anchor) {
    const box = state.boxes.get(anchor);
    if (!box) return;
    if (box.parentNode) box.parentNode.removeChild(box);
    state.boxes.delete(anchor);
}

function positionLinkGuardBox(box, anchor) {
    if (!anchor || anchor.isConnected === false || !anchor.getBoundingClientRect) {
        box.style.display = 'none';
        return;
    }
    let rect;
    try {
        rect = anchor.getBoundingClientRect();
    } catch (e) {
        box.style.display = 'none';
        return;
    }
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
        box.style.display = 'none';
        return;
    }
    const win = typeof window !== 'undefined' ? window : null;
    if (win && (rect.bottom <= 0 || rect.top >= win.innerHeight ||
        rect.right <= 0 || rect.left >= win.innerWidth)) {
        box.style.display = 'none';
        return;
    }

    const style = box.style;
    style.display = 'block';
    style.left = Math.max(0, rect.left) + 'px';
    style.top = Math.max(0, rect.top) + 'px';
    style.width = rect.width + 'px';
    style.height = rect.height + 'px';
}

function createLinkGuardBox(state, anchor) {
    const box = document.createElement('div');
    box.className = 'sc-link-guard';
    box.addEventListener('click', (event) => handleLinkGuardClick(event, anchor));
    // The native link menu cannot target the page's anchor while our layer is
    // on top, so right-click offers the same copy-displayed-link warning.
    box.addEventListener('contextmenu', (event) => handleLinkGuardContextMenu(event, anchor));
    // The click is already ours; keep page-level delegated handlers out of it
    // without touching the page's own event listeners. No preventDefault here:
    // the native right-click menu must still follow, and our contextmenu
    // handler takes over from there.
    const contain = (event) => {
        event.stopImmediatePropagation();
    };
    box.addEventListener('pointerdown', contain);
    box.addEventListener('mousedown', contain);
    state.shadow.appendChild(box);
    return box;
}

function ensureLinkGuardBox(state, anchor) {
    let box = state.boxes.get(anchor);
    if (!box) {
        box = createLinkGuardBox(state, anchor);
        state.boxes.set(anchor, box);
    }
    box.style.pointerEvents = 'auto';
    if (box.removeAttribute) box.removeAttribute('data-passive');
    positionLinkGuardBox(box, anchor);
    return box;
}

function collectViewportGuardAnchors() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return [];
    const scope = getSafeCopyLinkScope();
    if (scope === 'off') return [];
    const win = typeof window !== 'undefined' ? window : null;
    if (!win) return [];

    let anchors;
    try {
        anchors = document.querySelectorAll('a[href]');
    } catch (e) {
        return [];
    }

    const found = [];
    const total = anchors.length;
    for (let i = 0; i < total; i++) {
        if (found.length >= LINK_GUARD_MAX_COVERS) break;
        const anchor = anchors[i];
        if (anchor.hasAttribute && anchor.hasAttribute('download')) continue;
        let rect;
        try {
            rect = anchor.getBoundingClientRect();
        } catch (e) {
            continue;
        }
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) continue;
        if (rect.bottom <= 0 || rect.top >= win.innerHeight ||
            rect.right <= 0 || rect.left >= win.innerWidth) continue;
        if (!findSafeCopyLinkProblem(anchor, scope)) continue;
        found.push(anchor);
    }
    return found;
}

// Rebuild the cover set from what is currently visible. Called on scroll and
// resize only; content added without either is picked up by the hover fast path.
function refreshLinkGuards() {
    if (safeCopyClickAcknowledged) {
        // The tab is opted out: keep existing covers as plain visuals.
        if (!linkGuard) return;
        linkGuard.boxes.forEach((box, anchor) => {
            if (anchor.isConnected === false) removeLinkGuardBox(linkGuard, anchor);
            else positionLinkGuardBox(box, anchor);
        });
        return;
    }
    if (getConfig('safeCopyClickCheck') !== true ||
        getConfig('enableSafeCopyAlarm') !== true) {
        hideLinkGuard();
        return;
    }

    const anchors = collectViewportGuardAnchors();
    if (!anchors.length) {
        hideLinkGuard();
        return;
    }
    const state = getLinkGuard();
    if (!state) return;

    const keep = new Set(anchors);
    state.boxes.forEach((box, anchor) => {
        if (!keep.has(anchor) || anchor.isConnected === false) removeLinkGuardBox(state, anchor);
    });
    anchors.forEach((anchor) => ensureLinkGuardBox(state, anchor));
}

function scheduleLinkGuardScan() {
    if (linkGuardScanScheduled) return;
    linkGuardScanScheduled = true;
    const run = () => {
        linkGuardScanScheduled = false;
        try {
            refreshLinkGuards();
        } catch (e) {}
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
}

// SPA/PWA routes swap the content without a scroll or resize, so a viewport
// scan never runs again. Use the platform's own navigation signal instead of
// watching the DOM: Chrome's Navigation API fires currententrychange for
// history.pushState/replaceState, and popstate/hashchange cover back/forward.
// Content renders asynchronously after the route change, so re-check a bounded
// number of times rather than polling.
const LINK_GUARD_NAVIGATION_RECHECKS = [300, 1200];
let linkGuardNavigationTimers = [];

function clearLinkGuardNavigationTimers() {
    linkGuardNavigationTimers.forEach((timer) => clearTimeout(timer));
    linkGuardNavigationTimers = [];
}

function scheduleLinkGuardNavigationRecheck() {
    if (safeCopyClickAcknowledged) return;
    if (getConfig('safeCopyClickCheck') !== true) return;
    clearLinkGuardNavigationTimers();
    scheduleLinkGuardScan();
    LINK_GUARD_NAVIGATION_RECHECKS.forEach((delay) => {
        linkGuardNavigationTimers.push(setTimeout(() => {
            if (safeCopyClickAcknowledged) return;
            if (getConfig('safeCopyClickCheck') !== true) return;
            scheduleLinkGuardScan();
        }, delay));
    });
}

// Browsers without the Navigation API: a trusted click is the only reliable
// signal that a SPA may be about to swap the page content.
function handleLinkGuardNavigationClick(event) {
    if (!event || event.isTrusted === false) return;
    scheduleLinkGuardNavigationRecheck();
}

// Fast path for links that appear between scrolls (e.g. an infinite feed).
function handleLinkGuardPointerOver(event) {
    try {
        if (!event || event.isTrusted === false) return;
        if (safeCopyClickAcknowledged) return;
        if (getConfig('safeCopyClickCheck') !== true) return;
        if (getConfig('enableSafeCopyAlarm') !== true) return;
        const scope = getSafeCopyLinkScope();
        if (scope === 'off') return;

        const anchor = findSafeCopyAnchor(getSafeCopyTarget(event));
        if (!anchor) return;
        if (anchor.hasAttribute && anchor.hasAttribute('download')) return;
        if (!findSafeCopyLinkProblem(anchor, scope)) return;

        const state = getLinkGuard();
        if (!state) return;
        ensureLinkGuardBox(state, anchor);
    } catch (e) {
        // A hover detector must never disrupt the page.
    }
}

function showLinkGuardWarning(anchor, kind, pointer) {
    if (!anchor) return;
    if (getConfig('safeCopyClickCheck') !== true) return;
    if (getConfig('enableSafeCopyAlarm') !== true) return;
    const scope = getSafeCopyLinkScope();
    if (scope === 'off') return;

    const problem = findSafeCopyLinkProblem(anchor, scope);
    if (!problem) return;

    const displayed = resolveSafeCopyDisplayedLink(anchor, problem.shown);
    const target = anchor.getAttribute
        ? String(anchor.getAttribute('target') || '').toLowerCase()
        : '';
    const newTab = target === '_blank';
    const actualLabel = kind === 'open' ? 'alarm_open_actual' : 'alarm_copy_actual';
    showSecurityWarnings(
        [{ kind: 'link', text: problem.shown, link: problem.href }],
        pointer || null,
        null,
        [
            { kind, url: displayed, newTab },
            { kind, url: problem.href, newTab, label: actualLabel },
        ]
    );
}

function handleLinkGuardClick(event, anchor) {
    try {
        if (!event) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showLinkGuardWarning(anchor, 'open');
    } catch (e) {
        // A failed warning must never swallow the interaction by accident.
    }
}

function handleLinkGuardContextMenu(event, anchor) {
    try {
        if (!event) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showLinkGuardWarning(anchor, 'copy', {
            x: event.clientX,
            y: event.clientY,
        });
    } catch (e) {
        // A failed warning must never swallow the interaction by accident.
    }
}

function handleSafeCopyCheck(event) {
    try {
        runSafeCopyCheck(event);
    } catch (e) {
        // A read-only detector must never break the page's copy event.
    }
}

function runSafeCopyCheck(event) {
    if (!event || event.isTrusted === false) return;

    const win = typeof window !== 'undefined' ? window : null;
    if (!win) return;

    const copied = getSafeCopyText(event);
    if (!copied.text || !copied.text.trim()) return;

    let clipboardText = '';
    try {
        const data = event.clipboardData;
        clipboardText = data ? (data.getData('text/plain') || data.getData('text') || '') : '';
    } catch (e) {
        clipboardText = '';
    }

    const notices = [];
    if (clipboardText && clipboardText !== copied.text) {
        notices.push({ kind: 'altered', text: copied.text });
    } else if (copied.selection && selectionHasHiddenText(copied.selection, win)) {
        notices.push({ kind: 'hidden', text: copied.text });
    }

    // The clipboard is what actually leaves the page, so it is the source of
    // truth for zero-width tracking IDs (including page-injected ones). Fall
    // back to the selection when the event exposes no clipboard text.
    if (typeof getZeroWidthNotice === 'function') {
        const notice = getZeroWidthNotice(clipboardText || copied.text);
        if (notice) notices.push(notice);
    }
    if (!notices.length) return;

    // Toasts are always on; the strong reminder is the optional full-screen layer.
    showSecurityWarnings(notices);
}
