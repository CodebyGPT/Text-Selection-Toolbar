// ==UserScript==
// @name               Text Selection Toolbar
// @name:en            Text Selection Toolbar
// @name:ru            Панель_выбора_текста
// @name:zh-CN         划词工具栏
// @namespace          https://github.com/CodebyGPT/Text_Selection_Toolbar
// @version            2026.06.19
// @description        Add a text selection toolbar to your browser.
// @description:en     Add a text selection toolbar to your browser.
// @description:ru     Добавьте панель инструментов для выделения текста в ваш браузер.
// @description:zh-CN  为你的浏览器增加一个划词工具栏。
// @author             CodebyGPT
// @license            GPL-3.0
// @license            https://www.gnu.org/licenses/gpl-3.0.txt
// @match              *://*/*
// @icon               data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjx0aXRsZSB4bWxucz0iIj50b3VjaC10cmlwbGU8L3RpdGxlPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0ibTE3Ljk3NSAzLjRsMS0xLjc1cTEuMTc1LjY1IDEuODUgMS44MjVUMjEuNSA2cTAgLjY3NS0uMTc1IDEuMzEzdC0uNSAxLjE4N2wtMS43MjUtMXEuMi0uMzUuMy0uNzEyVDE5LjUgNnEwLS44LS40MTItMS41dC0xLjExMy0xLjFtLTQgMGwxLTEuNzVxMS4xNzUuNjUgMS44NSAxLjgyNVQxNy41IDZxMCAuNjc1LS4xNzUgMS4zMTN0LS41IDEuMTg3bC0xLjcyNS0xcS4yLS4zNS4zLS43MTJUMTUuNSA2cTAtLjgtLjQxMy0xLjV0LTEuMTEyLTEuMW0tMy41IDE4LjZxLS43IDAtMS4zMTItLjN0LTEuMDM4LS44NWwtNS40NS02LjkyNWwuNDc1LS41cS41LS41MjUgMS4yLS42MjV0MS4zLjI3NUw3LjUgMTQuMlY2cTAtLjQyNS4yODgtLjcxMlQ4LjUgNXQuNzI1LjI4OHQuMy43MTJ2NUgxN3ExLjI1IDAgMi4xMjUuODc1VDIwIDE0djRxMCAxLjY1LTEuMTc1IDIuODI1VDE2IDIyem0tNi4zLTEzLjVxLS4zMjUtLjU1LS41LTEuMTg3VDMuNSA2cTAtMi4wNzUgMS40NjMtMy41MzdUOC41IDF0My41MzggMS40NjNUMTMuNSA2cTAgLjY3NS0uMTc1IDEuMzEzdC0uNSAxLjE4N2wtMS43MjUtMXEuMi0uMzUuMy0uNzEyVDExLjUgNnEwLTEuMjUtLjg3NS0yLjEyNVQ4LjUgM3QtMi4xMjUuODc1VDUuNSA2cTAgLjQyNS4xLjc4OHQuMy43MTJ6Ii8+PC9zdmc+
// @grant              GM_registerMenuCommand
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_openInTab
// @grant              GM_addStyle
// @grant              GM_setClipboard
// @sandbox            DOM
// @inject-into        content
// @run-at             document-start
// @supportURL         https://github.com/CodebyGPT/Text_Selection_Toolbar/issues
// ==/UserScript==


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

// Module 02: Configuration & State

const DEFAULT_CONFIG = {
    language: 'auto', // 'auto' (default) | 'zh-CN' | 'en' | 'ru'
    positionMode: 'endchar', // 'endchar' | 'mouse'
    offset: 12, // px
    timeout: 2400, // ms, 0 = stays indefinitely
    buttonStyle: 'row', // 'row' (capsule) | 'col' (rounded rect)
    forceWhiteBlack: true, // true = force white bg/black text
    searchEngine: 'baidu', // key or custom url
    enableToast: true,
    enableCache: true,
    unlockHotkey: 'ControlLeft',
    enablePaste: true,

    enableDragPreview: false,
    scrollRepaintMode: 'always',
    smartEngine: false,        // whether to enable smart engine assignment
    fallbackEngine: 'bing',   // fallback engine when text contains no Chinese
    enableDeleteBtn: true, // whether to show delete button
    customTLDs: [], // user-defined TLD list
};

const SCROLL_REPAINT_MODE = {
    ALWAYS: 'always',      // 1. Always repaint (default)
    VIEWPORT: 'viewport',  // 2. Repaint only when anchor is within viewport
    HIDE: 'hide'           // 3. Hide on scroll, never repaint
};

const PASTE_MODE_THREE_BTNS = 'copy-search-paste';   // Lightning paste three-button mode marker

