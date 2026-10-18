// Module 17: Festival Particle Effects

// Chinese New Year / Christmas easter egg logic
function getFestivalType() {
    const now = new Date();
    // 1. Try to detect lunar calendar (Chinese Lunar)
    try {
        const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" });
        if (formatter.resolvedOptions().calendar === 'chinese') {
            const parts = formatter.formatToParts(now);
            const monthPart = parts.find(p => p.type === 'month').value;
            const dayPart = parts.find(p => p.type === 'day').value;

            const isLunarJan = monthPart.includes('正') || monthPart.replace(/[^\d]/g, '') === '1';
            const day = parseInt(dayPart.replace(/[^\d]/g, ''));

            if (isLunarJan && day === 1) return 'CNY';
            return 'NONE';
        }
    } catch (e) {}

    // 2. Fallback logic: December 25th Christmas
    if (now.getMonth() === 11 && now.getDate() === 25) {
        return 'XMAS';
    }

    return 'NONE';
}

// Trigger fireworks effect
function triggerSpringFestivalEffect(x, y, shadowRoot) {
    const festival = getFestivalType();
    if (festival === 'NONE') return;

    let colors = [];
    if (festival === 'CNY') {
        colors = ['#FF0000', '#FFD700', '#FF4500', '#DC143C', '#FFFF00'];
    } else if (festival === 'XMAS') {
        colors = ['#FF0000', '#228B22', '#FFD700', '#FFFFFF', '#006400'];
    }

    const activeColors = [];
    for (let i = 0; i < 3; i++) {
        activeColors.push(colors[Math.floor(Math.random() * colors.length)]);
    }

    const particleCount = 20 + Math.floor(Math.random() * 21);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        const size = 4 + Math.random() * 3;
        const color = activeColors[Math.floor(Math.random() * activeColors.length)];

        p.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483647;
            box-shadow: 0 0 6px ${color};
            will-change: transform, opacity;
        `;

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let opacity = 1.0;
        const gravity = 0.2 + Math.random() * 0.1;
        const friction = 0.96;
        const decay = 0.01 + Math.random() * 0.02;

        let posX = x;
        let posY = y;

        const animate = () => {
            if (opacity <= 0) {
                p.remove();
                return;
            }
            vx *= friction;
            vy *= friction;
            vy += gravity;
            posX += vx;
            posY += vy;
            opacity -= decay;

            p.style.transform = `translate(${posX - x}px, ${posY - y}px)`;
            p.style.opacity = opacity;
            requestAnimationFrame(animate);
        };

        fragment.appendChild(p);
        requestAnimationFrame(animate);
    }
    shadowRoot.appendChild(fragment);
}

// Get toast copy text
function getSpringFestivalToastText() {
    const festival = getFestivalType();
    if (festival === 'CNY') {
        return t('festival_cny');
    } else if (festival === 'XMAS') {
        return t('festival_xmas');
    }
    return t('toast_copied');
}
