// Module 13: Button Renderer

const LINK_MENU_MAX = 12;
const LINK_DISPLAY_MAX = 42;

// Keep a multi-link menu readable without changing the real URL that opens.
function truncateLinkDisplay(text) {
    const chars = Array.from(text);
    return chars.length > LINK_DISPLAY_MAX
        ? chars.slice(0, LINK_DISPLAY_MAX - 1).join('') + '…'
        : text;
}

// Hide the protocol for display and split the host from the rest so only the
// domain is rendered in bold.
function parseLinkDisplay(display) {
    const withoutProto = String(display || '').replace(/^https?:\/\//i, '');
    const clipped = truncateLinkDisplay(withoutProto);
    const hostEnd = clipped.search(/[/?#]/);
    return {
        domain: hostEnd === -1 ? clipped : clipped.slice(0, hostEnd),
        rest: hostEnd === -1 ? '' : clipped.slice(hostEnd)
    };
}

// Resolve an <a href> into the same shape as a text-derived link.
function resolveHrefLink(href, anchorText = '') {
    const raw = String(href || '').trim();
    if (!raw || raw.startsWith('#')) return null;
    try {
        const resolved = new URL(raw, document.baseURI);
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
        const urls = extractUrlsFromText(resolved.href);
        return urls.length > 0
            ? {
                ...urls[0],
                fromHref: true,
                hrefText: String(anchorText || '').replace(/\s+/g, ' ').trim()
            }
            : null;
    } catch (e) {
        return null;
    }
}

// Collect anchors intersecting the current selection. cloneContents catches
// fully selected anchors; closest() catches anchors that only contain the
// selection start/end and would otherwise be trimmed away.
function collectHrefLinks() {
    if (!getConfig('enableHiddenLinks')) return [];
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);
    const anchors = new Map();
    const addAnchor = (anchor) => {
        if (!anchor || !anchor.getAttribute) return;
        const href = anchor.getAttribute('href');
        if (!href) return;
        if (!anchors.has(href)) {
            anchors.set(href, String(anchor.textContent || '').replace(/\s+/g, ' ').trim());
        }
    };

    try {
        range.cloneContents().querySelectorAll('a[href]').forEach(addAnchor);
    } catch (e) {}
    [range.startContainer, range.endContainer].forEach((node) => {
        const el = node && (node.nodeType === 1 ? node : node.parentElement);
        if (el && el.closest) addAnchor(el.closest('a[href]'));
    });

    const seen = new Set();
    const links = [];
    anchors.forEach((text, href) => {
        const link = resolveHrefLink(href, text);
        if (link && !seen.has(link.url)) {
            seen.add(link.url);
            links.push(link);
        }
    });
    return links;
}

function mergeHiddenLinks(linkData, hiddenLinks) {
    const urls = linkData && Array.isArray(linkData.urls) ? linkData.urls.slice() : [];
    const seen = new Set(urls.map((url) => url.url));
    hiddenLinks.forEach((link) => {
        if (!link || seen.has(link.url)) return;
        seen.add(link.url);
        urls.push(link);
    });
    if (urls.length === 0) return null;
    return {
        urls,
        password: linkData ? linkData.password : null
    };
}

async function copySingleLink(url) {
    if (await copyToClipboard(url, '')) {
        showToast(t('toast_link_copied'));
    }
}

function formatAllLinks(urls) {
    return urls.map((url) => {
        if (url.fromHref && url.hrefText) {
            return `（${url.hrefText}）${url.url}`;
        }
        return url.url;
    }).join('\n');
}

async function copyAllLinks(urls) {
    const text = formatAllLinks(urls);
    if (await copyToClipboard(text, '')) {
        showToast(t('toast_all_links_copied'));
    }
}

// Long-press copy without affecting the normal click action.
function bindLongPress(btn, onLongPress, duration = 1000) {
    let timer = null;
    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    btn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        btn.__longPressTriggered = false;
        if (uiTimer) {
            clearTimeout(uiTimer);
            uiTimer = null;
        }
        cancel();
        timer = setTimeout(() => {
            timer = null;
            btn.__longPressTriggered = true;
            onLongPress();
        }, duration);
    });
    btn.addEventListener('mouseup', cancel);
    btn.addEventListener('mouseleave', cancel);
    btn.addEventListener('blur', cancel);
}

