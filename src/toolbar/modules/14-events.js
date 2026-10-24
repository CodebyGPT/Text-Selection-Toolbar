// Module 14: Event Handlers

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

        range.setStart(chars[first].node, chars[first].offset);
        range.setEnd(chars[last].node, chars[last].offset + 1);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
    } catch (e) {
        return false;
    }
}

// Selection root and scroll-target tracking. Sites such as Bilibili render
// comments inside open shadow roots, where window.getSelection() is empty; the
// ShadowRoot owns its own Selection object in Chromium.
let lastSelectionRoot = null;
let selectionScrollTargets = [];

function getSelectionRootFromEvent(event) {
    const target = event?.composedPath?.()[0] || event?.target;
    const root = target?.getRootNode?.();
    return root && root.host ? root : document;
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

    // Resolve the selection while the event path is still alive. Deferring this
    // to the setTimeout below loses composedPath(), and some sites also clear
    // the selection on mouseup before the timer runs.
    const selectionRoot = getSelectionRootFromEvent(e);
    const selection = getSelectionForRoot(selectionRoot);
    if (!selection || selection.rangeCount === 0) {
        lastSelectionRoot = null;
        clearSelectionScrollTargets();
        hideUI();
        return;
    }
    lastSelectionRoot = selectionRoot;

    const target = document.activeElement;
    const isTextInput = target && (
        (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly)
    );
    const isEditable = isTextInput || Boolean(target && target.isContentEditable);

    // Page selections trim edge whitespace; editable selections keep it.
    if (!isEditable && !trimRangeWhitespace(selection)) {
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
    cachedSelection = { text, html };

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
        renderButton(rect, releaseX, releaseY, text, html || '', mode, isInput ? target : null, isInput, cache);
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
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            text = target.value.substring(start, end);
        }
    }
    if (!text) {
        const sel = getSelectionForRoot(getSelectionRootFromEvent(e));
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
    const target = e.target;
    const isInput = (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly) || target.isContentEditable;
    if (!isInput) return;
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
            const sel = getSelectionForRoot(getSelectionRootFromEvent(e));
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
        const showIdCardCheck = isInput && isChineseUI() && isIdCardCandidate(selectedText);
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
            ? getSmartSelectionState(getSelectionForRoot(getSelectionRootFromEvent(e)))
            : null;
        if (!hostElement) initContainer();
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache, showIdCardCheck);
    }, 20);
}
