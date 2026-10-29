// Module 26: Cursor-distance toolbar fade
//
// The toolbar stays fully opaque while the pointer is within a "fully visible"
// radius of the toolbar centre. Between that radius and the fade radius the
// opacity decreases linearly; past the fade radius the toolbar is hidden.
// Module 14 turns that curve into a smoothed follow: one requestAnimationFrame
// per container while the value moves, dropped the moment it settles. There is
// no timer and no polling.

const FADE_AWAY_DISTANCE_MIN = 20;
const FADE_AWAY_DISTANCE_MAX = 600;
const FADE_AWAY_RATIO_FALLBACK = 1.5;

// Time constant of the exponential follow. Below ~50ms the fade reads as a
// hard snap; past ~120ms it trails the cursor. 70ms is the smooth-but-tight
// sweet spot, and it is the only knob the damping needs.
const FADE_SMOOTH_TAU_MS = 70;

// One frame of an exponential follow towards the target. The result is
// frame-rate independent (two 8ms steps land where one 16ms step does) and
// never overshoots. Exposed for the self-check.
function easeFadeToward(current, target, dtMs) {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return current;
    const k = 1 - Math.exp(-dtMs / FADE_SMOOTH_TAU_MS);
    return current + (target - current) * k;
}

// Returns null when the feature is disabled or the stored distance is invalid.
function getFadeAwayOptions() {
    const rawDistance = typeof getConfig === 'function' ? getConfig('fadeAwayDistance') : '';
    if (rawDistance === '' || rawDistance === null || rawDistance === undefined) return null;

    const distance = Number(rawDistance);
    if (!Number.isInteger(distance) ||
        distance < FADE_AWAY_DISTANCE_MIN ||
        distance > FADE_AWAY_DISTANCE_MAX) {
        return null;
    }

    const rawRatio = typeof getConfig === 'function' ? Number(getConfig('fadeAwayRatio')) : NaN;
    const ratio = Number.isFinite(rawRatio) && rawRatio >= 1
        ? rawRatio
        : FADE_AWAY_RATIO_FALLBACK;
    return { distance, fade: distance * ratio };
}

// Full opacity inside fullDistance, linear fade to 0 at fadeDistance, and 0
// beyond it. Exposed for the self-check and the toolbar render path.
function getFadeAwayOpacity(centerDistance, fullDistance, fadeDistance) {
    if (!Number.isFinite(centerDistance) || centerDistance <= fullDistance) return 1;
    if (centerDistance > fadeDistance) return 0;
    const span = fadeDistance - fullDistance;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, 1 - (centerDistance - fullDistance) / span));
}