const SEARCH_ENGINES = {
    google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
    baidu: { name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
    brave: { name: 'Brave', url: 'https://search.brave.com/search?q=%s' },
};

// Top-level domain whitelist
const TLD_SET = new Set([
    'com', 'cn', 'de', 'tk', 'uk', 'net', 'org', 'top', 'ru',
    'info', 'br', 'xyz', 'ga', 'nl', 'it', 'ws', 'ml', 'shop',
    'cf', 'fr', 'co', 'eu', 'in', 'online', 'au', 'gq', 'ph',
    'us', 'ca', 'vip', 'club', 'pl', 'cc', 'biz', 'store', 'za',
    'site', 'ch', 'se', 'es', 'tw', 'loan', 'jp', 'me', 'be',
    'live', 'buzz', 'at', 'ir', 'work', 'app', 'sbs', 'cz', 'pro',
    'click', 'id', 'dk', 'io', 'mx', 'bond', 'kr', 'wang', 'lol',
    'no', 'tr', 'cfd', 'nu', 'hu', 'life', 'ai', 'asia', 'my',
    'cl', 'ua', 'ro', 'icu', 'cloud', 'win', 'link', 'ar', 'nz',
    'vn', 'ltd', 'world', 'dev', 'fun', 'mobi', 'space', 'tv',
    'cyou', 'fi', 'tech', 'sk', 'today', 'gr', 'one', 'digital',
    'gov', 'edu'
]);
const TLD_SET_EXTENDED = new Set(TLD_SET); // Extendable copy, merged with custom TLDs

// Runtime state
let cachedSelection = { text: '', html: '' };
let uiTimer = null;
let toastTimer = null;
let isScrolling = false;
let scrollTimeout = null;
let shadowRoot = null;
let hostElement = null;

// Config cache object (initialized to defaults)
let configCache = { ...DEFAULT_CONFIG };

// Synchronous read (direct memory access, fastest, non-blocking)
const getConfig = (key) => {
    return configCache[key];
};

// Async write (update memory + persist to storage)
const setConfig = async (key, val) => {
    configCache[key] = val; // Immediate memory update for responsive interaction
    await safeSetValue(key, val); // Async persist to storage
};

// Module 03: I18N System

const I18N = {
    'zh-CN': {
        lang_name: '简体中文',
        menu_lang: '🌐 语言/Language',
        menu_pos: '📍 UI 弹出位置',
        val_endchar: '字符末尾',
        val_mouse: '光标附近',
        menu_offset: '📏 UI 弹出偏移量',
        prompt_offset: '请输入 UI 距离锚点的偏移量 (px):',
        menu_timeout: '⏱️ UI 停留时长',
        val_infinite: '不消失',
        prompt_timeout: '请输入 UI 停留时长 (ms, 0表示不自动消失):',
        menu_style: '🎨 UI 布局',
        val_row: '横排胶囊',
        val_col: '纵排矩形',
        menu_theme: '🌓 UI 配色',
        val_light: '强制浅色',
        val_auto: '自动反色',
        menu_search: '🔍 搜索引擎',
        prompt_search: '请输入搜索引擎代码 (google, baidu, bing, brave) 或完整URL (%s 代替关键词):',
        err_search: '无效的输入。自定义URL需包含 %s',
        menu_cache: '💾 选中即缓存',
        val_on: '开启',
        val_off: '关闭',
        menu_toast: '🔔 操作反馈',
        menu_hotkey: '🔑 超级取词键',
        val_disabled: '已禁用',
        prompt_hotkey: '请指定快捷键 (如 Ctrl, Alt, Shift) 或输入 "NONE" 以禁用:',
        menu_paste: '⚡ 闪电粘贴',
        menu_block: '🚫 屏蔽网页自建划词栏',
        menu_clear: '🗑️ 清除当前域名屏蔽规则',
        confirm_clear: '确定要清除 %s 下所有屏蔽规则吗？',
        alert_cleared: '规则已清除，请刷新。',
        alert_no_rules: '当前域名无已保存的规则。',
        menu_reset: '⚙️ 重置全部设置',
        confirm_reset: '确定要重置所有的设置吗？',
        toast_unlock: '🔓 超级取词已激活',
        toast_copied: '已复制',
        toast_pasted: '已粘贴',
        toast_paste_compat: '已粘贴 (兼容模式)',
        toast_paste_fail: '粘贴失败',
        picker_active: '已进入拾取模式；按 ESC 退出',
        picker_cant_block_self: '不能屏蔽脚本自身的按钮！',
        picker_confirm: '确定屏蔽该元素吗？(按Esc退出)\n\n选择器: %s',
        picker_saved: '元素已屏蔽并保存规则',
        picker_exit: '已退出拾取模式',
        btn_copy: '复制',
        btn_search: '搜索',
        btn_paste: '粘贴',
        festival_cny: '🏮已复制🏮',
        festival_xmas: '🎄已复制🎄',
        btn_open_link: '打开链接',
        btn_email: '@ 复制邮箱',
        toast_email_copied: '邮箱地址已复制',
        toast_password_pasted: '已粘贴提取码',
        menu_tld_add: '➕ 添加自定义顶级域名',
        prompt_tld_add: '请输入要添加的顶级域名 (如 xyz 或 .xyz):',
        toast_tld_added: '已添加域名: %s',
        err_tld_invalid: '无效的域名格式。请输入如 xyz 或 .xyz',
        menu_drag_preview: '🔗 拖拽预览',
        btn_cut: '剪切',
        menu_edit: '✏️ 编辑网页',
        menu_exit_edit: '已退出编辑',
        btn_delete: '删除',
        btn_bold: '加粗',
        btn_highlight: '标记',
        disclaimer_text: '此网页内容已经过 <SCRIPT_NAME> 编辑',
        scroll_repaint: '📜 UI 重绘策略',
        scroll_always: '始终重绘',
        scroll_viewport: '锚点在视口内重绘',
        scroll_hide: '始终不重绘',
        menu_smart_engine: '🧠 智能分配搜索引擎',
        menu_fallback_engine: '🔍 备用搜索引擎',
        val_smart_on: '开启',
        val_smart_off: '关闭',
        menu_delete_btn: '🗑️ 删除按钮可见性',
        val_show: '显示',
        val_hide: '隐藏',
    },
    'en': {
        lang_name: 'English',
        menu_lang: '🌐 Language',
        menu_pos: '📍 Position',
        val_endchar: 'End of Text',
        val_mouse: 'Mouse Cursor',
        menu_offset: '📏 Offset',
        prompt_offset: 'Enter offset distance (px):',
        menu_timeout: '⏱️ Timeout',
        val_infinite: 'Infinite',
        prompt_timeout: 'Enter timeout (ms, 0 = infinite):',
        menu_style: '🎨 Layout',
        val_row: 'Row (Capsule)',
        val_col: 'Column (Rect)',
        menu_theme: '🌓 Theme',
        val_light: 'Force Light',
        val_auto: 'Auto Contrast',
        menu_search: '🔍 Engine',
        prompt_search: 'Enter engine code (google, bing...) or URL with %s:',
        err_search: 'Invalid input. Custom URL must contain %s',
        menu_cache: '💾 Cache Selection',
        val_on: 'On',
        val_off: 'Off',
        menu_toast: '🔔 Toast Notification',
        menu_hotkey: '🔑 Unlock Hotkey',
        val_disabled: 'Disabled',
        prompt_hotkey: 'Press a key (Ctrl, Alt...) or type "NONE" to disable:',
        menu_paste: '⚡ Smart Paste',
        menu_block: '🚫 Block Page Element',
        menu_clear: '🗑️ Clear Block Rules',
        confirm_clear: 'Clear all rules for %s?',
        alert_cleared: 'Rules cleared. Please refresh.',
        alert_no_rules: 'No rules found for this domain.',
        menu_reset: '⚙️ Reset Settings',
        confirm_reset: 'Reset all settings?',
        toast_unlock: '🔓 Unlock Mode Active',
        toast_copied: 'Copied',
        toast_pasted: 'Pasted',
        toast_paste_compat: 'Pasted (Compat)',
        toast_paste_fail: 'Paste Failed',
        picker_active: 'Picker Mode Active (ESC to exit)',
        picker_cant_block_self: 'Cannot block script UI!',
        picker_confirm: 'Block this element? (ESC to cancel)\n\nSelector: %s',
        picker_saved: 'Element blocked & saved.',
        picker_exit: 'Picker Mode Exited',
        btn_copy: 'Copy',
        btn_search: 'Search',
        btn_paste: 'Paste',
        festival_cny: '🏮 Copied 🏮',
        festival_xmas: '🎄 Copied 🎄',
        btn_open_link: 'Open Link',
        btn_email: '@ Copy Email',
        toast_email_copied: 'Email Copied',
        toast_password_pasted: 'Code Pasted',
        menu_tld_add: '➕ Add Custom TLD',
        prompt_tld_add: 'Enter TLD to add (e.g. xyz or .xyz):',
        toast_tld_added: 'TLD added: %s',
        err_tld_invalid: 'Invalid TLD format. Use e.g. xyz or .xyz',
        menu_drag_preview: '🔗 Drag Link Preview',
        btn_cut: 'Cut',
        menu_edit: '✏️ Edit Page',
        menu_exit_edit: 'Exit Edit Mode',
        btn_delete: 'Delete',
        btn_bold: 'Bold',
        btn_highlight: 'Highlight',
        disclaimer_text: 'Content edited by <SCRIPT_NAME> for simplification purposes only.',
        scroll_repaint: '📜 UI redrawing',
        scroll_always: 'Always redraw',
        scroll_viewport: 'Redraw anchor points within the viewport',
        scroll_hide: 'Never redraw',
        menu_smart_engine: '🧠 Smart Engine',
        menu_fallback_engine: '🔍 Fallback Engine',
        val_smart_on: 'On',
        val_smart_off: 'Off',
        menu_delete_btn: '🗑️ Visibility of the delete button',
        val_show: 'Show',
        val_hide: 'Hide',
    },
    'ru': {
        lang_name: 'Русский',
        menu_lang: '🌐 Язык/Language',
        menu_pos: '📍 Позиция',
        val_endchar: 'Конец текста',
        val_mouse: 'Курсор мыши',
        menu_offset: '📏 Отступ',
        prompt_offset: 'Введите отступ (px):',
        menu_timeout: '⏱️ Задержка',
        val_infinite: 'Бесконечно',
        prompt_timeout: 'Введите задержку (мс, 0 = бесконечно):',
        menu_style: '🎨 Стиль кнопок',
        val_row: 'Строка',
        val_col: 'Колонка',
        menu_theme: '🌓 Тема',
        val_light: 'Светлая',
        val_auto: 'Авто',
        menu_search: '🔍 Поисковик',
        prompt_search: 'Код (google, yandex...) или URL с %s:',
        err_search: 'Ошибка. URL должен содержать %s',
        menu_cache: '💾 Кэш выделения',
        val_on: 'Вкл',
        val_off: 'Выкл',
        menu_toast: '🔔 Уведомления',
        menu_hotkey: '🔑 Горячая клавиша',
        val_disabled: 'Откл',
        prompt_hotkey: 'Нажмите клавишу (Ctrl, Alt...) или "NONE":',
        menu_paste: '⚡ Быстрая вставка',
        menu_block: '🚫 Блокировка элементов',
        menu_clear: '🗑️ Сброс блокировок',
        confirm_clear: 'Удалить правила для %s?',
        alert_cleared: 'Правила удалены. Обновите страницу.',
        alert_no_rules: 'Нет правил для этого домена.',
        menu_reset: '⚙️ Сброс настроек',
        confirm_reset: 'Сбросить все настройки?',
        toast_unlock: '🔓 Режим разблокировки',
        toast_copied: 'Скопировано',
        toast_pasted: 'Вставлено',
        toast_paste_compat: 'Вставлено (совм.)',
        toast_paste_fail: 'Ошибка вставки',
        picker_active: 'Режим выбора (ESC для выхода)',
        picker_cant_block_self: 'Нельзя блокировать кнопки скрипта!',
        picker_confirm: 'Блокировать элемент? (ESC - отмена)\n\nСелектор: %s',
        picker_saved: 'Заблокировано и сохранено.',
        picker_exit: 'Режим выбора отключен',
        btn_copy: 'Копировать',
        btn_search: 'Поиск',
        btn_paste: 'Вставить',
        festival_cny: '🏮 Скопировано 🏮',
        festival_xmas: '🎄 Скопировано 🎄',
        btn_open_link: 'Открыть ссылку',
        btn_email: '@ Копировать Email',
        toast_email_copied: 'Email скопирован',
        toast_password_pasted: 'Код вставлен',
        menu_tld_add: '➕ Добавить свой TLD',
        prompt_tld_add: 'Введите TLD (например xyz или .xyz):',
        toast_tld_added: 'TLD добавлен: %s',
        err_tld_invalid: 'Неверный формат TLD. Используйте напр. xyz или .xyz',
        menu_drag_preview: '🔗 Предпросмотр ссылки',
        btn_cut: 'Вырезать',
        menu_edit: '✏️ Редактировать',
        menu_exit_edit: 'Выход из редактора',
        btn_delete: 'Удалить',
        btn_bold: 'Жирный',
        btn_highlight: 'Маркер',
        disclaimer_text: 'Контент отредактирован <SCRIPT_NAME> только для упрощения просмотра.',
        scroll_repaint: '📜 Перерисовка интерфейса',
        scroll_always: 'Всегда перерисовывать',
        scroll_viewport: 'Анкор перерисовывается внутри окна просмотра',
        scroll_hide: 'Всегда не перерисовывать',
        menu_smart_engine: '🧠 Умный поиск',
        menu_fallback_engine: '🔍 Резерв поиск',
        val_smart_on: 'Вкл',
        val_smart_off: 'Выкл',
        menu_delete_btn: '🗑️ видимость кнопки удаления',
        val_show: 'Показать',
        val_hide: 'Скрыть',
    }
};

const t = (key, ...args) => {
    let lang = getConfig('language');
    if (lang === 'auto') {
        const nav = navigator.language.toLowerCase();
        if (nav.startsWith('zh')) lang = 'zh-CN';
        else if (nav.startsWith('ru')) lang = 'ru';
        else lang = 'en';
    }
    const dict = I18N[lang] || I18N['en'];
    let str = dict[key] || key;
    args.forEach(arg => str = str.replace('%s', arg));
    return str;
};

// Module 04: Edit Mode & Compliance Banner

// Edit mode state
let isEditMode = false;
let hasEditSessionStarted = false; // Whether edit mode was ever enabled this session
let complianceObserver = null;
let currentBannerId = null;

// Generate random ID (anti-tampering)
const generateRandomId = () => 'tm-sc-' + Math.random().toString(36).slice(2, 9);

// Create / rebuild compliance banner
function ensureComplianceBanner() {
    if (!hasEditSessionStarted) return; // Skip if edit mode was never enabled

    // 1. Check if banner already exists
    const existing = currentBannerId ? document.getElementById(currentBannerId) : null;
    if (existing && existing.offsetParent !== null) return;// Exists and visible (not display:none), skip
    if (existing) existing.remove();// Exists but hidden, or missing — proceed to rebuild

    // 2. Disconnect previous Observer to avoid dead loop on re-insert
    if (complianceObserver) {
        complianceObserver.disconnect();
    }

    // 3. Create element
    const scriptName = GM_info.script.name;
    const banner = document.createElement('div');
    currentBannerId = generateRandomId();
    banner.id = currentBannerId;

    banner.setAttribute('data-tm-policy', 'protected'); // Critical: mark for CSS exclusion
    banner.setAttribute('contenteditable', 'false');

    // Styles: high z-index, semi-transparent white background, light gray text, bottom-centered, no selection, click-through (anti-picker)
    banner.style.cssText = `
        position: fixed !important;
        bottom: 50px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        background: rgba(255, 255, 255, 0.85) !important;
        padding: 6px 14px !important;
        border-radius: 6px !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important;
        pointer-events: none !important; /* Click-through: avoids blocking page interaction and prevents picker selection */
        user-select: none !important;
        -webkit-user-select: none !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: auto !important;
        height: auto !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
    `;

    // SVG icon (Info)
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'display:flex;align-items:center;color:#888;pointer-events:none;';
    iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    banner.appendChild(iconContainer);

    // 2. Text (rendered on Canvas for anti-tampering)
    const textStr = t('disclaimer_text').replace('<SCRIPT_NAME>', scriptName);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 12;
    const fontFamily = 'sans-serif';

    // Measure text width
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(textStr);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.2); // Some line height

    // Set canvas dimensions (2x scaling for HiDPI clarity)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = textWidth * dpr;
    canvas.height = textHeight * dpr;
    canvas.style.width = `${textWidth}px`;
    canvas.style.height = `${textHeight}px`;
    canvas.style.pointerEvents = 'none';

    // Draw
    ctx.scale(dpr, dpr);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#999';
    ctx.textBaseline = 'middle';
    ctx.fillText(textStr, 0, textHeight / 2 + 1); // +1 nudge for vertical centering

    banner.appendChild(canvas);
    document.body.appendChild(banner);

    // 4. Start passive monitoring (MutationObserver)
    complianceObserver = new MutationObserver((mutations) => {
        let needsRebuild = false;
        mutations.forEach(m => {
            // If node was removed
            if (m.removedNodes.length) {
                m.removedNodes.forEach(node => {
                    if (node.id === currentBannerId) needsRebuild = true;
                });
            }
            // If attributes were tampered with (e.g., style set to none)
            if (m.target.id === currentBannerId) {
                needsRebuild = true;
            }
            // Child node changes (e.g., Canvas was deleted)
            if (m.target.id === currentBannerId && m.type === 'childList') needsRebuild = true;
        });

        if (needsRebuild) { // Async rebuild to prevent deadlock
            // On any tampering detected: immediately destroy old banner and rebuild
            setTimeout(() => { // setTimeout avoids synchronous DOM manipulation inside Observer callback
                const old = document.getElementById(currentBannerId); // Destroy old reference (if still in DOM but modified)
                if (old) old.remove();
                // Rebuild immediately
                ensureComplianceBanner();
            }, 0);
        }
    });

    complianceObserver.observe(document.body, { childList: true, subtree: false }); // Monitor body child removal
    // Monitor banner's own attribute changes (prevent hiding via style="display:none")
    setTimeout(() => { // Re-acquire latest banner reference
        const b = document.getElementById(currentBannerId);
        if (b && complianceObserver) {
            complianceObserver.observe(b, { attributes: true, attributeFilter: ['style', 'class', 'hidden', 'id', 'data-tm-policy', 'contenteditable'], childList: true, subtree: true });
        }
    }, 0);
}

