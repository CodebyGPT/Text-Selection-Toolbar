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
  `${src}\nreturn { getFadeAwayOptions, getFadeAwayOpacity };`
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

console.log("fade-away check passed");
