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

// Core paste logic (three-tier fallback strategy)
function performPaste(target, text) {
    if (!target) return;
    target.focus();

    // Strategy 1: document.execCommand (preserves undo, safest)
    try {
        const success = document.execCommand('insertText', false, text);
        if (success) {
            showToast(t('toast_pasted'));
            return;
        }
    } catch (e) {}

    // Strategy 2: Direct assignment + dispatch events (Vue/React compat)
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
        showToast(t('toast_paste_compat'));
    } catch (e) {
        showToast(t('toast_paste_fail'));
    }
}
