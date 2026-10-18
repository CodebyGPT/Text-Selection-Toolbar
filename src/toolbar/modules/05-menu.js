// Module 05: Minimal menu — settings live in the KISS settings overlay.
// Only page actions that do not belong in a form stay here.

async function initConfiguration() {
    configCache['scrollRepaintMode'] = await safeGetValue('scrollRepaintMode', 'always');
    const keys = Object.keys(DEFAULT_CONFIG);
    const values = await Promise.all(
        keys.map(key => safeGetValue(key, DEFAULT_CONFIG[key]))
    );
    keys.forEach((key, index) => {
        configCache[key] = values[index];
    });

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

function registerMenus() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    if (window.top !== window) return;

    GM_registerMenuCommand(t('menu_block'), () => {
        activateElementPicker();
    });

    GM_registerMenuCommand(t('menu_clear'), async () => {
        const domain = location.hostname;
        if (!confirm(t('confirm_clear', domain))) return;
        const rules = await safeGetValue('blocked_elements', {});
        if (!rules[domain]) {
            alert(t('alert_no_rules'));
            return;
        }
        delete rules[domain];
        await safeSetValue('blocked_elements', rules);
        if (typeof configCache !== 'undefined') configCache['blocked_elements'] = rules;
        alert(t('alert_cleared'));
        location.reload();
    });

    GM_registerMenuCommand(t('menu_edit'), () => {
        toggleEditMode(!isEditMode);
    });
}
