// Module 27: Selection share card (clipboard / .txt / image)
//
// The image is drawn with the Canvas 2D API only. No third-party renderer is
// involved, so the userscript stays dependency-free.

const SHARE_CARD_WIDTH = 640;
const SHARE_CARD_PADDING = 32;
const SHARE_CARD_RADIUS = 20;
const SHARE_DIM_ALPHA = 0.32;
const SHARE_FONT_STACK = '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const SHARE_STYLE = {
    title: { font: `700 18px ${SHARE_FONT_STACK}`, color: '#111827', lineHeight: 27 },
    meta: { font: `400 12.5px ${SHARE_FONT_STACK}`, color: '#6b7280', lineHeight: 20 },
    body: { font: `400 16px ${SHARE_FONT_STACK}`, color: '#111827', lineHeight: 27 },
    credit: { font: `400 12px ${SHARE_FONT_STACK}`, color: '#9ca3af', lineHeight: 18 },
};

// Which optional blocks the user wants on the card.
function getShareCardOptions() {
    return {
        url: getConfig('shareIncludeUrl') !== false,
        title: getConfig('shareIncludeTitle') !== false,
        favicon: getConfig('shareIncludeFavicon') !== false,
        time: getConfig('shareIncludeTime') !== false,
        context: getConfig('shareIncludeContext') !== false,
        author: getConfig('shareIncludeAuthor') !== false,
    };
}

function padShare2(value) {
    return String(value).padStart(2, '0');
}

// One metadata line, e.g. "// @name:zh-CN 划词工具栏".
function readScriptMetaLine(metaSource, key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(metaSource || '').match(
        new RegExp('^\\s*//\\s*@' + escaped + '\\s+(.+?)\\s*$', 'm')
    );
    return match ? match[1].trim() : '';
}

// The credit names the script itself: "@name" under "auto", otherwise the
// matching "@name:<language>" field, falling back to "@name".
function getScriptDisplayName(language, info) {
    const lang = String(language || 'auto');
    const suffix = lang && lang !== 'auto' ? lang : '';
    const source = info && (info.scriptSource || info.scriptMetaStr);
    const meta = (info && info.script && info.script.meta) || {};
    const fromMeta = (key) => String(meta[key] || '').trim();

    if (suffix) {
        const localized = readScriptMetaLine(source, 'name:' + suffix) ||
            fromMeta('name:' + suffix);
        if (localized) return localized;
    }
    return readScriptMetaLine(source, 'name') || fromMeta('name') ||
        String((info && info.script && info.script.name) || '').trim() ||
        'Text Selection Toolbar';
}

function getShareScriptName() {
    const info = typeof GM_info !== 'undefined' ? GM_info : globalThis.GM_info;
    return getScriptDisplayName(getConfig('language'), info);
}

// Locale-independent and readable in every UI language.
function formatShareTime(date) {
    return `${date.getFullYear()}-${padShare2(date.getMonth() + 1)}-${padShare2(date.getDate())} ` +
        `${padShare2(date.getHours())}:${padShare2(date.getMinutes())}`;
}

function shareFileName(date, ext) {
    const stamp = `${date.getFullYear()}${padShare2(date.getMonth() + 1)}${padShare2(date.getDate())}-` +
        `${padShare2(date.getHours())}${padShare2(date.getMinutes())}${padShare2(date.getSeconds())}`;
    return `share-${stamp}.${ext}`;
}

// Build a whitespace-normalized copy of the block text plus, for every
// character, the source line and column it came from. This survives the
// difference between selection.toString() and innerText (newlines, collapsed
// spaces).
function indexShareLines(text) {
    const lines = String(text || '').split(/\r?\n/);
    let normalized = '';
    const lineOf = [];
    const colOf = [];
    lines.forEach((line, index) => {
        const content = line.trim();
        if (!content) return;
        if (normalized) {
            normalized += ' ';
            lineOf.push(index);
            colOf.push(0);
        }
        for (let col = 0; col < content.length; col++) {
            normalized += content[col];
            lineOf.push(index);
            colOf.push(col);
        }
    });
    return { lines, normalized, lineOf, colOf };
}

