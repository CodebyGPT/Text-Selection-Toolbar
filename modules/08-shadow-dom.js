// Module 08: Shadow DOM Container & Styles

// Initialize Shadow DOM container (optimized for SPA/AJAX)
function initContainer() {
    // 1. Check if hostElement exists and is still connected to the document (isConnected)
    if (hostElement && hostElement.isConnected) return;

    // 2. If hostElement exists but has been detached from DOM (cleared by page scripts), clean up old reference
    if (hostElement) {
        hostElement = null;
        shadowRoot = null;
    }

    // 3. Re-create container
    hostElement = document.createElement('div');
    hostElement.id = 'tm-smart-copy-host';
    hostElement.style.all = 'initial';
    hostElement.style.position = 'fixed';
    hostElement.style.zIndex = '2147483647'; // Max z-index
    hostElement.style.top = '0';
    hostElement.style.left = '0';
    hostElement.style.width = '0';
    hostElement.style.height = '0';
    hostElement.style.overflow = 'visible';
    hostElement.style.pointerEvents = 'none';

    // Important: mount on documentElement (html) instead of body
    // This way even if body is overwritten by SPA framework, elements on html usually survive
    (document.documentElement || document.body).appendChild(hostElement);

    shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // Re-inject styles
    const style = document.createElement('style');
    style.textContent = getStyles();
    shadowRoot.appendChild(style);
}

