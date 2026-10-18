// Module 01: Async Compatibility Layer
// Prefer GM.getValue (standard async), fallback to GM_getValue (Tampermonkey sync)

const safeGetValue = (key, def) => {
    if (typeof GM !== 'undefined' && GM.getValue) {
        return GM.getValue(key, def);
    } else {
        return Promise.resolve(GM_getValue(key, def));
    }
};

const safeSetValue = (key, val) => {
    if (typeof GM !== 'undefined' && GM.setValue) {
        return GM.setValue(key, val);
    } else {
        return Promise.resolve(GM_setValue(key, val));
    }
};

const safeOpenTab = (url, options) => {
    if (typeof GM !== 'undefined' && GM.openInTab) {
        // Modern async standard (GM.openInTab)
        GM.openInTab(url, options);
    } else {
        // Legacy sync standard (GM_openInTab)
        GM_openInTab(url, options);
    }
};