function findShareSelection(sourceText, selectedText) {
    const index = indexShareLines(sourceText);
    const fragments = String(selectedText || '')
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
    if (!fragments.length || !index.normalized) return null;

    // Single line: the normalized index locates the exact columns.
    if (fragments.length === 1) {
        const query = fragments[0];
        let at = index.normalized.indexOf(query);
        if (at < 0) at = index.normalized.indexOf(query.slice(0, 40));
        if (at < 0) return null;
        const end = Math.min(at + query.length - 1, index.normalized.length - 1);
        // A single-line selection must not spill into the next visual line.
        if (index.lineOf[end] !== index.lineOf[at]) return null;
        return {
            lines: index.lines,
            firstLine: index.lineOf[at],
            lastLine: index.lineOf[end],
            startCol: index.colOf[at],
            endCol: index.colOf[end] + 1,
        };
    }

    // Multi-line: the first fragment is the tail of its line (the selection
    // continues on the next line) and the last fragment is the head of its
    // line (the selection started on an earlier line).
    const firstFragment = fragments[0];
    const lastFragment = fragments[fragments.length - 1];
    let firstLine = -1;
    let startCol = 0;
    for (let i = 0; i < index.lines.length; i++) {
        const content = index.lines[i].trim();
        if (content.endsWith(firstFragment)) {
            firstLine = i;
            startCol = content.length - firstFragment.length;
            break;
        }
    }
    let lastLine = -1;
    let endCol = 0;
    for (let i = index.lines.length - 1; i >= 0; i--) {
        const content = index.lines[i].trim();
        if (content.startsWith(lastFragment)) {
            lastLine = i;
            endCol = lastFragment.length;
            break;
        }
    }
    if (firstLine < 0 || lastLine < 0 || lastLine < firstLine) return null;
    return { lines: index.lines, firstLine, lastLine, startCol, endCol };
}

// Context on: emit the visual lines that contain the selection in full.
// Unselected characters become dim segments, selected ones stay solid.
function expandShareLines(sourceText, selectedText) {
    const found = findShareSelection(sourceText, selectedText);
    if (!found) return null;
    const { lines, firstLine, lastLine, startCol, endCol } = found;

    const result = [];
    const dimPart = (value) => (value ? [{ text: value, dim: true }] : []);
    const solidPart = (value) => (value ? [{ text: value, dim: false }] : []);

    for (let i = firstLine; i <= lastLine; i++) {
        const content = lines[i].trim();
        if (!content) continue;
        if (firstLine === lastLine) {
            result.push([
                ...dimPart(content.slice(0, startCol)),
                ...solidPart(content.slice(startCol, endCol)),
                ...dimPart(content.slice(endCol)),
            ]);
        } else if (i === firstLine) {
            result.push([
                ...dimPart(content.slice(0, startCol)),
                ...solidPart(content.slice(startCol)),
            ]);
        } else if (i === lastLine) {
            result.push([
                ...solidPart(content.slice(0, endCol)),
                ...dimPart(content.slice(endCol)),
            ]);
        } else {
            result.push(solidPart(content));
        }
    }
    return result.length ? result : null;
}

function getShareExpandedLines(range, text) {
    if (!range) return null;
    try {
        // ponytail: full lines come from the block's innerText mapped by text
        // occurrence. Textareas/iframes and repeated text can miss; upgrade
        // path is walking the range's text nodes if this proves too coarse.
        const node = range.commonAncestorContainer;
        const element = node && (node.nodeType === 1 ? node : node.parentElement);
        // innerText is the visual text: it carries the line breaks users see.
        const source = element && typeof element.innerText === 'string'
            ? element.innerText
            : (element && element.textContent) || '';
        return expandShareLines(source, text);
    } catch (e) {
        return null;
    }
}

function getShareFaviconUrl() {
    try {
        const link = document.querySelector(
            'link[rel~="icon"][href], link[rel="apple-touch-icon"][href]'
        );
        const href = link ? link.getAttribute('href') : '';
        return new URL(href || '/favicon.ico', document.baseURI).href;
    } catch (e) {
        return '';
    }
}

