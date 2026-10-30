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

// Host-facing readiness: userscript menus are registered only after the
// toolbar has loaded its configuration, so menu actions never see an empty
// configCache.
let resolveToolbarReady = null;
const toolbarReady = new Promise((resolve) => {
    resolveToolbarReady = resolve;
});

function markToolbarReady() {
    if (!resolveToolbarReady) return;
    resolveToolbarReady();
    resolveToolbarReady = null;
}

(function () {
    'use strict';

    (async function main() {
        try {
            // 1. Wait for config to load
            await initConfiguration();

            // Auto-set default search engine based on timezone on first run
            await initDefaultSearchEngine();
            markToolbarReady();

            // IDN homograph guard: check now and on browser navigation events.
            initIdnGuard();

            // 2. Apply blocking rules (userscript menu commands are registered
            //    by the host from the user-defined menu order).
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
            // Capture phase: shadow-DOM hosts and page widgets may stop mouseup
            // from bubbling, which used to suppress the toolbar entirely.
            // A toolbar is bound to one press: the press starts unarmed, a
            // native selection change arms it, and the release consumes the arm.
            window.addEventListener('mousedown', handleSelectionPressStart, true);
            window.addEventListener('mouseup', handleSelectionMouseUp, true);
            // `selectstart` marks a selection actually starting; `selectionchange`
            // and `select` additionally cover engines and controls where it is
            // not dispatched. Only a non-empty selection arms through those.
            window.addEventListener('selectstart', armOnSelectStart, true);
            document.addEventListener('selectionchange', armSelectionGesture, true);
            document.addEventListener('select', armSelectionGesture, true);
            // Cursor-distance fade is mouse-driven; no polling.
            window.addEventListener('mousemove', handleToolbarMouseMove, { passive: true, capture: true });
            document.addEventListener('contextmenu', handleContextMenu, true);
            window.addEventListener('scroll', handleResizeOrScroll, { passive: true });
            window.addEventListener('resize', handleResizeOrScroll, { passive: true });
            document.addEventListener('keydown', handleKeydownHideUI, true);
            // Capture copies made outside the toolbar; registered before unlock
            // mode's stopImmediatePropagation listener so it always sees them.
            window.addEventListener('copy', handleExternalCopy, true);
            // Runs after page copy handlers so it sees the final clipboardData
            // rather than the pre-copy selection text.
            window.addEventListener('copy', handleExternalCopyFinal, false);
            // Safe copy is a read-only warning. Bubble phase puts it after the
            // page's own document/body copy handlers; it never prevents or
            // rewrites anything, so the page's copy behavior is untouched.
            window.addEventListener('copy', handleSafeCopyCheck, false);
            // "Copy link address" never reaches the page, so check the link at
            // the right-click itself. Capture phase beats page handlers.
            window.addEventListener('contextmenu', handleSafeCopyContextMenu, true);
            // Dragging a link copies its URL too; that path is toast-only.
            window.addEventListener('dragstart', handleSafeCopyDragStart, true);
            // Opt-in: a translucent cover sits over mismatched links so a click
            // lands on the cover instead of the page (no click rewrites). The
            // viewport is re-checked on scroll/resize and on SPA navigation
            // signals, never on a timer.
            window.addEventListener('pointerover', handleLinkGuardPointerOver, true);
            window.addEventListener('scroll', scheduleLinkGuardScan, { passive: true, capture: true });
            window.addEventListener('resize', scheduleLinkGuardScan, { passive: true });
            // The script starts at document-start, before most links exist, so
            // scan once the DOM is ready and again when the page is resumed.
            const onLinkGuardReady = () => scheduleLinkGuardScan();
            document.addEventListener('DOMContentLoaded', onLinkGuardReady, { once: true });
            window.addEventListener('load', onLinkGuardReady, { once: true });
            window.addEventListener('pageshow', onLinkGuardReady);
            window.addEventListener('focus', scheduleLinkGuardScan);
            window.addEventListener('popstate', scheduleLinkGuardNavigationRecheck);
            window.addEventListener('hashchange', scheduleLinkGuardNavigationRecheck);
            // Chrome's Navigation API covers pushState/replaceState. A trusted
            // click stays as a fallback for engines (or sandboxes) where that
            // event is unavailable; the re-check is bounded either way.
            const navigationApi = typeof window !== 'undefined' ? window.navigation : null;
            if (navigationApi && typeof navigationApi.addEventListener === 'function') {
                navigationApi.addEventListener('currententrychange', scheduleLinkGuardNavigationRecheck);
            }
            window.addEventListener('click', handleLinkGuardNavigationClick, true);
            try {
                refreshLinkGuards();
            } catch (e) {
                // A broken scan must never take the rest of the toolbar down.
            }

            // Copy button for <pre><code> blocks follows the hover target.
            document.addEventListener('mouseover', handleCodeCopyHover, true);
            window.addEventListener('scroll', hideCodeCopyButton, { passive: true, capture: true });
            window.addEventListener('resize', hideCodeCopyButton, { passive: true });
            window.addEventListener('blur', hideCodeCopyButton);

            // 6. Drag preview event listeners (main window only)
            if (window.name !== PREVIEW_WIN_NAME) {
                document.addEventListener('dragstart', handleLinkDragStart, false);
                document.addEventListener('dragend', handleLinkDragEnd, false);
            }

        } catch (e) {
            markToolbarReady();
            //console.error('Smart Copy startup failed:', e);
        }
    })();
})();
