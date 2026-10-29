// Module 05: Minimal menu — settings live in the KISS settings overlay.
// Only page actions that do not belong in a form stay here.

async function initConfiguration() {
    const keys = Object.keys(DEFAULT_CONFIG);
    const values = await Promise.all(
        keys.map(key => safeGetValue(key, DEFAULT_CONFIG[key]))
    );
    keys.forEach((key, index) => {
        configCache[key] = values[index];
    });
    // Older releases offered "viewport"; it now maps to the default
    // keep-visible behaviour. Only an explicit hide destroys the bar on scroll.
    if (configCache['scrollRepaintMode'] !== SCROLL_REPAINT_MODE.HIDE) {
        configCache['scrollRepaintMode'] = SCROLL_REPAINT_MODE.KEEP;
    }

    const blockedRules = await safeGetValue('blocked_elements', {});
    configCache['blocked_elements'] = blockedRules;
}

async function initDefaultSearchEngine() {
    const hasInitialized = await safeGetValue('engine_initialized', false);
    if (!hasInitialized) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const chinaTimeZones = ['Asia/Shanghai', 'Asia/Urumqi'];
        const defaultEngine = chinaTimeZones.includes(timeZone) ? 'baidu' : 'google';

        configCache['searchEngine'] = defaultEngine;
        await safeSetValue('searchEngine', defaultEngine);
        await safeSetValue('engine_initialized', true);
    }
}

// Clear all element-blocking rules for the current page. The userscript menu
// registration lives in common.js so the user-defined order can be applied.
async function clearPageBlockRules() {
    const domain = location.hostname;
    if (!confirm(t('confirm_clear', domain))) return false;
    const rules = await safeGetValue('blocked_elements', {});
    if (!rules[domain]) {
        alert(t('alert_no_rules'));
        return false;
    }
    delete rules[domain];
    await safeSetValue('blocked_elements', rules);
    if (typeof configCache !== 'undefined') configCache['blocked_elements'] = rules;
    alert(t('alert_cleared'));
    location.reload();
    return true;
}
