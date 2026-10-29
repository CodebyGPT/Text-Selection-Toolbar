// Module 14: Event Handlers

// --- Shadow-DOM aware target resolution ------------------------------------
// An event that crosses a shadow boundary is retargeted to the host on the way
// out, so a listener on document sees `e.target === <my-widget>` instead of the
// <input>/contenteditable the user actually clicked. composedPath()[0] keeps
// the real inner node at any nesting depth, which is what paste/cut/delete need.
function eventTargetDeep(e) {
    if (!e) return null;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
    return (path && path[0]) || e.target || null;
}

// document.activeElement is retargeted the same way: it stops at the outer
// host. Descend the open shadow roots to find the element that owns focus.
function activeElementDeep() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
        el = el.shadowRoot.activeElement;
    }
    return el;
}

// Editable state is inherited and may live on an ancestor across shadow
// boundaries, so walk the composed tree and return the editing host itself.
// Returns null when the node is not in an editable area.
function editableTargetOf(node) {
    let el = node && node.nodeType === 1 ? node : node?.parentElement;
    while (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            return el.disabled || el.readOnly ? null : el;
        }
        if (el.isContentEditable) {
            // Climb to the element that carries contenteditable: paste events
            // and value comparisons are anchored there, not on a child span.
            let host = el;
            while (host.parentElement?.isContentEditable) host = host.parentElement;
            return host;
        }
        el = el.parentElement || el.host;
    }
    return null;
}

// selectionStart throws for input types that do not support selection (number,
// date, ...), so a text-control selection is only read through this helper.
function controlSelection(el) {
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return null;
    try {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        return typeof start === 'number' && typeof end === 'number'
            ? { start, end }
            : null;
    } catch (e) {
        return null;
    }
}

// Last real pointer position, shared with the toolbar render path so the fade
// state is applied immediately when the toolbar appears. Updated by mousemove
// only; there is no polling.
let lastPointerX = 0;
let lastPointerY = 0;
let pointerKnown = false;

// --- One toolbar per selection ---------------------------------------------
// A toolbar belongs to the press that created its selection: a native event
// that leaves a non-empty selection arms the press, and the release consumes
// the arm. Clicking already-selected text is a *selection-clearing* change, so
// it never arms and cannot bring the dismissed bar back. Nothing here inspects
// mouse movement, compares selection snapshots, counts renders or polls.
let selectionGestureArmed = false;
let pressSelection = null;
let pressControl = null;
let scheduledToolbar = null;

// The press remembers the selection object of the tree it started in: the
// document's, or an open ShadowRoot's. Chromium keeps a shadow-tree selection
// out of window.getSelection(), so a shadow-aware arm has to read the root's
// live Selection instead of the document one.
function selectionRootOfPress(e) {
    const path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
    const node = path[0] || (e && e.target);
    const root = node && typeof node.getRootNode === 'function' ? node.getRootNode() : document;
    return root && root !== document && typeof root.getSelection === 'function' ? root : document;
}

// Some engines dispatch selectionchange on the shadow root instead of the
// document. Subscribing to the root is idempotent, so a press can do it every
// time for the tree it starts in.
function watchShadowSelection(root) {
    if (!root || root === document) return;
    root.addEventListener('selectstart', armOnSelectStart, true);
    root.addEventListener('selectionchange', armSelectionGesture, true);
}

// `selectstart` is the native "a selection is starting" signal (the UA fires it
// only when the previous selection was empty or collapsed), so it arms without
// inspecting any state and works for shadow trees too.
function armOnSelectStart() {
    selectionGestureArmed = true;
}

function selectedTextOf(selection) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return '';
    return selection.toString();
}

function armSelectionGesture(e) {
    const target = e && e.target;
    // A text control keeps its selection outside the document selection, and
    // some engines dispatch the change at the document. The press remembers
    // the control it started in, so arming never depends on the event target.
    const control = controlSelection(target) ? target : pressControl;
    if (control) {
        const state = controlSelection(control);
        if (state && state.start !== state.end) selectionGestureArmed = true;
        return;
    }
    // Only a change to a non-empty selection arms; clearing a selection (for
    // example a click that deselects the current text) must not.
    if (selectedTextOf(pressSelection)) selectionGestureArmed = true;
}