function buildShareCard(text) {
    const options = getShareCardOptions();
    const content = String(text || '').trim();
    const scriptName = options.author ? getShareScriptName() : '';
    const title = options.title ? String(document.title || '').trim() : '';
    const url = options.url ? String(location.href || '') : '';

    let expanded = null;
    if (options.context) {
        const selection = cachedSelection.selection ||
            (typeof getActiveSelection === 'function' ? getActiveSelection() : null);
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        // Only trust the live range while it still describes this text.
        if (range && String(range.toString()).trim() === content) {
            expanded = getShareExpandedLines(range, content);
        }
    }

    return {
        text: content,
        title,
        url,
        // The icon belongs to the header; without a title or URL it would
        // overlap the body text.
        favicon: options.favicon && (title || url) ? getShareFaviconUrl() : '',
        time: options.time ? formatShareTime(new Date()) : '',
        credit: scriptName ? t('share_credit', scriptName) : '',
        expanded,
    };
}

// Plain-text card (clipboard / .txt): the selection always leads, then a blank
// line and the labeled metadata. The context is image-only by design.
function formatShareCardText(card) {
    const meta = [];
    if (card.url) meta.push(t('share_label_url') + card.url);
    if (card.title) meta.push(t('share_label_title') + card.title);
    if (card.time) meta.push(t('share_label_time') + card.time);
    if (card.credit) meta.push(card.credit);
    return meta.length ? `${card.text}\n\n${meta.join('\n')}` : card.text;
}

// Character-wrapped lines, preferring a nearby word boundary for Latin text.
function wrapShareText(text, maxWidth, measure) {
    const lines = [];
    String(text || '').split(/\r?\n/).forEach((paragraph) => {
        const content = paragraph.replace(/\s+$/, '');
        if (!content.trim()) {
            lines.push('');
            return;
        }
        let line = '';
        for (const ch of Array.from(content)) {
            const candidate = line + ch;
            if (line && measure(candidate) > maxWidth) {
                const spaceAt = ch.trim() ? line.lastIndexOf(' ') : -1;
                if (spaceAt > line.length * 0.5) {
                    lines.push(line.slice(0, spaceAt).replace(/\s+$/, ''));
                    line = line.slice(spaceAt + 1) + ch;
                    continue;
                }
                lines.push(line.replace(/\s+$/, ''));
                line = ch.trim() ? ch : '';
                continue;
            }
            line = candidate;
        }
        lines.push(line.replace(/\s+$/, ''));
    });
    return lines;
}

// Wrap expanded context lines while keeping each character's dim flag.
function wrapShareStyledLines(segmentsList, maxWidth, measure) {
    const lines = [];
    const pushLine = (chars) => {
        const segments = [];
        chars.forEach((item) => {
            if (!item.ch) return;
            const last = segments[segments.length - 1];
            if (last && last.dim === item.dim) last.text += item.ch;
            else segments.push({ text: item.ch, dim: item.dim });
        });
        lines.push(segments);
    };

    segmentsList.forEach((segments) => {
        const chars = [];
        segments.forEach((segment) => {
            for (const ch of Array.from(segment.text)) {
                chars.push({ ch, dim: segment.dim });
            }
        });
        if (!chars.length) {
            lines.push([]);
            return;
        }

        let line = [];
        const lineText = () => line.map((item) => item.ch).join('');
        chars.forEach((item) => {
            const candidate = lineText() + item.ch;
            if (line.length && measure(candidate) > maxWidth) {
                if (item.ch.trim()) {
                    const spaceAt = line.map((part) => part.ch).lastIndexOf(' ');
                    if (spaceAt > line.length * 0.5) {
                        pushLine(line.slice(0, spaceAt));
                        line = line.slice(spaceAt + 1);
                        line.push(item);
                        return;
                    }
                }
                pushLine(line);
                line = item.ch.trim() ? [item] : [];
                return;
            }
            line.push(item);
        });
        pushLine(line);
    });
    return lines;
}