// Toggle edit mode
function toggleEditMode(enable) {
    if (isEditMode === enable) return;
    isEditMode = enable;

    if (isEditMode) {
        hasEditSessionStarted = true; // Mark session started — banner persists even after exiting edit mode
        document.designMode = 'on';
        ensureComplianceBanner();
        showToast(t('menu_edit') + ': ' + t('val_on'));
    } else {
        document.designMode = 'off';
        showToast(t('menu_exit_edit'));
        hideUI(); // Hide any lingering buttons

        ensureComplianceBanner();  // Ensure banner still exists (prevent accidental deletion during toggle)
    }
}

// Module 05: GM Menu System

// Load all config at startup
async function initConfiguration() {
    configCache['scrollRepaintMode'] = await safeGetValue('scrollRepaintMode', 'always');
    const keys = Object.keys(DEFAULT_CONFIG);
    // Parallel reads for speed
    const values = await Promise.all(
        keys.map(key => safeGetValue(key, DEFAULT_CONFIG[key]))
    );

    // Write read values to cache
    keys.forEach((key, index) => {
        configCache[key] = values[index];
    });

    // Additionally load block rules (blocked_elements)
    const blockedRules = await safeGetValue('blocked_elements', {});
    configCache['blocked_elements'] = blockedRules;

    // Load custom TLDs and merge into extended set
    const customTLDs = configCache['customTLDs'] || [];
    if (customTLDs.length > 0) {
        customTLDs.forEach(t => TLD_SET_EXTENDED.add(t.toLowerCase().replace(/^\./, '')));
    }
}

// Auto-set search engine based on timezone on first run
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
    // 1. Language setting
    const curLang = getConfig('language');
    const langLabel = curLang === 'auto' ? 'Auto' : (I18N[curLang] ? I18N[curLang].lang_name : curLang);
    GM_registerMenuCommand(`${t('menu_lang')}: ${langLabel}`, () => {
        const nextMap = { 'auto': 'zh-CN', 'zh-CN': 'en', 'en': 'ru', 'ru': 'auto' };
        setConfig('language', nextMap[curLang] || 'auto');
        location.reload();
    });

    // 2.1 Position mode
    const posMode = getConfig('positionMode');
    GM_registerMenuCommand(`${t('menu_pos')}: ${posMode === 'endchar' ? t('val_endchar') : t('val_mouse')}`, () => {
        setConfig('positionMode', posMode === 'endchar' ? 'mouse' : 'endchar');
        location.reload();
    });

    // 2.2 Offset
    GM_registerMenuCommand(`${t('menu_offset')}: ${getConfig('offset')}px`, () => {
        const val = prompt(t('prompt_offset'), getConfig('offset'));
        if (val !== null && !isNaN(val)) {
            setConfig('offset', parseInt(val, 10));
            location.reload();
        }
    });

    // Button repaint strategy
    const scrollMode = getConfig('scrollRepaintMode');
    const modeText = {
        always: t('scroll_always'),
        viewport: t('scroll_viewport'),
        hide: t('scroll_hide')
    };
    GM_registerMenuCommand(`${t('scroll_repaint')}: ${modeText[scrollMode]}`, () => {
        const nextMap = { always: 'viewport', viewport: 'hide', hide: 'always' };
        setConfig('scrollRepaintMode', nextMap[scrollMode] || 'always');
        location.reload();
    });

    // 2.3 Timeout
    const timeout = getConfig('timeout');
    GM_registerMenuCommand(`${t('menu_timeout')}: ${timeout === 0 ? t('val_infinite') : timeout + 'ms'}`, () => {
        const val = prompt(t('prompt_timeout'), timeout);
        if (val !== null && !isNaN(val)) {
            setConfig('timeout', parseInt(val, 10));
            location.reload();
        }
    });

    // 2.4 Button style
    const btnStyle = getConfig('buttonStyle');
    GM_registerMenuCommand(`${t('menu_style')}: ${btnStyle === 'row' ? t('val_row') : t('val_col')}`, () => {
        setConfig('buttonStyle', btnStyle === 'row' ? 'col' : 'row');
        location.reload();
    });

    // 2.5 Theme
    const forceWB = getConfig('forceWhiteBlack');
    GM_registerMenuCommand(`${t('menu_theme')}: ${forceWB ? t('val_light') : t('val_auto')}`, () => {
        setConfig('forceWhiteBlack', !forceWB);
        location.reload();
    });

    // Delete button toggle
    const showDelete = getConfig('enableDeleteBtn');
    GM_registerMenuCommand(`${t('menu_delete_btn')}: ${showDelete ? t('val_show') : t('val_hide')}`, () => {
        setConfig('enableDeleteBtn', !showDelete);
        location.reload();
    });

    // 2.6 Search engine
    const currentEngineKey = getConfig('searchEngine');
    const engineName = SEARCH_ENGINES[currentEngineKey] ? SEARCH_ENGINES[currentEngineKey].name : 'Custom';
    GM_registerMenuCommand(`${t('menu_search')}: ${engineName}`, () => {
        const choice = prompt(t('prompt_search'), currentEngineKey);
        if (choice) {
            if (SEARCH_ENGINES[choice] || choice.includes('%s')) {
                setConfig('searchEngine', choice);
                location.reload();
            } else {
                alert(t('err_search'));
            }
        }
    });

    // Smart engine toggle
    const smartOn = getConfig('smartEngine');
    GM_registerMenuCommand(`${t('menu_smart_engine')}: ${smartOn ? t('val_smart_on') : t('val_smart_off')}`, () => {
        setConfig('smartEngine', !smartOn);
        location.reload();
    });

    // Fallback engine selection (only shown when smart engine is on)
    if (smartOn) {
        const fbKey = getConfig('fallbackEngine');
        const fbName = SEARCH_ENGINES[fbKey] ? SEARCH_ENGINES[fbKey].name : 'Custom';
        GM_registerMenuCommand(`${t('menu_fallback_engine')}: ${fbName}`, () => {
            const choice = prompt(t('prompt_search'), fbKey);
            if (choice) {
                if (SEARCH_ENGINES[choice] || choice.includes('%s')) {
                    setConfig('fallbackEngine', choice);
                    location.reload();
                } else {
                    alert(t('err_search'));
                }
            }
        });
    }

    // 2.7 Cache
    GM_registerMenuCommand(`${t('menu_cache')}: ${getConfig('enableCache') ? t('val_on') : t('val_off')}`, () => {
        setConfig('enableCache', !getConfig('enableCache'));
        location.reload();
    });

    // 2.8 Toast notification
    GM_registerMenuCommand(`${t('menu_toast')}: ${getConfig('enableToast') ? t('val_on') : t('val_off')}`, () => {
        setConfig('enableToast', !getConfig('enableToast'));
        location.reload();
    });

    // 2.9 Unlock mode hotkey
    const currentKey = getConfig('unlockHotkey');
    GM_registerMenuCommand(`${t('menu_hotkey')}: ${currentKey || t('val_disabled')}`, () => {
        const val = prompt(t('prompt_hotkey'));
        if (val === null) return;

        let finalKey = val.trim();
        if (finalKey.toLowerCase() === 'ctrl') finalKey = 'ControlLeft';
        if (finalKey.toLowerCase() === 'alt') finalKey = 'AltLeft';
        if (finalKey.toLowerCase() === 'shift') finalKey = 'ShiftLeft';
        if (finalKey === '' || finalKey.toUpperCase() === 'NONE') finalKey = '';

        setConfig('unlockHotkey', finalKey);
        location.reload();
    });

    // 2.10 Lightning paste
    GM_registerMenuCommand(`${t('menu_paste')}: ${getConfig('enablePaste') ? t('val_on') : t('val_off')}`, () => {
        setConfig('enablePaste', !getConfig('enablePaste'));
        location.reload();
    });

    // Drag preview toggle
    GM_registerMenuCommand(`${t('menu_drag_preview')}: ${getConfig('enableDragPreview') ? t('val_on') : t('val_off')}`, () => {
        setConfig('enableDragPreview', !getConfig('enableDragPreview'));
        location.reload();
    });

    // 2.12 Block element tool
    GM_registerMenuCommand(t('menu_block'), () => {
        activateElementPicker();
    });

    GM_registerMenuCommand(t('menu_clear'), async () => {
        const domain = location.hostname;
        if (confirm(t('confirm_clear', domain))) {
            const rules = await safeGetValue('blocked_elements', {});
            if (rules[domain]) {
                delete rules[domain];
                await safeSetValue('blocked_elements', rules);
                if (typeof configCache !== 'undefined') { configCache['blocked_elements'] = rules; }
                alert(t('alert_cleared'));
                location.reload();
            } else {
                alert(t('alert_no_rules'));
            }
        }
    });

    // Add custom TLD
    GM_registerMenuCommand(t('menu_tld_add'), () => {
        const val = prompt(t('prompt_tld_add'));
        if (!val) return;
        let tld = val.trim().toLowerCase().replace(/^\./, ''); // Strip leading dot
        // Validate: letters only
        if (!/^[a-z]{2,}$/.test(tld)) {
            alert(t('err_tld_invalid'));
            return;
        }
        const current = getConfig('customTLDs') || [];
        if (current.includes(tld)) {
            showToast('TLD already exists: ' + tld);
            return;
        }
        current.push(tld);
        setConfig('customTLDs', current);
        TLD_SET_EXTENDED.add(tld);
        showToast(t('toast_tld_added', tld));
    });

    // Edit page
    GM_registerMenuCommand(t('menu_edit'), () => {
        toggleEditMode(!isEditMode);
    });

    // 2.13 Reset
    GM_registerMenuCommand(t('menu_reset'), async () => {
        if (confirm(t('confirm_reset'))) {
            const keys = Object.keys(DEFAULT_CONFIG);
            await Promise.all(keys.map(k => setConfig(k, DEFAULT_CONFIG[k])));
            location.reload();
        }
    });
}

// Module 06: Link & Password Extractors

// Get merged complete TLD set (built-in + user-defined)
function getEffectiveTLDs() {
    const custom = getConfig('customTLDs') || [];
    if (custom.length === 0) return TLD_SET_EXTENDED;
    const merged = new Set(TLD_SET_EXTENDED);
    custom.forEach(t => merged.add(t.toLowerCase().replace(/^\./, '')));
    return merged;
}

// RFC 3986 URL safe character detection (unreserved + reserved)
const isUrlSafeChar = (ch) => {
    const code = ch.charCodeAt(0);
    return code < 128 && /^[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]$/.test(ch);
};

const isChineseChar = (ch) => /[\u4e00-\u9fa5]/.test(ch);

