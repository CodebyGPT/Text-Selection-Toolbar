// Module 18: Canvas fillText Text Extraction (Super Selection)

// Hooked fillText calls are recorded per canvas so a hotkey+click can return
// the real text arguments. Records are cleared after a successful copy, and a
// canvas resize/reset discards the stale frame.
const canvasTextStore = new WeakMap();
const CANVAS_TEXT_LIMIT = 500;
const CANVAS_LINE_TOLERANCE = 5;

function getCanvasTextRecord(canvas) {
    const existing = canvasTextStore.get(canvas);
    if (existing && existing.width === canvas.width && existing.height === canvas.height) {
        return existing;
    }
    const record = {
        width: canvas.width,
        height: canvas.height,
        entries: [],
        keys: new Set()
    };
    canvasTextStore.set(canvas, record);
    return record;
}

function recordCanvasText(canvas, text, x, y) {
    if (!canvas || typeof text !== 'string' || !text) return;
    const record = getCanvasTextRecord(canvas);
    const key = `${text}\u0000${Math.round(x)}\u0000${Math.round(y)}`;
    if (record.keys.has(key)) return;
    record.keys.add(key);
    record.entries.push({ text, x, y, key });
    if (record.entries.length > CANVAS_TEXT_LIMIT) {
        record.keys.delete(record.entries.shift().key);
    }
}

// Group recorded draws into visual lines and read left to right, top to bottom.
function composeCanvasText(record) {
    if (!record || record.entries.length === 0) return '';
    const sorted = record.entries
        .slice()
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));

    const lines = [];
    for (const entry of sorted) {
        const line = lines[lines.length - 1];
        if (line && Math.abs(entry.y - line.y) < CANVAS_LINE_TOLERANCE) {
            line.entries.push(entry);
        } else {
            lines.push({ y: entry.y, entries: [entry] });
        }
    }

    return lines
        .map((line) => line.entries
            .sort((a, b) => a.x - b.x)
            .map((entry) => entry.text)
            .join(''))
        .filter((line) => line.trim())
        .join('\n');
}

let canvasTextHookInstalled = false;

function installCanvasTextHook() {
    if (canvasTextHookInstalled) return true;
    const proto = typeof CanvasRenderingContext2D !== 'undefined'
        ? CanvasRenderingContext2D.prototype
        : null;
    if (!proto || typeof proto.fillText !== 'function') return false;

    const originalFillText = proto.fillText;
    const hookedFillText = function (text, x, y) {
        try {
            recordCanvasText(this.canvas, text, x, y);
        } catch (e) {}
        return originalFillText.apply(this, arguments);
    };
    hookedFillText.__scCanvasTextHook = true;
    proto.fillText = hookedFillText;

    window.addEventListener('click', copyCanvasTextOnClick, true);
    canvasTextHookInstalled = true;
    return true;
}

function findCanvasInEvent(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    for (const node of path) {
        if (node && node.tagName === 'CANVAS') return node;
    }
    return null;
}

async function copyCanvasTextOnClick(e) {
    if (!isUnlockMode) return;
    const canvas = findCanvasInEvent(e);
    if (!canvas) return;

    // The toast lives inside the toolbar's shadow root.
    initContainer();
    const record = canvasTextStore.get(canvas);
    const text = composeCanvasText(record);
    if (!text) {
        showToast(t('toast_canvas_empty'));
        return;
    }
    if (!(await copyToClipboard(text, ''))) {
        showToast(t('toast_paste_fail'));
        return;
    }
    // A later repaint should describe the next frame, not replay this one.
    if (record) {
        record.entries.length = 0;
        record.keys.clear();
    }
    showToast(t('toast_canvas_copied', text.length));
}

