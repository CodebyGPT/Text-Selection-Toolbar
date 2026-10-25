// Module 23: Safe copy (read-only copy guard)
//
// Copy Guard-style checks run synchronously inside the copy event. This module
// must never call preventDefault / stopPropagation / setData / execCommand or
// any clipboard write: outside unlock mode the page's own copy behavior must
// stay exactly as it was. It only reads the selection, the event's clipboard
// data and computed styles, then shows a toast (and optionally a full-screen
// warning).
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
.sc-guard-ack {
    margin-top: 24px;
    border: 0;
    border-radius: 12px;
    padding: 12px 28px;
    background: #f8e71c;
    color: #171717;
    font: inherit;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
}
.sc-guard-ack:hover { filter: brightness(0.94); }
.sc-guard-ack:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
`;

let safeCopyAlarm = null;

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

    // Classic offscreen text is absolutely/fixed positioned far outside the
    // visible document. Absolute boxes are measured in document coordinates so
    // a normally scrolled-out element is not mistaken for hidden text.
    const position = style.position;
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

    // A hidden ancestor above the range root hides the whole selection too.
    // Skip zero-sized layout wrappers/shadow hosts; their text elements are
    // checked by their own box below.
    const docEl = root.ownerDocument && root.ownerDocument.documentElement;
    let ancestor = getParentElement(root);
    while (ancestor) {
        if (isAncestorHidden(ancestor, win)) return true;
        if (ancestor === docEl) break;
        ancestor = getParentElement(ancestor);
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

function formatSafeCopyAlarmBody(kind, text) {
    const value = String(text || '');
    const shown = value.length > SAFE_COPY_ALARM_TEXT_LIMIT
        ? value.slice(0, SAFE_COPY_ALARM_TEXT_LIMIT) + '…'
        : value;
    const key = kind === 'hidden' ? 'alarm_body_hidden' : 'alarm_body_altered';
    // Function replacement keeps "$&"-like text in the selection literal.
    return t(key).replace('%s', () => shown);
}

function closeSafeCopyAlarm() {
    const state = safeCopyAlarm;
    if (!state) return;
    safeCopyAlarm = null;

    if (state.timer) clearInterval(state.timer);
    if (state.host && state.host.parentNode) state.host.parentNode.removeChild(state.host);
}

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
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'auto';
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
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'tm-safe-copy-alarm-title');
    panel.setAttribute('aria-describedby', 'tm-safe-copy-alarm-body');
    viewport.appendChild(panel);

    const icon = doc.createElement('div');
    icon.className = 'sc-guard-icon';
    icon.innerHTML = SAFE_COPY_ALARM_ICON;
    panel.appendChild(icon);

    const title = doc.createElement('h2');
    title.className = 'sc-guard-title';
    title.id = 'tm-safe-copy-alarm-title';
    panel.appendChild(title);

    const body = doc.createElement('p');
    body.className = 'sc-guard-body';
    body.id = 'tm-safe-copy-alarm-body';
    panel.appendChild(body);

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'sc-guard-ack';
    button.addEventListener('click', closeSafeCopyAlarm);
    panel.appendChild(button);

    return { host, title, body, button, timer: null, deadline: 0 };
}

function showSafeCopyAlarm({ kind, text }) {
    if (typeof document === 'undefined' || !document.createElement) return false;

    let state = safeCopyAlarm;
    if (!state || !state.host.isConnected) {
        if (state) closeSafeCopyAlarm();
        state = createSafeCopyAlarm(document);
        if (!state) return false;
        safeCopyAlarm = state;
    }

    state.title.textContent = t(kind === 'hidden' ? 'alarm_title_hidden' : 'alarm_title_altered');
    state.body.textContent = formatSafeCopyAlarmBody(kind, text);
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
    return true;
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

    let kind = '';
    if (clipboardText && clipboardText !== copied.text) {
        kind = 'altered';
    } else if (copied.selection && selectionHasHiddenText(copied.selection, win)) {
        kind = 'hidden';
    }
    if (!kind) return;

    // The toast is always on; the strong reminder is the optional full-screen layer.
    if (typeof showToast === 'function') {
        showToast(t(kind === 'altered' ? 'toast_copy_altered' : 'toast_copy_hidden'), 2600);
    }
    if (getConfig('enableSafeCopyAlarm') === true) {
        showSafeCopyAlarm({ kind, text: copied.text });
    }
}