// Clean non-URL characters from the end of a URL
function trimUrlTail(url) {
    url = url.replace(/[,.。;:!?！？、]+$/, '');
    const openParens = (url.match(/\(/g) || []).length;
    const closeParens = (url.match(/\)/g) || []).length;
    if (closeParens > openParens) {
        const excess = closeParens - openParens;
        for (let i = 0; i < excess; i++) {
            url = url.replace(/\)+$/, (m) => m.slice(1));
        }
    }
    if (openParens > closeParens && url.endsWith('(')) {
        url = url.slice(0, -1);
    }
    url = url.replace(/[,.。;:!?！？、]+$/, '');
    return url;
}

// Scan URL path from startPos in text, return path end position
// Key rule: stop scanning on Chinese characters; backtrack '(' before Chinese
function scanUrlPath(text, startPos) {
    let urlEnd = startPos;
    let sawChinese = false;

    for (let i = startPos; i < text.length; i++) {
        const ch = text[i];

        if (isChineseChar(ch)) {
            sawChinese = true;
            const collected = text.substring(startPos, urlEnd);
            if (collected.endsWith('(:') || collected.endsWith('(')) {
                while (urlEnd > startPos && text[urlEnd - 1] !== '(') {
                    urlEnd--;
                }
                urlEnd--;
            }
            continue;
        }

        if (sawChinese) break;

        if (isUrlSafeChar(ch)) {
            urlEnd = i + 1;
        } else {
            break;
        }
    }

    return urlEnd;
}

// Protocol anchor regex
const PROTO_ANCHOR_PATTERN = /https?:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/gi;

// Protocol-less domain anchor regex (for patterns like cloud.189.cn/t/xxx)
const DOMAIN_ANCHOR_PATTERN = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/gi;