// Secondary menu for 2-12 links. It always uses the vertical rounded list
// look, even when the toolbar itself is the horizontal capsule.
function showLinkMenu(urls, anchorRect) {
    if (uiTimer) {
        clearTimeout(uiTimer);
        uiTimer = null;
    }
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
        isScrolling = false;
    }

    shadowRoot.querySelectorAll('.sc-container').forEach((old) => old.remove());

    const menu = document.createElement('div');
    menu.className = 'sc-container sc-link-menu';
    if (getConfig('forceWhiteBlack')) {
        menu.classList.add('theme-light-ui');
    } else {
        menu.classList.add(getBestContrastTheme());
    }

    urls.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'sc-link-item';
        item.title = url.url;

        const number = document.createElement('span');
        number.className = 'sc-link-index';
        number.textContent = String(index + 1);
        item.appendChild(number);

        const label = document.createElement('span');
        label.className = 'sc-link-url';
        if (url.fromHref) label.classList.add('sc-link-from-href');
        const { domain, rest } = parseLinkDisplay(url.display || url.url);

        const domainEl = document.createElement('strong');
        domainEl.textContent = domain;
        label.appendChild(domainEl);
        if (rest) label.appendChild(document.createTextNode(rest));
        item.appendChild(label);

        item.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        item.onclick = (e) => {
            if (item.__longPressTriggered) {
                item.__longPressTriggered = false;
                return;
            }
            e.stopPropagation();
            safeOpenTab(url.url, { active: true });
            // Keep the menu open so the user can open more links; the normal
            // timeout starts only after the first item click.
            startLinkMenuTimeout();
        };
        bindLongPress(item, () => copySingleLink(url.url));
        menu.appendChild(item);
    });

    shadowRoot.appendChild(menu);
    menu.style.left = '-9999px';

    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        const offset = getConfig('offset');
        let left = anchorRect.left;
        let top = anchorRect.bottom + offset;
        if (top + rect.height > window.innerHeight - 10) {
            top = anchorRect.top - rect.height - offset;
        }
        left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 10));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.add('visible');
    });
}

function startLinkMenuTimeout() {
    if (uiTimer) clearTimeout(uiTimer);
    const timeout = getConfig('timeout');
    if (timeout > 0) {
        uiTimer = setTimeout(hideUI, timeout);
    }
}

function getSearchEngineUrl(engine, query) {
    const template = String(engine.url || '').includes('%s')
        ? engine.url
        : SEARCH_ENGINES.google.url;
    return template.replace('%s', encodeURIComponent(query.trim()));
}

function closeSearchEngineMenu(resetTimer = true) {
    const menu = shadowRoot && shadowRoot.querySelector('.sc-search-menu');
    if (menu) menu.remove();
    if (resetTimer) startLinkMenuTimeout();
}

