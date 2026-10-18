// Module 16: Element Blocker Subsystem

let pickerOverlay = null;
let pickerHandler = null;
let pickerClickHandler = null;
let pickerEscHandler = null;
let pickerRightClickHandler = null;

// Auto-apply saved blocking rules
function applySavedBlockingRules() {
    const rules = configCache['blocked_elements'] || {};
    const domain = location.hostname;
    if (rules[domain] && Array.isArray(rules[domain])) {
        const cssText = rules[domain].join(', ') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
        GM_addStyle(cssText);
    }
}

// Activate picker mode
function activateElementPicker() {
    if (pickerOverlay) disablePicker();

    showToast(t('picker_active'));

    // Create highlight overlay
    pickerOverlay = document.createElement('div');
    pickerOverlay.style.all = 'initial';
    pickerOverlay.style.position = 'fixed';
    pickerOverlay.style.pointerEvents = 'none';
    pickerOverlay.style.border = '2px solid #ff0000';
    pickerOverlay.style.background = 'rgba(255, 0, 0, 0.1)';
    pickerOverlay.style.zIndex = '2147483646';
    pickerOverlay.style.transition = 'all 0.1s ease';
    pickerOverlay.style.display = 'none';
    document.body.appendChild(pickerOverlay);

    pickerHandler = (e) => {
        const target = e.target;
        if (target === hostElement || hostElement.contains(target) || target === pickerOverlay) return;
        const rect = target.getBoundingClientRect();
        pickerOverlay.style.display = 'block';
        pickerOverlay.style.top = rect.top + 'px';
        pickerOverlay.style.left = rect.left + 'px';
        pickerOverlay.style.width = rect.width + 'px';
        pickerOverlay.style.height = rect.height + 'px';
    };

    pickerClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const target = e.target;
        if (target === hostElement || hostElement.contains(target)) {
            showToast(t('picker_cant_block_self'));
            return;
        }

        const selector = generateCssSelector(target);
        if (confirm(t('picker_confirm', selector) + `\n(Domain: ${location.hostname})`)) {
            saveBlockRule(selector);
            target.style.display = 'none';
            showToast(t('picker_saved'));
            disablePicker();
        }
    };

    pickerEscHandler = (e) => {
        if (e.key === 'Escape') {
            disablePicker();
            showToast(t('picker_exit'));
        }
    };

    pickerRightClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        disablePicker();
    };

    document.addEventListener('contextmenu', pickerRightClickHandler, true);
    document.addEventListener('mousemove', pickerHandler, true);
    document.addEventListener('click', pickerClickHandler, true);
    document.addEventListener('keydown', pickerEscHandler, true);
}

// Exit picker mode
function disablePicker() {
    if (pickerOverlay) {
        pickerOverlay.remove();
        pickerOverlay = null;
    }
    document.removeEventListener('mousemove', pickerHandler, true);
    document.removeEventListener('click', pickerClickHandler, true);
    document.removeEventListener('keydown', pickerEscHandler, true);
    document.removeEventListener('contextmenu', pickerRightClickHandler, true);
    pickerRightClickHandler = null;
}

// Generate the shortest possible unique CSS selector
function generateCssSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);

    const tagName = el.tagName.toLowerCase();
    let selector = tagName;

    if (el.className && typeof el.className === 'string' && el.className.trim().length > 0) {
        const classes = el.className.trim().split(/\s+/);
        classes.slice(0, 3).forEach(c => {
            selector += '.' + CSS.escape(c);
        });
    }

    if (selector === tagName) {
        if (el.parentElement && el.parentElement !== document.body) {
            return generateCssSelector(el.parentElement) + ' > ' + tagName;
        }
    }

    return selector;
}

// Save rule to GM storage
function saveBlockRule(selector) {
    const rules = configCache['blocked_elements'] || {};
    const domain = location.hostname;

    if (!rules[domain]) rules[domain] = [];
    if (!rules[domain].includes(selector)) {
        rules[domain].push(selector);
        configCache['blocked_elements'] = rules;
        safeSetValue('blocked_elements', rules);
    }
}
