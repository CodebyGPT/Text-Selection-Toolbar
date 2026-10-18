// Module 09: Drag Preview Subsystem

let dragStartData = null; // Temp storage for drag start data
const PREVIEW_WIN_NAME = 'PicKitPreviewWindow';

// 1. Handle drag start
function handleLinkDragStart(e) {
    if (!getConfig('enableDragPreview')) return;

    // Precise check: must be left-button drag on a hyperlink (or inside one)
    const link = e.target.closest('a[href]');

    // Exclude invalid links (e.g., javascript:void(0) or anchors)
    if (!link || !link.href || link.href.startsWith('javascript:') || link.href.startsWith('#')) {
        dragStartData = null;
        return;
    }

    dragStartData = {
        url: link.href,
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
    };
}

// 2. Handle drag end
function handleLinkDragEnd(e) {
    if (!dragStartData) return;

    const { x: startX, y: startY, url } = dragStartData;
    const endX = e.clientX;
    const endY = e.clientY;

    /* ---------- 1. Outside viewport: discard ---------- */
    if (
        endX < 0 || endY < 0 ||
        endX > window.innerWidth || endY > window.innerHeight
    ) {
        dragStartData = null;
        return;
    }

    /* ---------- 2. Input area / rich text / drop container filter ---------- */
    const target = document.elementFromPoint(endX, endY);
    if (target) {
        // 2-1 Input fields
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            dragStartData = null;
            return;
        }
        // 2-2 Rich text editing
        if (target.closest('[contenteditable="true"]')) {
            dragStartData = null;
            return;
        }
        // 2-3 Container with dragover / drop events
        const dropZone = target.closest('[ondragover],[ondrop]');
        if (dropZone) {
            dragStartData = null;
            return;
        }
    }

    /* ---------- 3. Distance threshold check ---------- */
    const dist = Math.hypot(endX - startX, endY - startY);
    if (dist > 30) openPreviewWindow(url); // Distance threshold: 30px
    // Clean up data
    dragStartData = null;
}

// 3. Open preview window
async function openPreviewWindow(url) {
    const screen = window.screen;
    const screenW = screen.availWidth;
    const screenH = screen.availHeight;
    const screenLeft = screen.availLeft || 0;
    const screenTop = screen.availTop || 0;

    // Golden ratio
    const GOLDEN_RATIO = 0.618;

    const width = Math.round(screenW * GOLDEN_RATIO);
    const height = Math.round(screenH * GOLDEN_RATIO);

    const left = screenLeft + (screenW - width) / 2;
    const top = screenTop + (screenH - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
    window.open(url, PREVIEW_WIN_NAME, features);
}
