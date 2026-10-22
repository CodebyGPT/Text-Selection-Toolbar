// Canvas fillText extraction self-check for src/toolbar/modules/18-canvas-text.js.
// usage: node scripts/test-canvas-text.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../src/toolbar/modules/18-canvas-text.js"),
  "utf8"
);

function makeSandbox() {
  const calls = [];
  const toasts = [];
  const copied = [];
  const listeners = {};

  class Context2D {
    constructor(canvas) {
      this.canvas = canvas;
    }
    fillText(text, x, y) {
      calls.push({ text, x, y });
      return "drawn";
    }
  }

  const api = new Function(
    "CanvasRenderingContext2D",
    "copyToClipboard",
    "showToast",
    "t",
    "initContainer",
    "window",
    src +
      `
      let isUnlockMode = false;
      return {
        installCanvasTextHook,
        composeCanvasText,
        getCanvasTextRecord,
        copyCanvasTextOnClick,
        setUnlock: (value) => { isUnlockMode = value; }
      };`
  )(
    Context2D,
    async (text) => {
      copied.push(text);
      return true;
    },
    (message) => toasts.push(message),
    (key, ...args) => {
      let out = key;
      args.forEach((arg) => {
        out = out.replace("%s", arg);
      });
      return out;
    },
    () => {},
    {
      addEventListener: (type, fn) => {
        listeners[type] = fn;
      },
    }
  );

  return { api, Context2D, calls, toasts, copied, listeners };
}

function canvasStub(width = 300, height = 150) {
  return { tagName: "CANVAS", width, height };
}

function clickEvent(canvas) {
  return { target: canvas, composedPath: () => [canvas] };
}

(async () => {
  // fillText hook forwards args and records the real text parameters.
  {
    const { api, Context2D, calls } = makeSandbox();
    assert.strictEqual(api.installCanvasTextHook(), true);
    const canvas = canvasStub();
    const ctx = new Context2D(canvas);
    assert.strictEqual(ctx.fillText("Hi", 12, 34), "drawn");
    assert.deepStrictEqual(calls, [{ text: "Hi", x: 12, y: 34 }]);
    assert.strictEqual(api.getCanvasTextRecord(canvas).entries.length, 1);
  }

  // Repeated identical draws are stored once.
  {
    const { api, Context2D } = makeSandbox();
    api.installCanvasTextHook();
    const canvas = canvasStub();
    const ctx = new Context2D(canvas);
    ctx.fillText("same", 10, 10);
    ctx.fillText("same", 10, 10);
    assert.strictEqual(api.getCanvasTextRecord(canvas).entries.length, 1);
  }

  // Reading order: top to bottom, then left to right, one line per baseline.
  {
    const { api, Context2D } = makeSandbox();
    api.installCanvasTextHook();
    const canvas = canvasStub();
    const ctx = new Context2D(canvas);
    ctx.fillText("world", 40, 101);
    ctx.fillText("second", 10, 130);
    ctx.fillText("Hello ", 10, 100);
    ctx.fillText("!", 80, 99);
    assert.strictEqual(
      api.composeCanvasText(api.getCanvasTextRecord(canvas)),
      "Hello world!\nsecond"
    );
  }

  // A resized canvas discards the previous frame.
  {
    const { api, Context2D } = makeSandbox();
    api.installCanvasTextHook();
    const canvas = canvasStub();
    new Context2D(canvas).fillText("old", 10, 10);
    canvas.width = 600;
    assert.strictEqual(api.composeCanvasText(api.getCanvasTextRecord(canvas)), "");
  }

  // Hotkey held + canvas click copies text, then clears the copied frame.
  {
    const { api, Context2D, copied, toasts } = makeSandbox();
    api.installCanvasTextHook();
    const canvas = canvasStub();
    new Context2D(canvas).fillText("line one", 10, 10);
    new Context2D(canvas).fillText("line two", 10, 40);

    api.setUnlock(true);
    await api.copyCanvasTextOnClick(clickEvent(canvas));
    assert.deepStrictEqual(copied, ["line one\nline two"]);
    assert.strictEqual(toasts.pop(), "toast_canvas_copied");
    assert.strictEqual(api.getCanvasTextRecord(canvas).entries.length, 0);

    await api.copyCanvasTextOnClick(clickEvent(canvas));
    assert.strictEqual(toasts.pop(), "toast_canvas_empty");
    assert.strictEqual(copied.length, 1);
  }

  // Without the hotkey held, a canvas click copies nothing.
  {
    const { api, Context2D, copied } = makeSandbox();
    api.installCanvasTextHook();
    const canvas = canvasStub();
    new Context2D(canvas).fillText("ignored", 10, 10);

    await api.copyCanvasTextOnClick(clickEvent(canvas));
    assert.deepStrictEqual(copied, []);
  }

  // Non-canvas clicks are ignored even in unlock mode.
  {
    const { api, copied } = makeSandbox();
    api.installCanvasTextHook();
    api.setUnlock(true);
    const div = { tagName: "DIV" };
    await api.copyCanvasTextOnClick({ target: div, composedPath: () => [div] });
    assert.deepStrictEqual(copied, []);
  }

  console.log("test-canvas-text: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