// Get stylesheet string
function getStyles() {
    const isCol = getConfig('buttonStyle') === 'col';
    const padRow = '10px 13.1415926px';   // Capsule: slightly narrower top/bottom, wider left/right
    const padCol = '10px';       // Column: square, equal on all sides
    return `
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .sc-container {
            position: fixed;
            display: flex;
            flex-direction: ${isCol ? 'column' : 'row'};
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid transparent;
            box-shadow:
                0 0 0 1px rgba(255, 255, 255, 0.3),
                0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06),
                0 0 10px rgba(255, 255, 255, 0.1);
            color: #000;
            border-radius: ${isCol ? '12px' : '20px'};
            font-size: 16px;
            z-index: 9999;
            cursor: pointer;
            user-select: none;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            pointer-events: auto;
            overflow: hidden;
            white-space: nowrap;
        }
        .sc-container.visible {
            opacity: 1;
            transform: scale(1);
        }
        .sc-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, transform 0.1s;
            color: #000;
            padding: ${isCol ? padCol : padRow};
        }
        .sc-container[data-btn-count="1"] .sc-btn {
            padding: 10px;
            aspect-ratio: 1 / 1;
        }
        .sc-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.03);
        }
        .sc-btn:active {
            transform: scale(0.98);
            background: rgba(255, 255, 255, 0.2);
        }
        /* Dark mode overrides */
        .theme-dark-ui {
            background: rgba(30, 30, 30, 0.3);
            border: 1px solid transparent;
            box-shadow:
                0 0 0 1px rgba(255, 255, 255, 0.15),
                0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06),
                0 0 10px rgba(0, 0, 0, 0.1);
            color: #fff;
        }
        .theme-dark-ui .sc-btn {
            color: #fff;
        }
        .theme-dark-ui .sc-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        .theme-dark-ui .sc-btn:active {
            background: rgba(255, 255, 255, 0.1);
        }
        /* Dividers */
        .divider {
            background: rgba(255, 255, 255, 0.25);
        }
        .theme-dark-ui .divider {
            background: rgba(255, 255, 255, 0.12);
        }
        .divider-v { width: 1px; height: 1.6em; align-self: center; }
        .divider-h { height: 1px; width: 100%; }
        /* Toast notification */
        .sc-toast {
            position: fixed;
            left: 50%;
            bottom: 20px;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10000;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .sc-toast.show { opacity: 1; }
        /* ===== Glass refraction edges ===== */
        .sc-container {
            position: fixed;
            display: flex;
            backdrop-filter: blur(14px) saturate(180%);
            -webkit-backdrop-filter: blur(14px) saturate(180%);
            background:
                linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.08'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(255,255,255,0.10);
            background-blend-mode: overlay;
            box-shadow:
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 12px rgba(255,255,255,0.15),
                0 8px 30px rgba(0,0,0,0.22);
            transition: box-shadow .25s ease, transform .25s ease, opacity .2s ease;
        }
        .sc-btn:hover {
            background: rgba(255,255,255,0.28);
            transform: scale(1.05);
            box-shadow:
                0 0 6px rgba(255,255,255,0.8),
                0 0 16px rgba(255,255,255,0.6),
                0 0 26px rgba(255,255,255,0.4);
            filter: brightness(1.25);
        }
        .theme-dark-ui {
            background:
                linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.06'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(0,0,0,0.25);
            background-blend-mode: soft-light;
            box-shadow:
                0 0 0 1px rgba(255,255,255,0.18),
                0 0 12px rgba(255,255,255,0.06),
                0 8px 26px rgba(0,0,0,0.32);
        }
        .theme-dark-ui .sc-btn:hover {
            background: rgba(255,255,255,0.12);
            filter: brightness(1.35);
            box-shadow:
                0 0 6px rgba(255,255,255,0.5),
                0 0 22px rgba(255,255,255,0.25),
                0 0 36px rgba(255,255,255,0.15);
        }
        /* ===== Glass refraction edges ===== */
        .theme-light-ui.sc-container {
            background:
                linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08)),
                url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.06'/></feComponentTransfer>\
</filter>\
<rect width='40' height='40' filter='url(#n)'/>\
</svg>"),
                rgba(255,255,255,0.18);
            background-blend-mode: overlay;
            box-shadow:
                inset 2px 2px 3px rgba(0,0,0,0.20),
                inset -2px -2px 3px rgba(0,0,0,0.18),
                0 0 0 1px rgba(255,255,255,0.45),
                0 0 12px rgba(255,255,255,0.25),
                0 8px 30px rgba(0,0,0,0.18);
            --divider-color: rgba(0,0,0,0.18);
        }
        .theme-light-ui .sc-btn:hover {
            background: rgba(255,255,255,0.35);
            filter: brightness(1.3);
            box-shadow:
                0 0 6px rgba(255,255,255,0.9),
                0 0 16px rgba(255,255,255,0.7),
                0 0 26px rgba(255,255,255,0.5);
        }
        .divider {
            background: var(--divider-color, rgba(255,255,255,0.25));
        }
        .theme-dark-ui.sc-container {
            box-shadow:
                inset 2px 2px 3px rgba(255,255,255,0.32),
                inset -2px -2px 3px rgba(255,255,255,0.28),
                0 0 0 1px rgba(255,255,255,0.18),
                0 0 12px rgba(255,255,255,0.06),
                0 8px 26px rgba(0,0,0,0.32);
        }
        /* Icon wrapper: serves as badge positioning anchor, same size as SVG */
        .sc-icon-wrap {
            position: relative;
            display: inline-flex;
            width: 18px;
            height: 18px;
        }
        /* Link count badge: bottom-right aligned, layered on top of icon */
        .sc-badge {
            position: absolute;
            right: 0;
            bottom: 0;
            color: inherit;
            font-size: 10px;
            font-weight: 700;
            line-height: 1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            pointer-events: none;
            filter:
                drop-shadow(0 0 1px rgba(255,255,255,0.98))
                drop-shadow(0 0 2px rgba(255,255,255,0.9))
                drop-shadow(0 0 3px rgba(255,255,255,0.75))
                drop-shadow(0 0 5px rgba(255,255,255,0.55));
        }
        .sc-badge-key {
            font-size: 0;
            right: -1px;
            bottom: -1px;
        }
        .sc-badge-key svg {
            display: block;
            stroke-width: 4;
        }
        .theme-dark-ui .sc-badge {
            filter:
                drop-shadow(0 0 1px rgba(0,0,0,0.98))
                drop-shadow(0 0 2px rgba(0,0,0,0.9))
                drop-shadow(0 0 3px rgba(0,0,0,0.75))
                drop-shadow(0 0 5px rgba(0,0,0,0.55));
        }
    `;
}
