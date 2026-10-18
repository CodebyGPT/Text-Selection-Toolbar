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
