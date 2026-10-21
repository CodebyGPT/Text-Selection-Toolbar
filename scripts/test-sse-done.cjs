const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");

// 直接编译真实源码，验证 [DONE] 会结束流，而不是依赖服务端关闭连接。
const file = path.join(__dirname, "../src/libs/stream.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
  filename: file,
  babelrc: false,
  configFile: false,
  presets: [
    [require.resolve("@babel/preset-env"), { targets: { node: "current" } }],
  ],
});

const mod = { exports: {} };
new Function("require", "module", "exports", code)(
  () => ({}),
  mod,
  mod.exports
);
const { createSSEParser } = mod.exports;

const parse = createSSEParser();
const chunks = [
  ...parse('data: {"id":0}\n\ndata: [DONE]\n\n'),
  ...parse("data: [DONE]\n\n"),
];
assert.deepStrictEqual(chunks, ['{"id":0}'], "only [DONE] should be swallowed");
assert.strictEqual(parse.done, true, "parser must flag end-of-stream");

const open = createSSEParser();
assert.deepStrictEqual([...open('data: {"id":0}\n\n')], ['{"id":0}']);
assert.strictEqual(open.done, false, "open stream must not end early");

console.log("sse-done ok");
