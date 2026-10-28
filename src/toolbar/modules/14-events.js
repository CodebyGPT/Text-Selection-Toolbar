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

// Last real pointer position, shared with the toolbar render path so the fade
// state is applied immediately when the toolbar appears. Updated by mousemove
// only; there is no polling.
let lastPointerX = 0;
let lastPointerY = 0;
let pointerKnown = false;

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
    if (!selection || selection.rangeCount === 0) {
        lastSelectionRoot = null;
        clearSelectionScrollTargets();
        hideUI();
        return;
    }
    lastSelectionRoot = selectionRoot;

    const editable = editableTargetOf(activeElementDeep());
    const isTextInput = Boolean(editable && (editable.tagName === 'INPUT' || editable.tagName === 'TEXTAREA'));
    const isEditable = Boolean(editable);

    // Page selections trim edge whitespace unless the option is off; editable
    // selections always keep it.
    const trimWhitespace = !isEditable && getConfig('trimSelectionWhitespace') !== false;
    if (trimWhitespace && !trimRangeWhitespace(selection)) {
        hideUI();
        return;
    }

    const text = selection.toString();
    if (!text) {
        hideUI();
        return;
    }
    if (!isEditable && text.trim().length === 0) {
        hideUI();
        return;
    }
    // Whitespace-only input/textarea selection is handled by the capture
    // mouseup handler, which expands it and builds the delete/paste UI.
    if (isTextInput && text.trim().length === 0) return;

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
    setTimeout(async () => {
        let cache = null;
        if (getConfig('enablePaste')) {
            cache = await safeGetValue('smart_paste_cache', null);
        }
        const isChineseEnv = isChineseUI();
        const cacheValid = cache && cache.text && (Date.now() - cache.timestamp < getPasteTtlMs()) && !(isChineseEnv && cache.type === 'pan_code');
        const isInput = isEditable;
        const mode = (cacheValid && isInput) ? PASTE_MODE_THREE_BTNS : 'default';
        renderButton(rect, releaseX, releaseY, text, html || '', mode, isInput ? editable : null, isInput, cache);
    }, 10);
}

function handleGlobalMouseDown(e) {
    if (hostElement && e.composedPath().includes(hostElement)) {
        // Clicked inside button, keep it
    } else {
        shadowRoot?.querySelectorAll('.sc-container').forEach((btn) => {
            btn.classList.remove('visible');
        });
    }
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
            if (container.style.opacity) container.style.opacity = '';
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
            container.style.opacity = '0';
            hideUI();
            return;
        }
        container.style.opacity = String(
            getFadeAwayOpacity(distance, options.distance, options.fade)
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

// Scroll and resize handler
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

    if (mode === SCROLL_REPAINT_MODE.HIDE) {
        hideUI();
        return;
    }

    if (mode === SCROLL_REPAINT_MODE.VIEWPORT) {
        const selection = getActiveSelection();
        if (!selection.rangeCount) { hideUI(); return; }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;
        if (!inViewport) { hideUI(); return; }
    }

    btn.classList.remove('visible');
    isScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
        const selection = getActiveSelection();
        if (selection && selection.toString().trim().length > 0) {
            const rect = getSmartSelectionState(selection);
            if (rect) {
                renderButton(rect, rect.right, rect.top,
                    selection.toString(),
                    cachedSelection.html);
            }
        }
    }, 300);
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

// A normal Ctrl+C / context-menu copy outside the toolbar. Capture the text
// synchronously from the selection and share it through the existing cache so
// another tab can offer lightning paste without polling or clipboard reads.
async function handleExternalCopy(e) {
    if (!getConfig('enablePaste')) return;

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
    if (!text) return;

    unregisterVisibilityCleanup();
    await safeSetValue('smart_paste_cache', {
        text,
        timestamp: Date.now(),
        type: 'clipboard'
    });
}

// Input paste mouseup handler
function handleInputPasteMouseUp(e) {
    // Resolve the real clicked node: at document level e.target is the shadow
    // host, which is neither an <input> nor contenteditable, so lightning paste
    // never fired for editors rendered inside a shadow root.
    const target = editableTargetOf(eventTargetDeep(e));
    if (!target) return;
    // composedPath() is already empty once this event has finished dispatching,
    // so resolve the selection now instead of inside the timer below.
    const selectionAtMouseUp = target.isContentEditable
        ? getSelectionFromEvent(e).selection
        : null;
    setTimeout(async () => {
        let selectedText = '';
        let hasSelection = false;
        let whitespaceSelection = false;

        if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
            let start = target.selectionStart;
            let end = target.selectionEnd;
            if (typeof start === 'number' && typeof end === 'number' && start !== end) {
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

        if (!cache) {
            if (!showIdCardCheck) return;
            initContainer();
            renderButton(null, e.clientX, e.clientY, selectedText, '', 'default', target, false, null, true);
            return;
        }

        // Cloud drive extraction code cache (Chinese mode only): force single paste button (key icon)
        const isChineseEnv = isChineseUI();
        if (isChineseEnv && cache.type === 'pan_code') {
            initContainer();
            const rect = target.getBoundingClientRect();
            renderButton(rect, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            return;
        }

        const isReplaceIntent = selectedText === ' ' || selectedText === '，';
        const mode = (hasSelection && !isReplaceIntent) ? PASTE_MODE_THREE_BTNS : 'paste';
        const textArg = (mode === 'paste') ? cache.text : selectedText;

        const rect = (target.isContentEditable && hasSelection)
            ? getSmartSelectionState(selectionAtMouseUp)
            : null;
        if (!hostElement) initContainer();
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache, showIdCardCheck);
    }, 20);
}