function layoutShareCard(card, measure) {
    const contentWidth = SHARE_CARD_WIDTH - SHARE_CARD_PADDING * 2;
    const blocks = [];
    let y = SHARE_CARD_PADDING;
    let hasHeader = false;
    let headerLeft = SHARE_CARD_PADDING;
    if (card.favicon) headerLeft += 30;
    const headerWidth = SHARE_CARD_WIDTH - headerLeft - SHARE_CARD_PADDING;
    const wrap = (text, style, width) =>
        wrapShareText(text, width, (value) => measure(value, style.font));

    if (card.title) {
        const lines = wrap(card.title, SHARE_STYLE.title, headerWidth);
        blocks.push({ kind: 'title', lines, x: headerLeft, y });
        y += lines.length * SHARE_STYLE.title.lineHeight + 6;
        hasHeader = true;
    }
    if (card.url) {
        const lines = wrap(card.url, SHARE_STYLE.meta, headerWidth).slice(0, 2);
        blocks.push({ kind: 'meta', lines, x: headerLeft, y });
        y += lines.length * SHARE_STYLE.meta.lineHeight + 4;
        hasHeader = true;
    }
    if (hasHeader) {
        y += 12;
        blocks.push({ kind: 'divider', y });
        y += 20;
    }

    if (card.expanded) {
        const bodyLines = wrapShareStyledLines(
            card.expanded,
            contentWidth,
            (value) => measure(value, SHARE_STYLE.body.font)
        );
        blocks.push({
            kind: 'body',
            lines: bodyLines,
            x: SHARE_CARD_PADDING,
            y,
            styled: true,
        });
        y += bodyLines.length * SHARE_STYLE.body.lineHeight;
    } else {
        const bodyLines = wrap(card.text, SHARE_STYLE.body, contentWidth);
        blocks.push({ kind: 'body', lines: bodyLines, x: SHARE_CARD_PADDING, y });
        y += bodyLines.length * SHARE_STYLE.body.lineHeight;
    }

    if (card.time || card.credit) {
        y += 20;
        blocks.push({ kind: 'footer', y, time: card.time, credit: card.credit });
        y += SHARE_STYLE.credit.lineHeight;
    }

    return {
        blocks,
        height: Math.ceil(Math.max(132, y + SHARE_CARD_PADDING)),
    };
}

function shareRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function drawShareLines(ctx, lines, x, y, style) {
    ctx.font = style.font;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
    lines.forEach((line, index) => {
        ctx.fillText(line, x, y + index * style.lineHeight);
    });
}

