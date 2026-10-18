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