// Extract all URLs from text
function extractUrlsFromText(text) {
    const effectiveTLDs = getEffectiveTLDs();
    const results = [];

    // Collect all anchors (proto + proto-less)
    const allAnchors = [];

    // Protocol anchors
    let m;
    const protoRegex = new RegExp(PROTO_ANCHOR_PATTERN.source, 'gi');
    while ((m = protoRegex.exec(text)) !== null) {
        allAnchors.push({
            start: m.index,
            end: m.index + m[0].length,
            hostAndProto: m[0],
            hasProto: true
        });
    }

    // Protocol-less domain anchors (only where not already covered)
    const domainRegex = new RegExp(DOMAIN_ANCHOR_PATTERN.source, 'gi');
    while ((m = domainRegex.exec(text)) !== null) {
        // Check if this domain is already covered by a proto anchor
        const isOverlapped = allAnchors.some(a =>
            m.index >= a.start && m.index < a.end
        );
        if (!isOverlapped) {
            allAnchors.push({
                start: m.index,
                end: m.index + m[0].length,
                hostAndProto: m[0],
                hasProto: false
            });
        }
    }

    // Sort by position
    allAnchors.sort((a, b) => a.start - b.start);

    // Deduplicate: remove anchors whose range is already covered by a previous one (use anchor end position for initial filtering)
    const deduped = [];
    for (const anchor of allAnchors) {
        if (deduped.length === 0 || anchor.start >= deduped[deduped.length - 1].end) {
            deduped.push(anchor);
        }
    }

    // Scan path for each anchor; record actual URL end position for dedup
    let lastUrlEnd = 0;
    for (const anchor of deduped) {
        // Skip anchors already covered by the previous full URL
        if (anchor.start < lastUrlEnd) continue;
        const host = anchor.hostAndProto.replace(/^https?:\/\//, '').split('/')[0];
        const tld = host.split('.').pop().toLowerCase();
        if (!effectiveTLDs.has(tld)) continue;
        if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/.test(host)) continue;

        const pathEnd = scanUrlPath(text, anchor.end);
        let url = text.substring(anchor.start, pathEnd);
        url = url.replace(/[\u4e00-\u9fa5]+/g, '');
        url = trimUrlTail(url);

        // Validate: URL must have path beyond domain
        if (!anchor.hasProto) {
            const urlHost = url.split('/')[0];
            // URL after protocol must contain at least one / path or ? param
            if (url === urlHost || url.length <= urlHost.length) {
                // No path; check for ? params
                const questionIdx = text.indexOf('?', anchor.end);
                if (questionIdx !== -1 && questionIdx < anchor.end + 50) {
                    // May have params after, but scanner didn't catch them. Conservative skip.
                }
                // Bare domain not treated as link (e.g., "cloud.189.cn" alone)
                if (!/[/?#]/.test(url)) continue;
            }
        }

        const finalHost = url.replace(/^https?:\/\//, '').split('/')[0];
        const finalTld = finalHost.split('.').pop().toLowerCase();
        if (!effectiveTLDs.has(finalTld)) continue;

        const fullUrl = url.startsWith('http') ? url : 'http://' + url;
        const displayUrl = anchor.hasProto ? url : url; // Display shows with http:// if needed

        results.push({
            display: fullUrl.replace(/^https?:\/\//, '') === url.replace(/^https?:\/\//, '')
                ? url : fullUrl,
            url: fullUrl,
            host: finalHost,
            anchorStart: anchor.start  // Keep anchor position in original text for password assignment
        });

        // Mark covered range for subsequent anchor dedup
        lastUrlEnd = pathEnd;
    }

    return results;
}

// Extract all passwords with their positions in the original text
function extractAllCodesWithPositions(rawText) {
    const results = [];
    const codePatterns = [
        /(?:提取码|提取密碼|密码|訪問碼|访问码|分享码|口令|code|pwd|key|pw|pass)\s*[:：\s]+\s*([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /(?:提取码|提取密碼|密码|訪問碼|访问码|分享码|口令|code|pwd|key|pw|pass)[:：]([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /码\s*[:：\s]*([a-zA-Z0-9]{3,8})(?![a-zA-Z0-9])/gi,
        /\([:：\s]*([a-zA-Z0-9]{3,8})\s*\)/gi,
    ];
    const seen = new Set(); // Dedup: same position + same code recorded once
    for (const pat of codePatterns) {
        let m;
        while ((m = pat.exec(rawText)) !== null) {
            const key = m.index + '|' + m[1];
            if (!seen.has(key)) {
                seen.add(key);
                results.push({ code: m[1], index: m.index });
            }
        }
    }
    results.sort((a, b) => a.index - b.index);
    return results;
}

// Smart link and password extractor
function extractLinkAndCode(rawText) {
    if (!rawText) return null;

    // ---- Stage 1: Extract all passwords with positions ----
    const allCodes = extractAllCodesWithPositions(rawText);
    const password = allCodes.length > 0 ? allCodes[0].code : null;

    // ---- Stage 2: Extract URLs (dual strategy) ----
    let urls = extractUrlsFromText(rawText);

    if (urls.length === 0) {
        const cleanText = rawText
            .replace(/[\u4e00-\u9fa5]+/g, '')
            .replace(/\s+/g, '');
        urls = extractUrlsFromText(cleanText);
    }

    if (urls.length === 0 && !password) return null;

    // ---- Stage 3: Assign nearest password to each URL (use anchor position directly, no re-search on host) ----
    for (let i = 0; i < urls.length; i++) {
        const urlStart = urls[i].anchorStart;
        if (urlStart === undefined) continue;
        // This URL's range in the original text: [urlStart, nextUrlStart)
        const nextUrlStart = (i + 1 < urls.length && urls[i + 1].anchorStart !== undefined)
            ? urls[i + 1].anchorStart
            : rawText.length;
        const matched = allCodes.filter(c => c.index >= urlStart && c.index < nextUrlStart);
        if (matched.length > 0) {
            urls[i].code = matched[0].code;
        }
    }

    return {
        urls: urls,
        password: password
    };
}

// Email address extractor
function extractEmailFromText(rawText) {
    if (!rawText || !rawText.includes('@')) return null;
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const m = rawText.match(emailPattern);
    return m ? m[1] : null;
}

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

// Module 08: Shadow DOM Container & Styles

// Initialize Shadow DOM container (optimized for SPA/AJAX)
function initContainer() {
    // 1. Check if hostElement exists and is still connected to the document (isConnected)
    if (hostElement && hostElement.isConnected) return;

    // 2. If hostElement exists but has been detached from DOM (cleared by page scripts), clean up old reference
    if (hostElement) {
        hostElement = null;
        shadowRoot = null;
    }

    // 3. Re-create container
    hostElement = document.createElement('div');
    hostElement.id = 'tm-smart-copy-host';
    hostElement.style.all = 'initial';
    hostElement.style.position = 'fixed';
    hostElement.style.zIndex = '2147483647'; // Max z-index
    hostElement.style.top = '0';
    hostElement.style.left = '0';
    hostElement.style.width = '0';
    hostElement.style.height = '0';
    hostElement.style.overflow = 'visible';
    hostElement.style.pointerEvents = 'none';

    // Important: mount on documentElement (html) instead of body
    // This way even if body is overwritten by SPA framework, elements on html usually survive
    (document.documentElement || document.body).appendChild(hostElement);

    shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // Re-inject styles
    const style = document.createElement('style');
    style.textContent = getStyles();
    shadowRoot.appendChild(style);
}

// Get stylesheet string
function getStyles() {
    const isCol = getConfig('buttonStyle') === 'col';
    const padRow = '10px 13.1415926px';   // Capsule: slightly narrower top/bottom, wider left/right
    const padCol = '10px';       // Column: square, equal on all sides
    return `
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .sc-container {
            position: fixed;
            display: flex;
            flex-direction: ${isCol ? 'column' : 'row'};
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid transparent;
            box-shadow:
                0 0 0 1px rgba(255, 255, 255, 0.3),
                0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06),
                0 0 10px rgba(255, 255, 255, 0.1);
            color: #000;
            border-radius: ${isCol ? '12px' : '20px'};
            font-size: 16px;
            z-index: 9999;
            cursor: pointer;
            user-select: none;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            pointer-events: auto;
            overflow: hidden;
            white-space: nowrap;
        }
        .sc-container.visible {
            opacity: 1;
            transform: scale(1);
        }
        .sc-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, transform 0.1s;
            color: #000;
            padding: ${isCol ? padCol : padRow};
        }
        .sc-container[data-btn-count="1"] .sc-btn {
            padding: 10px;
            aspect-ratio: 1 / 1;
        }
        .sc-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.03);
        }
        .sc-btn:active {
            transform: scale(0.98);
            background: rgba(255, 255, 255, 0.2);
        }
        /* Dark mode overrides */
        .theme-dark-ui {
            background: rgba(30, 30, 30, 0.3);
            border: 1px solid transparent;
            box-shadow:
                0 0 0 1px rgba(255, 255, 255, 0.15),
                0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06),
                0 0 10px rgba(0, 0, 0, 0.1);
            color: #fff;
        }
        .theme-dark-ui .sc-btn {
            color: #fff;
        }
        .theme-dark-ui .sc-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        .theme-dark-ui .sc-btn:active {
            background: rgba(255, 255, 255, 0.1);
        }
        /* Dividers */
        .divider {
            background: rgba(255, 255, 255, 0.25);
        }
        .theme-dark-ui .divider {
            background: rgba(255, 255, 255, 0.12);
        }
        .divider-v { width: 1px; height: 1.6em; align-self: center; }
        .divider-h { height: 1px; width: 100%; }
        /* Toast notification */
        .sc-toast {
            position: fixed;
            left: 50%;
            bottom: 20px;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10000;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .sc-toast.show { opacity: 1; }
        /* ===== Glass refraction edges ===== */
        .sc-container {
            position: fixed;
            display: flex;
            backdrop-filter: blur(14px) saturate(180%);
            -webkit-backdrop-filter: blur(14px) saturate(180%);
            background:
                linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.08'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(255,255,255,0.10);
            background-blend-mode: overlay;
            box-shadow:
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 12px rgba(255,255,255,0.15),
                0 8px 30px rgba(0,0,0,0.22);
            transition: box-shadow .25s ease, transform .25s ease, opacity .2s ease;
        }
        .sc-btn:hover {
            background: rgba(255,255,255,0.28);
            transform: scale(1.05);
            box-shadow:
                0 0 6px rgba(255,255,255,0.8),
                0 0 16px rgba(255,255,255,0.6),
                0 0 26px rgba(255,255,255,0.4);
            filter: brightness(1.25);
        }
        .theme-dark-ui {
            background:
                linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.06'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(0,0,0,0.25);
            background-blend-mode: soft-light;
            box-shadow:
                0 0 0 1px rgba(255,255,255,0.18),
                0 0 12px rgba(255,255,255,0.06),
                0 8px 26px rgba(0,0,0,0.32);
        }
        .theme-dark-ui .sc-btn:hover {
            background: rgba(255,255,255,0.12);
            filter: brightness(1.35);
            box-shadow:
                0 0 6px rgba(255,255,255,0.5),
                0 0 22px rgba(255,255,255,0.25),
                0 0 36px rgba(255,255,255,0.15);
        }
        /* ===== Glass refraction edges ===== */
        .theme-light-ui.sc-container {
            background:
                linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.06'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(255,255,255,0.18);
            background-blend-mode: overlay;
            box-shadow:
                inset 2px 2px 3px rgba(0,0,0,0.20),
                inset -2px -2px 3px rgba(0,0,0,0.18),
                0 0 0 1px rgba(255,255,255,0.45),
                0 0 12px rgba(255,255,255,0.25),
                0 8px 30px rgba(0,0,0,0.18);
            --divider-color: rgba(0,0,0,0.18);
        }
        .theme-light-ui .sc-btn:hover {
            background: rgba(255,255,255,0.35);
            filter: brightness(1.3);
            box-shadow:
                0 0 6px rgba(255,255,255,0.9),
                0 0 16px rgba(255,255,255,0.7),
                0 0 26px rgba(255,255,255,0.5);
        }
        .divider {
            background: var(--divider-color, rgba(255,255,255,0.25));
        }
        .theme-dark-ui.sc-container {
            box-shadow:
                inset 2px 2px 3px rgba(255,255,255,0.32),
                inset -2px -2px 3px rgba(255,255,255,0.28),
                0 0 0 1px rgba(255,255,255,0.18),
                0 0 12px rgba(255,255,255,0.06),
                0 8px 26px rgba(0,0,0,0.32);
        }
        /* Icon wrapper: serves as badge positioning anchor, same size as SVG */
        .sc-icon-wrap {
            position: relative;
            display: inline-flex;
            width: 18px;
            height: 18px;
        }
        /* Link count badge: bottom-right aligned, layered on top of icon */
        .sc-badge {
            position: absolute;
            right: 0;
            bottom: 0;
            color: inherit;
            font-size: 10px;
            font-weight: 700;
            line-height: 1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            pointer-events: none;
            filter:
                drop-shadow(0 0 1px rgba(255,255,255,0.98))
                drop-shadow(0 0 2px rgba(255,255,255,0.9))
                drop-shadow(0 0 3px rgba(255,255,255,0.75))
                drop-shadow(0 0 5px rgba(255,255,255,0.55));
        }
        .sc-badge-key {
            font-size: 0;
            right: -1px;
            bottom: -1px;
        }
        .sc-badge-key svg {
            display: block;
            stroke-width: 4;
        }
        .theme-dark-ui .sc-badge {
            filter:
                drop-shadow(0 0 1px rgba(0,0,0,0.98))
                drop-shadow(0 0 2px rgba(0,0,0,0.9))
                drop-shadow(0 0 3px rgba(0,0,0,0.75))
                drop-shadow(0 0 5px rgba(0,0,0,0.55));
        }
    `;
}

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

// Module 10: Unlock Mode / Super Selection

let isUnlockMode = false;
let unlockStyleEl = null;
let startPos = { x: 0, y: 0 };
const modifiedElements = new Set(); // Set of affected elements

// Dynamic CSS: force text selectable, block drag, disable pointer event restrictions, etc.
function getUnlockCSS() {
    return `
        /* --- 1. Global force selectable (separate cursor settings) --- */
        html, body, *:not([data-tm-policy="protected"]), [unselectable] {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
        }

        /* Fix: html/body keep default cursor to avoid global pollution */
        html, body {
            cursor: default !important;
        }

        /* Fix: text cursor only for actual text elements */
        p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, pre, code,
        blockquote, article, section, main, aside, header, footer,
        nav, figcaption, label, time, mark, em, strong, i, b, u,
        s, small, cite, dfn, abbr, data, q, sub, sup, kbd, samp,
        var, output, details, summary, address, dl, dt, dd,
        fieldset, legend, caption, tbody, thead, tfoot, tr,
        button:not([disabled]),
        a:not([data-tm-policy="protected"]) {
            cursor: text !important;
        }

        /* Force highlight color */
        ::selection {background-color: #3390FF !important;color: #ffffff !important;text-shadow: none !important;}
        ::-moz-selection {background-color: #3390FF !important;color: #ffffff !important;text-shadow: none !important;}

        /* Make links look like plain text, block image/link dragging (interferes with text selection) */
        a:not([data-tm-policy="protected"]),
        a *:not([data-tm-policy="protected"]),
        img:not([data-tm-policy="protected"]){
            pointer-events: auto !important;
            user-drag: none !important;
            -webkit-user-drag: none !important;
            text-decoration: none !important;
        }

        /* Disable interaction on common transparent overlays so clicks reach text below */
        div[style*="z-index"][style*="fixed"]:not([data-tm-policy="protected"]),
        div[style*="z-index"][style*="absolute"]:not([data-tm-policy="protected"]) {
            pointer-events: none !important;
        }

        /* Fix: enhance pointer-events restoration logic, cover more container types */
        div:not([data-tm-policy="protected"]),
        article:not([data-tm-policy="protected"]),
        main:not([data-tm-policy="protected"]),
        section:not([data-tm-policy="protected"]),
        aside:not([data-tm-policy="protected"]),
        header:not([data-tm-policy="protected"]),
        footer:not([data-tm-policy="protected"]),
        nav:not([data-tm-policy="protected"]),
        figure:not([data-tm-policy="protected"]),
        figcaption:not([data-tm-policy="protected"]),
        details:not([data-tm-policy="protected"]),
        summary:not([data-tm-policy="protected"]),
        fieldset:not([data-tm-policy="protected"]),
        dialog:not([data-tm-policy="protected"]),
        p:not([data-tm-policy="protected"]),
        span:not([data-tm-policy="protected"]),
        h1:not([data-tm-policy="protected"]), h2:not([data-tm-policy="protected"]),
        h3:not([data-tm-policy="protected"]), h4:not([data-tm-policy="protected"]),
        h5:not([data-tm-policy="protected"]), h6:not([data-tm-policy="protected"]),
        em:not([data-tm-policy="protected"]), strong:not([data-tm-policy="protected"]),
        i:not([data-tm-policy="protected"]), b:not([data-tm-policy="protected"]),
        td:not([data-tm-policy="protected"]), li:not([data-tm-policy="protected"]),
        code:not([data-tm-policy="protected"]), pre:not([data-tm-policy="protected"]) {
            pointer-events: auto !important;
        }

        /* Style for expanded truncated text: hide scrollbar but keep scroll functionality */
        .tm-sc-expanded {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        .tm-sc-expanded::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }

        a.absolute, a[style*="position: absolute"] { pointer-events: none !important; }

        /* Protected marker takes highest priority */
        [data-tm-policy="protected"][data-tm-policy="protected"][data-tm-policy="protected"],
        [data-tm-policy="protected"][data-tm-policy="protected"][data-tm-policy="protected"] * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            pointer-events: none !important;
            cursor: default !important;
            z-index: 2147483647 !important;
        }
    `;
}

// Check if element is protected
function isProtectedElement(target) {
    return target && target.closest && target.closest('[data-tm-policy="protected"]');
}

function handleCaptureSelectStart(e) {
    if (!isUnlockMode) return;
    if (isProtectedElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }
    e.stopPropagation();
    e.stopImmediatePropagation();
}

// Intercept click events: prevent if drag operation or link click
function handleCaptureClick(e) {
    if (!isUnlockMode) return;
    if (isProtectedElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }
    const dx = Math.abs(e.clientX - startPos.x);
    const dy = Math.abs(e.clientY - startPos.y);
    const isDrag = dx > 3 || dy > 3;

    let target = e.target;
    let isLink = false;
    while (target && target !== document) {
        if (target.tagName === 'A') {
            isLink = true;
            break;
        }
        target = target.parentNode;
    }
    if (isDrag || isLink) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}

// Process current element on mousedown as needed
function handleCaptureMouseDown(e) {
    if (!isUnlockMode) return;
    if (isProtectedElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }
    const el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        try {
            if (el.type === 'password') {
                el.dataset.scOriginalType = 'password';
                el.type = 'text';
                modifiedElements.add(el);
            }
            if (el.disabled) {
                el.disabled = false;
                el.dataset.scWasDisabled = 'true';
                modifiedElements.add(el);
            }
            if (el.readOnly) {
                el.readOnly = false;
                el.dataset.scWasReadOnly = 'true';
                modifiedElements.add(el);
            }
        } catch (err) {}
    }
    startPos = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
    e.stopImmediatePropagation();
}

function handleCaptureDragStart(e) {
    if (!isUnlockMode) return;
    e.preventDefault();
    e.stopPropagation();
}

function handleCaptureCopy(e) {
    if (!isUnlockMode) return;
    e.stopImmediatePropagation();
}

function handleCaptureSelectionChange(e) {
    if (!isUnlockMode) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
}

function cleanInlineEvents() {
    const targets = [document.documentElement, document.body];
    const events = ['onselectstart', 'onmousedown', 'oncontextmenu', 'oncopy'];
    targets.forEach(el => {
        if (!el) return;
        events.forEach(evt => {
            if (el.hasAttribute(evt)) {
                el.removeAttribute(evt);
            }
            if (el[evt]) {
                el[evt] = null;
            }
        });
    });
}

// Smart expand truncated text on mouse hover
function handleExpandHover(e) {
    if (!isUnlockMode) return;
    let target = e.target;
    if (target.nodeType !== 1 || target.classList.contains('tm-sc-expanded')) return;

    const style = window.getComputedStyle(target);
    const isEllipsis = style.textOverflow === 'ellipsis';
    const isLineClamp = style.webkitLineClamp && style.webkitLineClamp !== 'none';

    if (isEllipsis || isLineClamp) {
        const rect = target.getBoundingClientRect();
        target.style.setProperty('height', rect.height + 'px', 'important');
        target.style.setProperty('width', rect.width + 'px', 'important');
        target.classList.add('tm-sc-expanded');

        if (isLineClamp) {
            target.style.setProperty('-webkit-line-clamp', 'none', 'important');
            target.style.setProperty('overflow-y', 'auto', 'important');
        } else {
            target.style.setProperty('text-overflow', 'clip', 'important');
            target.style.setProperty('overflow-x', 'auto', 'important');
            target.style.setProperty('white-space', 'nowrap', 'important');
        }
    }
}

// Clean up all expanded elements when exiting mode
function cleanupExpandedElements() {
    const elements = document.querySelectorAll('.tm-sc-expanded');
    elements.forEach(el => {
        el.scrollTop = 0;
        el.scrollLeft = 0;
        el.classList.remove('tm-sc-expanded');
        el.style.removeProperty('height');
        el.style.removeProperty('width');
        el.style.removeProperty('-webkit-line-clamp');
        el.style.removeProperty('overflow-y');
        el.style.removeProperty('overflow-x');
        el.style.removeProperty('text-overflow');
        el.style.removeProperty('white-space');
    });
}

// Toggle unlock mode
function toggleUnlockMode(active) {
    if (active === isUnlockMode) return;
    isUnlockMode = active;

    if (active) {
        if (!unlockStyleEl) {
            unlockStyleEl = document.createElement('style');
            unlockStyleEl.textContent = getUnlockCSS();
            unlockStyleEl.id = 'tm-smart-copy-unlock-style';
        }
        (document.documentElement || document.body).appendChild(unlockStyleEl);
        cleanInlineEvents();

        window.addEventListener('selectstart', handleCaptureSelectStart, true);
        window.addEventListener('click', handleCaptureClick, true);
        window.addEventListener('mousedown', handleCaptureMouseDown, true);
        window.addEventListener('dragstart', handleCaptureDragStart, true);
        window.addEventListener('copy', handleCaptureCopy, true);
        window.addEventListener('contextmenu', handleCaptureCopy, true);
        document.addEventListener('selectionchange', handleCaptureSelectionChange, true);
        document.addEventListener('mouseover', handleExpandHover, true);

        showToast(t('toast_unlock'));
    } else {
        if (unlockStyleEl && unlockStyleEl.parentNode) {
            unlockStyleEl.parentNode.removeChild(unlockStyleEl);
        }

        modifiedElements.forEach(el => {
            try {
                if (el.dataset.scOriginalType === 'password') {
                    el.type = 'password';
                    delete el.dataset.scOriginalType;
                }
                if (el.dataset.scWasDisabled === 'true') { el.disabled = true; delete el.dataset.scWasDisabled; }
                if (el.dataset.scWasReadOnly === 'true') { el.readOnly = true; delete el.dataset.scWasReadOnly; }
            } catch (e) {}
        });
        modifiedElements.clear();

        window.removeEventListener('selectstart', handleCaptureSelectStart, true);
        window.removeEventListener('mousedown', handleCaptureMouseDown, true);
        window.removeEventListener('click', handleCaptureClick, true);
        window.removeEventListener('dragstart', handleCaptureDragStart, true);
        window.removeEventListener('copy', handleCaptureCopy, true);
        window.removeEventListener('contextmenu', handleCaptureCopy, true);
        document.removeEventListener('selectionchange', handleCaptureSelectionChange, true);
        document.removeEventListener('mouseover', handleExpandHover, true);
        cleanupExpandedElements();

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            sel.removeAllRanges();
        }
        const toast = shadowRoot && shadowRoot.querySelector('.sc-toast');
        if (toast) toast.classList.remove('show');
    }
}

// Keyboard listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEditMode) {
        toggleEditMode(false);
        return;
    }
    const hotkey = getConfig('unlockHotkey');
    if (!hotkey) return;
    if (e.code === hotkey || e.key === hotkey) {
        if (!isUnlockMode) toggleUnlockMode(true);
    }
});

document.addEventListener('keyup', (e) => {
    const hotkey = getConfig('unlockHotkey');
    if (!hotkey) return;
    if (e.code === hotkey || e.key === hotkey) {
        if (isUnlockMode) toggleUnlockMode(false);
    }
});

window.addEventListener('blur', () => {
    if (isUnlockMode) toggleUnlockMode(false);
});

// Module 11: Clipboard & Toast

// Three-tier fallback copy strategy
async function copyToClipboard(text, html) {
    try {
        // Prefer ClipboardItem to preserve formatting (unless plain text)
        if (html && typeof ClipboardItem !== 'undefined') {
            const htmlBlob = new Blob([html], { type: 'text/html' });
            const textBlob = new Blob([text], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
            await navigator.clipboard.write(data);
        } else {
            // Fallback to plain text
            await navigator.clipboard.writeText(text);
        }
    } catch (e) {
        // Fallback to privileged GM API GM_setClipboard
        if (typeof GM_setClipboard === 'function') {
            if (text) {
                GM_setClipboard(text, 'text');
            } else {
                GM_setClipboard(html, 'html');
            }
        }
    }
}

// Show toast (inside Shadow DOM)
function showToast(msg) {
    if (!getConfig('enableToast')) return;

    let toast = shadowRoot.querySelector('.sc-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'sc-toast';
        shadowRoot.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 1200);
}

// Module 12: Background Brightness & Theme

// Smart page background brightness detection; returns 'light' or 'dark' to determine UI theme
// Logic: dark page background → return 'light' (light UI); light page background → return 'dark' (dark UI)
function getBestContrastTheme() {
    const getBgColor = (el) => {
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return style.backgroundColor;
    };

    const getBrightness = (colorStr) => {
        if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null;
        const match = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        // Calculate brightness (YIQ formula), range 0~255, lower = darker
        return (r * 299 + g * 587 + b * 114) / 1000;
    };

    // 1. Prefer body background
    let brightness = getBrightness(getBgColor(document.body));

    // 2. If body is transparent, check html (documentElement) background
    if (brightness === null) {
        brightness = getBrightness(getBgColor(document.documentElement));
    }

    // 3. If html is also transparent, fallback to system dark mode preference
    if (brightness === null) {
        const sysIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return sysIsDark ? 'theme-light-ui' : 'theme-dark-ui';
    }

    // 4. Brightness < 128 (dark background) → use 'theme-light-ui' (light buttons)
    return brightness < 128 ? 'theme-light-ui' : 'theme-dark-ui';
}

// Module 13: Button Renderer

// Render buttons (supports Copy/Search mode and Paste mode)
function renderButton(rect, mouseX, mouseY, text, html, mode = 'default', targetInput = null, isEditable = false, pasteCache = null) {
    // Clean up old button
    const oldBtn = shadowRoot.querySelector('.sc-container');
    if (oldBtn) oldBtn.remove();

    const container = document.createElement('div');
    container.className = 'sc-container';

    // Smart background color detection and theme application
    const forceWB = getConfig('forceWhiteBlack');
    if (forceWB) {
        container.classList.add('theme-light-ui');
    } else {
        const contrastTheme = getBestContrastTheme();
        container.classList.add(contrastTheme);
    }

    const isCol = getConfig('buttonStyle') === 'col';

    // Mode: Edit mode
    if (isEditMode) {
        // 1. Delete button
        const delBtn = document.createElement('div');
        delBtn.className = 'sc-btn';
        delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        delBtn.title = t('btn_delete');
        delBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        delBtn.onclick = (e) => {
            e.stopPropagation();
            document.execCommand('delete');
            hideUI();
        };
        container.appendChild(delBtn);

        const div1 = document.createElement('div');
        div1.className = isCol ? 'divider divider-h' : 'divider divider-v';
        container.appendChild(div1);

        // 2. Bold button
        const boldBtn = document.createElement('div');
        boldBtn.className = 'sc-btn';
        boldBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>`;
        boldBtn.title = t('btn_bold');
        boldBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        boldBtn.onclick = (e) => {
            e.stopPropagation();
            document.execCommand('bold');
        };
        container.appendChild(boldBtn);

        const div2 = document.createElement('div');
        div2.className = isCol ? 'divider divider-h' : 'divider divider-v';
        container.appendChild(div2);

        // 3. Highlight button
        const highlightBtn = document.createElement('div');
        highlightBtn.className = 'sc-btn';
        highlightBtn.innerHTML = `<?xml version="1.0" encoding="UTF-8"?><svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 44L6 25H12V17H36V25H42V44H6Z" fill="none" stroke="#000000" stroke-width="4" stroke-linejoin="bevel"/><path d="M17 17V8L31 4V17" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="bevel"/></svg>`;
        highlightBtn.title = t('btn_highlight');
        highlightBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        highlightBtn.onclick = (e) => {
            e.stopPropagation();
            if (!document.execCommand('hiliteColor', false, 'yellow')) {
                document.execCommand('backColor', false, 'yellow');
            }
            hideUI();
        };
        container.appendChild(highlightBtn);
    }
    // Mode A: Default mode
    else if (mode === 'default' || mode === PASTE_MODE_THREE_BTNS) {
        // 1. Copy button
        const copyBtn = document.createElement('div');
        copyBtn.className = 'sc-btn';
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.title = t('btn_copy');
        copyBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            triggerSpringFestivalEffect(e.clientX, e.clientY, shadowRoot);
            const contentToCopy = getConfig('enableCache') ? (cachedSelection.text || text) : text;
            const htmlToCopy = getConfig('enableCache') ? (cachedSelection.html || html) : html;
            await copyToClipboard(contentToCopy, htmlToCopy);
            if (getConfig('enablePaste')) {
                await safeSetValue('smart_paste_cache', {
                    text: contentToCopy,
                    timestamp: Date.now()
                });
                unregisterVisibilityCleanup();
            }
            showToast(getSpringFestivalToastText());
            setTimeout(hideUI, 50);
        };
        container.appendChild(copyBtn);

        const isInInput = targetInput !== null;

        // 2. Cut button (only show in editable fields)
        if (isInInput && !isEditMode) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);

            const cutBtn = document.createElement('div');
            cutBtn.className = 'sc-btn';
            cutBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
            cutBtn.title = t('btn_cut');
            cutBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            cutBtn.onclick = async (e) => {
                e.stopPropagation();
                triggerSpringFestivalEffect(e.clientX, e.clientY, shadowRoot);
                const contentToCopy = getConfig('enableCache') ? (cachedSelection.text || text) : text;
                const htmlToCopy = getConfig('enableCache') ? (cachedSelection.html || html) : html;
                try {
                    const success = document.execCommand('cut');
                    if (!success) throw new Error('execCommand failed');
                } catch (err) {
                    await copyToClipboard(contentToCopy, htmlToCopy);
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        selection.getRangeAt(0).deleteContents();
                    }
                }
                if (getConfig('enablePaste')) {
                    await safeSetValue('smart_paste_cache', {
                        text: contentToCopy,
                        timestamp: Date.now()
                    });
                    unregisterVisibilityCleanup();
                }
                setTimeout(hideUI, 35);
            };
            container.appendChild(cutBtn);
        }

        // Delete button (inside input fields)
        if (getConfig('enableDeleteBtn') && isInInput) {
            const div2 = document.createElement('div');
            div2.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div2);

            const delBtn = document.createElement('div');
            delBtn.className = 'sc-btn';
            delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
            delBtn.title = t('btn_delete');
            delBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            delBtn.onclick = (e) => {
                e.stopPropagation();
                document.execCommand('delete');
                hideUI();
            };
            container.appendChild(delBtn);
        }
        // Search button (only show outside input fields with short texts)
        else if (!isInInput && !isEditMode && text.trim().length <= 32) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);

            const searchBtn = document.createElement('div');
            searchBtn.className = 'sc-btn';
            searchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
            searchBtn.title = t('btn_search');
            searchBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            searchBtn.onclick = (e) => {
                e.stopPropagation();
                const query = getConfig('enableCache') ? (cachedSelection.text || text) : text;
                const rawText = getConfig('enableCache') ? (cachedSelection.text || text) : text;
                let engine;
                if (getConfig('smartEngine') && !/[\u4e00-\u9fa5]/.test(rawText)) {
                    engine = getConfig('fallbackEngine');
                } else {
                    engine = getConfig('searchEngine');
                }
                let url = SEARCH_ENGINES[engine] ? SEARCH_ENGINES[engine].url : (engine.includes('%s') ? engine : SEARCH_ENGINES['google'].url);
                safeOpenTab(url.replace('%s', encodeURIComponent(query.trim())), { active: true });
                setTimeout(hideUI, 50);
            };
            container.appendChild(searchBtn);
        }

        // @ button / chain button logic
        const activeEl = document.activeElement;
        const isUserEditing = activeEl && (
            (['INPUT', 'TEXTAREA'].includes(activeEl.tagName) && !activeEl.readOnly) ||
            activeEl.isContentEditable ||
            document.designMode === 'on'
        );
        if (!isUserEditing && !targetInput && mode !== PASTE_MODE_THREE_BTNS) {
            // 1. Check email first (higher priority than links)
            const emailAddr = extractEmailFromText(text);
            if (emailAddr) {
                const div = document.createElement('div');
                div.className = isCol ? 'divider divider-h' : 'divider divider-v';
                container.appendChild(div);

                const atBtn = document.createElement('div');
                atBtn.className = 'sc-btn';
                atBtn.innerHTML = `<svg viewBox="0 0 48 48" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44V44C28.9886 44 33.5507 42.1735 37.0539 39.1529" stroke="currentColor" stroke-width="3" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M24 32C28.4183 32 32 28.4183 32 24C32 19.5817 28.4183 16 24 16C19.5817 16 16 19.5817 16 24C16 28.4183 19.5817 32 24 32Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"/><path d="M32 24C32 27.3137 34.6863 30 38 30V30C41.3137 30 44 27.3137 44 24" stroke="currentColor" stroke-width="3" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M32 25V16" stroke="currentColor" stroke-width="3" stroke-linecap="butt" stroke-linejoin="miter"/></svg>`;
                atBtn.title = t('btn_email');
                atBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                atBtn.onclick = async (e) => {
                    e.stopPropagation();
                    // Copy full email to clipboard
                    try {
                        await navigator.clipboard.writeText(emailAddr);
                    } catch (_) {
                        if (typeof GM_setClipboard === 'function') {
                            GM_setClipboard(emailAddr, 'text');
                        }
                    }
                    showToast(t('toast_email_copied'));
                    hideUI();
                };
                container.appendChild(atBtn);
            } else {
                // 2. Detect URLs (supports multiple links)
                // Chinese mode enables cloud drive extraction code; non-Chinese mode extracts plain URLs only
                const curLangForLink = getConfig('language');
                const isChineseForLink = curLangForLink === 'zh-CN' || (curLangForLink === 'auto' && navigator.language.startsWith('zh'));
                const linkData = isChineseForLink ? extractLinkAndCode(text) : (() => {
                    const urls = extractUrlsFromText(text);
                    return urls.length > 0 ? { urls, password: null } : null;
                })();
                if (linkData && linkData.urls && linkData.urls.length > 0) {
                    const div = document.createElement('div');
                    div.className = isCol ? 'divider divider-h' : 'divider divider-v';
                    container.appendChild(div);

                    const urlCount = linkData.urls.length;
                    const chainBtn = document.createElement('div');
                    chainBtn.className = 'sc-btn';

                    // Icon wrapper (18x18, serves as badge positioning anchor)
                    const iconWrap = document.createElement('span');
                    iconWrap.className = 'sc-icon-wrap';
                    iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
                    chainBtn.appendChild(iconWrap);

                    // Badge: single link + extraction code → key icon; multiple links → number badge
                    const isSingleLink = urlCount === 1;
                    if (isChineseForLink && isSingleLink && linkData.password) {
                        const badge = document.createElement('span');
                        badge.className = 'sc-badge sc-badge-key';
                        badge.innerHTML = `<svg viewBox="0 0 48 48" width="10" height="10" stroke="currentColor" fill="none"><path d="M22.8682 24.2982C25.4105 26.7935 26.4138 30.4526 25.4971 33.8863C24.5805 37.32 21.8844 40.0019 18.4325 40.9137C14.9806 41.8256 11.3022 40.8276 8.79375 38.2986C5.02208 34.4141 5.07602 28.2394 8.91499 24.4206C12.754 20.6019 18.9613 20.5482 22.8664 24.3L22.8682 24.2982Z"/><path d="M23 24L40 7"/><path d="M30.3052 16.9001L35.7337 22.3001L42.0671 16.0001L36.6385 10.6001L30.3052 16.9001Z"/></svg>`;
                        iconWrap.appendChild(badge);
                    } else if (urlCount > 1) {
                        const badge = document.createElement('span');
                        badge.className = 'sc-badge';
                        badge.textContent = urlCount;
                        iconWrap.appendChild(badge);
                    }

                    const titlePrefix = urlCount > 1 ? ('(' + urlCount + ') ') : '';
                    chainBtn.title = titlePrefix + t('btn_open_link');
                    chainBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                    chainBtn.onclick = async (e) => {
                        e.stopPropagation();
                        // Single link + Chinese mode: write extraction code to lightning paste cache
                        if (isSingleLink && isChineseForLink && getConfig('enablePaste') && linkData.password) {
                            await safeSetValue('smart_paste_cache', {
                                text: linkData.password,
                                timestamp: Date.now() + 22000,
                                type: 'pan_code'
                            });
                            unregisterVisibilityCleanup();
                            if (getConfig('enableToast')) {
                                showToast(t('toast_password_pasted'));
                            }
                        }
                        // Batch open links (200ms interval to avoid popup blocking)
                        linkData.urls.forEach((u, i) => {
                            setTimeout(() => {
                                safeOpenTab(u.url, { active: i === 0 });
                            }, i * 200);
                        });
                        hideUI();
                    };
                    container.appendChild(chainBtn);
                }
            }
        }

        // Check if "correct" button should be shown
        const curLang = getConfig('language');
        const isChineseEnv = curLang === 'zh-CN' || (curLang === 'auto' && navigator.language.startsWith('zh'));
        if (isChineseEnv && targetInput) {
            const isInputType = targetInput.tagName === 'INPUT';
            if (smartCorrectText(text, isInputType) !== null) {
                const div = document.createElement('div');
                div.className = isCol ? 'divider divider-h' : 'divider divider-v';
                container.appendChild(div);

                const correctBtn = document.createElement('div');
                correctBtn.className = 'sc-btn';
                correctBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>`;
                correctBtn.title = "Correct";
                correctBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                correctBtn.onclick = (e) => {
                    e.stopPropagation();
                    handleTextCorrection(targetInput, text);
                };
                container.appendChild(correctBtn);
            }
        }

        // 3. Append paste button in three-button lightning paste mode
        if (mode === PASTE_MODE_THREE_BTNS) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);
            const pasteBtn = document.createElement('div');
            pasteBtn.className = 'sc-btn';
            pasteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
            pasteBtn.title = t('btn_paste');
            pasteBtn.onmousedown = e => { e.preventDefault(); e.stopPropagation(); };
            pasteBtn.onclick = async (e) => {
                e.stopPropagation();
                const cache = await safeGetValue('smart_paste_cache', null);
                if (cache && cache.text) {
                    performPaste(document.activeElement, cache.text);
                    // Reset timestamp after paste to allow repeated use on same page
                    await safeSetValue('smart_paste_cache', {
                        text: cache.text,
                        timestamp: Date.now()
                    });
                    registerVisibilityCleanup();
                }
                hideUI();
            };
            container.appendChild(pasteBtn);
        }
    }
    // Mode B: Paste mode (lightning paste / cloud drive extraction code)
    else if (mode === 'paste') {
        const isPanCode = pasteCache && pasteCache.type === 'pan_code';
        const pasteBtn = document.createElement('div');
        pasteBtn.className = 'sc-btn';
        if (isPanCode) {
            // Key icon (for cloud drive extraction code)
            pasteBtn.innerHTML = '<svg viewBox="0 0 48 48" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none"><path d="M22.8682 24.2982C25.4105 26.7935 26.4138 30.4526 25.4971 33.8863C24.5805 37.32 21.8844 40.0019 18.4325 40.9137C14.9806 41.8256 11.3022 40.8276 8.79375 38.2986C5.02208 34.4141 5.07602 28.2394 8.91499 24.4206C12.754 20.6019 18.9613 20.5482 22.8664 24.3L22.8682 24.2982Z"/><path d="M23 24L40 7"/><path d="M30.3052 16.9001L35.7337 22.3001L42.0671 16.0001L36.6385 10.6001L30.3052 16.9001Z"/></svg>';
            pasteBtn.title = t('btn_paste') + ' ' + (pasteCache.text || '');
        } else {
            pasteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
            pasteBtn.title = t('btn_paste');
        }
        pasteBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        pasteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (isPanCode) {
                performPaste(targetInput || document.activeElement, pasteCache.text);
                showToast(t('toast_password_pasted'));
                await safeSetValue('smart_paste_cache', { text: '', timestamp: 0 });
                unregisterVisibilityCleanup();
                hideUI();
                return;
            }
            performPaste(targetInput, text);
            // Reset timestamp after paste to allow repeated use on same page
            // Note: caching target input content here, not clipboard content; reset only in direct paste mode
            const existingCache = await safeGetValue('smart_paste_cache', null);
            if (existingCache && existingCache.text) {
                await safeSetValue('smart_paste_cache', {
                    text: existingCache.text,
                    timestamp: Date.now()
                });
                registerVisibilityCleanup();
            }
            hideUI();
        };
        container.appendChild(pasteBtn);
    }

    const btnCount = container.children.length;
    container.setAttribute('data-btn-count', btnCount);

    shadowRoot.appendChild(container);

    // Calculate position (common logic)
    container.style.left = '-9999px';

    requestAnimationFrame(() => {
        const btnRect = container.getBoundingClientRect();
        const btnW = btnRect.width;
        const btnH = btnRect.height;
        const offset = getConfig('offset');
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        let targetX, targetY;

        if (rect) {
            const isBackward = rect.isBackward || false;
            const isVertical = rect.isVertical || false;
            if (isVertical) {
                if (isBackward) {
                    targetX = rect.right + offset;
                    targetY = rect.top;
                } else {
                    targetX = rect.left - btnW - offset;
                    targetY = rect.bottom - btnH;
                }
            } else {
                if (isBackward) {
                    targetX = rect.left - (btnW / 2);
                    targetY = rect.top - btnH - offset;
                } else {
                    targetX = rect.right - (btnW / 2);
                    const spaceBelow = viewportH - rect.bottom;
                    if (spaceBelow < (btnH + offset + 20)) {
                        targetY = rect.top - btnH - offset;
                    } else {
                        targetY = rect.bottom + offset;
                    }
                }
            }
        } else {
            if (mouseY > viewportH / 2) {
                targetY = mouseY - btnH - offset;
            } else {
                targetY = mouseY + offset;
            }
            if (mouseX > viewportW / 2) {
                targetX = mouseX - btnW - offset;
            } else {
                targetX = mouseX + offset;
            }
        }

        // Edge detection
        const margin = 10;
        targetX = Math.max(margin, Math.min(targetX, viewportW - btnW - margin));
        targetY = Math.max(margin, Math.min(targetY, viewportH - btnH - margin));

        container.style.left = `${targetX}px`;
        container.style.top = `${targetY}px`;
        container.classList.add('visible');

        const timeout = getConfig('timeout');
        if (timeout > 0) {
            if (uiTimer) clearTimeout(uiTimer);
            uiTimer = setTimeout(hideUI, timeout);
        }
    });
}

function hideUI() {
    const btn = shadowRoot && shadowRoot.querySelector('.sc-container');
    if (btn) {
        btn.classList.remove('visible');
        setTimeout(() => {
            if (btn && btn.parentNode) btn.remove();
        }, 200);
    }
    cachedSelection = { text: '', html: '' };
}

// Module 14: Event Handlers

function handleSelectionMouseUp(e) {
    if (hostElement && e.composedPath().includes(hostElement)) return;
    if (!hostElement) initContainer();
    if (isScrolling) return;
    setTimeout(async () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            hideUI();
            return;
        }
        const text = selection.toString();
        if (!text || text.trim().length === 0) {
            hideUI();
            return;
        }
        const range = selection.getRangeAt(0);
        if (getConfig('enableCache')) {
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            cachedSelection = {
                text: text,
                html: container.innerHTML
            };
        }
        let rect = null;
        if (getConfig('positionMode') === 'endchar') {
            const smartState = getSmartSelectionState(selection, e);
            if (smartState) {
                rect = smartState.rect;
                if (rect) {
                    rect.isBackward = smartState.isBackward;
                    rect.isVertical = smartState.isVertical;
                }
            }
        }

        initContainer();
        let cache = null;
        if (getConfig('enablePaste')) {
            cache = await safeGetValue('smart_paste_cache', null);
        }
        const curLang = getConfig('language');
        const isChineseEnv = curLang === 'zh-CN' || (curLang === 'auto' && navigator.language.startsWith('zh'));
        const cacheValid = cache && cache.text && (Date.now() - cache.timestamp < 8000) && !(isChineseEnv && cache.type === 'pan_code');
        const target = document.activeElement;
        const isInput = target && (
            (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly) ||
            target.isContentEditable
        );
        const mode = (cacheValid && isInput) ? PASTE_MODE_THREE_BTNS : 'default';
        renderButton(rect, e.clientX, e.clientY, text, cachedSelection.html || '', mode, isInput ? target : null, isInput, cache);
    }, 10);
}

function handleGlobalMouseDown(e) {
    if (hostElement && e.composedPath().includes(hostElement)) {
        // Clicked inside button, keep it
    } else {
        const btn = shadowRoot && shadowRoot.querySelector('.sc-container');
        if (btn) btn.classList.remove('visible');
    }
}

// Scroll and resize handler
const handleResizeOrScroll = () => {
    if (!hostElement) return;
    const mode = getConfig('scrollRepaintMode');
    const btn = shadowRoot.querySelector('.sc-container');
    if (!btn) return;

    if (mode === SCROLL_REPAINT_MODE.HIDE) {
        hideUI();
        return;
    }

    if (mode === SCROLL_REPAINT_MODE.VIEWPORT) {
        const selection = window.getSelection();
        if (!selection.rangeCount) { hideUI(); return; }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;
        if (!inViewport) { hideUI(); return; }
    }

    btn.classList.remove('visible');
    isScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[rects.length - 1];
                renderButton(rect, rect.right, rect.top,
                    selection.toString(),
                    getConfig('enableCache') ? cachedSelection.html : '');
            }
        }
    }, 300);
};

function handleContextMenu(e) {
    hideUI();
    if (getConfig('enablePaste')) {
        safeSetValue('smart_paste_cache', { text: '', timestamp: 0 });
        unregisterVisibilityCleanup();
    }
}

function handleKeydownHideUI(e) {
    if (isUnlockMode) return;
    hideUI();
}

// Input paste mouseup handler
function handleInputPasteMouseUp(e) {
    if (!getConfig('enablePaste')) return;
    const target = e.target;
    const isInput = (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.disabled && !target.readOnly) || target.isContentEditable;
    if (!isInput) return;
    setTimeout(async () => {
        // Read lightning paste cache
        const cache = await safeGetValue('smart_paste_cache', null);
        if (!cache || !cache.text) return;
        if (Date.now() - cache.timestamp > 8000) return;

        // Cloud drive extraction code cache (Chinese mode only): force single paste button (key icon)
        const curLang = getConfig('language');
        const isChineseEnv = curLang === 'zh-CN' || (curLang === 'auto' && navigator.language.startsWith('zh'));
        if (isChineseEnv && cache.type === 'pan_code') {
            initContainer();
            const rect = target.getBoundingClientRect();
            renderButton(rect, e.clientX, e.clientY, cache.text, '', 'paste', target, false, cache);
            return;
        }

        // Regular lightning paste: check selection within input
        let selectedText = '';
        let hasSelection = false;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            if (typeof start === 'number' && typeof end === 'number' && start !== end) {
                selectedText = target.value.substring(start, end);
                hasSelection = true;
            }
        } else if (target.isContentEditable) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                selectedText = sel.toString();
                hasSelection = true;
            }
        }

        const isReplaceIntent = selectedText === ' ' || selectedText === '，';
        const mode = (hasSelection && !isReplaceIntent) ? PASTE_MODE_THREE_BTNS : 'paste';
        const textArg = (mode === 'paste') ? cache.text : selectedText;

        let rect = null;
        if (target.isContentEditable && hasSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rects = range.getClientRects();
                if (rects.length > 0) {
                    rect = rects[rects.length - 1];
                }
            }
        }
        if (!hostElement) initContainer();
        renderButton(rect, e.clientX, e.clientY, textArg, '', mode, target, false, cache);
    }, 20);
}

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

// Module 17: Festival Particle Effects

// Chinese New Year / Christmas easter egg logic
function getFestivalType() {
    const now = new Date();
    // 1. Try to detect lunar calendar (Chinese Lunar)
    try {
        const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" });
        if (formatter.resolvedOptions().calendar === 'chinese') {
            const parts = formatter.formatToParts(now);
            const monthPart = parts.find(p => p.type === 'month').value;
            const dayPart = parts.find(p => p.type === 'day').value;

            const isLunarJan = monthPart.includes('正') || monthPart.replace(/[^\d]/g, '') === '1';
            const day = parseInt(dayPart.replace(/[^\d]/g, ''));

            if (isLunarJan && day === 1) return 'CNY';
            return 'NONE';
        }
    } catch (e) {}

    // 2. Fallback logic: December 25th Christmas
    if (now.getMonth() === 11 && now.getDate() === 25) {
        return 'XMAS';
    }

    return 'NONE';
}

// Trigger fireworks effect
function triggerSpringFestivalEffect(x, y, shadowRoot) {
    const festival = getFestivalType();
    if (festival === 'NONE') return;

    let colors = [];
    if (festival === 'CNY') {
        colors = ['#FF0000', '#FFD700', '#FF4500', '#DC143C', '#FFFF00'];
    } else if (festival === 'XMAS') {
        colors = ['#FF0000', '#228B22', '#FFD700', '#FFFFFF', '#006400'];
    }

    const activeColors = [];
    for (let i = 0; i < 3; i++) {
        activeColors.push(colors[Math.floor(Math.random() * colors.length)]);
    }

    const particleCount = 20 + Math.floor(Math.random() * 21);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        const size = 4 + Math.random() * 3;
        const color = activeColors[Math.floor(Math.random() * activeColors.length)];

        p.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483647;
            box-shadow: 0 0 6px ${color};
            will-change: transform, opacity;
        `;

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let opacity = 1.0;
        const gravity = 0.2 + Math.random() * 0.1;
        const friction = 0.96;
        const decay = 0.01 + Math.random() * 0.02;

        let posX = x;
        let posY = y;

        const animate = () => {
            if (opacity <= 0) {
                p.remove();
                return;
            }
            vx *= friction;
            vy *= friction;
            vy += gravity;
            posX += vx;
            posY += vy;
            opacity -= decay;

            p.style.transform = `translate(${posX - x}px, ${posY - y}px)`;
            p.style.opacity = opacity;
            requestAnimationFrame(animate);
        };

        fragment.appendChild(p);
        requestAnimationFrame(animate);
    }
    shadowRoot.appendChild(fragment);
}

