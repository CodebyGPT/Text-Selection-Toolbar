// Module 07: Selection Geometry Calculator
// Three-tier fallback: Smart Rect -> Bounding Box -> Mouse Position

function getSmartSelectionState(selection, mouseEvent) {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    // 1. Get fine-grained rect list (may be empty, especially in Input/Textarea or during framework DOM updates)
    let rects = range.getClientRects();

    let targetRect = null;
    let isBackward = false;
    let isVertical = false;

    // --- Tier A: Smart directional positioning ---
    if (rects.length > 0) {
        const anchor = selection.anchorNode;
        const focus = selection.focusNode;

        // Determine selection direction
        if (anchor === focus) {
            isBackward = selection.anchorOffset > selection.focusOffset;
        } else {
            // Use bitmask to determine node position
            const pos = anchor.compareDocumentPosition(focus);
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) isBackward = true;
        }

        // Detect vertical writing mode (check focusNode only)
        let focusEl = focus.nodeType === 1 ? focus : focus.parentElement;
        if (focusEl) {
            const style = window.getComputedStyle(focusEl);
            const writingMode = style.writingMode || 'horizontal-tb';
            isVertical = writingMode.startsWith('vertical');
        }

        // Get head or tail rect based on direction
        targetRect = isBackward ? rects[0] : rects[rects.length - 1];
    }

    // Helper: check if Rect is invalid (0x0 at 0,0 usually means the node has been detached from the document flow)
    const isInvalidRect = (r) => {
        return !r || (r.width === 0 && r.height === 0 && r.top === 0 && r.left === 0);
    };

    // --- Tier B: Classic bounding box fallback ---
    if (isInvalidRect(targetRect)) {
        const bounding = range.getBoundingClientRect();
        // Only use if bounding box is also valid
        if (!isInvalidRect(bounding)) {
            targetRect = bounding;
            isBackward = false;
            isVertical = false;
        }
    }

    // --- Tier C: Mouse position fallback ---
    if (isInvalidRect(targetRect) && mouseEvent) {
        const size = 20; // Simulate cursor height
        targetRect = {
            top: mouseEvent.clientY - size,
            bottom: mouseEvent.clientY,
            left: mouseEvent.clientX,
            right: mouseEvent.clientX,
            width: 0,
            height: size,
            x: mouseEvent.clientX,
            y: mouseEvent.clientY - size
        };
        isBackward = false;
        isVertical = false;
    }

    // If all attempts fail (extremely rare), return null
    if (isInvalidRect(targetRect)) return null;

    return {
        rect: targetRect,
        isBackward: isBackward,
        isVertical: isVertical
    };
}