// The engine picker sits beside the toolbar: right, left, below, then above.
function showSearchEngineMenu(engines, query, anchorRect) {
    if (uiTimer) {
        clearTimeout(uiTimer);
        uiTimer = null;
    }
    const old = shadowRoot.querySelector('.sc-search-menu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.className = 'sc-container sc-link-menu sc-search-menu';
    if (getConfig('forceWhiteBlack')) {
        menu.classList.add('theme-light-ui');
    } else {
        menu.classList.add(getBestContrastTheme());
    }

    engines.forEach((engine) => {
        const item = document.createElement('div');
        item.className = 'sc-link-item';
        item.title = engine.url;

        const label = document.createElement('span');
        label.className = 'sc-link-url';
        label.textContent = engine.name;
        item.appendChild(label);

        item.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        item.onclick = (e) => {
            e.stopPropagation();
            safeOpenTab(getSearchEngineUrl(engine, query), { active: true });
            hideUI();
        };
        menu.appendChild(item);
    });

    shadowRoot.appendChild(menu);
    menu.style.left = '-9999px';

    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        const gap = getConfig('offset');
        const margin = 10;
        const canRight = anchorRect.right + gap + rect.width <= window.innerWidth - margin;
        const canLeft = anchorRect.left - gap - rect.width >= margin;
        const canBelow = anchorRect.bottom + gap + rect.height <= window.innerHeight - margin;
        const canAbove = anchorRect.top - gap - rect.height >= margin;

        let left;
        let top;
        if (canRight || canLeft) {
            left = canRight
                ? anchorRect.right + gap
                : anchorRect.left - rect.width - gap;
            top = canBelow || !canAbove
                ? anchorRect.top
                : anchorRect.top - rect.height - gap;
        } else if (canBelow || canAbove) {
            left = anchorRect.left;
            top = canBelow
                ? anchorRect.bottom + gap
                : anchorRect.top - rect.height - gap;
        } else {
            left = anchorRect.right + gap;
            top = anchorRect.top;
        }

        left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.add('visible');
    });
}

// Scroll/resize should keep the secondary menu, clamped into the viewport,
// rather than falling back to the selection toolbar.
function repositionLinkMenu() {
    const menu = shadowRoot && shadowRoot.querySelector('.sc-link-menu');
    if (!menu) return false;
    const rect = menu.getBoundingClientRect();
    const left = Math.max(10, Math.min(parseFloat(menu.style.left) || 10, window.innerWidth - rect.width - 10));
    const top = Math.max(10, Math.min(parseFloat(menu.style.top) || 10, window.innerHeight - rect.height - 10));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.classList.add('visible');
    return true;
}


