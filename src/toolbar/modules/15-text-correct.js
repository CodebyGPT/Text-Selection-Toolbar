// Module 15: Smart Text Correction

// Core correction algorithm with 9 Chinese typography rules
function smartCorrectText(text, isInputType) {
    // 0. Basic determination
    const hasHanzi = /[\u4e00-\u9fa5]/.test(text);
    const hasCNPunct = /[，。：；？！""''（）【】《》]/.test(text);
    const hasNum = /\d/.test(text);

    let activeRules = {
        basic: hasHanzi,
        punct: hasHanzi || hasCNPunct,
        unit: hasHanzi || hasCNPunct || hasNum,
        pureCN: hasHanzi && !/[a-zA-Z]/.test(text.replace(/[a-zA-Z]+(?=[%℃$])/, ''))
    };

    if (!activeRules.basic && !activeRules.punct && !activeRules.unit) return null;

    const applyRule = (txt, regex, replacement) => {
        const parts = txt.split(/(".*?"|".*?")/g);
        return parts.map((part, i) => {
            if (i % 2 === 1) return part;
            return part.replace(regex, replacement);
        }).join('');
    };

    let result = text;

    // --- Rule 9: Line break / whitespace removal (highest priority) ---
    if (activeRules.basic) {
        const rule9Regex = /([\u4e00-\u9fa5。])(\s{2,})(?=[\u4e00-\u9fa5]|\d{1,3}(?:[、.]|\s))/g;
        result = applyRule(result, rule9Regex, (match, p1, p2) => {
            return p1 + (isInputType ? '' : '\n');
        });
    }

    // --- Rule 6: English punctuation to Chinese in pure Chinese environment ---
    if (activeRules.pureCN) {
        const parts = result.split(/(".*?"|".*?")/g);
        result = parts.map((part, i) => {
            if (i % 2 === 1) return part;
            let p = part;
            p = p.replace(/\.{3,}/g, '……');
            p = p.replace(/\.{2}/g, '。');
            p = p.replace(/(?<!\d)\.(?!\d)|(?<=\d)\.(?!\d)|(?<!\d)\.(?=\d)/g, '。');
            const map = {',':'，', '?':'？', '!':'！', ':':'：', ';':'；', '(':'（', ')':'）'};
            p = p.replace(/[,?!:;()]/g, m => map[m]);
            return p;
        }).join('');
    }

    // --- Rule 1: Add space between Chinese and English ---
    if (activeRules.basic) {
        result = applyRule(result, /([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');
        result = applyRule(result, /([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2');
    }

    // --- Rule 2: Add space between Chinese and numbers (including operators) ---
    if (activeRules.basic) {
        const isMathContext = /[+*/=]|等于/.test(text);
        const charSet = isMathContext ? '[\\d+\\-*/=]' : '[\\d]';
        const regex1 = new RegExp(`([\\u4e00-\\u9fa5])(?=${charSet})`, 'g');
        const regex2 = new RegExp(`(${charSet})(?=[\\u4e00-\\u9fa5])`, 'g');
        result = applyRule(result, regex1, '$1 ');
        result = applyRule(result, regex2, '$1 ');
    }

    // --- Rule 3: Remove space between char/number and trailing punctuation ---
    if (activeRules.punct) {
        result = applyRule(result, /([a-zA-Z0-9\u4e00-\u9fa5])\s+([,.:;?!，。：；？！、\])}（）】【《》[({""''"'])/g, '$1$2');
    }

    // --- Rule 4: Number/char and unit (%, ℃, $) ---
    if (activeRules.unit) {
        result = applyRule(result, /(\d)\s+([%℃$])/g, '$1$2');
        result = applyRule(result, /([^\s\d])([%℃$])/g, '$1 $2');
    }

    // --- Rule 5: Deduplicate Chinese periods ---
    if (activeRules.basic) {
        const parts = result.split(/(".*?"|".*?")/g);
        result = parts.map((part, i) => {
            if (i % 2 === 1) return part;
            part = part.replace(/。{3,8}/g, '……');
            part = part.replace(/。{2}/g, '。');
            return part;
        }).join('');
    }

    // --- Rule 7: Chinese colon between numbers to English colon ---
    if (activeRules.unit) {
        result = applyRule(result, /(\d)\s*：\s*(\d)/g, '$1:$2');
    }

    // --- Rule 8: Fix double quotes (only when exactly one pair) ---
    if (activeRules.punct) {
        const quoteCount = (result.match(/[""]/g) || []).length;
        if (quoteCount === 2) {
            let qIndex = 0;
            result = result.replace(/[""]/g, () => {
                qIndex++;
                return qIndex === 1 ? '\u201C' : '\u201D';
            });
        }
    }

    return result === text ? null : result;
}

// Execute correction operation
async function handleTextCorrection(target, originalText) {
    const isInput = target.tagName === 'INPUT';
    const newText = smartCorrectText(originalText, isInput);

    if (!newText) {
        showToast('No correction needed');
        return;
    }

    if (document.execCommand && typeof document.execCommand === 'function') {
        try {
            target.focus();
            document.execCommand('insertText', false, newText);
        } catch (e) {
            performPaste(target, newText);
        }
    } else {
        performPaste(target, newText);
    }

    showToast('Text corrected');
    hideUI();
}

// Build the clipboard payload used by the synthetic paste event. DataTransfer
// is preferred; the plain object keeps pages working in restricted sandboxes.
function createPasteData(text) {
    try {
        if (typeof DataTransfer === 'function') {
            const data = new DataTransfer();
            data.setData('text/plain', text);
            return data;
        }
    } catch (e) {}
    return {
        types: ['text/plain'],
        getData: (type) => (type === 'text/plain' ? text : '')
    };
}

// A native-like paste event is what controlled editors (Baidu Translate,
// Vditor, ProseMirror, ...) listen to in order to update their own model.
// execCommand('insertText') only mutates the DOM and can leave that model empty.
function dispatchPasteEvent(target, text) {
    const data = createPasteData(text);
    let event;
    try {
        event = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: data
        });
    } catch (e) {
        event = new Event('paste', { bubbles: true, cancelable: true });
    }
    if (!event.clipboardData) {
        try {
            Object.defineProperty(event, 'clipboardData', { value: data });
        } catch (e) {}
    }
    target.dispatchEvent(event);
    return event.defaultPrevented;
}

// Paste feedback. With previews enabled, include up to 10 characters of the
// pasted text (quoted in the UI language); pan codes stay bold.
function showPasteResultToast(text, panCode, compat = false, externalClipboard = false) {
    if (externalClipboard) {
        if (getConfig('showPastePreview')) {
            showToast(t('toast_clipboard_pasted'));
        } else {
            showToast(t('toast_pasted'));
        }
        return;
    }

    if (!getConfig('showPastePreview')) {
        showToast(
            compat
                ? t('toast_paste_compat')
                : panCode
                    ? t('toast_password_pasted')
                    : t('toast_pasted')
        );
        return;
    }

    if (panCode) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(t('toast_password_pasted') + ' '));
        const code = document.createElement('strong');
        code.textContent = truncatePasteText(text, 10);
        fragment.appendChild(code);
        showToast(fragment);
        return;
    }

    const [open, close] = getPasteQuotePair();
    const base = compat ? t('toast_paste_compat') : t('toast_pasted');
    const separator = baseLanguageTag(getCurrentLanguage()) === 'zh' ? '' : ' ';
    showToast(`${base}${separator}${open}${truncatePasteText(text, 10)}${close}`);
}

// Paste text copied outside the toolbar. If the copy event captured the text,
// use it; otherwise ask the Clipboard API or the browser's native paste.
async function performClipboardPaste(target, cache) {
    if (!target) return false;
    target.focus();

    if (cache && cache.text) {
        performPaste(target, cache.text, { externalClipboard: true });
        return true;
    }

    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
                performPaste(target, text, { externalClipboard: true });
                return true;
            }
        }
    } catch (e) {}

    try {
        if (document.execCommand && document.execCommand('paste')) {
            showPasteResultToast('', false, false, true);
            return true;
        }
    } catch (e) {}

    showToast(t('toast_paste_fail'));
    return false;
}

// Core paste logic: synthetic paste first, then DOM/execCommand fallbacks.
function performPaste(target, text, options = {}) {
    if (!target) return;
    const panCode = Boolean(options.panCode);
    const externalClipboard = Boolean(options.externalClipboard);
    target.focus();

    // Strategy 1: emit the same event a real Ctrl+V would emit.
    const valueBefore = target.isContentEditable ? target.textContent : target.value;
    const pasteHandled = dispatchPasteEvent(target, text);
    const valueAfter = target.isContentEditable ? target.textContent : target.value;
    if (pasteHandled || valueAfter !== valueBefore) {
        showPasteResultToast(text, panCode, false, externalClipboard);
        return;
    }

    // Strategy 2: document.execCommand (preserves undo, fires native events)
    try {
        const success = document.execCommand('insertText', false, text);
        if (success) {
            showPasteResultToast(text, panCode, false, externalClipboard);
            return;
        }
    } catch (e) {}

    // Strategy 3: Direct assignment + dispatch events (Vue/React compat)
    try {
        if (target.isContentEditable) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
            } else {
                target.innerText += text;
            }
        } else {
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || 0;
            const oldVal = target.value;
            const newVal = oldVal.slice(0, start) + text + oldVal.slice(end);

            let proto = window.HTMLInputElement.prototype;
            if (target.tagName === 'TEXTAREA') {
                proto = window.HTMLTextAreaElement.prototype;
            }

            const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
            if (nativeValueSetter && nativeValueSetter.call) {
                nativeValueSetter.call(target, newVal);
            } else {
                target.value = newVal;
            }

            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));

            const newCursorPos = start + text.length;
            target.setSelectionRange(newCursorPos, newCursorPos);
        }
        showPasteResultToast(text, panCode, true, externalClipboard);
    } catch (e) {
        showToast(t('toast_paste_fail'));
    }
}

