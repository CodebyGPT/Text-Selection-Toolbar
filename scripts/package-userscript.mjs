import fs from "node:fs";
import path from "node:path";

const source = path.resolve("build/kiss-translator.user.js");
if (!fs.existsSync(source)) {
  console.error("Userscript build output not found:", source);
  process.exit(1);
}
fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync(source, path.join("dist", "kiss-translator.user.js"));
console.log("Userscript written to dist/kiss-translator.user.js");