// Render buttons (supports Copy/Search mode and Paste mode)
function renderButton(rect, mouseX, mouseY, text, html, mode = 'default', targetInput = null, isEditable = false, pasteCache = null, showIdCardCheck = false) {
    // Clean up old button/menu
    shadowRoot.querySelectorAll('.sc-container').forEach((oldBtn) => oldBtn.remove());

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
    container.classList.toggle('sc-col', isCol);

    // Vertical menus show the action name beside the icon; the capsule keeps
    // its icon-only look. The title stays available in both styles.
    const applyButtonLabel = (btn, label, title = label) => {
        btn.title = title;
        if (!isCol) return;
        const span = document.createElement('span');
        span.className = 'sc-btn-label';
        span.textContent = label;
        btn.appendChild(span);
        btn.classList.add('has-label');
    };

    // Pending-lightning-paste preview beside the paste icon.
    const appendPastePreview = (btn, cache) => {
        if (!getConfig('showPastePreview') || !cache) return false;
        if (!cache.text && cache.type !== 'clipboard') return false;

        const span = document.createElement('span');
        span.className = 'sc-btn-label';
        btn.classList.add('has-label');

        // Text copied outside the toolbar cannot be read back; show a generic
        // label instead of pretending we know the clipboard contents.
        if (cache.type === 'clipboard') {
            const strong = document.createElement('strong');
            strong.textContent = isCol
                ? t('paste_clipboard_action')
                : t('paste_clipboard_text');
            span.appendChild(strong);
            btn.appendChild(span);
            return true;
        }

        const isPanCode = cache.type === 'pan_code';
        if (isCol) {
            if (isPanCode) {
                span.appendChild(document.createTextNode(t('btn_pan_code') + ' '));
                const code = document.createElement('strong');
                code.textContent = truncatePasteText(cache.text, 10);
                span.appendChild(code);
            } else {
                const [open, close] = getPasteQuotePair();
                span.textContent = open + truncatePasteText(cache.text, 10) + close;
            }
        } else {
            span.textContent = truncatePasteText(cache.text, 6);
            if (isPanCode) span.classList.add('sc-pan-code');
        }

        btn.appendChild(span);
        return true;
    };

    const applyPasteButtonContent = (btn, cache, title = t('btn_paste')) => {
        if (appendPastePreview(btn, cache)) {
            btn.title = title;
            return;
        }
        applyButtonLabel(btn, t('btn_paste'), title);
    };

    // Mode A: Default mode
    if (mode === 'default' || mode === PASTE_MODE_THREE_BTNS) {
        // 1. Copy button
        const copyBtn = document.createElement('div');
        copyBtn.className = 'sc-btn';
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        applyButtonLabel(copyBtn, t('btn_copy'));
        copyBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            triggerFestivalEffect(e.clientX, e.clientY, shadowRoot);
            let contentToCopy = cachedSelection.text || text;
            let htmlToCopy = cachedSelection.html || html;
            let hiddenRemoved = false;

            // Only this button sanitizes. Other copy paths stay untouched and
            // are handled by the read-only safe-copy listener.
            const liveSelection = (cachedSelection.selection && cachedSelection.selection.rangeCount > 0)
                ? cachedSelection.selection
                : (typeof getActiveSelection === 'function' ? getActiveSelection() : null);
            if (liveSelection && liveSelection.rangeCount > 0 &&
                liveSelection.toString() === contentToCopy &&
                typeof buildVisibleSelectionText === 'function') {
                const visible = buildVisibleSelectionText(liveSelection, window);
                if (visible && visible.changed) {
                    if (!visible.text.trim()) {
                        showToast(t('toast_copy_no_visible_text'), 2200);
                        setTimeout(hideUI, 50);
                        return;
                    }
                    contentToCopy = visible.text;
                    htmlToCopy = '';
                    hiddenRemoved = true;
                }
            }

            await copyToClipboard(contentToCopy, htmlToCopy);
            if (getConfig('enablePaste')) {
                await safeSetValue('smart_paste_cache', {
                    text: contentToCopy,
                    timestamp: Date.now()
                });
                unregisterVisibilityCleanup();
            }
            const copiedToast = hiddenRemoved ? t('toast_copy_visible_only') : t('toast_copied');
            const zeroWidth = typeof getZeroWidthNotice === 'function'
                ? getZeroWidthNotice(contentToCopy)
                : null;
            if (zeroWidth) {
                // Read-only warning: the copied text itself is left untouched.
                showSecurityWarnings([zeroWidth], null, copiedToast);
            } else {
                showToast(copiedToast);
            }
            setTimeout(hideUI, 50);
        };
        container.appendChild(copyBtn);

        const isInInput = targetInput !== null;

        // 2. Cut button (only show in editable fields)
        if (isInInput) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);

            const cutBtn = document.createElement('div');
            cutBtn.className = 'sc-btn';
            cutBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
            applyButtonLabel(cutBtn, t('btn_cut'));
            cutBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            cutBtn.onclick = async (e) => {
                e.stopPropagation();
                triggerFestivalEffect(e.clientX, e.clientY, shadowRoot);
                const target = targetInput || activeElementDeep();
                const contentToCopy = cachedSelection.text || text;
                const htmlToCopy = cachedSelection.html || html;
                const snapshot = captureSelectionSnapshot(target);
                if (await copyToClipboard(contentToCopy, htmlToCopy)) {
                    deleteSelectedText(target, snapshot);
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

        // Delete button (always shown inside input fields)
        if (isInInput) {
            const div2 = document.createElement('div');
            div2.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div2);

            const delBtn = document.createElement('div');
            delBtn.className = 'sc-btn';
            delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
            applyButtonLabel(delBtn, t('btn_delete'));
            delBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            delBtn.onclick = (e) => {
                e.stopPropagation();
                const target = targetInput || activeElementDeep();
                deleteSelectedText(target, captureSelectionSnapshot(target));
                hideUI();
            };
            container.appendChild(delBtn);
        }
        // Search button (only show outside input fields with short texts)
        else if (!isInInput && text.trim().length <= 32) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);

            const searchBtn = document.createElement('div');
            searchBtn.className = 'sc-btn';
            searchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
            applyButtonLabel(searchBtn, t('btn_search'));
            searchBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            searchBtn.onclick = (e) => {
                e.stopPropagation();
                const query = cachedSelection.text || text;

                if (shadowRoot.querySelector('.sc-search-menu')) {
                    closeSearchEngineMenu(true);
                    return;
                }

                const engines = getSearchEngineList();
                if (engines.length > 1) {
                    // Toggle a persistent engine picker beside the toolbar.
                    showSearchEngineMenu(engines, query, container.getBoundingClientRect());
                    return;
                }

                safeOpenTab(getSearchEngineUrl(engines[0], query), { active: true });
                setTimeout(hideUI, 50);
            };
            container.appendChild(searchBtn);
        }

        // Translation has the lowest priority: it comes after copy and search.
        // Skip it when the selection is already in the current language.
        if (getConfig('enableTranslate') !== false && !shouldHideTranslate(text) && typeof requestTranslation === 'function') {
            const translateDiv = document.createElement('div');
            translateDiv.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(translateDiv);

            const translateBtn = document.createElement('div');
            translateBtn.className = 'sc-btn';
            translateBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path></svg>`;
            applyButtonLabel(translateBtn, t('btn_translate'));
            translateBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            translateBtn.onclick = (e) => {
                e.stopPropagation();
                const content = cachedSelection.text || text;
                requestTranslation(content, rect);
                setTimeout(hideUI, 50);
            };
            container.appendChild(translateBtn);
        }

        // Share card: capture the current selection, then offer clipboard/txt/image.
        // Page selections only: typing-area selections never get a share button.
        if (getConfig('enableShareButton') === true && !isInInput) {
            const shareDiv = document.createElement('div');
            shareDiv.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(shareDiv);

            const shareBtn = document.createElement('div');
            shareBtn.className = 'sc-btn';
            shareBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="10.51" x2="15.42" y2="6.49"></line><line x1="8.59" y1="13.49" x2="15.42" y2="17.51"></line></svg>`;
            applyButtonLabel(shareBtn, t('btn_share'));
            shareBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            shareBtn.onclick = (e) => {
                e.stopPropagation();
                const card = buildShareCard(cachedSelection.text || text);
                showShareMenu(card, container.getBoundingClientRect());
            };
            container.appendChild(shareBtn);
        }

        // @ button / chain button logic
        const activeEl = activeElementDeep();
        const isUserEditing = activeEl && (
            (['INPUT', 'TEXTAREA'].includes(activeEl.tagName) && !activeEl.readOnly) ||
            activeEl.isContentEditable
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
                applyButtonLabel(atBtn, t('btn_email'));
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
                const isChineseForLink = isChineseUI();
                let linkData = isChineseForLink ? extractLinkAndCode(text) : (() => {
                    const urls = extractUrlsFromText(text);
                    return urls.length > 0 ? { urls, password: null } : null;
                })();
                if (getConfig('enableHiddenLinks')) {
                    linkData = mergeHiddenLinks(linkData, collectHrefLinks());
                }
                if (linkData && linkData.urls && linkData.urls.length > 0 && linkData.urls.length <= LINK_MENU_MAX) {
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
                    applyButtonLabel(chainBtn, t('btn_open_link'), titlePrefix + t('btn_open_link'));
                    chainBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                    chainBtn.onclick = async (e) => {
                        if (chainBtn.__longPressTriggered) {
                            chainBtn.__longPressTriggered = false;
                            return;
                        }
                        e.stopPropagation();
                        // Single link + Chinese mode: write extraction code to lightning paste cache
                        if (isSingleLink && isChineseForLink && getConfig('enablePaste') && linkData.password) {
                            await safeSetValue('smart_paste_cache', {
                                text: linkData.password,
                                timestamp: Date.now() + 22000,
                                type: 'pan_code'
                            });
                            unregisterVisibilityCleanup();
                            showToast(t('toast_password_pasted'));
                        }

                        if (isSingleLink) {
                            safeOpenTab(linkData.urls[0].url, { active: true });
                            hideUI();
                            return;
                        }

                        // 2-12 links: replace the toolbar with a numbered menu.
                        const anchorRect = container.getBoundingClientRect();
                        showLinkMenu(linkData.urls, anchorRect);
                    };
                    bindLongPress(chainBtn, () => {
                        if (isSingleLink) copySingleLink(linkData.urls[0].url);
                        else copyAllLinks(linkData.urls);
                    });
                    container.appendChild(chainBtn);
                }
            }
        }

        // Check if "correct" button should be shown.
        // Hidden until the correction feature is rebuilt from scratch; the
        // implementation below stays intact for that future rework.
        const SHOW_TEXT_CORRECTION_BUTTON = false;
        const isChineseEnv = isChineseUI();
        if (SHOW_TEXT_CORRECTION_BUTTON && isChineseEnv && targetInput) {
            const isInputType = targetInput.tagName === 'INPUT';
            if (smartCorrectText(text, isInputType) !== null) {
                const div = document.createElement('div');
                div.className = isCol ? 'divider divider-h' : 'divider divider-v';
                container.appendChild(div);

                const correctBtn = document.createElement('div');
                correctBtn.className = 'sc-btn';
                correctBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>`;
                applyButtonLabel(correctBtn, "Correct");
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
            applyPasteButtonContent(pasteBtn, pasteCache);
            pasteBtn.onmousedown = e => { e.preventDefault(); e.stopPropagation(); };
            pasteBtn.onclick = async (e) => {
                e.stopPropagation();
                const cache = await safeGetValue('smart_paste_cache', null);
                if (cache && (cache.text || cache.type === 'clipboard')) {
                    if (cache.type === 'clipboard') {
                        await performClipboardPaste(activeElementDeep(), cache);
                    } else {
                        performPaste(activeElementDeep(), cache.text, {
                            panCode: cache.type === 'pan_code'
                        });
                        // Reset timestamp after paste to allow repeated use on same page
                        await safeSetValue('smart_paste_cache', {
                            text: cache.text,
                            timestamp: Date.now()
                        });
                        registerVisibilityCleanup();
                    }
                }
                hideUI();
            };
            container.appendChild(pasteBtn);
        }
    }
    // Mode C: input whitespace selection (delete + optional paste)
    else if (mode === PASTE_MODE_WHITESPACE) {
        const delBtn = document.createElement('div');
        delBtn.className = 'sc-btn';
        delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        applyButtonLabel(delBtn, t('btn_delete'));
        delBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        delBtn.onclick = (e) => {
            e.stopPropagation();
            const target = targetInput || activeElementDeep();
            const start = target.selectionStart;
            const end = target.selectionEnd;
            if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
                hideUI();
                return;
            }
            if (target.value.substring(start, end).trim() !== '') {
                hideUI();
                return;
            }

            if (end - start >= 2) {
                // Collapse the whitespace run to one space and keep the delete
                // button selected so another click removes it.
                replaceInputRange(target, start, end, ' ', true);
            } else {
                replaceInputRange(target, start, end, '', false);
                hideUI();
            }
        };
        container.appendChild(delBtn);

        if (pasteCache && (pasteCache.text || pasteCache.type === 'clipboard')) {
            const div = document.createElement('div');
            div.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(div);

            const pasteBtn = document.createElement('div');
            pasteBtn.className = 'sc-btn';
            pasteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
            applyPasteButtonContent(pasteBtn, pasteCache);
            pasteBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
            pasteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (pasteCache.type === 'clipboard') {
                    await performClipboardPaste(targetInput || activeElementDeep(), pasteCache);
                } else {
                    performPaste(targetInput, pasteCache.text, {
                        panCode: pasteCache.type === 'pan_code'
                    });
                }
                hideUI();
            };
            container.appendChild(pasteBtn);
        }
    }
    // Mode B: Paste mode (lightning paste / cloud drive extraction code)
    else if (mode === 'paste') {
        const isPanCode = pasteCache && pasteCache.type === 'pan_code';
        const pasteTitle = isPanCode
            ? t('btn_paste') + ' ' + (pasteCache.text || '')
            : t('btn_paste');
        const pasteBtn = document.createElement('div');
        pasteBtn.className = 'sc-btn';
        if (isPanCode) {
            // Key icon (for cloud drive extraction code)
            pasteBtn.innerHTML = '<svg viewBox="0 0 48 48" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none"><path d="M22.8682 24.2982C25.4105 26.7935 26.4138 30.4526 25.4971 33.8863C24.5805 37.32 21.8844 40.0019 18.4325 40.9137C14.9806 41.8256 11.3022 40.8276 8.79375 38.2986C5.02208 34.4141 5.07602 28.2394 8.91499 24.4206C12.754 20.6019 18.9613 20.5482 22.8664 24.3L22.8682 24.2982Z"/><path d="M23 24L40 7"/><path d="M30.3052 16.9001L35.7337 22.3001L42.0671 16.0001L36.6385 10.6001L30.3052 16.9001Z"/></svg>';
        } else {
            pasteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
        }
        applyPasteButtonContent(pasteBtn, pasteCache, pasteTitle);
        pasteBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        pasteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (pasteCache && pasteCache.type === 'clipboard') {
                await performClipboardPaste(targetInput || activeElementDeep(), pasteCache);
                hideUI();
                return;
            }
            if (isPanCode) {
                performPaste(targetInput || activeElementDeep(), pasteCache.text, { panCode: true });
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

    // The ID card action is appended to whichever toolbar the selection
    // already produced (paste actions, default copy/cut tools, ...), never a
    // standalone replacement for them.
    if (showIdCardCheck) {
        if (container.children.length > 0) {
            const divider = document.createElement('div');
            divider.className = isCol ? 'divider divider-h' : 'divider divider-v';
            container.appendChild(divider);
        }

        const idBtn = document.createElement('div');
        idBtn.className = 'sc-btn';
        idBtn.innerHTML = `<svg viewBox="0 0 48 48" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="40" height="32" rx="2" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M17 25C19.2091 25 21 23.2091 21 21C21 18.7909 19.2091 17 17 17C14.7909 17 13 18.7909 13 21C13 23.2091 14.7909 25 17 25Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M23 31C23 27.6863 20.3137 25 17 25C13.6863 25 11 27.6863 11 31" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 20H36" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 28H36" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        applyButtonLabel(idBtn, '身份证号码校验');
        idBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        idBtn.onclick = (e) => {
            e.stopPropagation();
            showToast(getIdCardCheckMessage(text));
        };
        container.appendChild(idBtn);
    }
    container.setAttribute('data-btn-count', container.children.length);

    shadowRoot.appendChild(container);

    // Calculate position (common logic)
    container.style.left = '-9999px';

    requestAnimationFrame(() => placeToolbar(container, rect, mouseX, mouseY));
}

// Position the bar next to the selection endpoint (or the release point when
// there is no usable rect). Scroll/resize moves the same element through this
// function instead of creating a new toolbar.
function placeToolbar(container, rect, mouseX, mouseY) {
    if (!container || !container.isConnected) return;

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

    // Apply the cursor-distance fade using the last real mouse position.
    if (pointerKnown && typeof applyToolbarFade === 'function') {
        applyToolbarFade(lastPointerX, lastPointerY);
    }

    const timeout = getConfig('timeout');
    if (timeout > 0) {
        if (uiTimer) clearTimeout(uiTimer);
        uiTimer = setTimeout(hideUI, timeout);
    }
}

function hideUI() {
    // A hidden bar must never be resurrected by a render that was still queued
    // when the user dismissed it.
    cancelScheduledToolbar();
    const containers = shadowRoot ? shadowRoot.querySelectorAll('.sc-container') : [];
    containers.forEach((btn) => {
        btn.classList.remove('visible');
        setTimeout(() => {
            if (btn && btn.parentNode) btn.remove();
        }, 200);
    });
    cachedSelection = { text: '', html: '' };
    clearSelectionScrollTargets();
    lastSelectionRoot = null;
}