function consumeSelectionArm() {
    const armed = selectionGestureArmed;
    selectionGestureArmed = false;
    return armed;
}

function handleSelectionPressStart(e) {
    if (e.button !== 0) return;
    // Every press starts unarmed: only a selection event during this press can
    // allow the release to open a toolbar.
    selectionGestureArmed = false;
    const root = selectionRootOfPress(e);
    pressSelection = root === document ? window.getSelection() : root.getSelection();
    const target = eventTargetDeep(e);
    pressControl = controlSelection(target) ? target : null;
    watchShadowSelection(root);
    if (hostElement && e.composedPath().includes(hostElement)) return;
    // Dismiss the previous bar now and drop its scheduled render, so it cannot
    // reappear after the user has moved on to something else.
    hideUI();
}

// A release schedules at most one render. Pressing again or hiding the UI
// cancels it, so an async cache read cannot resurrect a stale bar.
function scheduleToolbarRender(delay, render) {
    cancelScheduledToolbar();
    const job = { timer: 0, cancelled: false };
    job.timer = setTimeout(async () => {
        try {
            await render(() => job.cancelled);
        } finally {
            if (scheduledToolbar === job) scheduledToolbar = null;
        }
    }, delay);
    scheduledToolbar = job;
}

function cancelScheduledToolbar() {
    if (!scheduledToolbar) return;
    clearTimeout(scheduledToolbar.timer);
    scheduledToolbar.cancelled = true;
    scheduledToolbar = null;
}

// Trim whitespace at both ends of a normal page selection before the toolbar
// is shown. Returns false when the selection contains only whitespace.
function trimRangeWhitespace(selection) {
    try {
        const range = selection.getRangeAt(0);
        const root = range.commonAncestorContainer.nodeType === 1
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentNode;
        if (!root) return false;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const chars = [];
        let node;
        while ((node = walker.nextNode())) {
            if (!range.intersectsNode(node)) continue;
            const data = node.data;
            const start = node === range.startContainer ? range.startOffset : 0;
            const end = node === range.endContainer ? range.endOffset : data.length;
            for (let i = start; i < end; i++) {
                chars.push({ node, offset: i, char: data[i] });
            }
        }

        let first = 0;
        let last = chars.length - 1;
        while (first <= last && /\s/.test(chars[first].char)) first++;
        while (last >= first && /\s/.test(chars[last].char)) last--;
        if (first > last) return false;

        const startNode = chars[first].node;
        const startOffset = chars[first].offset;
        const endNode = chars[last].node;
        const endOffset = chars[last].offset + 1;

        // Nothing selected beyond whitespace: leave the selection untouched so
        // its drag direction and the page's selection state stay as they are.
        if (startNode === range.startContainer && startOffset === range.startOffset &&
            endNode === range.endContainer && endOffset === range.endOffset) {
            return true;
        }

        // Pitfall: Chrome resets the selection to forward as soon as script
        // code sets the range's boundaries - even to identical values - so the
        // old setStart/setEnd + removeAllRanges()+addRange() rewrite silently
        // killed backward drags and moved the toolbar to the wrong end. Read
        // the drag direction first, leave the selection untouched when nothing
        // is trimmed, and apply the trimmed boundaries with setBaseAndExtent,
        // which sets the anchor/focus order (i.e. the direction) explicitly.
        const backward = isSelectionBackward(selection);
        selection.setBaseAndExtent(
            backward ? endNode : startNode,
            backward ? endOffset : startOffset,
            backward ? startNode : endNode,
            backward ? startOffset : endOffset
        );
        return true;
    } catch (e) {
        return false;
    }
}

