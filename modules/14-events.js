// Module 14: Event Handlers

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
        const text = selection.toString();
        if (!text || text.trim().length === 0) {
            hideUI();
            return;
        }
        const range = selection.getRangeAt(0);
        if (getConfig('enableCache')) {
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            cachedSelection = {
                text: text,
                html: container.innerHTML
            };
        }
        let rect = null;
        if (getConfig('positionMode') === 'endchar') {
            const smartState = getSmartSelectionState(selection, e);
            if (smartState) {
                rect = smartState.rect;
                if (rect) {
                    rect.isBackward = smartState.isBackward;
                    rect.isVertical = smartState.isVertical;
                }
            }
        }

        initContainer();
        let cache = null;
        if (getConfig('enablePaste')) {
            cache = await safeGetValue('smart_paste_cache', null);
        }
        const curLang = getConfig('language');
        const isChineseEnv = curLang === 'zh-CN' || (curLang === 'auto' && navigator.language.startsWith('zh'));
        const cacheValid = cache && cache.text && (Date.now() - cache.timestamp < 8000) && !(isChineseEnv && cache.type === 'pan_code');
        const target = document.activeElement;
        const isInput = target && (
            (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly) ||
            target.isContentEditable
        );
        const mode = (cacheValid && isInput) ? PASTE_MODE_THREE_BTNS : 'default';
        renderButton(rect, e.clientX, e.clientY, text, cachedSelection.html || '', mode, isInput ? target : null, isInput, cache);
    }, 10);
}

function handleGlobalMouseDown(e) {
    if (hostElement && e.composedPath().includes(hostElement)) {
        // Clicked inside button, keep it
    } else {
        const btn = shadowRoot && shadowRoot.querySelector('.sc-container');
        if (btn) btn.classList.remove('visible');
    }
}

// Scroll and resize handler
const handleResizeOrScroll = () => {
    if (!hostElement) return;
    const mode = getConfig('scrollRepaintMode');
    const btn = shadowRoot.querySelector('.sc-container');
    if (!btn) return;

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
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[rects.length - 1];
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

// Input paste mouseup handler
function handleInputPasteMouseUp(e) {
    if (!getConfig('enablePaste')) return;
    const target = e.target;
    const isInput = (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly) || target.isContentEditable;
    if (!isInput) return;
    setTimeout(async () => {
        // Read lightning paste cache
        const cache = await safeGetValue('smart_paste_cache', null);
        if (!cache || !cache.text) return;
        if (Date.now() - cache.timestamp > 8000) return;

        // Cloud drive extraction code cache (Chinese mode only): force single paste button (key icon)
        const curLang = getConfig('language');
        const isChineseEnv = curLang === 'zh-CN' || (curLang === 'auto' && navigator.language.startsWith('zh'));
        if (isChineseEnv && cache.type === 'pan_code') {
            initContainer();
            const rect = target.getBoundingClientRect();
            renderButton(rect, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            return;
        }

        // Regular lightning paste: check selection within input
        let selectedText = '';
        let hasSelection = false;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            if (typeof start === 'number' && typeof end === 'number' && start !== end) {
                selectedText = target.value.substring(start, end);
                hasSelection = true;
            }
        } else if (target.isContentEditable) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                selectedText = sel.toString();
                hasSelection = true;
            }
        }

        const isReplaceIntent = selectedText === ' ' || selectedText === '，';
        const mode = (hasSelection && !isReplaceIntent) ? PASTE_MODE_THREE_BTNS : 'paste';
        const textArg = (mode === 'paste') ? cache.text : selectedText;

        let rect = null;
        if (target.isContentEditable && hasSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rects = range.getClientRects();
                if (rects.length > 0) {
                    rect = rects[rects.length - 1];
                }
            }
        }
        if (!hostElement) initContainer();
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache);
    }, 20);
}
