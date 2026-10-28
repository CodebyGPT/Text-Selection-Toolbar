// Module 17: Festival Emoji Effects

const FESTIVAL_GRAVITY = 0.38;

// Emoji particles burst upward, then fall under one shared gravity model. Each
// particle owns its speed, direction, size and fade time; it disappears after
// its own lifetime, never based on travel distance.
function triggerFestivalEffect(x, y, shadowRoot) {
    if (getConfig('disableFestivalEffect')) return;
    const festival = getFestivalInfo();
    if (!festival || !festival.emojis.length) return;

    const particleCount = 12 + Math.floor(Math.random() * 8);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        const size = 13 + Math.random() * 19;
        const emoji = festival.emojis[Math.floor(Math.random() * festival.emojis.length)];

        p.textContent = emoji;
        p.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: ${size}px;
            line-height: 1;
            pointer-events: none;
            user-select: none;
            z-index: 2147483647;
            will-change: transform, opacity;
        `;

        const vx = (Math.random() - 0.5) * 2 * (2 + Math.random() * 4);
        // Upward speed can be zero: those particles are born already falling.
        let vy = -Math.random() * 10;
        const lifetime = 300 + Math.random() * 500;
        const fadeStart = lifetime * (0.2 + Math.random() * 0.2);
        const start = performance.now();
        let last = start;
        let posX = 0;
        let posY = 0;

        const animate = (now) => {
            const age = now - start;
            if (age >= lifetime) {
                p.remove();
                return;
            }

            // Normalize to 60fps steps so particles move the same on any refresh rate.
            const step = Math.min(48, now - last) / 16.6667;
            last = now;
            posX += vx * step;
            posY += vy * step;
            vy += FESTIVAL_GRAVITY * step;
            p.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
            p.style.opacity = age >= fadeStart
                ? String(1 - (age - fadeStart) / (lifetime - fadeStart))
                : '1';

            requestAnimationFrame(animate);
        };

        fragment.appendChild(p);
        requestAnimationFrame(animate);
    }

    shadowRoot.appendChild(fragment);
}