// The selection records which end of the drag was fixed (anchor) and which one
// moved (focus). selection.direction exposes that directly; compare the two
// ends only for engines that do not implement it.
function isSelectionBackward(selection) {
    if (selection.direction) return selection.direction === 'backward';
    if (selection.anchorNode === selection.focusNode) {
        return selection.anchorOffset > selection.focusOffset;
    }
    return Boolean(selection.anchorNode.compareDocumentPosition(selection.focusNode) &
        Node.DOCUMENT_POSITION_PRECEDING);
}

// Selection root and scroll-target tracking. Sites such as Bilibili render
// comments inside open shadow roots, where window.getSelection() is empty; the
// ShadowRoot owns its own Selection object in Chromium.
let lastSelectionRoot = null;
let selectionScrollTargets = [];

function selectionOwnedByRoot(selection, root) {
    try {
        const range = selection.getRangeAt(0);
        // Ancestor shadow roots expose a shadow-including range whose start is
        // the fragment itself; it stringifies fine but cannot be trimmed or
        // measured. Only accept a range anchored in a real node of this root.
        if (range.startContainer.nodeType === 11) return false;
        return range.startContainer.getRootNode() === root;
    } catch (e) {
        return false;
    }
}

// The mouseup target is not necessarily inside the shadow root that owns the
// selection: a full-line drag often releases on the host or its padding.
// Ancestor roots expose a shadow-including selection too, so prefer the
// deepest root that owns a usable range.
function findShadowSelection(start) {
    if (!start) return null;
    const queue = [{ node: start, depth: 0 }];
    const seen = new Set();
    let best = null;
    while (queue.length) {
        const { node, depth } = queue.shift();
        if (!node || seen.has(node)) continue;
        seen.add(node);
        if (node.nodeType === 1) {
            if (node.shadowRoot) {
                const selection = typeof node.shadowRoot.getSelection === 'function'
                    ? node.shadowRoot.getSelection()
                    : null;
                if (selection && selection.rangeCount > 0 && selectionOwnedByRoot(selection, node.shadowRoot)) {
                    if (!best || depth + 1 > best.depth) {
                        best = { selection, root: node.shadowRoot, depth: depth + 1 };
                    }
                }
                queue.push({ node: node.shadowRoot, depth: depth + 1 });
            }
            for (const child of node.children) {
                queue.push({ node: child, depth: depth + 1 });
            }
        } else if (node.nodeType === 11) {
            for (const child of node.children) {
                queue.push({ node: child, depth: depth + 1 });
            }
        }
    }
    return best ? { selection: best.selection, root: best.root } : null;
}

function getSelectionFromEvent(event) {
    const path = event?.composedPath?.() || [];

    // Plain light-DOM selections need no shadow scan; keep the common path cheap.
    const pathHasShadow = path.some((node) => {
        if (!node) return false;
        if (node.shadowRoot) return true;
        const root = node.getRootNode?.();
        return Boolean(root && root.host);
    });
    if (!pathHasShadow) {
        return { selection: window.getSelection(), root: document };
    }

    // Prefer the innermost open shadow root that actually owns the range. The
    // mouseup target can be an outer host, so walking only its path roots can
    // pick an ancestor selection object instead of the real nested one.
    // composedPath()[0] keeps the real inner target even when event.target is
    // retargeted to the outermost host.
    const target = path[0] || event?.target;
    const targetRoot = target?.getRootNode?.();
    const start = targetRoot?.host || target;
    const found = findShadowSelection(start);
    if (found) return found;

    const seenRoots = new Set();
    for (const node of path) {
        // Prefer the node's own shadow root before its parent root; a host node
        // belongs to the outer tree but owns the nested selection.
        const roots = [node?.shadowRoot, node?.getRootNode?.()].filter(Boolean);
        for (const root of roots) {
            if (root === document || !root.host || seenRoots.has(root)) continue;
            seenRoots.add(root);
            if (typeof root.getSelection !== 'function') continue;
            const selection = root.getSelection();
            if (selection && selection.rangeCount > 0 && selectionOwnedByRoot(selection, root)) {
                return { selection, root };
            }
        }
    }

    const pageFound = findShadowSelection(document.documentElement);
    if (pageFound) return pageFound;

    return { selection: window.getSelection(), root: document };
}

