// Module 20: Hover copy button for <pre><code> blocks

const CODE_COPY_EDGE_GAP = 8;
const CODE_COPY_ANCHOR_GAP = 6;

let codeCopyButton = null;
let codeCopyTarget = null;

// pre:has(code) without relying on :has() support.
function findCodeBlock(target) {
    const pre = target?.closest?.('pre');
    if (!pre || !pre.querySelector('code')) return null;
    return pre;
}

// Sit inside the block's top-right corner, clear of its border/padding.
function getCodeCopyPosition(rect, size) {
    const left = Math.max(
        CODE_COPY_EDGE_GAP,
        Math.min(
            rect.right - size.width - CODE_COPY_ANCHOR_GAP,
            window.innerWidth - size.width - CODE_COPY_EDGE_GAP
        )
    );
    const top = rect.top + CODE_COPY_ANCHOR_GAP;
    return {
        left,
        top: Math.max(
            CODE_COPY_EDGE_GAP,
            Math.min(top, window.innerHeight - size.height - CODE_COPY_EDGE_GAP)
        ),
    };
}

function getCodeBlockText(pre) {
    const code = pre.querySelector('code') || pre;
    // Keep indentation, only drop the newlines that templates add around it.
    return String(code.textContent || '').replace(/^\n+|\n+$/g, '');
}

async function copyCodeBlock(pre) {
    const text = getCodeBlockText(pre);
    if (!text) return false;
    const copied = await copyToClipboard(text, '');
    if (copied) showToast(t('toast_copied'));
    return copied;
}

function ensureCodeCopyButton() {
    if (!hostElement) initContainer();
    if (codeCopyButton && codeCopyButton.isConnected) return codeCopyButton;

    const container = document.createElement('div');
    container.className = 'sc-container sc-code-copy';
    container.setAttribute('data-btn-count', '1');
    container.classList.add(
        getConfig('forceWhiteBlack') ? 'theme-light-ui' : getBestContrastTheme()
    );

    const btn = document.createElement('div');
    btn.className = 'sc-btn';
    btn.title = t('btn_copy');
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pre = codeCopyTarget;
        hideCodeCopyButton();
        if (pre && pre.isConnected) await copyCodeBlock(pre);
    };
    container.appendChild(btn);

    // A click meant for this button must not reach page copy/selection handlers.
    ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((type) => {
        container.addEventListener(type, (e) => e.stopPropagation());
    });

    shadowRoot.appendChild(container);
    codeCopyButton = container;
    return container;
}

function hideCodeCopyButton() {
    codeCopyTarget = null;
    if (codeCopyButton) codeCopyButton.classList.remove('visible');
}

function showCodeCopyButton(pre) {
    if (!pre.isConnected) {
        hideCodeCopyButton();
        return;
    }
    const rect = pre.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        hideCodeCopyButton();
        return;
    }

    const container = ensureCodeCopyButton();
    codeCopyTarget = pre;
    const position = getCodeCopyPosition(rect, {
        width: container.offsetWidth,
        height: container.offsetHeight,
    });
    container.style.left = `${position.left}px`;
    container.style.top = `${position.top}px`;
    container.classList.add('visible');
}

function handleCodeCopyHover(e) {
    if (isUnlockMode) return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (hostElement && path.includes(hostElement)) return;

    const pre = findCodeBlock(e.target);
    if (!pre) {
        hideCodeCopyButton();
        return;
    }
    showCodeCopyButton(pre);
}
