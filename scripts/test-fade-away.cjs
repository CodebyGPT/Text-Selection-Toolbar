// Cursor-distance fade self-check: stored options and opacity curve.
// usage: node scripts/test-fade-away.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/26-fade-away.js"),
  "utf8"
);

let distance = "";
let ratio = "1.5";
const getConfig = (key) => {
  if (key === "fadeAwayDistance") return distance;
  if (key === "fadeAwayRatio") return ratio;
  return undefined;
};

const ctx = new Function(
  "getConfig",
  `${src}\nreturn { getFadeAwayOptions, getFadeAwayOpacity, easeFadeToward };`
)(getConfig);

// Empty or invalid stored values disable the feature.
for (const value of ["", null, undefined, "abc", 10, 601, 100.5, -20]) {
  distance = value;
  assert.strictEqual(ctx.getFadeAwayOptions(), null, `disabled for ${value}`);
}

// Valid distances use the selected ratio, with 1.5 as the fallback.
distance = 100;
ratio = "1.5";
assert.deepStrictEqual(ctx.getFadeAwayOptions(), { distance: 100, fade: 150 });
ratio = "3";
assert.deepStrictEqual(ctx.getFadeAwayOptions(), { distance: 100, fade: 300 });
ratio = "bad";
assert.deepStrictEqual(ctx.getFadeAwayOptions(), { distance: 100, fade: 150 });
distance = 20;
ratio = "1";
assert.deepStrictEqual(ctx.getFadeAwayOptions(), { distance: 20, fade: 20 });

// Full opacity within the radius, linear fade between, invisible past it.
assert.strictEqual(ctx.getFadeAwayOpacity(0, 100, 150), 1);
assert.strictEqual(ctx.getFadeAwayOpacity(100, 100, 150), 1);
assert.strictEqual(ctx.getFadeAwayOpacity(125, 100, 150), 0.5);
assert.strictEqual(ctx.getFadeAwayOpacity(150, 100, 150), 0);
assert.strictEqual(ctx.getFadeAwayOpacity(151, 100, 150), 0);
// ratio 1 has no fade band: anything past the radius is already invisible.
assert.strictEqual(ctx.getFadeAwayOpacity(21, 20, 20), 0);
assert.strictEqual(ctx.getFadeAwayOpacity(20, 20, 20), 1);
// Non-finite input never fades the toolbar.
assert.strictEqual(ctx.getFadeAwayOpacity(NaN, 100, 150), 1);

// Damping: each frame lands between the current value and the target, two
// short frames equal one long frame, and repeated frames converge without
// overshooting. A non-positive delta leaves the value untouched.
assert.strictEqual(ctx.easeFadeToward(0.2, 1, 0), 0.2);
assert.strictEqual(ctx.easeFadeToward(0.2, 1, NaN), 0.2);
const oneBigStep = ctx.easeFadeToward(0, 1, 16);
const twoSmallSteps = ctx.easeFadeToward(ctx.easeFadeToward(0, 1, 8), 1, 8);
assert.ok(Math.abs(oneBigStep - twoSmallSteps) < 1e-9, "frame-rate independent");
assert.ok(oneBigStep > 0 && oneBigStep < 1, "moves without overshooting");
let damped = 0;
for (let i = 0; i < 60; i += 1) damped = ctx.easeFadeToward(damped, 1, 16);
assert.ok(damped > 0.9999, "converges on the target");
assert.ok(ctx.easeFadeToward(0.9, 0.2, 16) < 0.9, "fades down as well as up");

// Wiring: the fade must travel on --sc-fade, never on inline opacity. Inline
// opacity outranks `.sc-container` and would kill the CSS hide transition
// (the bar shrinks, then pops out at full opacity).
const eventsSrc = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/14-events.js"),
  "utf8"
);
assert.ok(
  !/style\.opacity\s*=/.test(eventsSrc),
  "applyToolbarFade must write --sc-fade, not inline opacity"
);
assert.ok(
  /setProperty\(\s*['"]--sc-fade['"]/.test(eventsSrc),
  "fade value is written through --sc-fade"
);

const styles = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/08-shadow-dom.js"),
  "utf8"
);
assert.ok(
  /\.sc-container\.visible\s*\{[^}]*var\(--sc-fade/.test(styles),
  "visible toolbar consumes --sc-fade"
);
assert.ok(
  /\.sc-container\.visible\s*\{[^}]*animation:/.test(styles),
  "show-in keeps an opacity animation while the fade owns opacity"
);

console.log("fade-away check passed");