function getSelectionForRoot(root) {
    if (root && root !== document && typeof root.getSelection === 'function') {
        try {
            const selection = root.getSelection();
            if (selection && selection.rangeCount > 0) return selection;
        } catch (e) {}
    }
    return window.getSelection();
}

function getActiveSelection() {
    if (lastSelectionRoot && lastSelectionRoot !== document) {
        const selection = getSelectionForRoot(lastSelectionRoot);
        if (selection && selection.rangeCount > 0) return selection;
    }
    return window.getSelection();
}

function clearSelectionScrollTargets() {
    selectionScrollTargets.forEach((target) => {
        target.removeEventListener('scroll', handleResizeOrScroll, { passive: true });
    });
    selectionScrollTargets = [];
}

// Scroll events do not bubble (and may not cross shadow boundaries), so bind
// them to the actual scrollable ancestors of the current selection.
function bindSelectionScrollTargets(selection) {
    clearSelectionScrollTargets();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.getRangeAt(0).commonAncestorContainer;
    const seen = new Set();
    while (node) {
        const el = node.nodeType === 1 ? node : node.parentElement;
        if (!el) break;
        if (!seen.has(el)) {
            seen.add(el);
            if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
                el.addEventListener('scroll', handleResizeOrScroll, { passive: true });
                selectionScrollTargets.push(el);
            }
        }
        node = el.parentNode || el.host;
    }
}

// The copy button reads the rich clipboard payload from the live range, so a
// contenteditable selection must be cached before the input handler renders.
function cacheContentEditableSelection(editable, selection) {
    if (!editable.isContentEditable || !selection || selection.rangeCount === 0) return;
    try {
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        cachedSelection = { text: selection.toString(), html: container.innerHTML, selection };
    } catch (e) {}
}

function handleSelectionMouseUp(e) {
    if (hostElement && e.composedPath().includes(hostElement)) return;
    if (!hostElement) initContainer();
    if (isScrolling) return;

    if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        pointerKnown = true;
    }

    // Resolve the selection while the event path is still alive. Deferring this
    // to the setTimeout below loses composedPath(), and some sites also clear
    // the selection on mouseup before the timer runs.
    const { selection, root: selectionRoot } = getSelectionFromEvent(e);
    lastSelectionRoot = selectionRoot;

    // Editable targets own their paste / cut / delete toolbar. The input handler
    // is the single owner of that render, so one press paints one bar instead
    // of the page toolbar and the paste toolbar replacing each other. This
    // must run before the empty-selection check: an <input> has no window
    // selection even while its own text is selected.
    const editable = editableTargetOf(activeElementDeep());
    if (editable) {
        cacheContentEditableSelection(editable, selection);
        handleInputPasteMouseUp(e, editable);
        return;
    }

    if (!selection || selection.rangeCount === 0) {
        lastSelectionRoot = null;
        clearSelectionScrollTargets();
        hideUI();
        return;
    }

    // Page selections trim edge whitespace unless the option is off.
    if (getConfig('trimSelectionWhitespace') !== false && !trimRangeWhitespace(selection)) {
        hideUI();
        return;
    }

    const text = selection.toString();
    if (!text.trim()) {
        hideUI();
        return;
    }

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    const html = container.innerHTML;
    cachedSelection = { text, html, selection };

    // Snapshot geometry before any page handler can mutate the range.
    const rect = getSmartSelectionState(selection);
    bindSelectionScrollTargets(selection);
    initContainer();

    const releaseX = e.clientX;
    const releaseY = e.clientY;
    scheduleToolbarRender(10, (cancelled) => {
        // Only a release that closes a selection-producing press may open the
        // bar. A click that leaves an older selection untouched fires no
        // selection event, so it cannot bring a dismissed toolbar back.
        if (cancelled() || !consumeSelectionArm()) return;
        // Remember the captured range, not the live selection: the page may
        // clear its selection at any time and the bar must still follow it.
        rememberToolbarAnchor(range, rect);
        renderButton(rect, releaseX, releaseY, text, html, 'default');
    });
}

