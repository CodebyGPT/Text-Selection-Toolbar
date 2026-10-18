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
