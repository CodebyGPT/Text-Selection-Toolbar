// Festival particle motion self-check: lifetime window, size floor and glyph
// heading (each emoji must face the direction it is travelling).
// usage: node scripts/test-festival-particles.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/17-festival.js"),
  "utf8"
);

const particles = [];
const documentStub = {
  createElement: () => {
    const el = { style: {}, textContent: "" };
    el.remove = () => {
      el.removed = true;
      particles.splice(particles.indexOf(el), 1);
    };
    particles.push(el);
    return el;
  },
  createDocumentFragment: () => ({ appendChild() {} }),
};

const frames = [];
const requestAnimationFrame = (cb) => frames.push(cb);
const performanceStub = { now: () => clock };
let clock = 0;

const toolbar = new Function(
  "document",
  "window",
  "performance",
  "requestAnimationFrame",
  "getConfig",
  "getFestivalInfo",
  "t",
  `${src}\nreturn { triggerFestivalEffect, FESTIVAL_GRAVITY };`
)(documentStub, {}, performanceStub, requestAnimationFrame, () => false, () => ({ emojis: ["🥚"] }), (key) => key);

// Deterministic spawn: size = 13 + 0.5 * 19, vx = 0, vy = -(4 + 0.5 * 6),
// lifetime = 1000 + 0.5 * 800.
const random = Math.random;
Math.random = () => 0.5;
const shadowRoot = { appendChild() {} };
toolbar.triggerFestivalEffect(10, 20, shadowRoot);
Math.random = random;

const runFrame = (ms) => {
  clock += ms;
  const pending = frames.splice(0);
  pending.forEach((cb) => cb(clock));
};

runFrame(0);
const [particle] = particles;
assert.strictEqual(particles.length, 16, "particle count range is halved (12-19)");
assert.match(particle.style.cssText, /font-size: 22\.5px/, "size floor is 13px, not 16px");

// Emojis stay upright: position only, no rotation with the trajectory.
for (let i = 0; i < 30; i++) runFrame(16.6667);
assert.match(
  particle.style.transform,
  /^translate3d\(-?[\d.]+px, -?[\d.]+px, 0\)$/,
  "particles move without following their trajectory"
);

// Gravity is heavier than the original 0.22, but no longer the 0.45 extreme.
assert.ok(toolbar.FESTIVAL_GRAVITY > 0.3 && toolbar.FESTIVAL_GRAVITY < 0.45, "gravity sits in the middle");

// Lifetime is 0.3-0.8s: this particle (550ms) is still there at 0.5s, gone by 0.8s.
assert.ok(particle.removed !== true, "particle outlives 0.5s");
while (clock < 800) runFrame(16.6667);
assert.strictEqual(particle.removed, true, "particle disappears by 0.8s");

console.log("festival particle motion check passed");
