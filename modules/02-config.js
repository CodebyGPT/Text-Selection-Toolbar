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
