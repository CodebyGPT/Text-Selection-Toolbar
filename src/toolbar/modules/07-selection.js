// Module 07: Selection Geometry Calculator
// Prefer the selection endpoint; return null when it cannot be trusted so the
// renderer falls back to the mouse-release position.

function getSmartSelectionState(selection) {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !anchor.isConnected || !focus.isConnected) return null;

    // Fine-grained line rects are the only reliable source for the endpoint:
    // a bounding box is the whole selection, not where it ends.
    const rects = range.getClientRects();
    if (!rects.length) return null;

    let isBackward;
    if (anchor === focus) {
        isBackward = selection.anchorOffset > selection.focusOffset;
    } else {
        isBackward = Boolean(anchor.compareDocumentPosition(focus) & Node.DOCUMENT_POSITION_PRECEDING);
    }

    // Focus is the moving end of the selection: the last line forward, first backward.
    const rect = isBackward ? rects[0] : rects[rects.length - 1];
    if (!isUsableSelectionRect(rect)) return null;

    const focusEl = focus.nodeType === 1 ? focus : focus.parentElement;
    let isVertical = false;
    if (focusEl) {
        const style = window.getComputedStyle(focusEl);
        isVertical = (style.writingMode || 'horizontal-tb').startsWith('vertical');
    }

    rect.isBackward = isBackward;
    rect.isVertical = isVertical;
    return rect;
}

function isUsableSelectionRect(rect) {
    if (!rect) return false;
    const { left, top, width, height } = rect;
    if (![left, top, width, height].every(Number.isFinite)) return false;
    if (width <= 0 || height <= 0) return false;
    // A stale/detached rect can sit outside the viewport even though the
    // release happened on screen; the mouse position is safer then.
    return rect.bottom >= 0 && rect.right >= 0 &&
        rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

// The toolbar remembers the range it was opened for. The range stays valid
// after the page clears the live selection, so scrolling can keep the bar on
// the text instead of treating the missing selection as a dismissal.
function rememberToolbarAnchor(range, rect) {
    if (!range) {
        toolbarAnchor = null;
        return;
    }
    toolbarAnchor = {
        range,
        isBackward: Boolean(rect && rect.isBackward),
        isVertical: Boolean(rect && rect.isVertical)
    };
}

// Unlike the mouseup path, an anchor outside the viewport is still a valid
// answer here: the scroll handler needs it to decide whether to freeze or
// destroy the bar.
function getToolbarAnchorRect() {
    if (!toolbarAnchor || !toolbarAnchor.range) return null;
    const { range, isBackward, isVertical } = toolbarAnchor;
    if (!range.startContainer || !range.startContainer.isConnected) return null;
    let rects;
    try {
        rects = range.getClientRects();
    } catch (e) {
        return null;
    }
    if (!rects.length) return null;
    const rect = isBackward ? rects[0] : rects[rects.length - 1];
    if (!rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) ||
        rect.width <= 0 || rect.height <= 0) {
        return null;
    }
    rect.isBackward = isBackward;
    rect.isVertical = isVertical;
    return rect;
}

function isOutsideViewport(rect) {
    return rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth;
}