// Get toast copy text
function getSpringFestivalToastText() {
    const festival = getFestivalType();
    if (festival === 'CNY') {
        return t('festival_cny');
    } else if (festival === 'XMAS') {
        return t('festival_xmas');
    }
    return t('toast_copied');
}

// Module 19: Bootstrap

// Lightning paste conditional visibilitychange cleanup (dynamic register/unregister)
// Unregister listener when copy/cut writes cache, register when paste resets timestamp
// On page hidden: overwrite with expired cache (never actively delete, one-way overwrite only)
// Note: these two functions must be defined in global scope because onclick callbacks in renderButton need to access them
let _visibilityChangeHandler = null;

function registerVisibilityCleanup() {
    if (_visibilityChangeHandler) return;
    _visibilityChangeHandler = async () => {
        if (document.visibilityState === 'hidden') {
            if (getConfig('enablePaste')) {
                await safeSetValue('smart_paste_cache', { text: '', timestamp: 0 });
            }
            unregisterVisibilityCleanup();
        }
    };
    document.addEventListener('visibilitychange', _visibilityChangeHandler, false);
}

function unregisterVisibilityCleanup() {
    if (_visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', _visibilityChangeHandler, false);
        _visibilityChangeHandler = null;
    }
}

(function () {
    'use strict';

    (async function main() {
        try {
            // 1. Wait for config to load
            await initConfiguration();

            // Auto-set default search engine based on timezone on first run
            await initDefaultSearchEngine();

            // 2. Register menus after config is loaded (so getConfig in menus reads correct values)
            registerMenus();

            // 3. Apply blocking rules
            applySavedBlockingRules();

            // 4. In unlock mode, smart intercept Ctrl+scroll
            const handleWheelZoom = (e) => {
                if (!e.ctrlKey || !isUnlockMode) return;

                const hotkey = getConfig('unlockHotkey') || '';
                const isCtrlConfigured = hotkey.includes('Control') || hotkey.toLowerCase() === 'ctrl';

                if (isCtrlConfigured) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.scrollBy({
                        top: e.deltaY,
                        behavior: 'auto'
                    });
                }
            };
            window.addEventListener('wheel', handleWheelZoom, { passive: false, capture: true });

            // 5. Register all event listeners
            document.addEventListener('mouseup', handleSelectionMouseUp, false);
            document.addEventListener('mouseup', handleInputPasteMouseUp, true);
            document.addEventListener('mousedown', handleGlobalMouseDown, false);
            document.addEventListener('contextmenu', handleContextMenu, true);
            window.addEventListener('scroll', handleResizeOrScroll, { passive: true });
            window.addEventListener('resize', handleResizeOrScroll, { passive: true });
            document.addEventListener('keydown', handleKeydownHideUI, true);

            // 6. Drag preview event listeners (main window only)
            if (window.name !== PREVIEW_WIN_NAME) {
                document.addEventListener('dragstart', handleLinkDragStart, false);
                document.addEventListener('dragend', handleLinkDragEnd, false);
            }

        } catch (e) {
            //console.error('Smart Copy startup failed:', e);
        }
    })();
})();
