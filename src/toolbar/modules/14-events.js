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

function handleSelectionMouseUp(e) {
    if (hostElement && e.composedPath().includes(hostElement)) return;
    if (!hostElement) initContainer();
    if (isScrolling) return;
    setTimeout(async () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            hideUI();
            return;
        }

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
        if (getConfig('enableCache')) {
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            cachedSelection = {
                text: text,
                html: container.innerHTML
            };
        }
        // Selection endpoint wins; null makes renderButton use the release point.
        const rect = getSmartSelectionState(selection);

        initContainer();
        let cache = null;
        if (getConfig('enablePaste')) {
            cache = await safeGetValue('smart_paste_cache', null);
        }
        const isChineseEnv = isChineseUI();
        const cacheValid = cache && cache.text && (Date.now() - cache.timestamp < getPasteTtlMs()) && !(isChineseEnv && cache.type === 'pan_code');
        const isInput = isEditable;
        const mode = (cacheValid && isInput) ? PASTE_MODE_THREE_BTNS : 'default';
        renderButton(rect, e.clientX, e.clientY, text, cachedSelection.html || '', mode, isInput ? target : null, isInput, cache);
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
        const selection = window.getSelection();
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
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            const rect = getSmartSelectionState(selection);
            if (rect) {
                renderButton(rect, rect.right, rect.top,
                    selection.toString(),
                    getConfig('enableCache') ? cachedSelection.html : '');
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
        const sel = window.getSelection();
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
            const sel = window.getSelection();
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

        if (whitespaceSelection) {
            initContainer();
            renderButton(
                target.getBoundingClientRect(),
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

        if (!cache) return;

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
            ? getSmartSelectionState(window.getSelection())
            : null;
        if (!hostElement) initContainer();
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache);
    }, 20);
}
