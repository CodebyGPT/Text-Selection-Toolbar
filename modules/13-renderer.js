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
