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
