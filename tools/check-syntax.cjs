"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function check(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            check(file);
        } else if (entry.isFile() && [".js", ".cjs", ".mjs"].includes(path.extname(file))) {
            const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
            if (result.error || result.status !== 0) {
                throw new Error(`Syntax check failed: ${path.relative(ROOT, file)}`);
            }
        } else if (entry.isFile() && path.extname(file) === ".json") {
            JSON.parse(fs.readFileSync(file, "utf8"));
        }
    }
}

for (const directory of ["methods", "lib", "tools", "tests"]) {
    check(path.join(ROOT, directory));
}

console.log("JavaScript syntax and method JSON files are valid.");