// Distance-based fade for the primary selection toolbar. Secondary link/search
// menus are excluded: they can be much taller than the main bar, so measuring
// from their centre would fade while the pointer is still on an item.
function applyToolbarFade(x, y) {
    if (!shadowRoot || typeof shadowRoot.querySelectorAll !== 'function') return;
    const containers = shadowRoot.querySelectorAll('.sc-container.visible:not(.sc-link-menu)');
    if (!containers.length) return;

    const options = typeof getFadeAwayOptions === 'function' ? getFadeAwayOptions() : null;
    if (!options) {
        containers.forEach((container) => {
            if (container.style.getPropertyValue('--sc-fade')) {
                container.style.removeProperty('--sc-fade');
            }
        });
        return;
    }

    for (const container of containers) {
        let rect;
        try {
            rect = container.getBoundingClientRect();
        } catch (e) {
            rect = null;
        }
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) continue;

        const distance = Math.hypot(
            x - (rect.left + rect.width / 2),
            y - (rect.top + rect.height / 2)
        );
        if (distance > options.fade) {
            container.style.setProperty('--sc-fade', '0');
            hideUI();
            return;
        }
        container.style.setProperty(
            '--sc-fade',
            String(getFadeAwayOpacity(distance, options.distance, options.fade))
        );
    }
}

function handleToolbarMouseMove(e) {
    if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    pointerKnown = true;
    applyToolbarFade(lastPointerX, lastPointerY);
}

// Scroll and resize handler. The toolbar is never re-created here and a missing
// live selection never dismisses it: the bar follows the range it was opened
// for, stays put when that anchor leaves the viewport, and resumes following
// once the anchor scrolls back in. Only the "hide" setting destroys it.
const handleResizeOrScroll = () => {
    if (!hostElement) return;
    const mode = getConfig('scrollRepaintMode');
    const btn = shadowRoot.querySelector('.sc-container');
    if (!btn) return;

    // The search engine picker is a persistent companion of the toolbar.
    if (shadowRoot.querySelector('.sc-search-menu')) {
        if (mode === SCROLL_REPAINT_MODE.HIDE) {
            hideUI();
            return;
        }
        return;
    }

    // The multi-link picker is still the active surface; repaint/keep it
    // instead of falling back to a fresh selection toolbar.
    if (btn.classList.contains('sc-link-menu')) {
        if (mode === SCROLL_REPAINT_MODE.HIDE) {
            hideUI();
            return;
        }
        repositionLinkMenu();
        return;
    }

    // A dismissed bar stays dismissed until a new selection is made.
    if (!btn.classList.contains('visible')) return;

    const anchor = getToolbarAnchorRect();
    if (!anchor) {
        // No usable anchor (e.g. a text-control selection, or the page removed
        // the anchor nodes): keep the bar where it is instead of dismissing it.
        return;
    }

    if (isOutsideViewport(anchor)) {
        // Default: freeze at the last on-screen position so scrolling back
        // resumes following. The hide setting destroys the bar for good.
        if (mode === SCROLL_REPAINT_MODE.HIDE) hideUI();
        return;
    }

    placeToolbar(btn, anchor, lastPointerX, lastPointerY);
};

function handleContextMenu(e) {
    hideUI();
    if (getConfig('enablePaste')) {
        safeSetValue('smart_paste_cache', { text: '', timestamp: 0 });
        unregisterVisibilityCleanup();
    }
}

function handleKeydownHideUI(e) {
    if (isUnlockMode) return;
    hideUI();
}

