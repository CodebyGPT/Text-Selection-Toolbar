// Module 26: Cursor-distance toolbar fade
//
// The toolbar stays fully opaque while the pointer is within a "fully visible"
// radius of the toolbar centre. Between that radius and the fade radius the
// opacity decreases linearly; past the fade radius the toolbar is hidden.
// Everything here is driven by mouse events, never by a timer/poll.

const FADE_AWAY_DISTANCE_MIN = 20;
const FADE_AWAY_DISTANCE_MAX = 600;
const FADE_AWAY_RATIO_FALLBACK = 1.5;

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
