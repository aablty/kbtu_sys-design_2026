const { spawn } = require("node:child_process");
const path = require("node:path");

const executable = process.execPath;
const mainPath = path.join(__dirname, "..", "dist", "main.js");
const children = [];

for (const id of [1, 2, 3, 4, 5]) {
  const child = spawn(executable, [mainPath, "--id", String(id)], {
    stdio: "inherit",
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