// A normal Ctrl+C / context-menu copy outside the toolbar. The capture phase
// records the selection as a fallback; the bubble phase then reads the final
// clipboardData, because pages may rewrite it before the event finishes.
let pendingExternalCopyFallback = '';
let pendingExternalCopyTimer = 0;

function readExternalCopyText(e) {
    let text = '';
    const target = eventTargetDeep(e);
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            text = target.value.substring(start, end);
        }
    }
    if (!text) {
        const sel = getSelectionFromEvent(e).selection;
        text = sel ? sel.toString() : '';
    }
    return text;
}

async function writeExternalCopyCache(text) {
    if (!text) return;
    unregisterVisibilityCleanup();
    await safeSetValue('smart_paste_cache', {
        text,
        timestamp: Date.now(),
        type: 'clipboard'
    });
}

function handleExternalCopy(e) {
    if (!getConfig('enablePaste')) return;
    const text = readExternalCopyText(e);
    if (!text) return;

    pendingExternalCopyFallback = text;
    clearTimeout(pendingExternalCopyTimer);
    // Normally the bubble listener below replaces this with the page's final
    // clipboard text. The timer is only for pages that stop propagation before
    // the bubble listener can run.
    pendingExternalCopyTimer = setTimeout(() => {
        const fallback = pendingExternalCopyFallback;
        pendingExternalCopyFallback = '';
        writeExternalCopyCache(fallback);
    }, 0);
}

function handleExternalCopyFinal(e) {
    if (!getConfig('enablePaste')) return;
    let text = '';
    try {
        if (e.clipboardData) {
            text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';
        }
    } catch (error) {}
    if (!text) return;

    pendingExternalCopyFallback = '';
    clearTimeout(pendingExternalCopyTimer);
    writeExternalCopyCache(text);
}