// Snapshot the selection before an async clipboard write. Inputs keep their
// selectionStart/End; contenteditable editors need the live Range cloned.
function captureSelectionSnapshot(target) {
    if (!target) return null;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        return typeof start === 'number' && typeof end === 'number'
            ? { start, end }
            : null;
    }
    const selection = window.getSelection();
    return selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;
}

const makeInputEvent = (type, inputType) => {
    if (typeof InputEvent === 'function') {
        return new InputEvent(type, {
            bubbles: true,
            cancelable: type === 'beforeinput',
            inputType,
            data: null
        });
    }
    return new Event(type, { bubbles: true, cancelable: type === 'beforeinput' });
};

// Delete the current selection in a way editors can follow. execCommand alone
// is not enough: Vditor (markdown.lovejade.cn) copies on cut but prevents the
// default deletion, leaving its contenteditable untouched.
function deleteSelectedText(target, snapshot = null) {
    if (!target) return false;

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        target.focus();
        const start = snapshot && typeof snapshot.start === 'number'
            ? snapshot.start
            : target.selectionStart;
        const end = snapshot && typeof snapshot.end === 'number'
            ? snapshot.end
            : target.selectionEnd;
        if (typeof start !== 'number' || typeof end !== 'number' || start === end) return false;

        target.setSelectionRange(start, end);
        if (!target.dispatchEvent(makeInputEvent('beforeinput', 'deleteByCut'))) return false;

        const oldValue = target.value;
        const newValue = oldValue.slice(0, start) + oldValue.slice(end);
        const proto = target.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

        if (setter) setter.call(target, newValue);
        else target.value = newValue;

        target.setSelectionRange(start, start);
        target.dispatchEvent(makeInputEvent('input', 'deleteByCut'));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    if (!target.isContentEditable) return false;

    const selection = window.getSelection();
    if (snapshot && snapshot instanceof Range && selection) {
        selection.removeAllRanges();
        selection.addRange(snapshot);
    }
    target.focus();

    const textBefore = target.textContent;

    // Native deletion drives most editors' beforeinput/input pipeline.
    try {
        document.execCommand('delete');
    } catch (e) {}

    if (target.textContent !== textBefore) return true;

    const liveSelection = window.getSelection();
    if (!liveSelection || liveSelection.rangeCount === 0 || liveSelection.isCollapsed) {
        return false;
    }

    const range = liveSelection.getRangeAt(0);
    if (!target.dispatchEvent(makeInputEvent('beforeinput', 'deleteByCut'))) return true;

    range.deleteContents();
    liveSelection.removeAllRanges();
    liveSelection.addRange(range);
    target.dispatchEvent(makeInputEvent('input', 'deleteByCut'));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}
