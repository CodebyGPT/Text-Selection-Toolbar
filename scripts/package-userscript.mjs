import fs from "node:fs";
import path from "node:path";

const source = path.resolve("build/text-selection-toolbar.user.js");
if (!fs.existsSync(source)) {
  console.error("Userscript build output not found:", source);
  process.exit(1);
}
fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync(source, path.join("dist", "text-selection-toolbar.user.js"));
console.log("Userscript written to dist/text-selection-toolbar.user.js");
