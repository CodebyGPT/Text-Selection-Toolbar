import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function gitHash() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "nogit";
  }
}

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join(".");
}

const version = `${stamp()}.${gitHash()}`;
const env = {
  ...process.env,
  REACT_APP_CLIENT: "userscript",
  GENERATE_SOURCEMAP: "false",
  DISABLE_ESLINT_PLUGIN: "true",
  REACT_APP_VERSION: version,
};

console.log(`Building Text Selection Toolbar ${version}`);
execFileSync(
  process.execPath,
  [path.resolve("node_modules/react-app-rewired/scripts/build.js")],
  { env, stdio: "inherit" }
);
execFileSync(process.execPath, [path.resolve("scripts/package-userscript.mjs")], {
  env,
  stdio: "inherit",
});