function paintShareCard(card, measure, icon) {
    const layout = layoutShareCard(card, measure);
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(SHARE_CARD_WIDTH * scale);
    canvas.height = Math.round(layout.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    shareRoundRect(ctx, 0, 0, SHARE_CARD_WIDTH, layout.height, SHARE_CARD_RADIUS);
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    shareRoundRect(ctx, 0.5, 0.5, SHARE_CARD_WIDTH - 1, layout.height - 1, SHARE_CARD_RADIUS);
    ctx.stroke();

    if (icon) {
        try {
            ctx.save();
            shareRoundRect(ctx, SHARE_CARD_PADDING, SHARE_CARD_PADDING + 3, 18, 18, 4);
            ctx.clip();
            ctx.drawImage(icon, SHARE_CARD_PADDING, SHARE_CARD_PADDING + 3, 18, 18);
            ctx.restore();
        } catch (e) {}
    }

    layout.blocks.forEach((block) => {
        if (block.kind === 'divider') {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#eef0f3';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(SHARE_CARD_PADDING, block.y + 0.5);
            ctx.lineTo(SHARE_CARD_WIDTH - SHARE_CARD_PADDING, block.y + 0.5);
            ctx.stroke();
            return;
        }
        if (block.kind === 'footer') {
            ctx.textBaseline = 'top';
            ctx.font = SHARE_STYLE.credit.font;
            ctx.fillStyle = SHARE_STYLE.credit.color;
            ctx.globalAlpha = 1;
            if (block.time) {
                ctx.textAlign = 'left';
                ctx.fillText(block.time, SHARE_CARD_PADDING, block.y);
            }
            if (block.credit) {
                ctx.textAlign = 'right';
                ctx.fillText(block.credit, SHARE_CARD_WIDTH - SHARE_CARD_PADDING, block.y);
            }
            ctx.textAlign = 'left';
            return;
        }
        if (block.kind === 'title') {
            drawShareLines(ctx, block.lines, block.x, block.y, SHARE_STYLE.title);
            return;
        }
        if (block.kind === 'meta') {
            drawShareLines(ctx, block.lines, block.x, block.y, SHARE_STYLE.meta);
            return;
        }
        if (block.styled) {
            // Selected characters stay solid; the rest of each line is dimmed.
            ctx.font = SHARE_STYLE.body.font;
            ctx.fillStyle = SHARE_STYLE.body.color;
            ctx.textBaseline = 'top';
            block.lines.forEach((segments, index) => {
                let x = block.x;
                segments.forEach((segment) => {
                    ctx.globalAlpha = segment.dim ? SHARE_DIM_ALPHA : 1;
                    ctx.fillText(segment.text, x, block.y + index * SHARE_STYLE.body.lineHeight);
                    x += measure(segment.text, SHARE_STYLE.body.font);
                });
            });
            ctx.globalAlpha = 1;
            return;
        }
        drawShareLines(ctx, block.lines, block.x, block.y, SHARE_STYLE.body);
    });

    return canvas;
}

function loadShareImage(url) {
    return new Promise((resolve) => {
        if (!url || typeof Image === 'undefined') {
            resolve(null);
            return;
        }
        const image = new Image();
        let settled = false;
        const done = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        // A cross-origin icon without CORS headers must fail instead of tainting
        // the canvas; the card is simply rendered without it.
        image.crossOrigin = 'anonymous';
        image.onload = () => done(image);
        image.onerror = () => done(null);
        image.src = url;
        setTimeout(() => done(null), 3000);
    });
}

async function createShareCardBlob(card) {
    const measureContext = document.createElement('canvas').getContext('2d');
    const measure = (text, font) => {
        measureContext.font = font;
        return measureContext.measureText(text).width;
    };
    const icon = card.favicon ? await loadShareImage(card.favicon) : null;
    const canvas = paintShareCard(card, measure, icon);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('share card render failed'));
        }, 'image/png');
    });
}

function downloadShareBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    (document.body || document.documentElement).appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function copyShareCard(card) {
    if (await copyToClipboard(formatShareCardText(card), '')) {
        showToast(t('toast_share_copied'));
    } else {
        showToast(t('toast_share_failed'));
    }
}

function saveShareCardText(card) {
    try {
        const filename = shareFileName(new Date(), 'txt');
        downloadShareBlob(filename, new Blob(
            [formatShareCardText(card)],
            { type: 'text/plain;charset=utf-8' }
        ));
        showToast(t('toast_share_saved', filename));
    } catch (e) {
        showToast(t('toast_share_failed'));
    }
}

async function saveShareCardImage(card) {
    try {
        const blob = await createShareCardBlob(card);
        const filename = shareFileName(new Date(), 'png');
        downloadShareBlob(filename, blob);
        showToast(t('toast_share_saved', filename));
    } catch (e) {
        showToast(t('toast_share_failed'));
    }
}

// Secondary menu, reusing the multi-link picker look. Exporting keeps the menu
// open so the user can produce several formats in a row.
function showShareMenu(card, anchorRect) {
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
    menu.className = 'sc-container sc-link-menu sc-share-menu';
    menu.classList.add(getConfig('forceWhiteBlack') ? 'theme-light-ui' : getBestContrastTheme());

    [
        [t('share_export_clipboard'), () => copyShareCard(card)],
        [t('share_export_txt'), () => saveShareCardText(card)],
        [t('share_export_image'), () => saveShareCardImage(card)],
    ].forEach(([label, action]) => {
        const item = document.createElement('div');
        item.className = 'sc-link-item';

        const text = document.createElement('span');
        text.className = 'sc-link-url';
        text.textContent = label;
        item.appendChild(text);

        item.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
        item.onclick = async (e) => {
            e.stopPropagation();
            // A share action is a one-shot choice: close the menu right away
            // instead of leaving it to the toolbar timeout.
            hideUI();
            await action();
        };
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