// Input paste mouseup handler. This is the only render path for editable
// targets (the page handler delegates here), so a press cannot paint twice.
function handleInputPasteMouseUp(e, focusedTarget) {
    // A drag that starts inside a text control often ends outside it: the
    // pointer is released over a page element, while the control keeps focus
    // and its selection. The page handler already resolved the focused editing
    // host, so trust that instead of re-deriving a target from the release.
    const target = focusedTarget || editableTargetOf(eventTargetDeep(e));
    if (!target) return;
    // composedPath() is already empty once this event has finished dispatching,
    // so resolve the selection now instead of inside the timer below.
    const selectionAtMouseUp = target.isContentEditable
        ? getSelectionFromEvent(e).selection
        : null;
    const isTextControl = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    scheduleToolbarRender(20, async (cancelled) => {
        let selectedText = '';
        let hasSelection = false;
        let whitespaceSelection = false;

        if (isTextControl) {
            const state = controlSelection(target);
            let start = state ? state.start : 0;
            let end = state ? state.end : 0;
            if (state && start !== end) {
                selectedText = target.value.substring(start, end);
                hasSelection = true;
                if (selectedText.trim() === '') {
                    // Expand a all-whitespace selection across adjacent
                    // whitespace the user did not select.
                    const isSpace = (index) => index >= 0
                        && index < target.value.length
                        && /\s/.test(target.value[index]);
                    while (start > 0 && isSpace(start - 1)) start--;
                    while (end < target.value.length && isSpace(end)) end++;
                    if (start !== target.selectionStart || end !== target.selectionEnd) {
                        target.setSelectionRange(start, end);
                    }
                    selectedText = target.value.substring(start, end);
                    whitespaceSelection = true;
                }
            }
        } else if (target.isContentEditable) {
            const sel = selectionAtMouseUp;
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                selectedText = sel.toString();
                hasSelection = true;
            }
        }

        let cache = null;
        if (getConfig('enablePaste')) {
            cache = await safeGetValue('smart_paste_cache', null);
            if (cache && (!cache.text && cache.type !== 'clipboard')) cache = null;
            if (cache && Date.now() - cache.timestamp > getPasteTtlMs()) cache = null;
        }
        if (cancelled()) return;

        // The ID card action is appended to the normal input toolbar when the
        // selection looks like a mainland ID number (Chinese UI only).
        const showIdCardCheck = isChineseUI() && isIdCardCandidate(selectedText);
        if (showIdCardCheck) rememberIdCardDragGuard(target, selectedText);

        if (whitespaceSelection) {
            initContainer();
            // An <input>/<textarea> has no DOM Range, so there is no caret rect
            // to anchor to. Passing the element rect pinned the button to the
            // input's right edge; a null rect makes renderButton fall back to
            // the mouse-release point, i.e. the end of the whitespace run.
            renderButton(
                null,
                e.clientX,
                e.clientY,
                selectedText,
                '',
                PASTE_MODE_WHITESPACE,
                target,
                false,
                cache
            );
            return;
        }

        // A selection toolbar needs a selection made by this press. A click
        // that leaves an old selection untouched must not bring the bar back;
        // the collapsed-click paste offers below stay available.
        if (hasSelection && !consumeSelectionArm()) return;

        // Editable selections have a real range: follow it on scroll. A
        // collapsed click (paste offer) has no anchor and keeps its position.
        const anchorRect = hasSelection && selectionAtMouseUp
            ? getSmartSelectionState(selectionAtMouseUp)
            : null;
        rememberToolbarAnchor(anchorRect ? selectionAtMouseUp.getRangeAt(0) : null, anchorRect);

        // Text controls have no DOM Range, but their selection focus is the
        // release point. A zero-size endpoint rect routes them through the same
        // endpoint placement as page selections instead of the click fallback,
        // which pins the bar's left edge to the right of the pointer. When the
        // release landed outside the control, clamp the point to its box: the
        // caret is at the nearest text position, not out on unrelated content.
        let endpointRect = null;
        if (!target.isContentEditable) {
            const box = target.getBoundingClientRect();
            const anchorX = Math.min(Math.max(e.clientX, box.left), box.right);
            const anchorY = Math.min(Math.max(e.clientY, box.top), box.bottom);
            endpointRect = {
                left: anchorX,
                right: anchorX,
                top: anchorY,
                bottom: anchorY,
                width: 0,
                height: 0,
                isBackward: target.selectionDirection === 'backward'
            };
        }

        // A selection always gets a toolbar; a pending paste only upgrades it
        // to the three-button mode. Only a click *without* a selection depends
        // on the cache, because then the paste offer is the whole point.
        if (!hasSelection) {
            if (!cache) return;
            initContainer();
            if (isChineseUI() && cache.type === 'pan_code') {
                const rect = target.getBoundingClientRect();
                renderButton(rect, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            } else {
                renderButton(null, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            }
            return;
        }

        initContainer();
        if (!cache) {
            if (target.isContentEditable && !showIdCardCheck) {
                // Editable ranges carry their own geometry (and rich copy data).
                renderButton(anchorRect, e.clientX, e.clientY, selectedText, '', 'default');
            } else {
                // <input>/<textarea> selections have no DOM Range: the release
                // point is the only anchor, and targetInput adds cut/delete.
                renderButton(
                    target.isContentEditable ? null : endpointRect,
                    e.clientX,
                    e.clientY,
                    selectedText,
                    '',
                    'default',
                    target,
                    !target.isContentEditable,
                    null,
                    showIdCardCheck
                );
            }
            return;
        }

        // Cloud drive extraction code cache (Chinese mode only): force single paste button (key icon)
        const isChineseEnv = isChineseUI();
        if (isChineseEnv && cache.type === 'pan_code') {
            const rect = target.getBoundingClientRect();
            renderButton(rect, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            return;
        }

        const isReplaceIntent = selectedText === ' ' || selectedText === '，';
        const mode = isReplaceIntent ? 'paste' : PASTE_MODE_THREE_BTNS;
        const textArg = (mode === 'paste') ? cache.text : selectedText;
        const rect = target.isContentEditable ? anchorRect : endpointRect;
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache, showIdCardCheck);
    });
}
